/**
 * Backtest API Route
 * 回测API路由
 *
 * POST /api/backtest - Run a backtest with generated strategy
 *
 * Request body:
 * {
 *   strategyCode: string,     // Generated strategy code
 *   config: {
 *     symbol: string,         // Stock symbol (optional, for real data)
 *     initialCapital: number, // Starting capital (default: 100000)
 *     commission: number,     // Commission rate (default: 0.0003)
 *     slippage: number,       // Slippage rate (default: 0.001)
 *     startDate: string,      // Start date ISO string
 *     endDate: string,        // End date ISO string
 *     timeframe: string,      // "1d" | "1w" | "60m" | "30m" | "15m" | "5m" | "1m"
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  runBacktest,
  generateBacktestData,
  type BacktestConfig,
  type BacktestKline,
} from "@/lib/backtest/engine";
import { getKLineData } from "@/lib/data-service";

// Data source tracking interface
interface DataSourceInfo {
  type: "real" | "simulated" | "mixed";
  provider: string;
  reason: string;
  fallbackUsed: boolean;
  realDataCount: number;
  simulatedDataCount: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Track data source information
  let dataSourceInfo: DataSourceInfo = {
    type: "simulated",
    provider: "mock-generator",
    reason: "Default fallback",
    fallbackUsed: false,
    realDataCount: 0,
    simulatedDataCount: 0,
  };

  try {
    const body = await request.json();
    const { strategyCode, config: userConfig } = body;

    // Validate strategy code
    if (!strategyCode || typeof strategyCode !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Strategy code is required",
        },
        { status: 400 }
      );
    }

    // Build config with defaults
    const config: BacktestConfig = {
      symbol: userConfig?.symbol ?? "000001.SZ",
      initialCapital: userConfig?.initialCapital ?? 100000,
      commission: userConfig?.commission ?? 0.0003,
      slippage: userConfig?.slippage ?? 0.001,
      startDate: userConfig?.startDate ?? getDefaultStartDate(),
      endDate: userConfig?.endDate ?? new Date().toISOString().split("T")[0] ?? "",
      timeframe: userConfig?.timeframe ?? "1d",
    };

    // Calculate days from date range
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Validate date range
    if (days <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "End date must be after start date",
        },
        { status: 400 }
      );
    }

    if (days > 3650) {
      return NextResponse.json(
        {
          success: false,
          error: "Date range cannot exceed 10 years",
        },
        { status: 400 }
      );
    }

    // Get K-line data
    let klines: BacktestKline[] = [];
    let realDataFetchError: string | null = null;

    // Try to fetch real data if symbol is provided
    if (config.symbol && config.symbol !== "mock") {
      try {
        const klineResult = await getKLineData(
          config.symbol,
          config.timeframe,
          Math.min(days + 60, 500) // Extra bars for indicator calculation
        );

        if (klineResult.success && klineResult.data && klineResult.data.length > 0) {
          // Convert to backtest format
          klines = klineResult.data.map((k) => ({
            time: typeof k.time === "number" ? k.time : Math.floor(new Date(k.time).getTime() / 1000),
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
          }));

          // Update data source info for real data
          dataSourceInfo = {
            type: "real",
            provider: klineResult.source || "eastmoney",
            reason: "Successfully fetched real market data",
            fallbackUsed: false,
            realDataCount: klines.length,
            simulatedDataCount: 0,
          };
        } else {
          realDataFetchError = klineResult.error || "No data returned from API";
        }
      } catch (err) {
        realDataFetchError = err instanceof Error ? err.message : "Unknown fetch error";
        console.warn("Failed to fetch real K-line data:", realDataFetchError);
      }
    } else {
      realDataFetchError = config.symbol === "mock"
        ? "Mock mode requested by user"
        : "No symbol provided";
    }

    // If no real data, generate mock data
    if (klines.length === 0) {
      klines = generateBacktestData(days, 50 + Math.random() * 100, 0.02);

      // Update data source info for simulated data
      dataSourceInfo = {
        type: "simulated",
        provider: "mock-generator",
        reason: realDataFetchError || "Fallback to simulated data",
        fallbackUsed: config.symbol !== "mock" && config.symbol !== undefined,
        realDataCount: 0,
        simulatedDataCount: klines.length,
      };
    }

    // Filter klines by date range
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Keep some bars before start date for indicator warmup
    const warmupBars = 60;
    const filteredKlines = klines.filter((k, index) => {
      if (index < warmupBars) return true; // Keep warmup bars
      return k.time >= startTimestamp && k.time <= endTimestamp;
    });

    if (filteredKlines.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient data for backtesting (minimum 20 bars required)",
        },
        { status: 400 }
      );
    }

    // Run backtest
    const result = await runBacktest(strategyCode, filteredKlines, config);

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        barsProcessed: filteredKlines.length,
        executionTime: totalTime,
        // Enhanced data source information
        dataSource: {
          type: dataSourceInfo.type,
          provider: dataSourceInfo.provider,
          reason: dataSourceInfo.reason,
          fallbackUsed: dataSourceInfo.fallbackUsed,
          realDataCount: dataSourceInfo.realDataCount,
          simulatedDataCount: dataSourceInfo.simulatedDataCount,
        },
        // Legacy field for backward compatibility
        dataSourceLegacy: dataSourceInfo.type === "real" ? "real" : "simulated",
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Backtest API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get default start date (1 year ago)
 */
function getDefaultStartDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split("T")[0] ?? "";
}

export const dynamic = "force-dynamic";
