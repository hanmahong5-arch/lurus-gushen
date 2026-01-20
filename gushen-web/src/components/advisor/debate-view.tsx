"use client";

/**
 * Debate View Component
 *
 * Displays Bull vs Bear debate sessions with real-time updates
 * Reference: TradingAgents (UCLA) debate visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
  DebateSession,
  DebateArgument,
  DebateConclusion,
} from '@/lib/advisor/agent/types';
import {
  formatDebateConclusion,
  isDebateComplete,
  getCurrentRound,
} from '@/lib/advisor/reaction/debate-engine';

// ============================================================================
// Component Props
// ============================================================================

interface DebateViewProps {
  session: DebateSession | null;
  isLoading?: boolean;
  currentSpeaker?: 'bull' | 'bear' | 'moderator' | null;
  streamingContent?: string;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function DebateView({
  session,
  isLoading = false,
  currentSpeaker,
  streamingContent,
  className,
}: DebateViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.arguments.length, streamingContent]);

  if (!session) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center text-white/50">
          <span className="text-4xl mb-2 block">⚔️</span>
          <p>选择一只股票开始多空辩论</p>
        </div>
      </div>
    );
  }

  const currentRound = getCurrentRound(session);
  const complete = isDebateComplete(session);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <DebateHeader
        topic={session.topic}
        symbol={session.symbol}
        currentRound={currentRound}
        totalRounds={session.rounds}
        complete={complete}
      />

      {/* Debate Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 py-4"
      >
        {/* Arguments */}
        {session.arguments.map((arg, index) => (
          <ArgumentCard key={index} argument={arg} />
        ))}

        {/* Streaming Content */}
        {isLoading && currentSpeaker && (
          <StreamingCard
            speaker={currentSpeaker}
            content={streamingContent || '思考中...'}
          />
        )}

        {/* Conclusion */}
        {session.conclusion && (
          <ConclusionCard conclusion={session.conclusion} />
        )}
      </div>

      {/* Progress Bar */}
      <DebateProgress
        bullCount={session.arguments.filter(a => a.stance === 'bull').length}
        bearCount={session.arguments.filter(a => a.stance === 'bear').length}
        totalRounds={session.rounds}
        hasConclusion={!!session.conclusion}
      />
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface DebateHeaderProps {
  topic: string;
  symbol?: string;
  currentRound: number;
  totalRounds: number;
  complete: boolean;
}

function DebateHeader({
  topic,
  symbol,
  currentRound,
  totalRounds,
  complete,
}: DebateHeaderProps) {
  return (
    <div className="border-b border-white/10 pb-3 mb-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white flex items-center gap-2">
            <span>⚔️</span>
            <span>多空辩论</span>
            {symbol && (
              <span className="text-accent ml-2">{symbol}</span>
            )}
          </h3>
          <p className="text-sm text-white/70 mt-1">{topic}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/50">
            {complete ? '辩论完成' : `第 ${currentRound}/${totalRounds} 轮`}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ArgumentCardProps {
  argument: DebateArgument;
}

function ArgumentCard({ argument }: ArgumentCardProps) {
  const isBull = argument.stance === 'bull';

  return (
    <div
      className={cn(
        'rounded-lg p-4',
        isBull
          ? 'bg-green-500/10 border-l-4 border-green-500'
          : 'bg-red-500/10 border-l-4 border-red-500'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{isBull ? '🐂' : '🐻'}</span>
        <span className="font-medium text-white">
          {isBull ? '多头研究员' : '空头研究员'}
        </span>
        <span className="text-xs text-white/50 ml-auto">
          第 {argument.round} 轮
        </span>
      </div>

      {/* Content */}
      <div className="text-white/80 text-sm whitespace-pre-wrap">
        {argument.content}
      </div>

      {/* Key Points */}
      {argument.keyPoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-white/50 mb-1">核心论点:</div>
          <ul className="text-sm text-white/70 space-y-1">
            {argument.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={isBull ? 'text-green-400' : 'text-red-400'}>•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface StreamingCardProps {
  speaker: 'bull' | 'bear' | 'moderator';
  content: string;
}

function StreamingCard({ speaker, content }: StreamingCardProps) {
  const config = {
    bull: { icon: '🐂', name: '多头研究员', color: 'green' },
    bear: { icon: '🐻', name: '空头研究员', color: 'red' },
    moderator: { icon: '⚖️', name: '主持人', color: 'blue' },
  }[speaker];

  return (
    <div
      className={cn(
        'rounded-lg p-4 animate-pulse',
        `bg-${config.color}-500/10 border-l-4 border-${config.color}-500`
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{config.icon}</span>
        <span className="font-medium text-white">{config.name}</span>
        <span className="text-xs text-white/50">正在发言...</span>
      </div>
      <div className="text-white/80 text-sm whitespace-pre-wrap">
        {content}
        <span className="inline-block w-2 h-4 bg-white/50 ml-1 animate-blink" />
      </div>
    </div>
  );
}

interface ConclusionCardProps {
  conclusion: DebateConclusion;
}

function ConclusionCard({ conclusion }: ConclusionCardProps) {
  const verdictConfig = {
    bullish: { icon: '📈', text: '偏多', color: 'green' },
    bearish: { icon: '📉', text: '偏空', color: 'red' },
    neutral: { icon: '➖', text: '中性', color: 'gray' },
  }[conclusion.finalVerdict];

  return (
    <div className="rounded-lg p-4 bg-blue-500/10 border-l-4 border-blue-500">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">⚖️</span>
        <span className="font-medium text-white">综合结论</span>
      </div>

      {/* Verdict */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-white/5 rounded-lg">
        <div className="text-center">
          <div className="text-3xl">{verdictConfig.icon}</div>
          <div className={`text-sm font-medium text-${verdictConfig.color}-400`}>
            {verdictConfig.text}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/50 mb-1">置信度</div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${verdictConfig.color}-500`}
              style={{ width: `${conclusion.confidenceLevel}%` }}
            />
          </div>
          <div className="text-xs text-white/70 mt-1">
            {conclusion.confidenceLevel}%
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-green-400 mb-2">🐂 多头核心论点</div>
          <ul className="text-sm text-white/70 space-y-1">
            {conclusion.keyBullPoints.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-red-400 mb-2">🐻 空头核心论点</div>
          <ul className="text-sm text-white/70 space-y-1">
            {conclusion.keyBearPoints.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consensus */}
      {conclusion.consensus && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/50 mb-1">共识与分歧</div>
          <p className="text-sm text-white/80">{conclusion.consensus}</p>
        </div>
      )}

      {/* Suggested Action */}
      {conclusion.suggestedAction && (
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
          <div className="text-xs text-accent mb-1">💡 操作建议</div>
          <p className="text-sm text-white">{conclusion.suggestedAction}</p>
        </div>
      )}
    </div>
  );
}

interface DebateProgressProps {
  bullCount: number;
  bearCount: number;
  totalRounds: number;
  hasConclusion: boolean;
}

function DebateProgress({
  bullCount,
  bearCount,
  totalRounds,
  hasConclusion,
}: DebateProgressProps) {
  const totalSteps = totalRounds * 2 + 1; // Bull + Bear per round + Conclusion
  const currentStep = bullCount + bearCount + (hasConclusion ? 1 : 0);
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="pt-3 border-t border-white/10">
      <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
        <span>🐂 {bullCount}/{totalRounds}</span>
        <span>vs</span>
        <span>🐻 {bearCount}/{totalRounds}</span>
        <span className="ml-auto">
          {hasConclusion ? '✓ 已完成' : `进度 ${Math.round(progress)}%`}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Compact Debate Summary
// ============================================================================

interface DebateSummaryProps {
  session: DebateSession;
  onClick?: () => void;
  className?: string;
}

export function DebateSummary({ session, onClick, className }: DebateSummaryProps) {
  const complete = isDebateComplete(session);
  const verdict = session.conclusion?.finalVerdict;

  const verdictConfig = verdict
    ? {
        bullish: { icon: '📈', text: '偏多', color: 'text-green-400' },
        bearish: { icon: '📉', text: '偏空', color: 'text-red-400' },
        neutral: { icon: '➖', text: '中性', color: 'text-gray-400' },
      }[verdict]
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 transition text-left',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span>⚔️</span>
        <span className="font-medium text-white">{session.topic}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-white/50">
          {session.symbol || '综合分析'}
        </span>
        <span className="text-white/30">•</span>
        <span className="text-white/50">
          {session.arguments.length} 轮辩论
        </span>
        {verdictConfig && (
          <>
            <span className="text-white/30">•</span>
            <span className={verdictConfig.color}>
              {verdictConfig.icon} {verdictConfig.text}
            </span>
          </>
        )}
        {!complete && (
          <span className="text-amber-400 ml-auto">进行中...</span>
        )}
      </div>
    </button>
  );
}

export default DebateView;
