"use client";

/**
 * Investment Advisor Chat Component (Enhanced with Agentic Features)
 * 投资顾问对话组件（增强版，支持 Agentic 功能）
 *
 * Features:
 * - Multi-Agent support (Analysts, Researchers, Masters)
 * - Investment philosophy selection
 * - Debate mode (Bull vs Bear)
 * - Dynamic context building
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Import new Agentic components
import { PhilosophySelector } from "./philosophy-selector";
import { CompactModeSelector, ModeBadge } from "./mode-selector";
import { MasterAgentPreview, MasterQuote } from "./master-agent-cards";
import { DebateView } from "./debate-view";

// Import types and utilities
import type {
  AdvisorContext,
  ChatMode,
  DebateSession,
  InvestmentPhilosophy,
} from "@/lib/advisor/agent/types";
import {
  getDefaultAdvisorContext,
  getContextSummary,
} from "@/lib/advisor/context-builder";
import {
  getMasterAgentSummaries,
  getMasterAgentById,
} from "@/lib/advisor/agent/master-agents";

// Message type definition
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    mode?: string;
    responseTime?: number;
    agentId?: string;
    agentName?: string;
  };
}

// Component props
interface AdvisorChatProps {
  className?: string;
  defaultMode?: ChatMode;
  initialContext?: Partial<AdvisorContext>;
}

/**
 * Investment Advisor Chat Interface (Enhanced)
 * 投资顾问聊天界面（增强版）
 */
export function AdvisorChat({
  className,
  defaultMode = "quick",
  initialContext,
}: AdvisorChatProps) {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(defaultMode);
  const [advisorContext, setAdvisorContext] = useState<AdvisorContext>(
    initialContext
      ? { ...getDefaultAdvisorContext(), ...initialContext }
      : getDefaultAdvisorContext(),
  );
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [debateSession, setDebateSession] = useState<DebateSession | null>(
    null,
  );

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get master agent summaries for display
  const masterAgents = getMasterAgentSummaries();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate unique ID for messages
  const generateId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle context changes
  const handleContextChange = useCallback((newContext: AdvisorContext) => {
    setAdvisorContext(newContext);
  }, []);

  // Handle mode changes
  const handleModeChange = useCallback(
    (newMode: ChatMode) => {
      setMode(newMode);
      // Clear debate session when switching away from debate mode
      if (newMode !== "debate" && debateSession) {
        setDebateSession(null);
      }
    },
    [debateSession],
  );

  // Handle master agent quick select
  const handleMasterSelect = useCallback((masterId: string) => {
    const master = getMasterAgentById(masterId);
    if (master) {
      const philosophy = master.philosophy;
      if (philosophy) {
        setAdvisorContext((prev) => ({
          ...prev,
          masterAgent: masterId,
          corePhilosophy: philosophy,
        }));
      } else {
        setAdvisorContext((prev) => ({
          ...prev,
          masterAgent: masterId,
        }));
      }
    }
  }, []);

  // Send message to advisor API
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      // Build history for API (last 10 messages)
      const history = messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Handle debate mode specially
      if (mode === "debate") {
        await handleDebateRequest(userMessage.content, history);
      } else {
        // Standard chat request
        const response = await fetch("/api/advisor/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage.content,
            history,
            mode,
            advisorContext,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`,
          );
        }

        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          metadata: {
            ...data.metadata,
            agentId: advisorContext.masterAgent,
            agentName: advisorContext.masterAgent
              ? getMasterAgentById(advisorContext.masterAgent)?.name
              : undefined,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      console.error("Advisor chat error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, mode, advisorContext]);

  // Handle debate mode requests
  const handleDebateRequest = async (
    topic: string,
    history: { role: string; content: string }[],
  ) => {
    // Track arguments for conclusion
    const bullArguments: string[] = [];
    const bearArguments: string[] = [];

    try {
      // Start debate session
      const startResponse = await fetch("/api/advisor/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          topic,
          rounds: 2,
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start debate");
      }

      const startData = await startResponse.json();
      const session = startData.session as DebateSession;
      setDebateSession(session);

      // Extract symbol info from topic if possible (e.g., "贵州茅台是否值得持有")
      // DebateSession has symbol but not symbolName, use topic as symbolName
      const symbol = session.symbol || "";
      const symbolName = topic;

      // Generate Bull argument (Round 1)
      const bullResponse = await fetch("/api/advisor/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "argument",
          sessionId: session.id,
          stance: "bull", // Fixed: was "side"
          currentRound: 1, // Fixed: was "round"
          symbol,
          symbolName,
          topic,
        }),
      });

      if (bullResponse.ok) {
        const bullData = await bullResponse.json();
        bullArguments.push(bullData.argument?.content || "");
        setDebateSession((prev) =>
          prev
            ? { ...prev, arguments: [...prev.arguments, bullData.argument] }
            : null,
        );
      } else {
        const errorData = await bullResponse.json().catch(() => ({}));
        console.error("[Debate] Bull argument failed:", errorData);
      }

      // Generate Bear argument (Round 1)
      const bearResponse = await fetch("/api/advisor/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "argument",
          sessionId: session.id,
          stance: "bear", // Fixed: was "side"
          currentRound: 1, // Fixed: was "round"
          symbol,
          symbolName,
          topic,
          previousArguments: {
            bull: bullArguments,
            bear: [],
          },
        }),
      });

      if (bearResponse.ok) {
        const bearData = await bearResponse.json();
        bearArguments.push(bearData.argument?.content || "");
        setDebateSession((prev) =>
          prev
            ? { ...prev, arguments: [...prev.arguments, bearData.argument] }
            : null,
        );
      } else {
        const errorData = await bearResponse.json().catch(() => ({}));
        console.error("[Debate] Bear argument failed:", errorData);
      }

      // Generate conclusion (requires both arguments)
      if (bullArguments.length > 0 && bearArguments.length > 0) {
        const conclusionResponse = await fetch("/api/advisor/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "conclusion",
            sessionId: session.id,
            bullArguments, // Fixed: was missing
            bearArguments, // Fixed: was missing
            symbol,
            symbolName,
            topic,
          }),
        });

        if (conclusionResponse.ok) {
          const conclusionData = await conclusionResponse.json();
          setDebateSession((prev) =>
            prev ? { ...prev, conclusion: conclusionData.conclusion } : null,
          );
        } else {
          const errorData = await conclusionResponse.json().catch(() => ({}));
          console.error("[Debate] Conclusion failed:", errorData);
        }
      }

      // Add summary message
      const summaryMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `【多空辩论完成】\n\n主题: ${topic}\n\n请查看下方的辩论详情，包括多头和空头的观点以及最终结论。`,
        timestamp: new Date(),
        metadata: { mode: "debate" },
      };
      setMessages((prev) => [...prev, summaryMessage]);
    } catch (err) {
      throw err;
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
    setDebateSession(null);
    setError(null);
  };

  // Get context summary for display
  const contextSummaryObj = getContextSummary(advisorContext);
  const contextSummaryText = `${contextSummaryObj.philosophy} + ${contextSummaryObj.methods.join("/")} + ${contextSummaryObj.style}${contextSummaryObj.master ? ` (${contextSummaryObj.master})` : ""}`;

  return (
    <div className={cn("flex flex-col h-full bg-[#0f1117]", className)}>
      {/* Header with mode and settings */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f36]">
        <div className="flex items-center gap-2">
          <span className="text-[#f5a623] font-semibold">谷神</span>
          <span className="text-gray-400 text-sm">投资顾问</span>
          <ModeBadge mode={mode} />
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <CompactModeSelector
            selectedMode={mode}
            onModeChange={handleModeChange}
          />
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showSettings
                ? "bg-[#f5a623] text-[#0f1117]"
                : "bg-[#1a1f36] text-gray-400 hover:text-white",
            )}
            title="分析设置"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="border-b border-[#1a1f36] bg-[#1a1f36]/30">
          <div className="p-4">
            <PhilosophySelector
              context={advisorContext}
              onChange={handleContextChange}
              compact
            />
          </div>
          {/* Master Agent Quick Select */}
          <div className="px-4 pb-4">
            <div className="text-xs text-gray-400 mb-2">快速切换大师视角</div>
            <div className="flex gap-2 flex-wrap">
              {masterAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleMasterSelect(agent.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg transition-colors",
                    advisorContext.masterAgent === agent.id
                      ? "bg-[#f5a623] text-[#0f1117]"
                      : "bg-[#1a1f36] text-gray-400 hover:text-white hover:bg-[#2a2f46]",
                  )}
                >
                  {agent.name}
                </button>
              ))}
            </div>
          </div>
          {/* Context Summary */}
          <div className="px-4 pb-3 text-xs text-gray-500">
            当前配置: {contextSummaryText}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <WelcomeMessage
            onSuggestionClick={setInput}
            masterAgent={
              advisorContext.masterAgent
                ? getMasterAgentById(advisorContext.masterAgent)
                : undefined
            }
          />
        )}

        {/* Message list */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Debate View (if in debate mode with active session) */}
        {mode === "debate" && debateSession && (
          <div className="my-4">
            <DebateView session={debateSession} />
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-sm">
              {mode === "debate" ? "多空辩论进行中..." : "谷神正在分析..."}
            </span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            <span className="font-medium">错误：</span> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#1a1f36] p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "debate"
                ? "输入辩论主题，如：贵州茅台是否值得长期持有？"
                : "输入你的投资问题... (Ctrl+Enter 发送)"
            }
            className="flex-1 min-h-[60px] max-h-[200px] bg-[#1a1f36] border-[#2a2f46] text-white placeholder:text-gray-500 resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0f1117] font-medium"
            >
              {mode === "debate" ? "开始辩论" : "发送"}
            </Button>
            <Button
              onClick={clearChat}
              variant="outline"
              className="border-[#2a2f46] text-gray-400 hover:text-white"
              disabled={messages.length === 0 && !debateSession}
            >
              清空
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            {advisorContext.masterAgent && (
              <span className="text-[#f5a623]">
                {getMasterAgentById(advisorContext.masterAgent)?.name}视角
                ·{" "}
              </span>
            )}
            {mode === "quick"
              ? "快速分析"
              : mode === "deep"
                ? "深度分析"
                : mode === "debate"
                  ? "多空辩论"
                  : "组合诊断"}
          </span>
          <span>投资有风险，入市需谨慎</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Welcome Message Component
 */
function WelcomeMessage({
  onSuggestionClick,
  masterAgent,
}: {
  onSuggestionClick: (text: string) => void;
  masterAgent?: {
    name: string;
    nameEn: string;
    philosophy?: InvestmentPhilosophy;
  };
}) {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-4">🏛️</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        欢迎使用谷神投资顾问
      </h3>
      {masterAgent ? (
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
          当前视角：<span className="text-[#f5a623]">{masterAgent.name}</span>
          <br />
          将以
          {masterAgent.philosophy === "value"
            ? "价值投资"
            : masterAgent.philosophy}
          的理念为您分析。
        </p>
      ) : (
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
          基于多Agent协作的智能投资分析系统。
          <br />
          支持多种投资流派、多空辩论、大师视角。
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <SuggestionButton
          onClick={() => onSuggestionClick("帮我分析一下当前A股市场的整体状态")}
          label="市场概览"
        />
        <SuggestionButton
          onClick={() => onSuggestionClick("我想了解新能源板块最近的投资机会")}
          label="行业分析"
        />
        <SuggestionButton
          onClick={() => onSuggestionClick("帮我分析贵州茅台的投资价值")}
          label="个股分析"
        />
        <SuggestionButton
          onClick={() => onSuggestionClick("贵州茅台是否值得长期持有？")}
          label="多空辩论"
          highlight
        />
      </div>
    </div>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          isUser ? "bg-[#f5a623] text-[#0f1117]" : "bg-[#1a1f36] text-gray-100",
        )}
      >
        {/* Agent indicator for assistant messages */}
        {!isUser && message.metadata?.agentName && (
          <div className="text-xs text-[#f5a623] mb-1">
            {message.metadata.agentName}
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <FormattedContent content={message.content} />
        </div>

        {/* Metadata */}
        {message.metadata?.responseTime && (
          <div className="mt-2 text-xs opacity-60">
            响应时间: {(message.metadata.responseTime / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Formatted Content Component - Basic markdown rendering
 */
function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith("### ")) {
          return (
            <h4 key={index} className="font-semibold text-[#f5a623] mt-3 mb-1">
              {line.replace("### ", "")}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3
              key={index}
              className="font-bold text-lg text-[#f5a623] mt-4 mb-2"
            >
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2
              key={index}
              className="font-bold text-xl text-[#f5a623] mt-4 mb-2"
            >
              {line.replace("# ", "")}
            </h2>
          );
        }

        // Bold text
        if (line.includes("**")) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={index}>
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i} className="text-white font-semibold">
                    {part}
                  </strong>
                ) : (
                  part
                ),
              )}
            </p>
          );
        }

        // List items
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={index} className="flex gap-2 ml-2">
              <span className="text-[#f5a623]">•</span>
              <span>{line.replace(/^[-*]\s/, "")}</span>
            </div>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={index} className="flex gap-2 ml-2">
              <span className="text-[#f5a623] font-medium">
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{line.replace(/^\d+\.\s/, "")}</span>
            </div>
          );
        }

        // Table rows
        if (line.startsWith("|") && line.endsWith("|")) {
          const cells = line
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          return (
            <div
              key={index}
              className="flex gap-4 text-sm py-1 border-b border-[#2a2f46]"
            >
              {cells.map((cell, i) => (
                <span key={i} className="flex-1">
                  {cell}
                </span>
              ))}
            </div>
          );
        }

        // Separator
        if (line.startsWith("---")) {
          return <hr key={index} className="border-[#2a2f46] my-3" />;
        }

        // Empty line
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }

        // Regular paragraph
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

/**
 * Suggestion Button Component
 */
function SuggestionButton({
  label,
  onClick,
  highlight = false,
}: {
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-sm rounded-lg transition-colors",
        highlight
          ? "bg-[#f5a623]/20 text-[#f5a623] hover:bg-[#f5a623]/30"
          : "bg-[#1a1f36] text-gray-300 hover:bg-[#2a2f46] hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

export default AdvisorChat;
