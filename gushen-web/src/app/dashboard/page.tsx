"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { StrategyInput } from "@/components/strategy-editor/strategy-input";
import { CodePreview } from "@/components/strategy-editor/code-preview";
import { BacktestPanel } from "@/components/strategy-editor/backtest-panel";
import { StrategyTemplateList } from "@/components/strategy-editor/strategy-templates";
import { ParameterEditor } from "@/components/strategy-editor/parameter-editor";
import { AutoSaveIndicator } from "@/components/strategy-editor/auto-save-indicator";
import { DraftHistoryPanel } from "@/components/strategy-editor/draft-history-panel";
import { StrategyGuideCard } from "@/components/strategy-editor/strategy-guide-card";
import { AIStrategyAssistant } from "@/components/strategy-editor/ai-strategy-assistant";
import { parseStrategyParameters, updateParameterInCode } from "@/lib/strategy/parameter-parser";
import {
  useStrategyWorkspaceStore,
  selectWorkspace,
  selectAutoSaveStatus,
  selectHasUnsavedChanges,
  selectStrategyInput,
  selectGeneratedCode,
  selectIsGenerating,
  selectIsBacktesting,
} from "@/lib/stores/strategy-workspace-store";

export default function DashboardPage() {
  // ✨ Use Zustand store instead of useState for persistent state
  // 使用Zustand store替代useState以实现持久化状态
  const workspace = useStrategyWorkspaceStore(selectWorkspace);
  const autoSaveStatus = useStrategyWorkspaceStore(selectAutoSaveStatus);
  const hasUnsavedChanges = useStrategyWorkspaceStore(selectHasUnsavedChanges);
  const strategyInput = useStrategyWorkspaceStore(selectStrategyInput);
  const generatedCode = useStrategyWorkspaceStore(selectGeneratedCode);
  const isGenerating = useStrategyWorkspaceStore(selectIsGenerating);
  const isBacktesting = useStrategyWorkspaceStore(selectIsBacktesting);

  const {
    updateStrategyInput,
    updateGeneratedCode,
    setGenerating,
    setGenerationError,
    setBacktesting,
    saveDraft,
    markAsUnsaved,
  } = useStrategyWorkspaceStore();

  // Local error state (not persisted)
  // 本地错误状态（不持久化）
  const [error, setError] = useState<string | null>(null);

  // Code-parameter linkage state / 代码-参数联动状态
  const [focusedLine, setFocusedLine] = useState<number | null>(null);

  // Calculate current workflow step (Phase 4 UX enhancement)
  // 计算当前工作流步骤（Phase 4用户体验增强）
  const currentWorkflowStep = useMemo(() => {
    if (!generatedCode) return "strategy"; // No code yet, user is defining strategy
    if (!workspace.lastBacktestResult) return "parameters"; // Code generated, adjusting parameters
    return "backtest"; // Has backtest result, analyzing results
    // "validation" step is on strategy-validation page
  }, [generatedCode, workspace.lastBacktestResult]);

  // Parse current parameters from generated code for AI assistant
  // 从生成的代码中解析当前参数供AI助手使用
  const currentParameters = useMemo(() => {
    if (!generatedCode) return [];
    const parseResult = parseStrategyParameters(generatedCode);
    return parseResult.parameters.map((p) => ({
      name: p.name,
      value: p.value,
    }));
  }, [generatedCode]);

  // Ref to StrategyInput for focusing after template selection
  // 用于模板选择后聚焦到输入框
  const strategyInputRef = useRef<HTMLDivElement>(null);

  // Ref for backtest panel to trigger rerun
  const backtestPanelRef = useRef<{ runBacktest: () => void } | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // ✨ Auto-save mechanism - debounced 3 seconds
  // 自动保存机制 - 3秒防抖
  useEffect(() => {
    if (workspace.autoSaveStatus === 'unsaved') {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        console.log('[Dashboard] Auto-saving draft...');
        saveDraft();
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [workspace.autoSaveStatus, saveDraft]);

  // ✨ Warn before leaving page if there are unsaved changes
  // 如果有未保存的更改，离开页面前警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ✨ Save draft before Next.js route change
  // Next.js路由切换前保存草稿
  useEffect(() => {
    const handleRouteChange = () => {
      if (hasUnsavedChanges) {
        console.log('[Dashboard] Saving before route change...');
        saveDraft();
      }
    };

    // Note: In Next.js App Router, route change detection is different
    // This is a fallback mechanism, the main protection is beforeunload
    // 注意：在Next.js App Router中，路由变化检测方式不同
    // 这是一个后备机制，主要保护是beforeunload

    return () => {
      // Cleanup - save before unmount
      if (hasUnsavedChanges) {
        saveDraft();
      }
    };
  }, [hasUnsavedChanges, saveDraft]);

  const handleGenerate = useCallback(async (prompt: string) => {
    setGenerating(true);
    updateGeneratedCode("");
    setError(null);
    setGenerationError(null);
    updateStrategyInput(prompt);

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
        updateGeneratedCode(data.code);
        // ✨ Immediately save draft after code generation
        // 代码生成后立即保存草稿
        setTimeout(() => saveDraft(), 0);
      } else {
        throw new Error("No code generated");
      }
    } catch (err) {
      console.error("Generation error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMsg);
      setGenerationError(errorMsg);

      // Fallback to mock code if API fails
      // 如果 API 失败，使用模拟代码作为后备
      const fallbackCode = generateFallbackCode(prompt);
      updateGeneratedCode(fallbackCode);
    } finally {
      setGenerating(false);
    }
  }, [updateStrategyInput, updateGeneratedCode, setGenerating, setGenerationError, saveDraft]);

  // Handle template selection - fill into input
  // 处理模板选择 - 填充到输入框
  const handleSelectTemplate = useCallback((prompt: string) => {
    updateStrategyInput(prompt);
    // Scroll to input area
    // 滚动到输入区域
    strategyInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [updateStrategyInput]);

  // Handle code update from parameter editor
  // 处理参数编辑器的代码更新
  const handleCodeUpdate = useCallback((newCode: string) => {
    updateGeneratedCode(newCode);
  }, [updateGeneratedCode]);

  // Handle rerun backtest request
  // 处理重新回测请求
  const handleRerunBacktest = useCallback(() => {
    backtestPanelRef.current?.runBacktest();
  }, []);

  // Handle backtest state changes
  // 处理回测状态变化
  const handleBacktestStart = useCallback(() => {
    setBacktesting(true);
  }, [setBacktesting]);

  const handleBacktestEnd = useCallback(() => {
    setBacktesting(false);
  }, [setBacktesting]);

  // Handle AI assistant single parameter application
  // 处理AI助手单个参数应用
  const handleApplyAIParameter = useCallback(
    (name: string, value: number | string | boolean) => {
      if (!generatedCode) return;
      const updatedCode = updateParameterInCode(generatedCode, name, value);
      if (updatedCode !== generatedCode) {
        updateGeneratedCode(updatedCode);
        markAsUnsaved();
      }
    },
    [generatedCode, updateGeneratedCode, markAsUnsaved]
  );

  // Handle AI assistant all suggestions application
  // 处理AI助手批量应用所有建议
  const handleApplyAllAISuggestions = useCallback(
    (suggestions: Array<{ name: string; value: number | string | boolean }>) => {
      if (!generatedCode || suggestions.length === 0) return;

      let updatedCode = generatedCode;
      for (const suggestion of suggestions) {
        updatedCode = updateParameterInCode(
          updatedCode,
          suggestion.name,
          suggestion.value
        );
      }

      if (updatedCode !== generatedCode) {
        updateGeneratedCode(updatedCode);
        markAsUnsaved();
        // Trigger backtest after applying all suggestions
        // 应用所有建议后触发回测
        setTimeout(() => {
          handleRerunBacktest();
        }, 100);
      }
    },
    [generatedCode, updateGeneratedCode, markAsUnsaved, handleRerunBacktest]
  );

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
                href="/dashboard/strategy-validation"
                className="text-white/60 hover:text-white text-sm transition"
              >
                策略验证
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
              {/* ✨ Auto-save indicator / 自动保存指示器 */}
              <AutoSaveIndicator
                status={autoSaveStatus}
                lastSavedAt={workspace.lastSavedAt}
                onClick={() => {
                  if (autoSaveStatus === 'error') {
                    saveDraft();
                  }
                }}
              />
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
            用自然语言描述你的交易策略，AI 将自动生成可执行的 VeighNa
            策略代码，支持参数微调和回测验证
          </p>
        </div>

        {/* Strategy Guide Card (Phase 4 UX enhancement) */}
        <StrategyGuideCard currentStep={currentWorkflowStep} className="mb-6" />

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-loss/10 border border-loss/30 rounded-lg">
            <p className="text-loss text-sm">
              ⚠️ API 调用失败，使用本地模拟生成: {error}
            </p>
          </div>
        )}

        {/* Editor grid - 3 columns on large screens */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Input */}
          <div className="space-y-6" ref={strategyInputRef}>
            <StrategyInput
              onGenerate={handleGenerate}
              isLoading={isGenerating}
              value={strategyInput}
              onChange={updateStrategyInput}
            />

            {/* Parameter Editor - shows when code is generated */}
            {generatedCode && (
              <ParameterEditor
                code={generatedCode}
                onCodeUpdate={handleCodeUpdate}
                onRerunBacktest={handleRerunBacktest}
                isBacktesting={isBacktesting}
                onParameterFocus={setFocusedLine}
              />
            )}

            {/* Draft History Panel / 草稿历史面板 */}
            <DraftHistoryPanel />
          </div>

          {/* Middle column - Code preview with collapse and line highlight */}
          <div>
            <CodePreview
              code={generatedCode}
              isLoading={isGenerating}
              collapsible={true}
              highlightedLine={focusedLine}
              onHighlightClear={() => setFocusedLine(null)}
            />
          </div>

          {/* Right column - Backtest + AI Assistant */}
          <div className="space-y-6">
            <BacktestPanel
              strategyCode={generatedCode}
              onBacktestStart={handleBacktestStart}
              onBacktestEnd={handleBacktestEnd}
            />

            {/* AI Strategy Assistant - shows when code is generated */}
            {generatedCode && (
              <AIStrategyAssistant
                strategyCode={generatedCode}
                backtestResult={workspace.lastBacktestResult ?? undefined}
                currentParameters={currentParameters}
                onApplyParameter={handleApplyAIParameter}
                onApplyAllSuggestions={handleApplyAllAISuggestions}
              />
            )}
          </div>
        </div>

        {/* Strategy Templates Section / 策略模板区域 */}
        <div className="mt-8 p-6 bg-surface border border-border rounded-xl">
          <StrategyTemplateList onSelectTemplate={handleSelectTemplate} />
        </div>

        {/* Tips / 使用提示 */}
        <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <h3 className="text-sm font-medium text-accent mb-3">
            💡 使用指南 / Usage Guide
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-white/60">
            <div className="space-y-2">
              <h4 className="text-white/80 font-medium">📝 描述策略</h4>
              <ul className="space-y-1 pl-4">
                <li>• 使用具体的技术指标名称：均线、RSI、MACD、布林带等</li>
                <li>• 明确买入/卖出条件和触发时机</li>
                <li>• 指定参数范围：周期、阈值、止损比例</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-white/80 font-medium">⚙️ 参数调优</h4>
              <ul className="space-y-1 pl-4">
                <li>• 生成代码后可视化编辑参数</li>
                <li>• 实时预览参数变化对代码的影响</li>
                <li>• 支持快速重新回测验证效果</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-white/80 font-medium">📊 回测验证</h4>
              <ul className="space-y-1 pl-4">
                <li>• 选择不同时间周期和日期范围</li>
                <li>• 关注夏普比率、最大回撤等风险指标</li>
                <li>• 实盘前建议多周期、多品种测试</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Risk Disclaimer / 风险提示 */}
        <div className="mt-4 p-4 bg-loss/5 border border-loss/20 rounded-xl">
          <h3 className="text-sm font-medium text-loss mb-2">
            ⚠️ 风险提示 / Risk Disclaimer
          </h3>
          <p className="text-xs text-white/50 leading-relaxed">
            本工具生成的策略代码仅供学习研究使用，不构成任何投资建议。量化交易存在市场风险，
            历史回测结果不代表未来收益。请在充分了解相关风险的前提下，谨慎决策。
            The strategies generated are for educational purposes only. Past
            performance does not guarantee future results.
          </p>
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
