/**
 * Backtest Statistics Utilities
 * 回测统计计算工具
 *
 * Provides statistical calculation functions for strategy validation.
 * 为策略验证提供统计计算函数
 */

import type { SignalDetail } from "./signal-scanner";
import type { KLineData } from "../data-service/types";

// =============================================================================
// TYPES / 类型定义
// =============================================================================

/**
 * Return distribution bucket
 * 收益分布桶
 */
export interface ReturnDistributionBucket {
  range: string; // Label like "-5~-3%"
  rangeStart: number; // Start of range
  rangeEnd: number; // End of range
  count: number; // Number of signals in this range
  percentage: number; // Percentage of total
}

/**
 * Signal timeline entry
 * 信号时间线条目
 */
export interface SignalTimelineEntry {
  date: string; // Date (YYYY-MM-DD)
  signalCount: number; // Number of signals on this date
  avgReturn: number; // Average return for signals on this date
  buyCount: number; // Number of buy signals
  sellCount: number; // Number of sell signals
}

/**
 * Period return calculation result
 * 区间收益率计算结果
 */
export interface PeriodReturn {
  startPrice: number;
  endPrice: number;
  returnPct: number;
  startDate: string;
  endDate: string;
}

// =============================================================================
// PRECISION UTILITIES / 精度处理工具
// =============================================================================

/**
 * Default decimal places for different value types
 * 不同值类型的默认小数位数
 */
export const PRECISION = {
  PRICE: 2, // Price precision (2 decimal places) / 价格精度
  RETURN_PCT: 2, // Return percentage (2 decimal places) / 收益率百分比
  RATIO: 4, // Ratios like Sharpe (4 decimal places) / 比率（如夏普比率）
  PERCENTAGE: 2, // Percentages (2 decimal places) / 百分比
  COUNT: 0, // Counts (integer) / 计数
} as const;

/**
 * Round a number to specified decimal places
 * 将数字四舍五入到指定小数位
 *
 * @param value - The number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round price to standard precision
 * 将价格四舍五入到标准精度
 */
export function roundPrice(value: number): number {
  return roundTo(value, PRECISION.PRICE);
}

/**
 * Round return percentage to standard precision
 * 将收益率百分比四舍五入到标准精度
 */
export function roundReturnPct(value: number): number {
  return roundTo(value, PRECISION.RETURN_PCT);
}

/**
 * Round ratio to standard precision
 * 将比率四舍五入到标准精度
 */
export function roundRatio(value: number): number {
  return roundTo(value, PRECISION.RATIO);
}

/**
 * Round percentage to standard precision
 * 将百分比四舍五入到标准精度
 */
export function roundPercentage(value: number): number {
  return roundTo(value, PRECISION.PERCENTAGE);
}

/**
 * Format price for display
 * 格式化价格用于显示
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return roundPrice(value).toFixed(PRECISION.PRICE);
}

/**
 * Format return percentage for display
 * 格式化收益率百分比用于显示
 */
export function formatReturnPct(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = roundReturnPct(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(PRECISION.RETURN_PCT)}%`;
}

/**
 * Format ratio for display
 * 格式化比率用于显示
 */
export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  if (value === Infinity) return "∞";
  if (value === -Infinity) return "-∞";
  return roundRatio(value).toFixed(PRECISION.RATIO);
}

// =============================================================================
// BASIC STATISTICS / 基础统计函数
// =============================================================================

/**
 * Calculate arithmetic mean
 * 计算算术平均值
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * Calculate median
 * 计算中位数
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left === undefined || right === undefined) return 0;
    return (left + right) / 2;
  }

  return sorted[mid] ?? 0;
}

/**
 * Calculate variance
 * 计算方差
 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = average(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return average(squaredDiffs);
}

/**
 * Calculate standard deviation
 * 计算标准差
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Calculate percentile
 * 计算百分位数
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return values[0] ?? 0;
  if (p >= 100) return values[values.length - 1] ?? 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? 0;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

/**
 * Calculate sum
 * 计算总和
 */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

// =============================================================================
// RETURN DISTRIBUTION / 收益分布
// =============================================================================

/**
 * Default distribution ranges (percentage)
 * 默认分布范围 (百分比)
 */
const DEFAULT_RETURN_RANGES = [
  { start: -Infinity, end: -10, label: "<-10%" },
  { start: -10, end: -7, label: "-10~-7%" },
  { start: -7, end: -5, label: "-7~-5%" },
  { start: -5, end: -3, label: "-5~-3%" },
  { start: -3, end: -1, label: "-3~-1%" },
  { start: -1, end: 0, label: "-1~0%" },
  { start: 0, end: 1, label: "0~1%" },
  { start: 1, end: 3, label: "1~3%" },
  { start: 3, end: 5, label: "3~5%" },
  { start: 5, end: 7, label: "5~7%" },
  { start: 7, end: 10, label: "7~10%" },
  { start: 10, end: Infinity, label: ">10%" },
];

/**
 * Calculate return distribution
 * 计算收益分布
 *
 * @param returns - Array of return percentages
 * @param customRanges - Optional custom ranges
 * @returns Array of distribution buckets
 */
export function calculateReturnDistribution(
  returns: number[],
  customRanges?: Array<{ start: number; end: number; label: string }>,
): ReturnDistributionBucket[] {
  const ranges = customRanges ?? DEFAULT_RETURN_RANGES;
  const total = returns.length;

  if (total === 0) {
    return ranges.map((r) => ({
      range: r.label,
      rangeStart: r.start,
      rangeEnd: r.end,
      count: 0,
      percentage: 0,
    }));
  }

  return ranges.map((r) => {
    const count = returns.filter((ret) => ret >= r.start && ret < r.end).length;
    return {
      range: r.label,
      rangeStart: r.start,
      rangeEnd: r.end,
      count,
      percentage: (count / total) * 100,
    };
  });
}

// =============================================================================
// SIGNAL TIMELINE / 信号时间线
// =============================================================================

/**
 * Calculate signal timeline
 * 计算信号时间线
 *
 * Groups signals by date and calculates daily statistics.
 *
 * @param signals - Array of signal details
 * @returns Array of timeline entries sorted by date
 */
export function calculateSignalTimeline(
  signals: SignalDetail[],
): SignalTimelineEntry[] {
  if (signals.length === 0) return [];

  // Group signals by entry date
  const dateMap = new Map<
    string,
    {
      returns: number[];
      buyCount: number;
      sellCount: number;
    }
  >();

  for (const signal of signals) {
    const date = signal.entryDate;
    const existing = dateMap.get(date);

    if (existing) {
      existing.returns.push(signal.returnPct);
      if (signal.type === "buy") {
        existing.buyCount++;
      } else {
        existing.sellCount++;
      }
    } else {
      dateMap.set(date, {
        returns: [signal.returnPct],
        buyCount: signal.type === "buy" ? 1 : 0,
        sellCount: signal.type === "sell" ? 1 : 0,
      });
    }
  }

  // Convert to array and sort by date
  const timeline: SignalTimelineEntry[] = [];
  dateMap.forEach((data, date) => {
    timeline.push({
      date,
      signalCount: data.returns.length,
      avgReturn: average(data.returns),
      buyCount: data.buyCount,
      sellCount: data.sellCount,
    });
  });

  return timeline.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// =============================================================================
// PERIOD RETURN / 区间收益率
// =============================================================================

/**
 * Calculate period return from K-line data
 * 从K线数据计算区间收益率
 *
 * @param klines - K-line data array
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Period return result or null if data insufficient
 */
export function calculatePeriodReturn(
  klines: KLineData[],
  startDate: string,
  endDate: string,
): PeriodReturn | null {
  if (klines.length === 0) return null;

  const startTimestamp = new Date(startDate).getTime() / 1000;
  const endTimestamp = new Date(endDate).getTime() / 1000;

  // Find closest K-lines to start and end dates
  let startKline: KLineData | null = null;
  let endKline: KLineData | null = null;

  for (const kline of klines) {
    if (kline.time >= startTimestamp && !startKline) {
      startKline = kline;
    }
    if (kline.time <= endTimestamp) {
      endKline = kline;
    }
  }

  if (!startKline || !endKline) {
    return null;
  }

  const returnPct =
    ((endKline.close - startKline.close) / startKline.close) * 100;

  return {
    startPrice: startKline.close,
    endPrice: endKline.close,
    returnPct,
    startDate:
      new Date(startKline.time * 1000).toISOString().split("T")[0] ?? startDate,
    endDate:
      new Date(endKline.time * 1000).toISOString().split("T")[0] ?? endDate,
  };
}

// =============================================================================
// ADVANCED STATISTICS / 高级统计
// =============================================================================

/**
 * Calculate win statistics
 * 计算胜率统计
 */
export function calculateWinStats(signals: SignalDetail[]): {
  winRate: number;
  winCount: number;
  lossCount: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
} {
  const wins = signals.filter((s) => s.returnPct > 0);
  const losses = signals.filter((s) => s.returnPct <= 0);

  const winReturns = wins.map((s) => s.returnPct);
  const lossReturns = losses.map((s) => Math.abs(s.returnPct));

  const totalWin = sum(winReturns);
  const totalLoss = sum(lossReturns);
  const avgWin = average(winReturns);
  const avgLoss = average(lossReturns);

  // Apply precision to all calculated values
  return {
    winRate: roundPercentage(
      signals.length > 0 ? (wins.length / signals.length) * 100 : 0,
    ),
    winCount: wins.length,
    lossCount: losses.length,
    avgWin: roundReturnPct(avgWin),
    avgLoss: roundReturnPct(avgLoss),
    profitFactor: roundRatio(
      totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
    ),
    expectancy: roundReturnPct(
      signals.length > 0
        ? (wins.length / signals.length) * avgWin -
            (losses.length / signals.length) * avgLoss
        : 0,
    ),
  };
}

/**
 * Calculate maximum consecutive wins/losses
 * 计算最大连续盈亏次数
 */
export function calculateStreaks(signals: SignalDetail[]): {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  currentStreakType: "win" | "loss" | "none";
} {
  if (signals.length === 0) {
    return {
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreak: 0,
      currentStreakType: "none",
    };
  }

  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const signal of signals) {
    if (signal.isWin) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    }
  }

  const lastSignal = signals[signals.length - 1];
  return {
    maxConsecutiveWins: maxWins,
    maxConsecutiveLosses: maxLosses,
    currentStreak: lastSignal?.isWin ? currentWins : currentLosses,
    currentStreakType: lastSignal?.isWin ? "win" : "loss",
  };
}

/**
 * Calculate risk-adjusted returns
 * 计算风险调整后收益
 */
export function calculateRiskAdjustedReturns(
  returns: number[],
  riskFreeRate: number = 0,
): {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
} {
  if (returns.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
    };
  }

  const avgReturn = average(returns);
  const stdDev = standardDeviation(returns);

  // Sharpe Ratio
  const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

  // Sortino Ratio (uses downside deviation)
  const negativeReturns = returns.filter((r) => r < 0);
  const downsideDeviation = standardDeviation(negativeReturns);
  const sortinoRatio =
    downsideDeviation > 0
      ? (avgReturn - riskFreeRate) / downsideDeviation
      : avgReturn > 0
        ? Infinity
        : 0;

  // Max Drawdown (simplified - based on cumulative returns)
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  for (const ret of returns) {
    cumulative += ret;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Calmar Ratio
  const calmarRatio =
    maxDrawdown > 0 ? avgReturn / maxDrawdown : avgReturn > 0 ? Infinity : 0;

  // Apply precision to all calculated values
  return {
    sharpeRatio: roundRatio(sharpeRatio),
    sortinoRatio: roundRatio(sortinoRatio),
    calmarRatio: roundRatio(calmarRatio),
    maxDrawdown: roundReturnPct(maxDrawdown),
  };
}

// =============================================================================
// BENCHMARK COMPARISON / 基准对比
// =============================================================================

/**
 * Compare strategy returns with benchmark
 * 策略收益与基准对比
 */
export function compareToBenchmark(
  strategyReturns: number[],
  benchmarkReturn: number,
): {
  excessReturn: number;
  informationRatio: number;
  trackingError: number;
  beta: number;
  alpha: number;
} {
  const avgStrategyReturn = average(strategyReturns);
  const excessReturn = avgStrategyReturn - benchmarkReturn;

  // For simplified calculation, assume daily returns
  const trackingError = standardDeviation(strategyReturns);

  // Information Ratio
  const informationRatio = trackingError > 0 ? excessReturn / trackingError : 0;

  // Simplified beta and alpha (without correlation data)
  // In practice, these would require more data
  const beta = 1; // Assume market beta of 1
  const alpha = avgStrategyReturn - beta * benchmarkReturn;

  // Apply precision to all calculated values
  return {
    excessReturn: roundReturnPct(excessReturn),
    informationRatio: roundRatio(informationRatio),
    trackingError: roundReturnPct(trackingError),
    beta: roundRatio(beta),
    alpha: roundReturnPct(alpha),
  };
}
