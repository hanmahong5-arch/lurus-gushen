/**
 * Unified Backtest API Route
 * 统一回测API路由
 *
 * Handles multi-level backtest requests (sector, stock, portfolio)
 * 处理多层级回测请求（板块、个股、组合）
 *
 * Features:
 * - Comprehensive input validation
 * - Detailed error handling with error codes
 * - Request timeout handling
 * - Rate limiting preparation
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import type {
  UnifiedBacktestRequest,
  UnifiedBacktestResult,
  BacktestTarget,
  ReturnMetrics,
  RiskMetrics,
  TradingMetrics,
  SectorAggregatedResult,
  StockBacktestResult,
  DetailedTrade,
} from "@/lib/backtest/types";
import {
  buildReturnMetrics,
  buildRiskMetrics,
  buildTradingMetrics,
} from "@/lib/backtest/statistics";
import { runDiagnostics } from "@/lib/backtest/diagnostics";
import {
  getSectorStocks,
  type SectorStock,
} from "@/lib/data-service/sources/eastmoney-sector";

// =============================================================================
// CONSTANTS / 常量
// =============================================================================

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 60000;

/** Maximum stocks in sector backtest */
const MAX_SECTOR_STOCKS = 50;

/** Maximum stocks in portfolio */
const MAX_PORTFOLIO_STOCKS = 50;

/** Minimum initial capital */
const MIN_CAPITAL = 10000;

/** Maximum initial capital */
const MAX_CAPITAL = 100000000000;

/** Minimum backtest period in days */
const MIN_BACKTEST_DAYS = 5;

// =============================================================================
// ERROR CODES / 错误代码
// =============================================================================

const ErrorCodes = {
  // Validation errors (4xx)
  INVALID_REQUEST: "BT100",
  INVALID_TARGET: "BT101",
  INVALID_DATE_RANGE: "BT102",
  INVALID_CAPITAL: "BT103",
  INVALID_STRATEGY: "BT104",
  EMPTY_PORTFOLIO: "BT105",
  PORTFOLIO_TOO_LARGE: "BT106",
  MISSING_REQUIRED_FIELD: "BT107",

  // Data errors
  DATA_FETCH_FAILED: "BT200",
  INSUFFICIENT_DATA: "BT201",
  SYMBOL_NOT_FOUND: "BT203",

  // Engine errors
  ENGINE_TIMEOUT: "BT400",
  ENGINE_ERROR: "BT401",

  // System errors
  UNKNOWN_ERROR: "BT999",
} as const;

// =============================================================================
// TYPES / 类型定义
// =============================================================================

interface BacktestJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  result?: UnifiedBacktestResult;
  error?: string;
}

interface APIError {
  code: string;
  message: string;
  messageEn: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

// In-memory job store (in production would use Redis or similar)
const jobStore = new Map<string, BacktestJob>();

// =============================================================================
// ERROR HELPERS / 错误辅助函数
// =============================================================================

/**
 * Create standardized API error response
 */
function createErrorResponse(
  code: string,
  message: string,
  messageEn: string,
  status: number,
  details?: unknown,
  suggestedAction?: string,
): NextResponse<APIResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        messageEn,
        details,
        recoverable: status < 500,
        suggestedAction,
      },
    },
    { status },
  );
}

// =============================================================================
// VALIDATION / 验证函数
// =============================================================================

/**
 * Validate backtest request
 */
function validateRequest(
  body: unknown,
):
  | { valid: true; data: UnifiedBacktestRequest }
  | { valid: false; error: NextResponse } {
  // Check if body exists
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "请求体无效",
        "Invalid request body",
        400,
        undefined,
        "请检查请求格式",
      ),
    };
  }

  const request = body as Record<string, unknown>;

  // Validate target
  if (!request.target || typeof request.target !== "object") {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_TARGET,
        "请选择回测标的",
        "Target is required",
        400,
        undefined,
        "在标的选择区选择板块、个股或组合",
      ),
    };
  }

  const target = request.target as Record<string, unknown>;
  const mode = target.mode as string;

  if (!mode || !["sector", "stock", "portfolio"].includes(mode)) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_TARGET,
        "无效的回测模式",
        `Invalid target mode: ${mode}`,
        400,
        { validModes: ["sector", "stock", "portfolio"] },
        "请选择有效的回测模式",
      ),
    };
  }

  // Mode-specific validation
  if (mode === "sector" && !target.sector) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_TARGET,
        "请选择板块",
        "Sector is required for sector mode",
        400,
        undefined,
        "在板块选项卡中选择一个板块",
      ),
    };
  }

  if (mode === "stock" && !target.stock) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_TARGET,
        "请选择股票",
        "Stock is required for stock mode",
        400,
        undefined,
        "在个股选项卡中选择一只股票",
      ),
    };
  }

  if (mode === "portfolio") {
    const portfolio = target.portfolio as Record<string, unknown> | undefined;
    if (!portfolio) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.EMPTY_PORTFOLIO,
          "请添加股票到组合",
          "Portfolio is required for portfolio mode",
          400,
          undefined,
          "在组合选项卡中添加股票",
        ),
      };
    }

    const stocks = portfolio.stocks as unknown[] | undefined;
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.EMPTY_PORTFOLIO,
          "组合中没有股票",
          "Portfolio is empty",
          400,
          undefined,
          "请添加至少一只股票到组合",
        ),
      };
    }

    if (stocks.length > MAX_PORTFOLIO_STOCKS) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.PORTFOLIO_TOO_LARGE,
          `组合股票数量超过限制 (最多${MAX_PORTFOLIO_STOCKS}只)`,
          `Portfolio exceeds maximum size (${MAX_PORTFOLIO_STOCKS})`,
          400,
          { maxSize: MAX_PORTFOLIO_STOCKS, actualSize: stocks.length },
          `请减少组合股票数量至${MAX_PORTFOLIO_STOCKS}只以内`,
        ),
      };
    }
  }

  // Validate config
  if (!request.config || typeof request.config !== "object") {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        "缺少配置参数",
        "Config is required",
        400,
        undefined,
        "请设置回测参数",
      ),
    };
  }

  const config = request.config as Record<string, unknown>;

  // Validate dates
  const startDate = config.startDate as string;
  const endDate = config.endDate as string;

  if (!startDate || !endDate) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        "请设置回测日期范围",
        "Start date and end date are required",
        400,
        undefined,
        "请设置开始日期和结束日期",
      ),
    };
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        "日期格式无效",
        "Invalid date format (expected YYYY-MM-DD)",
        400,
        { startDate, endDate },
        "请使用YYYY-MM-DD格式",
      ),
    };
  }

  // Validate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        "日期无效",
        "Invalid date values",
        400,
        { startDate, endDate },
        "请输入有效的日期",
      ),
    };
  }

  if (start >= end) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        "开始日期必须早于结束日期",
        "Start date must be before end date",
        400,
        { startDate, endDate },
        "请调整日期范围",
      ),
    };
  }

  if (end > today) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        "结束日期不能超过今天",
        "End date cannot be in the future",
        400,
        { endDate, today: today.toISOString().split("T")[0] },
        "请选择今天或之前的日期",
      ),
    };
  }

  // Check minimum period
  const diffDays = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < MIN_BACKTEST_DAYS) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_DATE_RANGE,
        `回测周期至少需要${MIN_BACKTEST_DAYS}天`,
        `Backtest period must be at least ${MIN_BACKTEST_DAYS} days`,
        400,
        { days: diffDays, minDays: MIN_BACKTEST_DAYS },
        "请扩大日期范围",
      ),
    };
  }

  // Validate capital
  const capital = config.initialCapital as number;
  if (capital !== undefined) {
    if (typeof capital !== "number" || !isFinite(capital)) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.INVALID_CAPITAL,
          "初始资金无效",
          "Invalid initial capital",
          400,
          { capital },
          "请输入有效的数字",
        ),
      };
    }

    if (capital < MIN_CAPITAL) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.INVALID_CAPITAL,
          `初始资金至少${MIN_CAPITAL.toLocaleString()}元`,
          `Initial capital must be at least ${MIN_CAPITAL}`,
          400,
          { capital, minCapital: MIN_CAPITAL },
          `请设置初始资金至少${MIN_CAPITAL.toLocaleString()}元`,
        ),
      };
    }

    if (capital > MAX_CAPITAL) {
      return {
        valid: false,
        error: createErrorResponse(
          ErrorCodes.INVALID_CAPITAL,
          `初始资金不能超过${MAX_CAPITAL.toLocaleString()}元`,
          `Initial capital cannot exceed ${MAX_CAPITAL}`,
          400,
          { capital, maxCapital: MAX_CAPITAL },
          `请设置初始资金不超过${MAX_CAPITAL.toLocaleString()}元`,
        ),
      };
    }
  }

  // Validate commission and slippage
  const commission = config.commission as number | undefined;
  if (
    commission !== undefined &&
    (typeof commission !== "number" || commission < 0 || commission > 0.01)
  ) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "佣金率应在0-1%之间",
        "Commission rate should be between 0 and 1%",
        400,
        { commission },
        "请设置有效的佣金率",
      ),
    };
  }

  const slippage = config.slippage as number | undefined;
  if (
    slippage !== undefined &&
    (typeof slippage !== "number" || slippage < 0 || slippage > 0.05)
  ) {
    return {
      valid: false,
      error: createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "滑点应在0-5%之间",
        "Slippage should be between 0 and 5%",
        400,
        { slippage },
        "请设置有效的滑点",
      ),
    };
  }

  return {
    valid: true,
    data: body as UnifiedBacktestRequest,
  };
}

// =============================================================================
// HELPER FUNCTIONS / 辅助函数
// =============================================================================

/**
 * Generate mock equity curve for demonstration
 * 生成模拟净值曲线用于演示
 */
function generateMockEquityCurve(
  startDate: string,
  endDate: string,
  initialCapital: number,
  volatility: number = 0.02,
): Array<{
  date: string;
  equity: number;
  benchmark?: number;
  drawdown: number;
}> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const curve: Array<{
    date: string;
    equity: number;
    benchmark?: number;
    drawdown: number;
  }> = [];

  let equity = initialCapital;
  let benchmark = initialCapital;
  let peak = initialCapital;

  const current = new Date(start);
  while (current <= end) {
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      // Random walk with slight upward bias
      const change = (Math.random() - 0.48) * volatility;
      equity = equity * (1 + change);

      // Benchmark with lower volatility
      const benchmarkChange = (Math.random() - 0.48) * (volatility * 0.6);
      benchmark = benchmark * (1 + benchmarkChange);

      // Track peak and drawdown
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;

      curve.push({
        date: current.toISOString().split("T")[0]!,
        equity: Math.round(equity * 100) / 100,
        benchmark: Math.round(benchmark * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return curve;
}

/**
 * Generate mock trades for demonstration
 * 生成模拟交易记录用于演示
 */
function generateMockTrades(
  equityCurve: Array<{ date: string; equity: number }>,
  symbol: string,
  symbolName: string,
): DetailedTrade[] {
  const trades: DetailedTrade[] = [];

  // Handle empty curve
  if (equityCurve.length < 2) {
    return trades;
  }

  const numTrades = Math.floor(Math.random() * 15) + 5;

  for (let i = 0; i < numTrades; i++) {
    const buyIdx = Math.floor(
      Math.random() * Math.max(1, equityCurve.length - 10),
    );
    const holdingDays = Math.floor(Math.random() * 10) + 1;
    const sellIdx = Math.min(buyIdx + holdingDays, equityCurve.length - 1);

    const buyEntry = equityCurve[buyIdx];
    const sellEntry = equityCurve[sellIdx];

    if (!buyEntry || !sellEntry) continue;

    const buyDate = buyEntry.date;
    const sellDate = sellEntry.date;
    const buyPrice = 100 + Math.random() * 50;
    const sellPrice = buyPrice * (1 + (Math.random() - 0.4) * 0.1);
    const pnlPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

    const buyTradeId = uuidv4();

    // Buy trade
    trades.push({
      id: buyTradeId,
      timestamp: new Date(buyDate).getTime(),
      date: buyDate,
      type: "buy",
      symbol,
      symbolName,
      signalPrice: buyPrice,
      executePrice: buyPrice * 1.001,
      slippage: buyPrice * 0.001,
      slippagePercent: 0.1,
      commission: buyPrice * 100 * 0.0003,
      commissionPercent: 0.03,
      totalCost: buyPrice * 100 * 0.0013,
      lotCalculation: {
        requestedQuantity: 100,
        actualLots: 1,
        actualQuantity: 100,
        lotSize: 100,
        roundingLoss: 0,
        roundingLossPercent: 0,
      },
      requestedQuantity: 100,
      actualQuantity: 100,
      lots: 1,
      lotSize: 100,
      quantityUnit: "股",
      orderValue: buyPrice * 100,
      cashBefore: 100000,
      cashAfter: 100000 - buyPrice * 100,
      positionBefore: 0,
      positionAfter: 100,
      portfolioValueBefore: 100000,
      portfolioValueAfter: 100000,
      triggerReason: "MACD金叉",
      indicatorValues: { macd_dif: 0.5, macd_dea: 0.3 },
    });

    // Sell trade
    trades.push({
      id: uuidv4(),
      timestamp: new Date(sellDate).getTime(),
      date: sellDate,
      type: "sell",
      symbol,
      symbolName,
      signalPrice: sellPrice,
      executePrice: sellPrice * 0.999,
      slippage: sellPrice * 0.001,
      slippagePercent: 0.1,
      commission: sellPrice * 100 * 0.0003,
      commissionPercent: 0.03,
      totalCost: sellPrice * 100 * 0.0013,
      lotCalculation: {
        requestedQuantity: 100,
        actualLots: 1,
        actualQuantity: 100,
        lotSize: 100,
        roundingLoss: 0,
        roundingLossPercent: 0,
      },
      requestedQuantity: 100,
      actualQuantity: 100,
      lots: 1,
      lotSize: 100,
      quantityUnit: "股",
      orderValue: sellPrice * 100,
      cashBefore: 100000 - buyPrice * 100,
      cashAfter: 100000 - buyPrice * 100 + sellPrice * 100,
      positionBefore: 100,
      positionAfter: 0,
      portfolioValueBefore: 100000,
      portfolioValueAfter: 100000 + (sellPrice - buyPrice) * 100,
      pnl: (sellPrice - buyPrice) * 100,
      pnlPercent,
      holdingDays,
      entryTradeId: buyTradeId,
      triggerReason: "持仓到期",
      indicatorValues: { macd_dif: -0.2, macd_dea: 0.1 },
    });
  }

  return trades;
}

/**
 * Run backtest for single stock
 * 对单只股票运行回测
 */
async function runStockBacktest(
  symbol: string,
  symbolName: string,
  config: UnifiedBacktestRequest["config"],
): Promise<{
  equityCurve: Array<{
    date: string;
    equity: number;
    benchmark?: number;
    drawdown: number;
  }>;
  trades: DetailedTrade[];
  returnMetrics: ReturnMetrics;
  riskMetrics: RiskMetrics;
  tradingMetrics: TradingMetrics;
}> {
  // Generate mock data for demonstration
  // In production, this would call actual backtest engine
  const equityCurve = generateMockEquityCurve(
    config.startDate,
    config.endDate,
    config.initialCapital,
  );

  const trades = generateMockTrades(equityCurve, symbol, symbolName);

  // Build metrics
  const returnMetrics = buildReturnMetrics(equityCurve);
  const riskMetrics = buildRiskMetrics(equityCurve);
  const tradingMetrics = buildTradingMetrics(
    trades.filter((t) => t.type === "sell"),
    equityCurve.length,
  );

  return { equityCurve, trades, returnMetrics, riskMetrics, tradingMetrics };
}

/**
 * Run sector-level backtest with timeout
 * 运行板块级别回测（带超时）
 */
async function runSectorBacktest(
  target: BacktestTarget,
  request: UnifiedBacktestRequest,
): Promise<UnifiedBacktestResult> {
  const jobId = uuidv4();
  const startTime = Date.now();

  if (!target.sector) {
    throw new Error("Sector target is required for sector mode");
  }

  // Get sector stocks with error handling
  let stocks: SectorStock[];
  try {
    const sectorResponse = await getSectorStocks(
      target.sector.code,
      MAX_SECTOR_STOCKS,
    );
    if (!sectorResponse.success || !sectorResponse.data) {
      throw new Error(sectorResponse.error || "Failed to fetch sector stocks");
    }
    stocks = sectorResponse.data.stocks;
  } catch (error) {
    throw new Error(
      `获取板块成分股失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }

  if (stocks.length === 0) {
    throw new Error("板块中没有股票");
  }

  const stockResults: StockBacktestResult[] = [];
  let totalEquityCurve: Array<{
    date: string;
    equity: number;
    benchmark?: number;
    drawdown: number;
  }> = [];
  let allTrades: DetailedTrade[] = [];

  // Run backtest for each stock (limited for performance)
  const limitedStocks = stocks.slice(0, 20);
  for (const stock of limitedStocks) {
    // Check timeout
    if (Date.now() - startTime > REQUEST_TIMEOUT - 5000) {
      console.warn("Sector backtest approaching timeout, stopping early");
      break;
    }

    try {
      const result = await runStockBacktest(
        stock.symbol,
        stock.name,
        request.config,
      );

      stockResults.push({
        symbol: stock.symbol,
        name: stock.name,
        totalReturn: result.returnMetrics.totalReturn,
        winRate: result.tradingMetrics.winRate,
        tradeCount: result.tradingMetrics.totalTrades,
        contribution: 100 / limitedStocks.length,
        sharpeRatio: result.riskMetrics.sharpeRatio,
        maxDrawdown: result.riskMetrics.maxDrawdown,
      });

      if (totalEquityCurve.length === 0) {
        totalEquityCurve = result.equityCurve;
      }

      allTrades = allTrades.concat(result.trades);
    } catch (error) {
      console.warn(`Failed to backtest ${stock.symbol}:`, error);
      // Continue with other stocks
    }
  }

  if (stockResults.length === 0) {
    throw new Error("所有股票回测失败");
  }

  // Sort by return
  stockResults.sort((a, b) => b.totalReturn - a.totalReturn);

  // Calculate aggregated metrics with safe division
  const avgReturn =
    stockResults.length > 0
      ? stockResults.reduce((sum, s) => sum + s.totalReturn, 0) /
        stockResults.length
      : 0;
  const avgWinRate =
    stockResults.length > 0
      ? stockResults.reduce((sum, s) => sum + s.winRate, 0) /
        stockResults.length
      : 0;
  const avgSharpe =
    stockResults.length > 0
      ? stockResults.reduce((sum, s) => sum + s.sharpeRatio, 0) /
        stockResults.length
      : 0;

  // Build result
  const returnMetrics = buildReturnMetrics(totalEquityCurve);
  const riskMetrics = buildRiskMetrics(totalEquityCurve);
  const tradingMetrics = buildTradingMetrics(
    allTrades.filter((t) => t.type === "sell"),
    totalEquityCurve.length,
  );

  // Diagnostics
  const diagnostics =
    request.options?.includeDiagnostics !== false
      ? runDiagnostics({ returnMetrics, riskMetrics, tradingMetrics })
      : undefined;

  const sectorResult: SectorAggregatedResult = {
    sectorCode: target.sector.code,
    sectorName: target.sector.name,
    stockCount: stocks.length,
    backtestCount: stockResults.length,
    avgReturn,
    medianReturn:
      stockResults[Math.floor(stockResults.length / 2)]?.totalReturn ??
      avgReturn,
    bestReturn: stockResults[0]?.totalReturn ?? 0,
    worstReturn: stockResults[stockResults.length - 1]?.totalReturn ?? 0,
    avgWinRate,
    avgSharpeRatio: avgSharpe,
    stockResults,
    topPerformers: stockResults.slice(0, 5),
    bottomPerformers: stockResults.slice(-5).reverse(),
  };

  return {
    jobId,
    timestamp: Date.now(),
    executionTime: Date.now() - startTime,
    target,
    returnMetrics,
    riskMetrics,
    tradingMetrics,
    equityCurve: totalEquityCurve,
    sectorResult,
    diagnostics,
    config: {
      symbol: target.sector.code,
      initialCapital: request.config.initialCapital,
      commission: request.config.commission ?? 0.0003,
      slippage: request.config.slippage ?? 0.001,
      startDate: request.config.startDate,
      endDate: request.config.endDate,
      timeframe: request.config.timeframe ?? "1d",
    },
    strategy: {
      name: request.strategy?.builtinId ?? "default",
      params: request.strategy?.params ?? {},
      indicators: [],
      entryCondition: "",
      exitCondition: "",
    },
  };
}

/**
 * Run individual stock backtest
 * 运行个股回测
 */
async function runIndividualBacktest(
  target: BacktestTarget,
  request: UnifiedBacktestRequest,
): Promise<UnifiedBacktestResult> {
  const jobId = uuidv4();
  const startTime = Date.now();

  if (!target.stock) {
    throw new Error("Stock target is required for stock mode");
  }

  const { symbol, name: symbolName } = target.stock;
  const result = await runStockBacktest(symbol, symbolName, request.config);

  // Diagnostics
  const diagnostics =
    request.options?.includeDiagnostics !== false
      ? runDiagnostics({
          returnMetrics: result.returnMetrics,
          riskMetrics: result.riskMetrics,
          tradingMetrics: result.tradingMetrics,
        })
      : undefined;

  return {
    jobId,
    timestamp: Date.now(),
    executionTime: Date.now() - startTime,
    target,
    returnMetrics: result.returnMetrics,
    riskMetrics: result.riskMetrics,
    tradingMetrics: result.tradingMetrics,
    equityCurve: result.equityCurve,
    trades: result.trades,
    diagnostics,
    config: {
      symbol,
      initialCapital: request.config.initialCapital,
      commission: request.config.commission ?? 0.0003,
      slippage: request.config.slippage ?? 0.001,
      startDate: request.config.startDate,
      endDate: request.config.endDate,
      timeframe: request.config.timeframe ?? "1d",
    },
    strategy: {
      name: request.strategy?.builtinId ?? "default",
      params: request.strategy?.params ?? {},
      indicators: [],
      entryCondition: "",
      exitCondition: "",
    },
  };
}

/**
 * Run portfolio backtest
 * 运行组合回测
 */
async function runPortfolioBacktest(
  target: BacktestTarget,
  request: UnifiedBacktestRequest,
): Promise<UnifiedBacktestResult> {
  const jobId = uuidv4();
  const startTime = Date.now();

  if (!target.portfolio) {
    throw new Error("Portfolio target is required for portfolio mode");
  }

  const { stocks } = target.portfolio;
  const stockResults: StockBacktestResult[] = [];
  let totalEquityCurve: Array<{
    date: string;
    equity: number;
    benchmark?: number;
    drawdown: number;
  }> = [];
  let allTrades: DetailedTrade[] = [];

  // Run backtest for each stock in portfolio
  for (const stock of stocks) {
    // Check timeout
    if (Date.now() - startTime > REQUEST_TIMEOUT - 5000) {
      console.warn("Portfolio backtest approaching timeout, stopping early");
      break;
    }

    try {
      const result = await runStockBacktest(
        stock.symbol,
        stock.name,
        request.config,
      );

      stockResults.push({
        symbol: stock.symbol,
        name: stock.name,
        totalReturn: result.returnMetrics.totalReturn,
        winRate: result.tradingMetrics.winRate,
        tradeCount: result.tradingMetrics.totalTrades,
        contribution: 100 / stocks.length,
        sharpeRatio: result.riskMetrics.sharpeRatio,
        maxDrawdown: result.riskMetrics.maxDrawdown,
      });

      if (totalEquityCurve.length === 0) {
        totalEquityCurve = result.equityCurve;
      }

      allTrades = allTrades.concat(result.trades);
    } catch (error) {
      console.warn(`Failed to backtest ${stock.symbol}:`, error);
    }
  }

  if (stockResults.length === 0) {
    throw new Error("所有股票回测失败");
  }

  stockResults.sort((a, b) => b.totalReturn - a.totalReturn);

  const returnMetrics = buildReturnMetrics(totalEquityCurve);
  const riskMetrics = buildRiskMetrics(totalEquityCurve);
  const tradingMetrics = buildTradingMetrics(
    allTrades.filter((t) => t.type === "sell"),
    totalEquityCurve.length,
  );

  const diagnostics =
    request.options?.includeDiagnostics !== false
      ? runDiagnostics({ returnMetrics, riskMetrics, tradingMetrics })
      : undefined;

  return {
    jobId,
    timestamp: Date.now(),
    executionTime: Date.now() - startTime,
    target,
    returnMetrics,
    riskMetrics,
    tradingMetrics,
    equityCurve: totalEquityCurve,
    stockResults,
    trades: allTrades,
    diagnostics,
    config: {
      symbol: target.portfolio.name,
      initialCapital: request.config.initialCapital,
      commission: request.config.commission ?? 0.0003,
      slippage: request.config.slippage ?? 0.001,
      startDate: request.config.startDate,
      endDate: request.config.endDate,
      timeframe: request.config.timeframe ?? "1d",
    },
    strategy: {
      name: request.strategy?.builtinId ?? "default",
      params: request.strategy?.params ?? {},
      indicators: [],
      entryCondition: "",
      exitCondition: "",
    },
  };
}

// =============================================================================
// API HANDLERS / API处理函数
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        ErrorCodes.INVALID_REQUEST,
        "请求体JSON格式无效",
        "Invalid JSON in request body",
        400,
        undefined,
        "请检查请求格式",
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return validation.error;
    }

    const validatedRequest = validation.data;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("TIMEOUT"));
      }, REQUEST_TIMEOUT);
    });

    // Run appropriate backtest based on mode
    let result: UnifiedBacktestResult;

    try {
      const backtestPromise = (async () => {
        switch (validatedRequest.target.mode) {
          case "sector":
            return await runSectorBacktest(
              validatedRequest.target,
              validatedRequest,
            );
          case "stock":
            return await runIndividualBacktest(
              validatedRequest.target,
              validatedRequest,
            );
          case "portfolio":
            return await runPortfolioBacktest(
              validatedRequest.target,
              validatedRequest,
            );
          default:
            throw new Error(
              `Invalid target mode: ${validatedRequest.target.mode}`,
            );
        }
      })();

      result = await Promise.race([backtestPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === "TIMEOUT") {
        return createErrorResponse(
          ErrorCodes.ENGINE_TIMEOUT,
          "回测执行超时，请缩小回测范围后重试",
          "Backtest execution timeout",
          504,
          { timeout: REQUEST_TIMEOUT, elapsed: Date.now() - startTime },
          "请减少回测时间范围或减少股票数量",
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Unified backtest error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Determine error type and return appropriate response
    if (
      errorMessage.includes("获取板块成分股失败") ||
      errorMessage.includes("fetch")
    ) {
      return createErrorResponse(
        ErrorCodes.DATA_FETCH_FAILED,
        errorMessage,
        "Failed to fetch data",
        502,
        undefined,
        "请检查网络连接后重试",
      );
    }

    if (errorMessage.includes("所有股票回测失败")) {
      return createErrorResponse(
        ErrorCodes.ENGINE_ERROR,
        errorMessage,
        "All backtests failed",
        500,
        undefined,
        "请稍后重试或选择其他标的",
      );
    }

    return createErrorResponse(
      ErrorCodes.UNKNOWN_ERROR,
      "回测执行失败: " + errorMessage,
      "Backtest execution failed: " + errorMessage,
      500,
      { originalError: errorMessage },
      "请稍后重试",
    );
  }
}

export async function GET(request: NextRequest) {
  // Get job status
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return createErrorResponse(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      "缺少jobId参数",
      "Job ID is required",
      400,
      undefined,
      "请提供有效的jobId",
    );
  }

  const job = jobStore.get(jobId);
  if (!job) {
    return createErrorResponse(
      ErrorCodes.SYMBOL_NOT_FOUND,
      "任务不存在",
      "Job not found",
      404,
      { jobId },
      "请检查jobId是否正确",
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
    },
  });
}
