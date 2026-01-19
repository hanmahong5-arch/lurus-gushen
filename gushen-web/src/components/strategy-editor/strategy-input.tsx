"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StrategyInputProps {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading?: boolean;
}

const exampleStrategies = [
  "当5日均线穿过20日均线时买入，RSI超过70时卖出",
  "如果价格突破布林带上轨，且成交量放大50%，则开多仓",
  "MACD金叉买入，死叉卖出，止损5%，止盈15%",
  "当KDJ在20以下金叉时买入，在80以上死叉时卖出",
];

export function StrategyInput({
  onGenerate,
  isLoading = false,
}: StrategyInputProps) {
  const [prompt, setPrompt] = useState("");
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;
    await onGenerate(prompt);
  }, [prompt, isLoading, onGenerate]);

  const handleExample = useCallback((example: string) => {
    setPrompt(example);
    setShowExamples(false);
  }, []);

  return (
    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <span className="text-sm font-medium text-white">
            策略描述 / Strategy Description
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition"
          >
            示例 / Examples
          </button>
        </div>
      </div>

      {/* Examples dropdown */}
      {showExamples && (
        <div className="px-4 py-3 bg-primary/30 border-b border-border">
          <p className="text-xs text-white/50 mb-2">
            点击使用示例策略 / Click to use example:
          </p>
          <div className="space-y-2">
            {exampleStrategies.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExample(example)}
                className="block w-full text-left px-3 py-2 text-sm bg-surface/50 hover:bg-surface rounded-lg text-white/80 hover:text-white transition"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="用自然语言描述你的交易策略...&#10;Describe your trading strategy in plain language..."
          className={cn(
            "w-full h-32 p-4 bg-primary/50 rounded-lg border border-border",
            "text-white placeholder:text-white/30 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50",
            "transition-all",
          )}
          disabled={isLoading}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrompt("")}
              disabled={!prompt || isLoading}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 disabled:opacity-50 transition"
            >
              清空 / Clear
            </button>
            <span className="text-xs text-white/30">
              {prompt.length} / 500 字符
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!prompt || isLoading}
              className="gap-1"
              onClick={async () => {
                if (!prompt.trim()) return;
                // Optimize the strategy description using AI
                // 使用AI优化策略描述
                const optimizedPrompt = `${prompt}\n\n请优化以上策略，添加：
1. 明确的入场和出场条件
2. 合理的止盈止损比例
3. 仓位管理建议`;
                setPrompt(optimizedPrompt);
              }}
            >
              <span>✨</span>
              AI优化
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!prompt || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
                  生成中...
                </span>
              ) : (
                "生成策略 / Generate"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
