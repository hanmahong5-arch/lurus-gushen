/**
 * Investment Advisor Chat API Route
 * 投资顾问对话 API 路由
 *
 * Implements the 3-Dao 6-Shu investment decision framework
 * 实现三道六术投资决策框架
 *
 * Supports both streaming and non-streaming responses
 * 支持流式和非流式响应
 */

import { NextRequest, NextResponse } from "next/server";
import { INVESTMENT_ADVISOR_SYSTEM_PROMPT } from "@/lib/investment-context/conversation-templates";

// lurus-api configuration
// 在集群内部通过 Service 访问，外部通过 api.lurus.cn 访问
const LURUS_API_URL = process.env.LURUS_API_URL || "https://api.lurus.cn";
const LURUS_API_KEY =
  process.env.LURUS_API_KEY || "sk-gushenAIQuantTradingPlatform2026";

// Message interface for chat history
// 聊天历史的消息接口
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Request body interface
// 请求体接口
interface AdvisorChatRequest {
  message: string;
  history?: ChatMessage[];
  mode?: "standard" | "quick" | "deep";
  stream?: boolean; // Enable streaming response / 启用流式响应
  context?: {
    symbol?: string;
    sector?: string;
    timeframe?: string;
    riskTolerance?: string;
  };
}

/**
 * Build contextual system prompt based on request parameters
 * 根据请求参数构建上下文系统提示词
 */
function buildSystemPrompt(context?: AdvisorChatRequest["context"]): string {
  let prompt = INVESTMENT_ADVISOR_SYSTEM_PROMPT;

  if (context) {
    const contextAdditions: string[] = [];

    if (context.symbol) {
      contextAdditions.push(`当前用户关注的标的：${context.symbol}`);
    }
    if (context.sector) {
      contextAdditions.push(`当前关注的行业板块：${context.sector}`);
    }
    if (context.timeframe) {
      contextAdditions.push(`用户的投资时间框架：${context.timeframe}`);
    }
    if (context.riskTolerance) {
      contextAdditions.push(`用户的风险承受能力：${context.riskTolerance}`);
    }

    if (contextAdditions.length > 0) {
      prompt += `\n\n## 当前对话上下文\n${contextAdditions.join("\n")}`;
    }
  }

  return prompt;
}

/**
 * POST handler for investment advisor chat
 * 投资顾问对话 POST 处理器
 *
 * Supports streaming when stream=true in request body
 * 当请求体中 stream=true 时支持流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body: AdvisorChatRequest = await request.json();
    const {
      message,
      history = [],
      mode = "standard",
      stream = false,
      context,
    } = body;

    // Validate input
    // 验证输入
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message too long (max 5000 characters)" },
        { status: 400 },
      );
    }

    // Build messages array with system prompt and history
    // 构建包含系统提示词和历史的消息数组
    const systemPrompt = buildSystemPrompt(context);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages to manage context length / 保留最近10条消息以管理上下文长度
      { role: "user", content: message },
    ];

    // Adjust temperature based on mode
    // 根据模式调整温度
    const temperature = mode === "quick" ? 0.5 : mode === "deep" ? 0.2 : 0.3;
    const maxTokens = mode === "quick" ? 1000 : mode === "deep" ? 4000 : 2000;

    console.log(
      `[Advisor API] Processing ${mode} mode request (stream: ${stream}), history: ${history.length} messages`,
    );
    const startTime = Date.now();

    // Call lurus-api (DeepSeek) for investment advice
    // 调用 lurus-api (DeepSeek) 获取投资建议
    const response = await fetch(`${LURUS_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LURUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[Advisor API] LLM error:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to get advisor response",
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      );
    }

    // Handle streaming response
    // 处理流式响应
    if (stream) {
      const responseTime = Date.now() - startTime;
      console.log(`[Advisor API] Streaming started in ${responseTime}ms`);

      // Create a TransformStream to process SSE data
      // 创建 TransformStream 处理 SSE 数据
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              // Check for stream end
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";

                if (content) {
                  // Send content as SSE event
                  // 将内容作为 SSE 事件发送
                  const sseData = JSON.stringify({ content });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        },
      });

      // Pipe the response through our transform
      // 通过我们的转换器管道响应
      const streamResponse = response.body?.pipeThrough(transformStream);

      return new Response(streamResponse, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Response-Time": `${responseTime}ms`,
          "X-Mode": mode,
        },
      });
    }

    // Handle non-streaming response
    // 处理非流式响应
    const responseTime = Date.now() - startTime;
    console.log(
      `[Advisor API] Response received in ${responseTime}ms, status: ${response.status}`,
    );

    const data = await response.json();
    const advisorResponse = data.choices?.[0]?.message?.content || "";

    if (!advisorResponse) {
      return NextResponse.json(
        { error: "Empty response from advisor" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      response: advisorResponse,
      usage: data.usage,
      metadata: {
        mode,
        responseTime,
        model: data.model,
      },
    });
  } catch (error) {
    console.error("[Advisor API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 },
    );
  }
}

/**
 * GET handler - returns advisor capabilities and status
 * GET 处理器 - 返回顾问能力和状态
 */
export async function GET() {
  return NextResponse.json({
    name: "GuShen Investment Advisor",
    version: "1.0.0",
    framework: "3-Dao 6-Shu (三道六术)",
    capabilities: [
      "Individual stock analysis (个股分析)",
      "Sector rotation analysis (行业轮动分析)",
      "Market overview (市场概览)",
      "Risk assessment (风险评估)",
      "Position sizing suggestions (仓位建议)",
      "Entry/exit timing guidance (入场/出场时机指导)",
    ],
    modes: {
      standard: "Balanced analysis with moderate depth",
      quick: "Fast response for simple queries",
      deep: "Comprehensive multi-dimensional analysis",
    },
    status: "ready",
  });
}
