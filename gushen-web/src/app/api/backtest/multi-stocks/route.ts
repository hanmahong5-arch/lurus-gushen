/**
 * Multi-Stocks Backtest API
 * 多股回测API
 *
 * POST /api/backtest/multi-stocks
 *
 * Performs backtesting on multiple stocks with database optimization
 * 对多只股票进行回测，使用数据库优化
 */

import { NextRequest, NextResponse } from "next/server";
import { getKLineDataBatch } from "@/lib/db/queries";
import {
  scanStockSignalsEnhanced,
  type StockSignalResult as ImportedStockSignalResult,
} from "@/lib/backtest/signal-scanner";
import { createHash } from "crypto";
import { cacheGet, cacheSet } from "@/lib/redis";

// =============================================================================
// Constants
// =============================================================================

const CACHE_TTL = 86400; // 24 hours

// =============================================================================
// Types
// =============================================================================

interface MultiStocksBacktestRequest {
  symbols: string[]; // Stock symbols (max 100)
  strategy: string; // Strategy ID
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  holdingDays: number; // Holding period in days
  maxStocks?: number; // Max stocks to hold simultaneously
  includeTransactionCosts?: boolean; // Include transaction costs
  excludeSTStocks?: boolean; // Exclude ST stocks
  deduplicateSignals?: boolean; // Deduplicate signals on same day
  dataSource?: "database" | "api" | "auto"; // Data source preference
}

interface BacktestSummary {
  totalSignals: number;
  positiveReturns: number;
  negativeReturns: number;
  avgReturn: number;
  winRate: number;
  maxReturn: number;
  minReturn: number;
  totalReturn: number;
}

interface BacktestResponse {
  success: boolean;
  summary: BacktestSummary;
  stockResults: ImportedStockSignalResult[];
  dataSource: "database" | "api" | "mixed";
  cacheHit?: boolean;
  executionTime?: number;
  timestamp: string;
}

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generate cache key from config
 * 从配置生成缓存键
 */
function generateCacheKey(config: MultiStocksBacktestRequest): string {
  // Sort symbols to ensure consistency
  const normalized = {
    symbols: [...config.symbols].sort(),
    strategy: config.strategy,
    startDate: config.startDate,
    endDate: config.endDate,
    holdingDays: config.holdingDays,
    maxStocks: config.maxStocks || 10,
    includeTransactionCosts: config.includeTransactionCosts || false,
    excludeSTStocks: config.excludeSTStocks || false,
    deduplicateSignals: config.deduplicateSignals || false,
  };

  const hash = createHash("md5")
    .update(JSON.stringify(normalized))
    .digest("hex");
  return `backtest:multi:${hash}`;
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const config: MultiStocksBacktestRequest = await request.json();

    // Validate request
    if (
      !config.symbols ||
      !Array.isArray(config.symbols) ||
      config.symbols.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbols array is required and must not be empty",
        },
        { status: 400 }
      );
    }

    if (config.symbols.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 stocks allowed" },
        { status: 400 }
      );
    }

    if (!config.strategy) {
      return NextResponse.json(
        { success: false, error: "Strategy is required" },
        { status: 400 }
      );
    }

    if (!config.startDate || !config.endDate) {
      return NextResponse.json(
        { success: false, error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Check Redis cache
    const cacheKey = generateCacheKey(config);
    const cachedResult = await cacheGet<{
      success: boolean;
      summary: BacktestSummary;
      stockResults: ImportedStockSignalResult[];
      dataSource: "database" | "api" | "mixed";
    }>(cacheKey);

    if (cachedResult) {
      console.log("[MultiStocks] Cache hit:", cacheKey);
      return NextResponse.json({
        ...cachedResult,
        cacheHit: true,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch K-line data from database
    console.log(
      `[MultiStocks] Fetching K-line data for ${config.symbols.length} stocks...`
    );
    const dataSource = config.dataSource || "auto";

    let klineDataMap: Map<string, unknown[]>;
    let actualDataSource: "database" | "api" | "mixed" = "database";

    try {
      klineDataMap = await getKLineDataBatch(
        config.symbols,
        config.startDate,
        config.endDate
      );

      // Check if all stocks have data
      const missingSymbols = config.symbols.filter(
        (s) => !klineDataMap.has(s) || klineDataMap.get(s)!.length === 0
      );

      if (missingSymbols.length > 0) {
        console.warn(
          `[MultiStocks] Missing data for ${missingSymbols.length} stocks:`,
          missingSymbols
        );

        if (dataSource === "database") {
          return NextResponse.json(
            {
              success: false,
              error: `Database missing data for ${missingSymbols.length} stocks`,
              missingSymbols,
            },
            { status: 404 }
          );
        }

        // Fall back to API for missing stocks
        actualDataSource = "mixed";
        // Exclude missing stocks for now
        config.symbols = config.symbols.filter(
          (s) => !missingSymbols.includes(s)
        );
      }
    } catch (error) {
      console.error("[MultiStocks] Database fetch failed:", error);

      if (dataSource === "database") {
        return NextResponse.json(
          {
            success: false,
            error: "Database fetch failed",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }

      // Fall back to API
      actualDataSource = "api";
      return NextResponse.json(
        { success: false, error: "API fallback not implemented yet" },
        { status: 501 }
      );
    }

    console.log(
      `[MultiStocks] Fetched data for ${klineDataMap.size} stocks from ${actualDataSource}`
    );

    // Execute backtesting concurrently
    console.log("[MultiStocks] Starting backtest execution...");
    const results = await Promise.all(
      config.symbols.map(async (symbol) => {
        try {
          const klineData = klineDataMap.get(symbol) as
            | { date: string; open: number; high: number; low: number; close: number; volume: number }[]
            | undefined;
          if (!klineData || klineData.length === 0) {
            return null;
          }

          // Convert database format to BacktestKline format
          const backtestKlines = klineData.map((k) => ({
            time: new Date(k.date).getTime() / 1000, // Convert to Unix timestamp (seconds)
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
          }));

          // Run backtest
          const result = await scanStockSignalsEnhanced(
            symbol,
            "", // name will be populated later if needed
            backtestKlines,
            config.strategy,
            {
              holdingDays: config.holdingDays,
              transactionCosts: config.includeTransactionCosts
                ? undefined // undefined uses DEFAULT_COSTS
                : {
                    commission: 0,
                    stampDuty: 0,
                    transferFee: 0,
                    slippage: 0,
                    minCommission: 0,
                  },
              deduplication: config.deduplicateSignals
                ? undefined // undefined uses DEFAULT
                : {
                    minGapDays: 0,
                    mergeConsecutive: false,
                    keepStrongest: false,
                  },
            }
          );

          return result;
        } catch (error) {
          console.error(`[MultiStocks] Backtest failed for ${symbol}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    type ResultType = Awaited<ReturnType<typeof scanStockSignalsEnhanced>>;
    const validResults = results.filter(
      (r): r is NonNullable<ResultType> => r !== null
    );

    console.log(
      `[MultiStocks] Completed backtest for ${validResults.length}/${config.symbols.length} stocks`
    );

    // Calculate summary statistics
    const summary: BacktestSummary = {
      totalSignals: 0,
      positiveReturns: 0,
      negativeReturns: 0,
      avgReturn: 0,
      winRate: 0,
      maxReturn: -Infinity,
      minReturn: Infinity,
      totalReturn: 0,
    };

    let allReturns: number[] = [];

    // Extend results with totalReturn for each stock
    type ExtendedStockResult = ImportedStockSignalResult & {
      totalReturn: number;
    };
    const extendedResults: ExtendedStockResult[] = [];

    for (const stockResult of validResults) {
      summary.totalSignals += stockResult.totalSignals;

      const stockReturns = stockResult.signals
        .filter((s) => s.returnPct !== undefined)
        .map((s) => s.returnPct!);

      allReturns = allReturns.concat(stockReturns);

      for (const ret of stockReturns) {
        if (ret > 0) summary.positiveReturns++;
        if (ret < 0) summary.negativeReturns++;
        if (ret > summary.maxReturn) summary.maxReturn = ret;
        if (ret < summary.minReturn) summary.minReturn = ret;
      }

      // Calculate totalReturn for this stock
      const totalReturn =
        stockReturns.length > 0
          ? stockReturns.reduce((sum, r) => sum + r, 0)
          : 0;

      extendedResults.push({
        ...stockResult,
        totalReturn,
      });
    }

    if (allReturns.length > 0) {
      summary.avgReturn =
        allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length;
      summary.winRate = summary.positiveReturns / allReturns.length;
      summary.totalReturn = allReturns.reduce((sum, r) => sum + r, 0);
    } else {
      summary.maxReturn = 0;
      summary.minReturn = 0;
    }

    // Sort results by total return (descending)
    extendedResults.sort((a, b) => b.totalReturn - a.totalReturn);

    const response: BacktestResponse = {
      success: true,
      summary,
      stockResults: extendedResults,
      dataSource: actualDataSource,
      cacheHit: false,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Cache the result (TTL: 24 hours)
    const cacheData = {
      success: true,
      summary,
      stockResults: extendedResults,
      dataSource: actualDataSource,
    };
    await cacheSet(cacheKey, cacheData, CACHE_TTL);

    console.log(`[MultiStocks] Backtest completed in ${response.executionTime}ms`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[MultiStocks] Backtest error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Backtest execution failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// OPTIONS Handler (CORS)
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
