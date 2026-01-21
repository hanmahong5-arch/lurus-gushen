"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EnhancedTradeCard } from "./enhanced-trade-card";
import { BacktestBasisPanel } from "./backtest-basis-panel";
import type { BacktestResult, DetailedTrade } from "@/lib/backtest/types";

// =============================================================================
// TYPES / 类型定义
// =============================================================================

// Note: BacktestResult is now imported from @/lib/backtest/types
// This includes all fields needed for the enhanced UX (Phase 1):
// - backtestMeta for transparency
// - config, executionTime, etc.

interface BacktestConfig {
  symbol: string;
  initialCapital: number;
  commission: number;
  slippage: number;
  startDate: string;
  endDate: string;
  timeframe: "1d" | "1w" | "60m" | "30m" | "15m" | "5m" | "1m";
}

interface BacktestPanelProps {
  strategyCode: string;
  result?: BacktestResult;
  isRunning?: boolean;
  onRunBacktest?: (config: BacktestConfig) => Promise<void>;
  /** Callback when backtest starts / 回测开始时的回调 */
  onBacktestStart?: () => void;
  /** Callback when backtest ends / 回测结束时的回调 */
  onBacktestEnd?: () => void;
}

// =============================================================================
// CONSTANTS / 常量
// =============================================================================

const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "1分钟", labelEn: "1min" },
  { value: "5m", label: "5分钟", labelEn: "5min" },
  { value: "15m", label: "15分钟", labelEn: "15min" },
  { value: "30m", label: "30分钟", labelEn: "30min" },
  { value: "60m", label: "1小时", labelEn: "1hour" },
  { value: "1d", label: "日线", labelEn: "Daily" },
  { value: "1w", label: "周线", labelEn: "Weekly" },
] as const;

const PRESET_PERIODS = [
  { label: "1个月", days: 30 },
  { label: "3个月", days: 90 },
  { label: "6个月", days: 180 },
  { label: "1年", days: 365 },
  { label: "2年", days: 730 },
  { label: "3年", days: 1095 },
] as const;

// =============================================================================
// HELPER FUNCTIONS / 辅助函数
// =============================================================================

function getDefaultDates(days: number = 365): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split("T")[0] ?? "",
    endDate: endDate.toISOString().split("T")[0] ?? "",
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("zh-CN");
}

// =============================================================================
// COMPONENT / 组件
// =============================================================================

export function BacktestPanel({
  strategyCode,
  result: externalResult,
  isRunning: externalIsRunning = false,
  onRunBacktest,
  onBacktestStart,
  onBacktestEnd,
}: BacktestPanelProps) {
  // Config state
  const defaultDates = getDefaultDates(365);
  const [config, setConfig] = useState<BacktestConfig>({
    symbol: "模拟数据",
    initialCapital: 100000,
    commission: 0.0003,
    slippage: 0.001,
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
    timeframe: "1d",
  });

  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayResult = externalResult ?? result;
  const running = externalIsRunning || isRunning;

  /**
   * Set date range from preset
   */
  const setPresetPeriod = (days: number) => {
    const dates = getDefaultDates(days);
    setConfig((prev) => ({
      ...prev,
      startDate: dates.startDate,
      endDate: dates.endDate,
    }));
  };

  /**
   * Run backtest
   */
  const handleRunBacktest = useCallback(async () => {
    if (!strategyCode) {
      setError("请先生成策略代码 / Please generate strategy code first");
      return;
    }

    setIsRunning(true);
    setError(null);
    onBacktestStart?.();

    try {
      if (onRunBacktest) {
        await onRunBacktest(config);
      } else {
        // Call API directly
        const response = await fetch("/api/backtest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyCode,
            config: {
              ...config,
              symbol: config.symbol === "模拟数据" ? "mock" : config.symbol,
            },
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setResult(data.data);
        } else {
          setError(data.error ?? "回测失败 / Backtest failed");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "回测出错 / Backtest error",
      );
    } finally {
      setIsRunning(false);
      onBacktestEnd?.();
    }
  }, [strategyCode, config, onRunBacktest, onBacktestStart, onBacktestEnd]);

  /**
   * Export backtest report
   */
  const handleExport = () => {
    if (!displayResult) return;

    const report = {
      generatedAt: new Date().toISOString(),
      platform: "GuShen AI Trading",
      config,
      strategy: displayResult.strategy,
      results: {
        totalReturn: displayResult.totalReturn,
        annualizedReturn: displayResult.annualizedReturn,
        maxDrawdown: displayResult.maxDrawdown,
        sharpeRatio: displayResult.sharpeRatio,
        sortinoRatio: displayResult.sortinoRatio,
        winRate: displayResult.winRate,
        totalTrades: displayResult.totalTrades,
        profitFactor: displayResult.profitFactor,
        avgWin: displayResult.avgWin,
        avgLoss: displayResult.avgLoss,
        maxSingleWin: displayResult.maxSingleWin,
        maxSingleLoss: displayResult.maxSingleLoss,
      },
      trades: displayResult.trades,
      equityCurve: displayResult.equityCurve,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-medium text-white">
            回测结果 / Backtest Results
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="text-white/60 hover:text-white"
          >
            ⚙️ 设置
          </Button>
          <Button
            size="sm"
            onClick={handleRunBacktest}
            disabled={running || !strategyCode}
            className="gap-1"
          >
            {running ? (
              <>
                <span className="w-3 h-3 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
                回测中...
              </>
            ) : (
              <>
                <span>▶</span>
                运行回测
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="p-4 bg-primary/30 border-b border-border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Timeframe */}
            <div>
              <label className="block text-xs text-white/50 mb-1">
                时间颗粒度 / Timeframe
              </label>
              <select
                value={config.timeframe}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    timeframe: e.target.value as BacktestConfig["timeframe"],
                  }))
                }
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              >
                {TIMEFRAME_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-surface"
                  >
                    {opt.label} ({opt.labelEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Capital */}
            <div>
              <label className="block text-xs text-white/50 mb-1">
                初始资金 / Capital
              </label>
              <input
                type="number"
                value={config.initialCapital}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    initialCapital: parseInt(e.target.value) || 100000,
                  }))
                }
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs text-white/50 mb-2">
              回测区间 / Date Range
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_PERIODS.map((period) => (
                <button
                  key={period.days}
                  onClick={() => setPresetPeriod(period.days)}
                  className="px-2 py-1 text-xs rounded bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  {period.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={config.startDate}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              />
              <input
                type="date"
                value={config.endDate}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <details className="text-xs">
            <summary className="text-white/50 cursor-pointer hover:text-white">
              高级设置 / Advanced
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-white/40 mb-1">手续费率</label>
                <input
                  type="number"
                  step="0.0001"
                  value={config.commission}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      commission: parseFloat(e.target.value) || 0.0003,
                    }))
                  }
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-white/40 mb-1">滑点率</label>
                <input
                  type="number"
                  step="0.0001"
                  value={config.slippage}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      slippage: parseFloat(e.target.value) || 0.001,
                    }))
                  }
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-loss/10 border-b border-loss/30">
          <p className="text-sm text-loss">⚠️ {error}</p>
        </div>
      )}

      {/* Results */}
      <div className="p-4">
        {running ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-3 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
            <span className="text-white/50">正在运行回测...</span>
            <span className="text-xs text-white/30 mt-1">
              处理 {config.startDate} 至 {config.endDate} 的数据
            </span>
          </div>
        ) : displayResult ? (
          <>
            {/* Strategy Info */}
            {displayResult.strategy && (
              <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-accent">
                      {displayResult.strategy.name}
                    </span>
                    <span className="text-xs text-white/40 ml-2">
                      {displayResult.strategy.indicators.join(" + ")}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    {Object.entries(displayResult.strategy.params)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ")}
                  </div>
                </div>
              </div>
            )}

            {/* Backtest Basis Panel - Show data source and configuration transparency */}
            <BacktestBasisPanel result={displayResult} className="mb-4" />

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                label="总收益率"
                labelEn="Total Return"
                value={`${displayResult.totalReturn >= 0 ? "+" : ""}${displayResult.totalReturn.toFixed(2)}%`}
                valueColor={
                  displayResult.totalReturn >= 0 ? "text-profit" : "text-loss"
                }
                highlight
              />
              <MetricCard
                label="年化收益"
                labelEn="Annualized"
                value={`${displayResult.annualizedReturn >= 0 ? "+" : ""}${displayResult.annualizedReturn.toFixed(1)}%`}
                valueColor={
                  displayResult.annualizedReturn >= 0
                    ? "text-profit"
                    : "text-loss"
                }
              />
              <MetricCard
                label="最大回撤"
                labelEn="Max Drawdown"
                value={`-${Math.abs(displayResult.maxDrawdown).toFixed(1)}%`}
                valueColor="text-loss"
              />
              <MetricCard
                label="夏普比率"
                labelEn="Sharpe Ratio"
                value={displayResult.sharpeRatio.toFixed(2)}
                valueColor={
                  displayResult.sharpeRatio >= 1 ? "text-profit" : "text-white"
                }
              />
              <MetricCard
                label="胜率"
                labelEn="Win Rate"
                value={`${displayResult.winRate.toFixed(1)}%`}
                valueColor={
                  displayResult.winRate >= 50 ? "text-profit" : "text-loss"
                }
              />
              <MetricCard
                label="交易次数"
                labelEn="Total Trades"
                value={displayResult.totalTrades.toString()}
                valueColor="text-white"
              />
            </div>

            {/* Detailed Stats */}
            {showDetails && (
              <div className="mt-4 p-4 bg-primary/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-white mb-3">
                  详细统计 / Detailed Stats
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">盈利因子</span>
                    <span className="text-white">
                      {(displayResult.profitFactor ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">索提诺比率</span>
                    <span className="text-white">
                      {(displayResult.sortinoRatio ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">平均盈利</span>
                    <span className="text-profit">
                      +{(displayResult.avgWin ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">平均亏损</span>
                    <span className="text-loss">
                      -{(displayResult.avgLoss ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">最大连胜</span>
                    <span className="text-profit">
                      {displayResult.maxConsecutiveWins ?? 0}次
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">最大连亏</span>
                    <span className="text-loss">
                      {displayResult.maxConsecutiveLosses ?? 0}次
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">最大单笔盈利</span>
                    <span className="text-profit">
                      +{(displayResult.maxSingleWin ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">最大单笔亏损</span>
                    <span className="text-loss">
                      {(displayResult.maxSingleLoss ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">平均持仓时间</span>
                    <span className="text-white">
                      {(displayResult.avgHoldingPeriod ?? 0).toFixed(1)}天
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trade List - Enhanced with detailed information (Phase 14 UX) */}
            {showTrades &&
              displayResult.trades &&
              displayResult.trades.length > 0 && (
                <div className="mt-4 p-4 bg-primary/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">
                      交易记录 / Trade History
                    </h4>
                    <span className="text-xs text-white/40">
                      共 {displayResult.trades.length} 笔交易（最近20笔）
                    </span>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto space-y-3">
                    {(() => {
                      try {
                        // Use enhanced trades if available (DetailedTrade[])
                        const tradesToDisplay = displayResult.enhanced?.trades ?? displayResult.trades;

                        // Validate trades array
                        if (!Array.isArray(tradesToDisplay) || tradesToDisplay.length === 0) {
                          return (
                            <div className="text-center text-white/40 py-4">
                              暂无交易记录
                            </div>
                          );
                        }

                        // Safe slice and map with validation
                        return tradesToDisplay
                          .slice(-20)
                          .filter(trade => trade && typeof trade === "object")
                          .map((trade, index) => {
                            try {
                              // Generate safe key
                              const safeKey = trade.id || `trade-${index}`;

                              // Check if trade has DetailedTrade structure
                              const isDetailedTrade =
                                trade &&
                                typeof trade === "object" &&
                                "triggerReason" in trade &&
                                "indicatorValues" in trade &&
                                "cashBefore" in trade;

                              // If trade has detailed structure, use EnhancedTradeCard
                              if (isDetailedTrade) {
                                return (
                                  <EnhancedTradeCard
                                    key={safeKey}
                                    trade={trade as unknown as DetailedTrade}
                                    onError={(error) => {
                                      console.error("[BacktestPanel] EnhancedTradeCard error:", error);
                                    }}
                                  />
                                );
                              }

                              // Fallback to legacy display for backward compatibility
                              // Validate legacy trade fields
                              const displayPrice = typeof trade.price === "number" && isFinite(trade.price)
                                ? trade.price
                                : 0;
                              const displayQty = typeof trade.size === "number" && isFinite(trade.size)
                                ? trade.size
                                : 0;
                              const unit = "股";
                              const tradeType = trade.type === "buy" || trade.type === "sell" ? trade.type : "buy";
                              const pnlPercent = typeof trade.pnlPercent === "number" && isFinite(trade.pnlPercent)
                                ? trade.pnlPercent
                                : null;
                              const reason = typeof trade.reason === "string" ? trade.reason : null;

                              return (
                                <div
                                  key={safeKey}
                                  className={cn(
                                    "p-2 rounded text-xs",
                                    tradeType === "buy" ? "bg-profit/10" : "bg-loss/10"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "font-medium px-1.5 py-0.5 rounded",
                                          tradeType === "buy"
                                            ? "text-profit bg-profit/20"
                                            : "text-loss bg-loss/20"
                                        )}
                                      >
                                        {tradeType === "buy" ? "买入" : "卖出"}
                                      </span>
                                    </div>
                                    {pnlPercent !== null && (
                                      <span
                                        className={cn(
                                          "font-medium",
                                          pnlPercent >= 0 ? "text-profit" : "text-loss"
                                        )}
                                      >
                                        {pnlPercent >= 0 ? "+" : ""}
                                        {pnlPercent.toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-white/60">
                                    ¥{displayPrice.toFixed(2)} × {displayQty.toLocaleString()}{unit}
                                    {reason && (
                                      <span className="ml-2 text-white/40">{reason}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            } catch (tradeError) {
                              console.error("[BacktestPanel] Trade render error:", tradeError, trade);
                              return (
                                <div key={`error-${index}`} className="p-2 rounded text-xs bg-error/10 border border-error/20">
                                  <span className="text-error text-xs">交易记录渲染失败</span>
                                </div>
                              );
                            }
                          });
                      } catch (error) {
                        console.error("[BacktestPanel] Trades display error:", error);
                        return (
                          <div className="text-center text-error py-4">
                            交易记录加载失败
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "收起" : "详情"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowTrades(!showTrades)}
              >
                {showTrades ? "隐藏" : "交易记录"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleExport}
              >
                导出
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-white/40">
            <p>点击"运行回测"开始测试策略</p>
            <p className="text-xs mt-1">
              Click "Run Backtest" to test your strategy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS / 子组件
// =============================================================================

interface MetricCardProps {
  label: string;
  labelEn: string;
  value: string;
  valueColor?: string;
  highlight?: boolean;
}

function MetricCard({
  label,
  labelEn,
  value,
  valueColor = "text-white",
  highlight = false,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg",
        highlight ? "bg-accent/10 border border-accent/30" : "bg-primary/30",
      )}
    >
      <div className="text-xs text-white/50 mb-1">
        {label}
        <span className="block text-white/30">{labelEn}</span>
      </div>
      <div className={cn("text-xl font-bold", valueColor)}>{value}</div>
    </div>
  );
}
