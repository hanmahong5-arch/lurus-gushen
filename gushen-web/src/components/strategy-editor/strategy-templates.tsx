/**
 * Strategy Templates Component
 * 策略模板组件
 *
 * Displays classic and popular trading strategy templates
 * with expandable cards and category filtering.
 *
 * @module components/strategy-editor/strategy-templates
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  StrategyTemplate,
  StrategyCategory,
  MarketType,
  categoryInfo,
  marketInfo,
  classicStrategies,
  popularStrategies,
  getStrategiesByCategory,
} from "@/lib/strategy-templates";

// =============================================================================
// TYPES
// =============================================================================

interface StrategyTemplateCardProps {
  strategy: StrategyTemplate;
  onUse: (prompt: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

interface StrategyTemplateListProps {
  onSelectTemplate: (prompt: string) => void;
}

// =============================================================================
// DIFFICULTY INDICATOR
// =============================================================================

/**
 * Difficulty level indicator component
 * 难度级别指示器
 */
function DifficultyStars({ level }: { level: 1 | 2 | 3 }) {
  const labels = ["入门", "进阶", "高级"];
  const colors = ["text-green-400", "text-yellow-400", "text-red-400"];

  return (
    <span className={`text-xs ${colors[level - 1]} flex items-center gap-1`}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={i < level ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
      <span className="ml-1">{labels[level - 1]}</span>
    </span>
  );
}

// =============================================================================
// MARKET TAGS
// =============================================================================

/**
 * Market type tags
 * 市场类型标签
 */
function MarketTags({ markets }: { markets: MarketType[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {markets.map((market) => (
        <span
          key={market}
          className={`text-xs px-1.5 py-0.5 rounded ${marketInfo[market].color}`}
        >
          {marketInfo[market].name}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// STRATEGY TEMPLATE CARD
// =============================================================================

/**
 * Single strategy template card component
 * 单个策略模板卡片组件
 */
function StrategyTemplateCard({
  strategy,
  onUse,
  isExpanded,
  onToggle,
}: StrategyTemplateCardProps) {
  const catInfo = categoryInfo[strategy.category];

  return (
    <div
      className={`border border-gray-700 rounded-lg bg-gray-800/50 transition-all duration-200 ${
        isExpanded ? "ring-1 ring-blue-500/50" : "hover:border-gray-600"
      }`}
    >
      {/* Collapsed Header - First Layer Info / 折叠态头部 - 第一层信息 */}
      <div
        className="p-3 cursor-pointer flex items-start justify-between gap-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          {/* Strategy Name with Icon / 策略名称和图标 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{strategy.icon}</span>
            <h3 className="font-medium text-white truncate">{strategy.name}</h3>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {strategy.nameEn}
            </span>
          </div>

          {/* Summary / 简介 */}
          <p className="text-sm text-gray-400 mb-2">{strategy.summary}</p>

          {/* Tags Row: Markets + Difficulty / 标签行：市场 + 难度 */}
          <div className="flex items-center gap-3 flex-wrap">
            <MarketTags markets={strategy.markets} />
            <DifficultyStars level={strategy.difficulty} />
          </div>
        </div>

        {/* Use Button & Expand Indicator / 使用按钮和展开指示 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse(strategy.prompt);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
          >
            使用
          </button>
          <span
            className={`text-gray-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Content - Second & Third Layer Info / 展开内容 - 第二、三层信息 */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-700/50 pt-3 space-y-3">
          {/* Category Tag / 分类标签 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">分类:</span>
            <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
              {catInfo.icon} {catInfo.name}
            </span>
          </div>

          {/* Entry/Exit Logic / 买卖逻辑 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-900/20 border border-green-800/30 rounded p-2">
              <h4 className="text-xs text-green-400 font-medium mb-1">
                📈 买入条件
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                {strategy.logic.entry.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-green-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-800/30 rounded p-2">
              <h4 className="text-xs text-red-400 font-medium mb-1">
                📉 卖出条件
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                {strategy.logic.exit.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Parameters / 参数建议 */}
          <div>
            <h4 className="text-xs text-gray-500 mb-1">⚙️ 参数建议</h4>
            <div className="flex flex-wrap gap-2">
              {strategy.params.map((param, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-300"
                >
                  {param.name}: {param.default}
                  <span className="text-gray-500 ml-1">({param.range})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Pros & Cons / 优势劣势 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs text-gray-500 mb-1">✅ 优势</h4>
              <ul className="text-xs text-gray-400 space-y-0.5">
                {strategy.pros.map((pro, idx) => (
                  <li key={idx}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">⚠️ 劣势</h4>
              <ul className="text-xs text-gray-400 space-y-0.5">
                {strategy.cons.map((con, idx) => (
                  <li key={idx}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Best For / 最佳适用 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">🎯 最佳适用:</span>
            <span className="text-blue-400">{strategy.bestFor}</span>
          </div>

          {/* Risk Warning / 风险警告 */}
          {strategy.riskWarning && (
            <div className="bg-red-900/30 border border-red-700/50 rounded p-2">
              <p className="text-xs text-red-300">
                ⚠️ <strong>风险警告:</strong> {strategy.riskWarning}
              </p>
            </div>
          )}

          {/* Action Buttons / 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onUse(strategy.prompt)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
            >
              直接使用
            </button>
            <button
              onClick={() => {
                onUse(`基于${strategy.name}策略，但做以下修改：`);
              }}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded transition-colors"
            >
              修改后使用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STRATEGY TEMPLATE LIST (MAIN COMPONENT)
// =============================================================================

/**
 * Main strategy templates list component
 * 主策略模板列表组件
 */
export function StrategyTemplateList({
  onSelectTemplate,
}: StrategyTemplateListProps) {
  // State for tab selection (classic / popular)
  const [activeTab, setActiveTab] = useState<"classic" | "popular">("classic");

  // State for category filter
  const [selectedCategory, setSelectedCategory] = useState<
    StrategyCategory | "all"
  >("all");

  // State for expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get available categories based on active tab
  const availableCategories = useMemo(() => {
    const strategies =
      activeTab === "classic" ? classicStrategies : popularStrategies;
    const cats = new Set(strategies.map((s) => s.category));
    return Array.from(cats);
  }, [activeTab]);

  // Filter strategies based on tab and category
  const filteredStrategies = useMemo(() => {
    const base =
      activeTab === "classic" ? classicStrategies : popularStrategies;
    if (selectedCategory === "all") return base;
    return base.filter((s) => s.category === selectedCategory);
  }, [activeTab, selectedCategory]);

  // Handle tab change - reset category filter
  const handleTabChange = (tab: "classic" | "popular") => {
    setActiveTab(tab);
    setSelectedCategory("all");
    setExpandedId(null);
  };

  return (
    <div className="space-y-4">
      {/* Section Header / 区域标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📚</span>
          <span>策略模板库</span>
          <span className="text-sm text-gray-500 font-normal">
            (40个经典 & 流行策略)
          </span>
        </h2>
      </div>

      {/* Tab Switcher / Tab 切换 */}
      <div className="flex items-center gap-4 border-b border-gray-700 pb-3">
        <button
          onClick={() => handleTabChange("classic")}
          className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
            activeTab === "classic"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          🏛️ 经典策略
          <span className="ml-1 text-xs opacity-70">(20)</span>
        </button>
        <button
          onClick={() => handleTabChange("popular")}
          className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
            activeTab === "popular"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          🔥 流行策略
          <span className="ml-1 text-xs opacity-70">(20)</span>
        </button>

        {/* Category Filter / 分类筛选 */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">筛选:</span>
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as StrategyCategory | "all")
            }
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">全部分类</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryInfo[cat].icon} {categoryInfo[cat].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Description / Tab 描述 */}
      <div className="text-sm text-gray-400 bg-gray-800/50 rounded p-3">
        {activeTab === "classic" ? (
          <p>
            🏛️{" "}
            <strong className="text-gray-300">经典策略</strong>
            ：源于华尔街的永恒智慧，经过数十年市场验证。这些策略基于人性的贪婪与恐惧、市场的趋势与回归等永恒规律，在股票、期货、加密货币市场中广泛适用。
          </p>
        ) : (
          <p>
            🔥{" "}
            <strong className="text-gray-300">流行策略</strong>
            ：当代交易者的智慧结晶，包括因子投资、量化套利、加密货币特有策略等。这些策略融合了现代金融理论与技术，适合不同市场环境和风险偏好。
          </p>
        )}
      </div>

      {/* Strategy Cards Grid / 策略卡片网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredStrategies.map((strategy) => (
          <StrategyTemplateCard
            key={strategy.id}
            strategy={strategy}
            onUse={onSelectTemplate}
            isExpanded={expandedId === strategy.id}
            onToggle={() =>
              setExpandedId(expandedId === strategy.id ? null : strategy.id)
            }
          />
        ))}
      </div>

      {/* Empty State / 空状态 */}
      {filteredStrategies.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>该分类下暂无策略</p>
        </div>
      )}

      {/* Usage Tips / 使用提示 */}
      <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-3 space-y-1">
        <p>
          💡 <strong>提示</strong>：点击卡片展开查看详细信息，点击"使用"将策略描述填入输入框
        </p>
        <p>
          ⚠️ <strong>风险提示</strong>
          ：策略模板仅供参考学习，实盘交易需根据实际情况调整参数，并做好风险管理
        </p>
      </div>
    </div>
  );
}

export default StrategyTemplateList;
