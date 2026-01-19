"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { StrategyInput } from "@/components/strategy-editor/strategy-input";
import { CodePreview } from "@/components/strategy-editor/code-preview";
import { BacktestPanel } from "@/components/strategy-editor/backtest-panel";

export default function DashboardPage() {
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setGeneratedCode("");
    setError(null);

    try {
      // Call real API endpoint
      // 调用真实的 API 端点
      const response = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      // Handle non-JSON responses (e.g., 503 "no available server")
      // 处理非JSON响应
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.details || "Failed to generate strategy",
        );
      }

      if (data.success && data.code) {
        setGeneratedCode(data.code);
      } else {
        throw new Error("No code generated");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");

      // Fallback to mock code if API fails
      // 如果 API 失败，使用模拟代码作为后备
      const fallbackCode = generateFallbackCode(prompt);
      setGeneratedCode(fallbackCode);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleBacktest = useCallback(async () => {
    setIsBacktesting(true);
    // Simulate backtest delay - TODO: implement real backtest
    // 模拟回测延迟 - TODO: 实现真实回测
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsBacktesting(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-400 flex items-center justify-center">
                <span className="text-primary-600 font-bold">G</span>
              </div>
              <span className="text-lg font-bold text-white">
                GuShen<span className="text-accent">.</span>
              </span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-accent text-sm font-medium"
              >
                策略编辑器
              </Link>
              <Link
                href="/dashboard/advisor"
                className="text-white/60 hover:text-white text-sm transition"
              >
                投资顾问
              </Link>
              <Link
                href="/dashboard/trading"
                className="text-white/60 hover:text-white text-sm transition"
              >
                交易面板
              </Link>
              <Link
                href="/dashboard/history"
                className="text-white/60 hover:text-white text-sm transition"
              >
                历史记录
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">演示账户</span>
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-sm">D</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            AI 策略生成器
            <span className="text-base font-normal text-white/50 ml-2">
              / AI Strategy Generator
            </span>
          </h1>
          <p className="text-white/60">
            用自然语言描述你的交易策略，AI 将自动生成可执行的 VeighNa 策略代码
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-loss/10 border border-loss/30 rounded-lg">
            <p className="text-loss text-sm">
              ⚠️ API 调用失败，使用本地模拟生成: {error}
            </p>
          </div>
        )}

        {/* Editor grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column - Input and results */}
          <div className="space-y-6">
            <StrategyInput
              onGenerate={handleGenerate}
              isLoading={isGenerating}
            />
            <BacktestPanel
              strategyCode={generatedCode}
              onRunBacktest={handleBacktest}
              isRunning={isBacktesting}
            />
          </div>

          {/* Right column - Code preview */}
          <div>
            <CodePreview code={generatedCode} isLoading={isGenerating} />
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <h3 className="text-sm font-medium text-accent mb-2">
            💡 提示 / Tips
          </h3>
          <ul className="text-sm text-white/60 space-y-1">
            <li>• 尝试描述具体的技术指标，如 "5日均线"、"RSI"、"MACD" 等</li>
            <li>• 可以包含买入卖出条件、止盈止损比例等参数</li>
            <li>• 生成的代码基于 VeighNa 框架，可直接用于实盘交易</li>
            <li>
              • Try describing specific indicators like "5-day MA", "RSI",
              "MACD"
            </li>
          </ul>
        </div>

        {/* Powered by */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/30">
            Powered by <span className="text-accent/50">DeepSeek</span> +{" "}
            <span className="text-white/40">VeighNa</span> via{" "}
            <span className="text-white/40">Lurus API</span>
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Fallback code generator when API is unavailable
 * API 不可用时的后备代码生成器
 */
function generateFallbackCode(prompt: string): string {
  const hasMA = prompt.includes("均线") || prompt.toLowerCase().includes("ma");
  const hasRSI = prompt.includes("RSI") || prompt.includes("rsi");
  const hasMACD = prompt.includes("MACD") || prompt.includes("macd");

  let code = `"""
AI Generated Trading Strategy (Fallback Mode)
AI生成的交易策略 (离线模式)

Strategy Description / 策略描述:
${prompt}

Generated by GuShen AI / 由谷神AI生成
"""

from vnpy.trader.object import BarData
from vnpy_ctastrategy import CtaTemplate, StopOrder
from vnpy.trader.constant import Interval

class AIStrategy(CtaTemplate):
    """AI-Generated CTA Strategy"""

    author = "GuShen AI"

    # Parameters / 参数
`;

  if (hasMA) {
    code += `    fast_window = 5
    slow_window = 20
`;
  }
  if (hasRSI) {
    code += `    rsi_window = 14
    rsi_buy = 30
    rsi_sell = 70
`;
  }
  if (hasMACD) {
    code += `    macd_fast = 12
    macd_slow = 26
    macd_signal = 9
`;
  }

  code += `    fixed_size = 1

    # Variables / 变量
    inited = False
    trading = False
`;

  if (hasMA) {
    code += `    fast_ma = 0.0
    slow_ma = 0.0
`;
  }
  if (hasRSI) {
    code += `    rsi_value = 0.0
`;
  }

  code += `
    def __init__(self, cta_engine, strategy_name, vt_symbol, setting):
        super().__init__(cta_engine, strategy_name, vt_symbol, setting)

    def on_bar(self, bar: BarData):
        """Process new bar data / 处理新K线数据"""
        if not self.inited:
            return
`;

  if (hasMA) {
    code += `
        # Calculate moving averages / 计算均线
        am = self.cta_engine.get_am(self.vt_symbol)
        self.fast_ma = am.sma(self.fast_window)
        self.slow_ma = am.sma(self.slow_window)

        # MA crossover signal / 均线交叉信号
        if self.fast_ma > self.slow_ma and self.pos == 0:
            self.buy(bar.close_price, self.fixed_size)
        elif self.fast_ma < self.slow_ma and self.pos > 0:
            self.sell(bar.close_price, abs(self.pos))
`;
  }

  if (hasRSI) {
    code += `
        # Calculate RSI / 计算RSI
        am = self.cta_engine.get_am(self.vt_symbol)
        self.rsi_value = am.rsi(self.rsi_window)

        # RSI signal / RSI信号
        if self.rsi_value < self.rsi_buy and self.pos == 0:
            self.buy(bar.close_price, self.fixed_size)
        elif self.rsi_value > self.rsi_sell and self.pos > 0:
            self.sell(bar.close_price, abs(self.pos))
`;
  }

  code += `
        self.put_event()
`;

  return code;
}
