"use client";

/**
 * Philosophy Selector Component
 *
 * Allows users to select investment philosophy, analysis methods,
 * trading style, and specialty strategies
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type {
  AdvisorContext,
  InvestmentPhilosophy,
  AnalysisMethod,
  TradingStyle,
  SpecialtyStrategy,
} from '@/lib/advisor/agent/types';
import {
  getPhilosophyOptions,
  getAnalysisMethodOptions,
  getTradingStyleOptions,
  getSpecialtyStrategyOptions,
} from '@/lib/advisor/philosophies';
import { getMasterAgentSummaries } from '@/lib/advisor/agent/master-agents';
import { getContextSummary } from '@/lib/advisor/context-builder';

// ============================================================================
// Component Props
// ============================================================================

interface PhilosophySelectorProps {
  context: AdvisorContext;
  onChange: (context: AdvisorContext) => void;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const philosophyIcons: Record<InvestmentPhilosophy, string> = {
  value: '🏛️',
  growth: '🌱',
  trend: '📈',
  quantitative: '🔢',
  index: '📊',
  dividend: '💰',
  momentum: '🚀',
};

const methodIcons: Record<AnalysisMethod, string> = {
  fundamental: '📋',
  technical: '📉',
  macro: '🌍',
  behavioral: '🧠',
  factor: '🎯',
};

const styleIcons: Record<TradingStyle, string> = {
  scalping: '⚡',
  day_trading: '☀️',
  swing: '🌊',
  position: '🏔️',
  buy_hold: '🌳',
};

// ============================================================================
// Main Component
// ============================================================================

export function PhilosophySelector({
  context,
  onChange,
  compact = false,
  className,
}: PhilosophySelectorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    compact ? null : 'philosophy'
  );

  const philosophies = getPhilosophyOptions();
  const methods = getAnalysisMethodOptions();
  const styles = getTradingStyleOptions();
  const strategies = getSpecialtyStrategyOptions();
  const masters = getMasterAgentSummaries();
  const summary = getContextSummary(context);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handlePhilosophyChange = useCallback(
    (philosophy: InvestmentPhilosophy) => {
      onChange({ ...context, corePhilosophy: philosophy });
    },
    [context, onChange]
  );

  const handleMethodToggle = useCallback(
    (method: AnalysisMethod) => {
      const current = context.analysisMethods;
      const updated = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method].slice(0, 2); // Max 2
      onChange({ ...context, analysisMethods: updated });
    },
    [context, onChange]
  );

  const handleStyleChange = useCallback(
    (style: TradingStyle) => {
      onChange({ ...context, tradingStyle: style });
    },
    [context, onChange]
  );

  const handleStrategyToggle = useCallback(
    (strategy: SpecialtyStrategy) => {
      const current = context.specialtyStrategies;
      const updated = current.includes(strategy)
        ? current.filter((s) => s !== strategy)
        : [...current, strategy].slice(0, 2); // Max 2
      onChange({ ...context, specialtyStrategies: updated });
    },
    [context, onChange]
  );

  const handleMasterChange = useCallback(
    (masterId: string | undefined) => {
      onChange({ ...context, masterAgent: masterId });
    },
    [context, onChange]
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (compact) {
    return (
      <CompactSelector
        context={context}
        summary={summary}
        onExpand={() => setExpandedSection('philosophy')}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Bar */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/70">当前组合:</span>
          <span className="text-accent">{summary.philosophy}</span>
          {summary.methods.length > 0 && (
            <>
              <span className="text-white/30">+</span>
              <span className="text-white/80">{summary.methods.join(' + ')}</span>
            </>
          )}
          {summary.master && (
            <>
              <span className="text-white/30">+</span>
              <span className="text-amber-400">{summary.master}</span>
            </>
          )}
        </div>
        <div className="text-xs text-white/50">
          预计 Token: ~{summary.estimatedTokens}
        </div>
      </div>

      {/* Core Philosophy Section */}
      <Section
        title="核心流派"
        subtitle="选择一个主要投资流派"
        expanded={expandedSection === 'philosophy'}
        onToggle={() => toggleSection('philosophy')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {philosophies.map((p) => (
            <SelectableCard
              key={p.id}
              icon={philosophyIcons[p.id]}
              title={p.name}
              subtitle={p.nameEn}
              selected={context.corePhilosophy === p.id}
              onClick={() => handlePhilosophyChange(p.id)}
            />
          ))}
        </div>
      </Section>

      {/* Analysis Methods Section */}
      <Section
        title="分析方法"
        subtitle="选择 1-2 个分析视角"
        expanded={expandedSection === 'methods'}
        onToggle={() => toggleSection('methods')}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {methods.map((m) => (
            <SelectableCard
              key={m.id}
              icon={methodIcons[m.id]}
              title={m.name}
              subtitle={m.nameEn}
              selected={context.analysisMethods.includes(m.id)}
              onClick={() => handleMethodToggle(m.id)}
              multi
            />
          ))}
        </div>
      </Section>

      {/* Trading Style Section */}
      <Section
        title="交易风格"
        subtitle="选择持仓周期偏好"
        expanded={expandedSection === 'style'}
        onToggle={() => toggleSection('style')}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {styles.map((s) => (
            <SelectableCard
              key={s.id}
              icon={styleIcons[s.id]}
              title={s.name}
              subtitle={s.holdingPeriod}
              selected={context.tradingStyle === s.id}
              onClick={() => handleStyleChange(s.id)}
            />
          ))}
        </div>
      </Section>

      {/* Specialty Strategies Section */}
      <Section
        title="特色策略"
        subtitle="可选 0-2 个特色策略"
        expanded={expandedSection === 'strategies'}
        onToggle={() => toggleSection('strategies')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {strategies.map((s) => (
            <SelectableCard
              key={s.id}
              icon="🎯"
              title={s.name}
              subtitle={s.origin}
              selected={context.specialtyStrategies.includes(s.id)}
              onClick={() => handleStrategyToggle(s.id)}
              multi
            />
          ))}
        </div>
      </Section>

      {/* Master Agent Section */}
      <Section
        title="大师视角"
        subtitle="选择一位大师的思维方式（可选）"
        expanded={expandedSection === 'master'}
        onToggle={() => toggleSection('master')}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SelectableCard
            icon="🔄"
            title="不使用"
            subtitle="标准分析"
            selected={!context.masterAgent}
            onClick={() => handleMasterChange(undefined)}
          />
          {masters.map((m) => (
            <SelectableCard
              key={m.id}
              icon={philosophyIcons[m.philosophy]}
              title={m.name}
              subtitle={m.masterName}
              selected={context.masterAgent === m.id}
              onClick={() => handleMasterChange(m.id)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SectionProps {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, subtitle, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition"
      >
        <div className="text-left">
          <div className="font-medium text-white">{title}</div>
          <div className="text-xs text-white/50">{subtitle}</div>
        </div>
        <span className="text-white/50">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
}

interface SelectableCardProps {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}

function SelectableCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
  multi,
}: SelectableCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg border transition',
        selected
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-white/10 hover:border-white/30 text-white/70 hover:text-white'
      )}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-white/50">{subtitle}</span>
      {multi && selected && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
      )}
    </button>
  );
}

interface CompactSelectorProps {
  context: AdvisorContext;
  summary: ReturnType<typeof getContextSummary>;
  onExpand: () => void;
  className?: string;
}

function CompactSelector({ summary, onExpand, className }: CompactSelectorProps) {
  return (
    <button
      onClick={onExpand}
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg',
        'hover:bg-white/10 transition text-sm',
        className
      )}
    >
      <span className="text-white/50">投资视角:</span>
      <span className="text-accent">{summary.philosophy}</span>
      {summary.methods.length > 0 && (
        <span className="text-white/70">+ {summary.methods.join('/')}</span>
      )}
      {summary.master && (
        <span className="text-amber-400">+ {summary.master}</span>
      )}
      <span className="text-white/30 ml-auto">▶</span>
    </button>
  );
}

export default PhilosophySelector;
