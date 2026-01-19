/**
 * Strategy Generation API Route
 * Connects to lurus-api (DeepSeek LLM) to generate trading strategies
 * 策略生成 API 路由 - 连接 lurus-api (DeepSeek LLM) 生成交易策略
 */

import { NextRequest, NextResponse } from "next/server";

// lurus-api configuration
// 在集群内部通过 Service 访问，外部通过 api.lurus.cn 访问
const LURUS_API_URL = process.env.LURUS_API_URL || "https://api.lurus.cn";
const LURUS_API_KEY =
  process.env.LURUS_API_KEY || "sk-gushenAIQuantTradingPlatform2026";

// System prompt for strategy generation
// 策略生成的系统提示词
const SYSTEM_PROMPT = `你是一个专业的量化交易策略开发专家，精通 VeighNa 量化交易框架。
你的任务是根据用户的自然语言描述，生成可执行的 VeighNa CTA 策略代码。

代码要求：
1. 使用 VeighNa 4.0+ 的 CtaTemplate 类
2. 包含完整的策略类定义
3. 包含参数定义、变量定义、初始化方法和 on_bar 方法
4. 代码需要有中英双语注释
5. 代码需要符合 Python 最佳实践
6. 如果用户提到具体的技术指标（如均线、RSI、MACD、布林带等），要正确实现
7. 如果用户提到止盈止损，要正确实现

输出格式：
- 只输出 Python 代码，不要有其他解释
- 代码开头要有策略描述的文档字符串
- 代码要可以直接复制运行

You are a professional quantitative trading strategy developer, expert in VeighNa framework.
Your task is to generate executable VeighNa CTA strategy code based on user's natural language description.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 },
      );
    }

    // Call lurus-api (DeepSeek) for strategy generation
    // 调用 lurus-api (DeepSeek) 生成策略
    console.log("[API] Calling lurus-api for strategy generation...");
    const startTime = Date.now();

    const response = await fetch(`${LURUS_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LURUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `请根据以下策略描述生成 VeighNa CTA 策略代码：\n\n${prompt}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      // Disable Next.js fetch caching for API calls
      // 禁用 Next.js fetch 缓存
      cache: "no-store",
    });

    console.log(
      `[API] Response received in ${Date.now() - startTime}ms, status: ${response.status}`,
    );

    if (!response.ok) {
      // Handle non-JSON error responses (like plain text "no available server")
      // 处理非JSON错误响应
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("LLM API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to generate strategy",
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content || "";

    // Extract code from markdown code blocks if present
    // 如果有 markdown 代码块，提取代码
    let code = generatedCode;
    const codeBlockMatch = generatedCode.match(/```python\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1];
    } else {
      // Try without language specifier
      const simpleCodeBlock = generatedCode.match(/```\n([\s\S]*?)```/);
      if (simpleCodeBlock) {
        code = simpleCodeBlock[1];
      }
    }

    return NextResponse.json({
      success: true,
      code: code.trim(),
      usage: data.usage,
    });
  } catch (error) {
    console.error("Strategy generation error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 },
    );
  }
}
