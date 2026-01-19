/**
 * Backtest Module Index
 * 回测模块索引
 *
 * @module lib/backtest
 */

export {
  runBacktest,
  generateBacktestData,
  parseStrategyCode,
  type BacktestKline,
  type BacktestTrade,
  type BacktestConfig,
  type BacktestResult,
  type EquityPoint,
  type ParsedStrategy,
  type StrategySignal,
} from "./engine";

export {
  scanStockSignals,
  scanMultipleStocks,
  scanStockSignalsEnhanced,
  scanMultipleStocksEnhanced,
  calculateAllIndicators,
  getAvailableStrategies,
  deduplicateSignals,
  detectExtremeReturns,
  filterSignalsByStatus,
  getScanStatistics,
  STRATEGY_DETECTORS,
  type Indicators,
  type SignalDetectionResult,
  type SignalDetail,
  type StockSignalResult,
  type StrategyDetector,
  type SignalDeduplicationOptions,
  type ScanOptions,
} from "./signal-scanner";

export {
  detectMarketStatus,
  detectMarketStatusBatch,
  determineSignalStatus,
  findNextTradableDay,
  validateKlineData,
  isSTStock,
  isNewStock,
  type MarketStatus,
  type SignalStatus,
  type SignalStatusInfo,
} from "./market-status";

export {
  calculateTradeCost,
  calculateRoundTripCost,
  calculateNetReturn,
  calculateBreakEvenPrice,
  estimateEffectivePrice,
  formatCostBreakdown,
  getCostSummary,
  createCostConfig,
  validateCostConfig,
  DEFAULT_COSTS,
  ZERO_COSTS,
  CONSERVATIVE_COSTS,
  type TransactionCosts,
  type CostBreakdown,
  type RoundTripCost,
} from "./transaction-costs";

export {
  // Precision utilities / 精度工具
  PRECISION,
  roundTo,
  roundPrice,
  roundReturnPct,
  roundRatio,
  roundPercentage,
  formatPrice,
  formatReturnPct,
  formatRatio,
  // Basic statistics / 基础统计
  average,
  median,
  variance,
  standardDeviation,
  percentile,
  sum,
  // Advanced statistics / 高级统计
  calculateReturnDistribution,
  calculateSignalTimeline,
  calculatePeriodReturn,
  calculateWinStats,
  calculateStreaks,
  calculateRiskAdjustedReturns,
  compareToBenchmark,
  type ReturnDistributionBucket,
  type SignalTimelineEntry,
  type PeriodReturn,
} from "./statistics";
