/**
 * Strategy Guide Card Component
 * 策略制作指南卡片组件
 *
 * Provides educational guidance for users to understand the complete
 * strategy creation workflow, addressing user need:
 * "最终目的是让用户全流程的把控，制作出属于自己的最适合市场套利的策略"
 *
 * Features:
 * - 4-step workflow visualization (策略类型 → 参数调整 → 回测验证 → 实盘优化)
 * - Expandable detailed tips for each step
 * - Current step highlighting
 * - Can be collapsed to save space
 *
 * @module components/strategy-editor/strategy-guide-card
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

type WorkflowStep = "strategy" | "parameters" | "backtest" | "validation";

interface StrategyGuideCardProps {
  currentStep?: WorkflowStep;
  className?: string;
}

// =============================================================================
// Workflow Steps Data
// =============================================================================

const WORKFLOW_STEPS = [
  {
    id: "strategy" as WorkflowStep,
    number: 1,
    title: "选择策略类型",
    titleEn: "Choose Strategy Type",
    icon: "🎯",
    description: "根据市场环境和个人风格选择合适的策略类型",
    tips: [
      "趋势跟踪策略：适合单边上涨/下跌行情，使用均线、MACD等趋势指标",
      "均值回归策略：适合震荡市场，使用RSI、布林带等超买超卖指标",
      "突破策略：捕捉关键位突破，适合波动率扩张阶段",
      "多因子策略：结合多个指标，提高信号可靠性",
    ],
    actionTip: "💡 在策略描述中明确说明想要的策略类型和核心逻辑",
  },
  {
    id: "parameters" as WorkflowStep,
    number: 2,
    title: "调整参数",
    titleEn: "Adjust Parameters",
    icon: "⚙️",
    description: "根据回测结果和市场特性优化策略参数",
    tips: [
      "点击参数旁的 ℹ️ 图标，查看详细说明和常见取值",
      "先用推荐值进行回测，观察效果后再微调",
      "注意参数之间的关系（如快线周期应小于慢线周期）",
      "不同市场环境使用不同参数（牛市用宽松参数，熊市用保守参数）",
    ],
    actionTip: "💡 每次只调整1-2个参数，观察对结果的影响",
  },
  {
    id: "backtest" as WorkflowStep,
    number: 3,
    title: "回测验证",
    titleEn: "Backtest Validation",
    icon: "📊",
    description: "在历史数据上测试策略表现，评估盈利能力和风险",
    tips: [
      "查看回测依据面板，确认测试数据的质量和来源",
      "关注核心指标：总收益率、最大回撤、夏普比率、胜率",
      "查看交易记录，理解每笔交易的触发原因和盈亏",
      "好的策略应该：收益稳定、回撤可控、交易次数合理（不要过度交易）",
    ],
    actionTip: "💡 单只股票测试后，再用多只股票验证策略普适性",
  },
  {
    id: "validation" as WorkflowStep,
    number: 4,
    title: "多股验证",
    titleEn: "Multi-Stock Validation",
    icon: "✅",
    description: "在多只股票上测试，验证策略的普适性和稳定性",
    tips: [
      "选择不同行业、不同特性的股票进行测试",
      "观察策略在不同股票上的表现差异",
      "警惕过拟合：在单只股票上完美，但在其他股票上失效",
      "真正优秀的策略应该在大多数股票上都有正收益",
    ],
    actionTip: "💡 使用策略验证页面，批量测试10-50只股票",
  },
];

// =============================================================================
// Component
// =============================================================================

export function StrategyGuideCard({ currentStep, className }: StrategyGuideCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<WorkflowStep | null>(null);

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "p-3 bg-primary/20 border border-border rounded-lg cursor-pointer hover:bg-primary/30 transition-colors",
          className
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span className="text-sm font-medium text-white">策略制作指南</span>
            <span className="text-xs text-white/40">Strategy Guide</span>
          </div>
          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-primary/20 border border-border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <div>
            <h3 className="text-sm font-semibold text-white">策略制作指南</h3>
            <p className="text-xs text-white/40">Strategy Creation Guide</p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-white/40 hover:text-white/60 transition-colors"
          aria-label="Collapse guide"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-3">
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isExpanded = expandedStep === step.id;
          const isPast = currentStep && WORKFLOW_STEPS.findIndex(s => s.id === currentStep) > index;

          return (
            <div
              key={step.id}
              className={cn(
                "rounded-lg border transition-all",
                isActive
                  ? "bg-accent/10 border-accent/30"
                  : isPast
                    ? "bg-profit/5 border-profit/20"
                    : "bg-background/40 border-border/50"
              )}
            >
              {/* Step Header */}
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {/* Step Number */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                      isActive
                        ? "bg-accent text-white"
                        : isPast
                          ? "bg-profit text-white"
                          : "bg-white/10 text-white/60"
                    )}
                  >
                    {isPast ? "✓" : step.number}
                  </div>

                  {/* Icon and Title */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{step.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", isActive ? "text-accent" : "text-white")}>
                          {step.title}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 bg-accent/20 text-accent text-[10px] rounded">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40">{step.titleEn}</p>
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <svg
                  className={cn(
                    "w-4 h-4 text-white/40 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-white/70 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Tips */}
                  <div className="space-y-1.5 mt-2">
                    {step.tips.map((tip, tipIndex) => (
                      <div
                        key={tipIndex}
                        className="flex items-start gap-2 text-xs text-white/60 leading-relaxed"
                      >
                        <span className="text-accent mt-0.5 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Tip */}
                  <div className="mt-3 p-2 bg-accent/10 border border-accent/20 rounded text-xs text-white/80">
                    {step.actionTip}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/30 text-xs text-white/40">
        <p>💡 提示：点击每个步骤查看详细指导 | Click each step for detailed guidance</p>
      </div>
    </div>
  );
}
