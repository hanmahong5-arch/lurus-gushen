/**
 * Backtest Engine
 * 回测引擎
 *
 * A lightweight backtest engine that simulates trading strategies
 * based on generated strategy code and historical K-line data.
 *
 * @module lib/backtest/engine
 */

// =============================================================================
// TYPES / 类型定义
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
 * Trade record during backtest
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
 * Daily equity snapshot
 */
export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
  position: number;
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
 * Strategy signal
 */
export interface StrategySignal {
  action: "buy" | "sell" | "hold";
  size?: number; // Position size (default: all-in)
  stopLoss?: number; // Stop loss price
  takeProfit?: number; // Take profit price
  reason?: string; // Signal reason
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

/**
 * Backtest result
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
}

// =============================================================================
// INDICATOR CALCULATIONS / 指标计算
// =============================================================================

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i] ?? 0);
    } else {
      const prevEMA = result[i - 1] ?? 0;
      const currentValue = data[i] ?? 0;
      result.push((currentValue - prevEMA) * multiplier + prevEMA);
    }
  }
  return result;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(50);
      gains.push(0);
      losses.push(0);
      continue;
    }

    const change = (data[i] ?? 0) - (data[i - 1] ?? 0);
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    if (i < period) {
      result.push(50);
      continue;
    }

    const avgGain =
      gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss =
      losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): { dif: number[]; dea: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  const dif = fastEMA.map((fast, i) => fast - (slowEMA[i] ?? 0));
  const dea = calculateEMA(dif, signalPeriod);
  const histogram = dif.map((d, i) => (d - (dea[i] ?? 0)) * 2);

  return { dif, dea, histogram };
}

/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i] ?? 0;
      const variance =
        slice.reduce((sum, val) => sum + Math.pow((val ?? 0) - mean, 2), 0) /
        period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

// =============================================================================
// STRATEGY PARSER / 策略解析器
// =============================================================================

/**
 * Parse strategy code to extract parameters and conditions
 * 解析策略代码提取参数和条件
 */
export function parseStrategyCode(code: string): ParsedStrategy {
  const strategy: ParsedStrategy = {
    name: "Custom Strategy",
    params: {},
    indicators: [],
    entryCondition: "",
    exitCondition: "",
  };

  // Extract strategy name
  const nameMatch = code.match(/class\s+(\w+)/);
  if (nameMatch) {
    strategy.name = nameMatch[1] ?? "Custom Strategy";
  }

  // Extract parameters (e.g., fast_window = 5)
  const paramRegex = /(\w+_?\w*)\s*=\s*(\d+(?:\.\d+)?)/g;
  let paramMatch;
  while ((paramMatch = paramRegex.exec(code)) !== null) {
    const key = paramMatch[1];
    const value = paramMatch[2];
    if (key && value && !key.startsWith("self") && !key.includes("__")) {
      strategy.params[key] = parseFloat(value);
    }
  }

  // Detect indicators used
  if (code.includes("sma") || code.includes("均线") || code.includes("ma")) {
    strategy.indicators.push("SMA");
  }
  if (code.includes("ema")) {
    strategy.indicators.push("EMA");
  }
  if (code.includes("rsi") || code.includes("RSI")) {
    strategy.indicators.push("RSI");
  }
  if (code.includes("macd") || code.includes("MACD")) {
    strategy.indicators.push("MACD");
  }
  if (code.includes("boll") || code.includes("布林")) {
    strategy.indicators.push("BOLL");
  }

  // Extract entry condition (simplified)
  // Use case-insensitive flag only (compatible with ES5+)
  const lowerCode = code.toLowerCase();
  const buyMatch = lowerCode.match(
    /if[^;]*(fast[^;]*>[^;]*slow|rsi[^;]*<|macd[^;]*>)[^;]*buy/i,
  );
  if (buyMatch) {
    strategy.entryCondition = buyMatch[1] ?? "MA crossover";
  } else {
    strategy.entryCondition =
      strategy.indicators.length > 0
        ? `${strategy.indicators.join(" + ")} signal`
        : "Default entry";
  }

  // Extract exit condition (simplified)
  const sellMatch = lowerCode.match(
    /if[^;]*(fast[^;]*<[^;]*slow|rsi[^;]*>|macd[^;]*<)[^;]*sell/i,
  );
  if (sellMatch) {
    strategy.exitCondition = sellMatch[1] ?? "MA crossover";
  } else {
    strategy.exitCondition =
      strategy.indicators.length > 0
        ? `${strategy.indicators.join(" + ")} signal`
        : "Default exit";
  }

  return strategy;
}

// =============================================================================
// SIGNAL GENERATOR / 信号生成器
// =============================================================================

/**
 * Generate trading signal based on strategy and market data
 * 根据策略和市场数据生成交易信号
 */
function generateSignal(
  strategy: ParsedStrategy,
  klines: BacktestKline[],
  index: number,
  currentPosition: number,
  indicators: {
    sma5?: number[];
    sma10?: number[];
    sma20?: number[];
    sma60?: number[];
    rsi?: number[];
    macd?: { dif: number[]; dea: number[]; histogram: number[] };
    boll?: { upper: number[]; middle: number[]; lower: number[] };
  },
): StrategySignal {
  const prices = klines.map((k) => k.close);
  const currentPrice = prices[index] ?? 0;

  // Default signal
  let signal: StrategySignal = { action: "hold" };

  // MA Crossover Strategy
  if (
    strategy.indicators.includes("SMA") ||
    Object.keys(strategy.params).some(
      (k) => k.includes("ma") || k.includes("window"),
    )
  ) {
    const fastPeriod = strategy.params.fast_window ?? strategy.params.fast ?? 5;
    const slowPeriod =
      strategy.params.slow_window ?? strategy.params.slow ?? 20;

    const fastMA = indicators.sma5 ?? calculateSMA(prices, fastPeriod);
    const slowMA = indicators.sma20 ?? calculateSMA(prices, slowPeriod);

    const currFast = fastMA[index];
    const currSlow = slowMA[index];
    const prevFast = fastMA[index - 1];
    const prevSlow = slowMA[index - 1];

    if (
      currFast !== undefined &&
      currSlow !== undefined &&
      prevFast !== undefined &&
      prevSlow !== undefined &&
      !isNaN(currFast) &&
      !isNaN(currSlow) &&
      !isNaN(prevFast) &&
      !isNaN(prevSlow)
    ) {
      // Golden cross - buy signal
      if (
        prevFast <= prevSlow &&
        currFast > currSlow &&
        currentPosition === 0
      ) {
        signal = {
          action: "buy",
          reason: `MA金叉 (${fastPeriod}>${slowPeriod})`,
        };
      }
      // Death cross - sell signal
      else if (
        prevFast >= prevSlow &&
        currFast < currSlow &&
        currentPosition > 0
      ) {
        signal = {
          action: "sell",
          reason: `MA死叉 (${fastPeriod}<${slowPeriod})`,
        };
      }
    }
  }

  // RSI Strategy
  if (strategy.indicators.includes("RSI")) {
    const rsiPeriod =
      strategy.params.rsi_window ?? strategy.params.rsi_period ?? 14;
    const rsiBuy = strategy.params.rsi_buy ?? strategy.params.oversold ?? 30;
    const rsiSell =
      strategy.params.rsi_sell ?? strategy.params.overbought ?? 70;

    const rsi = indicators.rsi ?? calculateRSI(prices, rsiPeriod);
    const currRSI = rsi[index];
    const prevRSI = rsi[index - 1];

    if (
      currRSI !== undefined &&
      prevRSI !== undefined &&
      !isNaN(currRSI) &&
      !isNaN(prevRSI)
    ) {
      // Oversold bounce - buy signal
      if (prevRSI < rsiBuy && currRSI >= rsiBuy && currentPosition === 0) {
        signal = {
          action: "buy",
          reason: `RSI超卖反弹 (${currRSI.toFixed(1)})`,
        };
      }
      // Overbought - sell signal
      else if (currRSI > rsiSell && currentPosition > 0) {
        signal = { action: "sell", reason: `RSI超买 (${currRSI.toFixed(1)})` };
      }
    }
  }

  // MACD Strategy
  if (strategy.indicators.includes("MACD")) {
    const macd = indicators.macd ?? calculateMACD(prices);
    const currHist = macd.histogram[index];
    const prevHist = macd.histogram[index - 1];

    if (
      currHist !== undefined &&
      prevHist !== undefined &&
      !isNaN(currHist) &&
      !isNaN(prevHist)
    ) {
      // MACD histogram turns positive - buy signal
      if (prevHist <= 0 && currHist > 0 && currentPosition === 0) {
        signal = { action: "buy", reason: "MACD金叉" };
      }
      // MACD histogram turns negative - sell signal
      else if (prevHist >= 0 && currHist < 0 && currentPosition > 0) {
        signal = { action: "sell", reason: "MACD死叉" };
      }
    }
  }

  // Bollinger Bands Strategy
  if (strategy.indicators.includes("BOLL")) {
    const boll = indicators.boll ?? calculateBollingerBands(prices);
    const lower = boll.lower[index];
    const upper = boll.upper[index];

    if (
      lower !== undefined &&
      upper !== undefined &&
      !isNaN(lower) &&
      !isNaN(upper)
    ) {
      // Price touches lower band - buy signal
      if (currentPrice <= lower && currentPosition === 0) {
        signal = { action: "buy", reason: "触及布林下轨" };
      }
      // Price touches upper band - sell signal
      else if (currentPrice >= upper && currentPosition > 0) {
        signal = { action: "sell", reason: "触及布林上轨" };
      }
    }
  }

  return signal;
}

// =============================================================================
// BACKTEST ENGINE / 回测引擎
// =============================================================================

/**
 * Run backtest with given strategy and data
 * 使用给定策略和数据运行回测
 */
export async function runBacktest(
  strategyCode: string,
  klines: BacktestKline[],
  config: BacktestConfig,
): Promise<BacktestResult> {
  const startTime = Date.now();

  // Parse strategy
  const strategy = parseStrategyCode(strategyCode);

  // Initialize state
  let cash = config.initialCapital;
  let position = 0;
  let positionPrice = 0;
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  // Pre-calculate indicators
  const prices = klines.map((k) => k.close);
  const indicators = {
    sma5: calculateSMA(prices, 5),
    sma10: calculateSMA(prices, 10),
    sma20: calculateSMA(prices, 20),
    sma60: calculateSMA(prices, 60),
    rsi: calculateRSI(prices, 14),
    macd: calculateMACD(prices),
    boll: calculateBollingerBands(prices),
  };

  // Track for metrics
  let peakEquity = config.initialCapital;
  let maxDrawdown = 0;
  const dailyReturns: number[] = [];
  let prevEquity = config.initialCapital;

  // Run through each bar
  for (let i = 1; i < klines.length; i++) {
    const bar = klines[i];
    if (!bar) continue;

    const currentPrice = bar.close;

    // Generate signal
    const signal = generateSignal(strategy, klines, i, position, indicators);

    // Execute signal
    if (signal.action === "buy" && position === 0 && cash > 0) {
      // Calculate position size
      const commission = cash * config.commission;
      const slippage = currentPrice * config.slippage;
      const buyPrice = currentPrice + slippage;
      const buySize = Math.floor((cash - commission) / buyPrice);

      if (buySize > 0) {
        const cost = buySize * buyPrice + commission;
        cash -= cost;
        position = buySize;
        positionPrice = buyPrice;

        trades.push({
          id: `T${trades.length + 1}`,
          type: "buy",
          price: buyPrice,
          size: buySize,
          timestamp: bar.time,
          reason: signal.reason ?? "Buy signal",
        });
      }
    } else if (signal.action === "sell" && position > 0) {
      // Sell position
      const slippage = currentPrice * config.slippage;
      const sellPrice = currentPrice - slippage;
      const revenue = position * sellPrice;
      const commission = revenue * config.commission;

      const pnl = revenue - commission - position * positionPrice;
      const pnlPercent = (pnl / (position * positionPrice)) * 100;

      cash += revenue - commission;

      trades.push({
        id: `T${trades.length + 1}`,
        type: "sell",
        price: sellPrice,
        size: position,
        timestamp: bar.time,
        reason: signal.reason ?? "Sell signal",
        pnl,
        pnlPercent,
      });

      position = 0;
      positionPrice = 0;
    }

    // Calculate equity
    const equity = cash + position * currentPrice;

    // Track drawdown
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const drawdown = (peakEquity - equity) / peakEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    // Track daily return
    const dailyReturn = (equity - prevEquity) / prevEquity;
    dailyReturns.push(dailyReturn);
    prevEquity = equity;

    // Record equity point
    const date = new Date(bar.time * 1000).toISOString().split("T")[0] ?? "";
    equityCurve.push({
      date,
      equity,
      drawdown: drawdown * 100,
      position,
    });
  }

  // Close any remaining position at last price
  if (position > 0) {
    const lastBar = klines[klines.length - 1];
    if (lastBar) {
      const finalPrice = lastBar.close;
      const revenue = position * finalPrice;
      const commission = revenue * config.commission;
      const pnl = revenue - commission - position * positionPrice;
      cash += revenue - commission;

      trades.push({
        id: `T${trades.length + 1}`,
        type: "sell",
        price: finalPrice,
        size: position,
        timestamp: lastBar.time,
        reason: "回测结束平仓",
        pnl,
        pnlPercent: (pnl / (position * positionPrice)) * 100,
      });
    }
  }

  // Calculate final metrics
  const finalEquity = cash;
  const totalReturn =
    ((finalEquity - config.initialCapital) / config.initialCapital) * 100;

  // Calculate annualized return
  const tradingDays = klines.length;
  const years = tradingDays / 252;
  const annualizedReturn =
    years > 0
      ? (Math.pow(finalEquity / config.initialCapital, 1 / years) - 1) * 100
      : 0;

  // Calculate win rate and other trade metrics
  const completedTrades = trades.filter(
    (t) => t.type === "sell" && t.pnl !== undefined,
  );
  const winningTrades = completedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losingTrades = completedTrades.filter((t) => (t.pnl ?? 0) <= 0);

  const winRate =
    completedTrades.length > 0
      ? (winningTrades.length / completedTrades.length) * 100
      : 0;

  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0) /
        winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((sum, t) => sum + (t.pnlPercent ?? 0), 0) /
            losingTrades.length,
        )
      : 0;

  const profitFactor =
    avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  const maxSingleWin = Math.max(
    ...completedTrades.map((t) => t.pnlPercent ?? 0),
    0,
  );
  const maxSingleLoss = Math.min(
    ...completedTrades.map((t) => t.pnlPercent ?? 0),
    0,
  );

  // Calculate Sharpe ratio (simplified, using daily returns)
  const avgReturn =
    dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
  const stdReturn =
    dailyReturns.length > 1
      ? Math.sqrt(
          dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
            (dailyReturns.length - 1),
        )
      : 0;
  const sharpeRatio =
    stdReturn > 0 ? (avgReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;

  // Calculate Sortino ratio (using downside deviation)
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideDeviation =
    downsideReturns.length > 1
      ? Math.sqrt(
          downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
            downsideReturns.length,
        )
      : 0;
  const sortinoRatio =
    downsideDeviation > 0
      ? (avgReturn * 252) / (downsideDeviation * Math.sqrt(252))
      : 0;

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const trade of completedTrades) {
    if ((trade.pnl ?? 0) > 0) {
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecutiveWins) maxConsecutiveWins = currentWins;
    } else {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecutiveLosses)
        maxConsecutiveLosses = currentLosses;
    }
  }

  // Calculate average holding period
  const holdingPeriods: number[] = [];
  let lastBuyTime = 0;
  for (const trade of trades) {
    if (trade.type === "buy") {
      lastBuyTime = trade.timestamp;
    } else if (trade.type === "sell" && lastBuyTime > 0) {
      holdingPeriods.push((trade.timestamp - lastBuyTime) / 86400); // Convert to days
      lastBuyTime = 0;
    }
  }
  const avgHoldingPeriod =
    holdingPeriods.length > 0
      ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
      : 0;

  const executionTime = Date.now() - startTime;

  return {
    totalReturn,
    annualizedReturn,
    maxDrawdown: maxDrawdown * 100,
    sharpeRatio,
    sortinoRatio,
    winRate,
    totalTrades: completedTrades.length,
    profitFactor,
    avgWin,
    avgLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgHoldingPeriod,
    maxSingleWin,
    maxSingleLoss,
    equityCurve,
    trades,
    config,
    strategy,
    executionTime,
  };
}

/**
 * Generate mock K-line data for backtesting
 * 生成用于回测的模拟K线数据
 */
export function generateBacktestData(
  days: number = 365,
  startPrice: number = 100,
  volatility: number = 0.02,
): BacktestKline[] {
  const klines: BacktestKline[] = [];
  let price = startPrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    const timestamp = Math.floor((now - i * dayMs) / 1000);

    // Random walk with drift
    const drift = 0.0003; // Small positive drift
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const change = drift + randomChange;

    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    klines.push({
      time: timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return klines;
}
