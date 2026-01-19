"use client";

/**
 * Investment Advisor Chat Component
 * 投资顾问对话组件
 *
 * Implements the 3-Dao 6-Shu investment decision framework in a chat interface
 * 在聊天界面中实现三道六术投资决策框架
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Message type definition
// 消息类型定义
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    mode?: string;
    responseTime?: number;
  };
}

// Chat mode options
// 聊天模式选项
type ChatMode = "standard" | "quick" | "deep";

// Component props
// 组件属性
interface AdvisorChatProps {
  className?: string;
  defaultMode?: ChatMode;
  initialContext?: {
    symbol?: string;
    sector?: string;
    timeframe?: string;
    riskTolerance?: string;
  };
}

/**
 * Investment Advisor Chat Interface
 * 投资顾问聊天界面
 */
export function AdvisorChat({
  className,
  defaultMode = "standard",
  initialContext,
}: AdvisorChatProps) {
  // State management
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(defaultMode);
  const [context, setContext] = useState(initialContext);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  // 新消息到达时自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate unique ID for messages
  // 生成消息唯一ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Send message to advisor API
  // 发送消息到顾问API
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    // 将用户消息添加到聊天
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      // Build history for API (last 10 messages)
      // 为API构建历史记录（最近10条消息）
      const history = messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          mode,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response
      // 添加助手响应
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      console.error("Advisor chat error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, mode, context]);

  // Handle keyboard shortcuts
  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat history
  // 清空聊天历史
  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Mode button style helper
  // 模式按钮样式辅助
  const getModeButtonClass = (buttonMode: ChatMode) =>
    cn(
      "px-3 py-1 text-xs rounded-full transition-colors",
      mode === buttonMode
        ? "bg-[#f5a623] text-[#0f1117]"
        : "bg-[#1a1f36] text-gray-400 hover:text-white"
    );

  return (
    <div className={cn("flex flex-col h-full bg-[#0f1117]", className)}>
      {/* Header with mode selection */}
      {/* 头部模式选择 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f36]">
        <div className="flex items-center gap-2">
          <span className="text-[#f5a623] font-semibold">谷神</span>
          <span className="text-gray-400 text-sm">投资顾问</span>
          <Badge variant="outline" className="text-xs border-[#f5a623]/30 text-[#f5a623]">
            三道六术
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("quick")}
            className={getModeButtonClass("quick")}
            title="快速分析模式"
          >
            快速
          </button>
          <button
            onClick={() => setMode("standard")}
            className={getModeButtonClass("standard")}
            title="标准分析模式"
          >
            标准
          </button>
          <button
            onClick={() => setMode("deep")}
            className={getModeButtonClass("deep")}
            title="深度分析模式"
          >
            深度
          </button>
        </div>
      </div>

      {/* Messages area */}
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message if no messages */}
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              欢迎使用谷神投资顾问
            </h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
              基于"三道六术"框架的专业投资分析系统。
              在给出建议前，我会先了解你的投资目标和风险偏好。
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <SuggestionButton
                onClick={() => setInput("帮我分析一下当前A股市场的整体状态")}
                label="市场概览"
              />
              <SuggestionButton
                onClick={() => setInput("我想了解新能源板块最近的投资机会")}
                label="行业分析"
              />
              <SuggestionButton
                onClick={() => setInput("帮我分析贵州茅台的投资价值")}
                label="个股分析"
              />
              <SuggestionButton
                onClick={() => setInput("如何控制投资组合的风险？")}
                label="风控建议"
              />
            </div>
          </div>
        )}

        {/* Message list */}
        {/* 消息列表 */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm">谷神正在分析...</span>
          </div>
        )}

        {/* Error display */}
        {/* 错误显示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            <span className="font-medium">错误：</span> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {/* 输入区域 */}
      <div className="border-t border-[#1a1f36] p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的投资问题... (Ctrl+Enter 发送)"
            className="flex-1 min-h-[60px] max-h-[200px] bg-[#1a1f36] border-[#2a2f46] text-white placeholder:text-gray-500 resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0f1117] font-medium"
            >
              发送
            </Button>
            <Button
              onClick={clearChat}
              variant="outline"
              className="border-[#2a2f46] text-gray-400 hover:text-white"
              disabled={messages.length === 0}
            >
              清空
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            当前模式: {mode === "quick" ? "快速" : mode === "deep" ? "深度" : "标准"}分析
          </span>
          <span>投资有风险，入市需谨慎</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Message Bubble Component
 * 消息气泡组件
 */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          isUser
            ? "bg-[#f5a623] text-[#0f1117]"
            : "bg-[#1a1f36] text-gray-100"
        )}
      >
        {/* Message content with markdown-like formatting */}
        {/* 支持markdown格式的消息内容 */}
        <div className="prose prose-invert prose-sm max-w-none">
          <FormattedContent content={message.content} />
        </div>

        {/* Metadata */}
        {/* 元数据 */}
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
 * 格式化内容组件 - 基本markdown渲染
 */
function FormattedContent({ content }: { content: string }) {
  // Split content into lines and render with basic formatting
  // 将内容分成行并进行基本格式化渲染
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
            <h3 key={index} className="font-bold text-lg text-[#f5a623] mt-4 mb-2">
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={index} className="font-bold text-xl text-[#f5a623] mt-4 mb-2">
              {line.replace("# ", "")}
            </h2>
          );
        }

        // Bold text (simple implementation)
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
                )
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
              <span className="text-[#f5a623] font-medium">{line.match(/^\d+/)?.[0]}.</span>
              <span>{line.replace(/^\d+\.\s/, "")}</span>
            </div>
          );
        }

        // Table rows (basic)
        if (line.startsWith("|") && line.endsWith("|")) {
          const cells = line.split("|").filter(Boolean).map((c) => c.trim());
          return (
            <div key={index} className="flex gap-4 text-sm py-1 border-b border-[#2a2f46]">
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
 * 建议按钮组件
 */
function SuggestionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm bg-[#1a1f36] text-gray-300 rounded-lg hover:bg-[#2a2f46] hover:text-white transition-colors"
    >
      {label}
    </button>
  );
}

export default AdvisorChat;
