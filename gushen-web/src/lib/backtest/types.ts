/**
 * Backtest Types - Enhanced type definitions
 * 回测类型 - 增强的类型定义
 *
 * This module provides comprehensive type definitions for the backtest system,
 * including detailed trade records, daily logs, and result structures.
 *
 * @module lib/backtest/types
 */

import type { LotCalculation } from "./lot-size";

// =============================================================================
// BASIC TYPES / 基础类型
// =============================================================================

/**
 * K-line data point for backtesting
 */
export interface BacktestKline {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  symbol: string;
  initialCapital: number;
  commission: number; // Commission rate (e.g., 0.0003 = 0.03%)
  slippage: number; // Slippage rate (e.g., 0.001 = 0.1%)
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  timeframe: "1d" | "1w" | "60m" | "30m" | "15m" | "5m" | "1m";
}

/**
 * Parsed strategy from generated code
 */
export interface ParsedStrategy {
  name: string;
  params: Record<string, number>;
  indicators: string[];
  entryCondition: string;
  exitCondition: string;
}

// =============================================================================
// ENHANCED TRADE TYPES / 增强的交易类型
// =============================================================================

/**
 * Detailed trade record with full execution information
 * 包含完整执行信息的详细交易记录
 */
export interface DetailedTrade {
  // Basic info / 基本信息
  id: string;
  timestamp: number; // Unix timestamp
  date: string; // ISO date string
  type: "buy" | "sell";

  // Symbol info / 标的信息 (Phase 7 新增)
  symbol: string; // Stock symbol code (股票代码)
  symbolName: string; // Stock name (股票名称, e.g., "贵州茅台")
  market?: string; // Market name (市场, e.g., "上海"/"深圳")

  // Execution details / 执行详情
  signalPrice: number; // Price when signal triggered (信号触发时的价格)
  executePrice: number; // Actual execution price with slippage (实际成交价含滑点)
  slippage: number; // Slippage amount (滑点金额)
  slippagePercent: number; // Slippage percentage (滑点百分比)
  commission: number; // Commission paid (手续费)
  commissionPercent: number; // Commission percentage (手续费百分比)
  totalCost: number; // Total transaction cost (总交易成本)

  // Quantity calculation / 数量计算过程
  lotCalculation: LotCalculation; // Lot size calculation details (手数计算详情)
  requestedQuantity: number; // Original calculated quantity (原始计算数量)
  actualQuantity: number; // Actual traded quantity after lot rounding (实际成交数量)
  lots: number; // Number of lots (手数, Phase 7 新增)
  lotSize: number; // Shares per lot (每手股数, Phase 7 新增)
  quantityUnit: string; // Unit for display (显示单位: "股"/"手"/"张", Phase 7 新增)
  orderValue: number; // Order value = quantity * price (订单金额, Phase 7 新增)

  // Position changes / 持仓变化
  cashBefore: number;
  cashAfter: number;
  positionBefore: number;
  positionAfter: number;
  portfolioValueBefore: number;
  portfolioValueAfter: number;

  // P&L for sell trades / 卖出交易的盈亏
  pnl?: number; // Profit/Loss amount (盈亏金额)
  pnlPercent?: number; // Profit/Loss percentage (盈亏百分比)
  holdingDays?: number; // Days held (持有天数)
  entryTradeId?: string; // Reference to entry trade (关联的买入交易ID)

  // Signal information / 信号信息
  triggerReason: string; // Signal trigger reason (触发原因)
  indicatorValues: Record<string, number>; // Indicator values at trigger (触发时的指标值)
  strategyName?: string; // Strategy name (策略名称, Phase 7 新增)
}

/**
 * Daily backtest log entry
 * 每日回测日志条目
 */
export interface BacktestDailyLog {
  // Bar info / K线信息
  bar: number; // Bar index (K线索引)
  date: string; // Date string (日期)
  time: number; // Unix timestamp

  // OHLCV data / OHLCV数据
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  // Indicators / 指标值
  indicators: {
    sma5?: number;
    sma10?: number;
    sma20?: number;
    sma60?: number;
    ema12?: number;
    ema26?: number;
    rsi?: number;
    macdDif?: number;
    macdDea?: number;
    macdHist?: number;
    bollUpper?: number;
    bollMiddle?: number;
    bollLower?: number;
    [key: string]: number | undefined;
  };

  // Signal / 信号
  signal: "buy" | "sell" | null;
  signalReason: string | null;
  signalStrength?: number; // Signal confidence 0-100 (信号强度)

  // Action taken / 采取的操作
  action: string; // Human readable action description (可读的操作描述)
  actionDetail?: string; // Detailed action info (详细操作信息)

  // Portfolio state / 投资组合状态
  cash: number;
  position: number;
  positionValue: number;
  portfolioValue: number;
  portfolioReturn: number; // Return since start (累计收益率)
  dailyReturn: number; // Daily return (日收益率)

  // Risk metrics / 风险指标
  drawdown: number; // Current drawdown percentage (当前回撤)
  peakValue: number; // Peak portfolio value (峰值)
}

/**
 * Backtest execution summary
 * 回测执行摘要
 */
export interface BacktestSummary {
  // Time info / 时间信息
  startDate: string;
  endDate: string;
  tradingDays: number;
  executionTime: number; // in milliseconds

  // Capital info / 资金信息
  initialCapital: number;
  finalCapital: number;
  peakCapital: number;
  troughCapital: number;

  // Return metrics / 收益指标
  totalReturn: number;
  annualizedReturn: number;
  monthlyReturn: number;
  dailyReturn: number;

  // Risk metrics / 风险指标
  maxDrawdown: number;
  maxDrawdownDuration: number; // Days (最大回撤持续天数)
  volatility: number; // Annualized volatility (年化波动率)
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number; // Annualized return / Max drawdown

  // Trade metrics / 交易指标
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingPeriod: number;

  // Best/Worst trades / 最佳/最差交易
  maxSingleWin: number;
  maxSingleWinDate: string;
  maxSingleLoss: number;
  maxSingleLossDate: string;

  // Commission & Slippage / 手续费和滑点
  totalCommission: number;
  totalSlippage: number;
  totalTradingCost: number;
  tradingCostPercent: number;
}

/**
 * Complete backtest result with all details
 * 包含所有详情的完整回测结果
 */
export interface EnhancedBacktestResult {
  // Summary / 摘要
  summary: BacktestSummary;

  // Time series data / 时间序列数据
  equityCurve: Array<{
    date: string;
    equity: number;
    drawdown: number;
    position: number;
    cash: number;
  }>;

  // Detailed trades / 详细交易记录
  trades: DetailedTrade[];

  // Daily logs / 每日日志
  dailyLogs: BacktestDailyLog[];

  // Configuration / 配置信息
  config: BacktestConfig;
  strategy: ParsedStrategy;

  // Lot size info / 手数信息
  lotSizeInfo: {
    assetType: string;
    lotSize: number;
    description: string;
  };
}

// =============================================================================
// EQUITY TYPES / 净值类型
// =============================================================================

/**
 * Daily equity snapshot
 */
export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
  position: number;
}

/**
 * Strategy signal
 */
export interface StrategySignal {
  action: "buy" | "sell" | "hold";
  size?: number; // Position size (default: all-in)
  stopLoss?: number; // Stop loss price
  takeProfit?: number; // Take profit price
  reason?: string; // Signal reason
  strength?: number; // Signal strength 0-100
  indicatorValues?: Record<string, number>;
}

// =============================================================================
// BACKWARD COMPATIBILITY / 向后兼容
// =============================================================================

/**
 * Legacy trade record (for backward compatibility)
 * 旧版交易记录（向后兼容）
 */
export interface BacktestTrade {
  id: string;
  type: "buy" | "sell";
  price: number;
  size: number;
  timestamp: number;
  reason: string;
  pnl?: number;
  pnlPercent?: number;
}

/**
 * Legacy backtest result (for backward compatibility)
 * 旧版回测结果（向后兼容）
 */
export interface BacktestResult {
  // Summary metrics
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  totalTrades: number;

  // Detailed metrics
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingPeriod: number;
  maxSingleWin: number;
  maxSingleLoss: number;

  // Time series data
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];

  // Config info
  config: BacktestConfig;
  strategy: ParsedStrategy;
  executionTime: number;

  // Enhanced data (optional, for gradual migration)
  enhanced?: EnhancedBacktestResult;
}
