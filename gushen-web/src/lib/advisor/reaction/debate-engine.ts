/**
 * GuShen Agentic Advisor - Reaction System: Debate Engine
 *
 * Manages Bull vs Bear debate sessions for balanced investment analysis
 * Reference: TradingAgents (UCLA) debate framework
 */

import type {
  DebateSession,
  DebateArgument,
  DebateConclusion,
  ResearcherStance,
  AdvisorContext,
} from "../agent/types";
import {
  BULL_RESEARCHER,
  BEAR_RESEARCHER,
  DEBATE_MODERATOR,
} from "../agent/researcher-agents";

// ============================================================================
// Debate Session Management
// ============================================================================

/**
 * Create a new debate session / 创建新的辩论会话
 */
export function createDebateSession(
  topic: string,
  symbol?: string,
  symbolName?: string,
  rounds: number = 2,
): DebateSession {
  return {
    id: `debate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    topic,
    symbol,
    rounds,
    participants: {
      bull: BULL_RESEARCHER,
      bear: BEAR_RESEARCHER,
      moderator: DEBATE_MODERATOR,
    },
    arguments: [],
    createdAt: new Date(),
  };
}

/**
 * Add argument to debate session / 添加论点到辩论会话
 */
export function addDebateArgument(
  session: DebateSession,
  stance: ResearcherStance,
  content: string,
  keyPoints: string[],
): DebateSession {
  const currentRound = Math.floor(session.arguments.length / 2) + 1;

  const argument: DebateArgument = {
    round: currentRound,
    stance,
    agentId: stance === "bull" ? BULL_RESEARCHER.id : BEAR_RESEARCHER.id,
    content,
    keyPoints,
    timestamp: new Date(),
  };

  return {
    ...session,
    arguments: [...session.arguments, argument],
  };
}

/**
 * Set debate conclusion / 设置辩论结论
 */
export function setDebateConclusion(
  session: DebateSession,
  conclusion: DebateConclusion,
): DebateSession {
  return {
    ...session,
    conclusion,
  };
}

// ============================================================================
// Debate Prompt Generation
// ============================================================================

export interface DebateConfig {
  symbol: string;
  symbolName: string;
  topic: string;
  context: AdvisorContext;
  marketData?: string;
  previousArguments?: {
    bull: string[];
    bear: string[];
  };
  currentRound: number;
}

export interface DebatePrompts {
  bullPrompt: string;
  bearPrompt: string;
  moderatorPrompt: string;
}

/**
 * Generate prompts for debate participants / 生成辩论参与者的提示词
 */
export function generateDebatePrompts(config: DebateConfig): DebatePrompts {
  const baseContext = buildBaseContext(config);

  return {
    bullPrompt: buildBullPrompt(config, baseContext),
    bearPrompt: buildBearPrompt(config, baseContext),
    moderatorPrompt: buildModeratorPrompt(config, baseContext),
  };
}

function buildBaseContext(config: DebateConfig): string {
  let context = `## 辩论标的
**${config.symbolName}** (${config.symbol})

## 辩论主题
${config.topic}`;

  if (config.marketData) {
    context += `\n\n## 市场数据\n${config.marketData}`;
  }

  return context;
}

function buildBullPrompt(config: DebateConfig, baseContext: string): string {
  let prompt = `${BULL_RESEARCHER.systemPrompt}

---

${baseContext}

## 你的任务
作为**多头研究员**，请从看多的角度分析${config.symbolName}。

### 分析要求
1. 提出 3-5 个核心看多论点
2. 每个论点必须有数据或逻辑支撑
3. 诚实评估风险，但解释为什么机会大于风险
4. 给出目标价格或潜在收益空间

### 当前轮次: 第 ${config.currentRound} 轮`;

  if (
    config.previousArguments?.bear &&
    config.previousArguments.bear.length > 0
  ) {
    prompt += `

## 空头前一轮观点
${config.previousArguments.bear[config.previousArguments.bear.length - 1]}

请针对空头的观点进行回应，同时补充新的看多理由。`;
  }

  return prompt;
}

function buildBearPrompt(config: DebateConfig, baseContext: string): string {
  let prompt = `${BEAR_RESEARCHER.systemPrompt}

---

${baseContext}

## 你的任务
作为**空头研究员**，请从看空/审慎的角度分析${config.symbolName}。

### 分析要求
1. 提出 3-5 个核心看空或风险论点
2. 每个论点必须有数据或逻辑支撑
3. 质疑过于乐观的假设
4. 给出合理的下行风险评估

### 当前轮次: 第 ${config.currentRound} 轮`;

  if (
    config.previousArguments?.bull &&
    config.previousArguments.bull.length > 0
  ) {
    prompt += `

## 多头前一轮观点
${config.previousArguments.bull[config.previousArguments.bull.length - 1]}

请针对多头的观点进行质疑和反驳，同时补充新的风险因素。`;
  }

  return prompt;
}

function buildModeratorPrompt(
  config: DebateConfig,
  baseContext: string,
): string {
  const bullArgs = config.previousArguments?.bull || [];
  const bearArgs = config.previousArguments?.bear || [];

  return `${DEBATE_MODERATOR.systemPrompt}

---

${baseContext}

## 辩论记录

### 多头观点
${bullArgs.map((arg, i) => `#### 第 ${i + 1} 轮\n${arg}`).join("\n\n")}

### 空头观点
${bearArgs.map((arg, i) => `#### 第 ${i + 1} 轮\n${arg}`).join("\n\n")}

---

## 你的任务
作为**辩论主持人**，请综合多空双方的观点，给出公正客观的总结和投资建议。

### 总结要求
1. 归纳多头核心论点 (3-5 点)
2. 归纳空头核心论点 (3-5 点)
3. 指出双方的共识和分歧
4. 评估哪一方的论据更有说服力
5. 给出最终判断: 偏多/偏空/中性
6. 给出具体的操作建议

### 输出格式
请使用以下结构输出:

## 多头核心观点
1. ...
2. ...

## 空头核心观点
1. ...
2. ...

## 共识与分歧
...

## 综合评估
- 最终判断: [偏多/偏空/中性]
- 置信度: [0-100]%
- 关键监控指标: ...

## 操作建议
- 适合投资者类型: ...
- 建议操作: [买入/持有/减仓/观望]
- 仓位建议: ...
- 风险提示: ...`;
}

// ============================================================================
// Debate Conclusion Parsing
// ============================================================================

/**
 * Parse moderator response to structured conclusion
 * / 解析主持人回复为结构化结论
 */
export function parseModeratorConclusion(
  moderatorResponse: string,
): DebateConclusion {
  // Default values
  const conclusion: DebateConclusion = {
    keyBullPoints: [],
    keyBearPoints: [],
    riskFactors: [],
    opportunityFactors: [],
    finalVerdict: "neutral",
    confidenceLevel: 50,
  };

  // Extract bull points
  const bullMatch = moderatorResponse.match(
    /## 多头核心观点\n([\s\S]*?)(?=## )/,
  );
  if (bullMatch && bullMatch[1]) {
    conclusion.keyBullPoints = extractListItems(bullMatch[1]);
  }

  // Extract bear points
  const bearMatch = moderatorResponse.match(
    /## 空头核心观点\n([\s\S]*?)(?=## )/,
  );
  if (bearMatch && bearMatch[1]) {
    conclusion.keyBearPoints = extractListItems(bearMatch[1]);
  }

  // Extract verdict
  const verdictMatch = moderatorResponse.match(
    /最终判断[：:]\s*\[?([偏多偏空中性]+)\]?/,
  );
  if (verdictMatch && verdictMatch[1]) {
    const verdictText = verdictMatch[1];
    if (verdictText && verdictText.includes("偏多")) {
      conclusion.finalVerdict = "bullish";
    } else if (verdictText && verdictText.includes("偏空")) {
      conclusion.finalVerdict = "bearish";
    } else {
      conclusion.finalVerdict = "neutral";
    }
  }

  // Extract confidence
  const confidenceMatch = moderatorResponse.match(
    /置信度[：:]\s*\[?(\d+)\]?%?/,
  );
  if (confidenceMatch && confidenceMatch[1]) {
    conclusion.confidenceLevel = parseInt(confidenceMatch[1], 10);
  }

  // Extract suggested action
  const actionMatch = moderatorResponse.match(
    /建议操作[：:]\s*\[?([^\]\n]+)\]?/,
  );
  if (actionMatch && actionMatch[1]) {
    conclusion.suggestedAction = actionMatch[1].trim();
  }

  // Extract consensus
  const consensusMatch = moderatorResponse.match(
    /## 共识与分歧\n([\s\S]*?)(?=## )/,
  );
  if (consensusMatch && consensusMatch[1]) {
    conclusion.consensus = consensusMatch[1].trim();
  }

  return conclusion;
}

function extractListItems(text: string): string[] {
  const items: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // Match numbered or bulleted items
    const match =
      line.match(/^[\d\-\*]\.\s*(.+)$/) || line.match(/^[\-\*]\s*(.+)$/);
    if (match && match[1]) {
      items.push(match[1].trim());
    }
  }

  return items;
}

// ============================================================================
// Debate Session Formatting
// ============================================================================

/**
 * Format debate session for display / 格式化辩论会话用于展示
 */
export function formatDebateSession(session: DebateSession): string {
  let output = `# 辩论会话: ${session.topic}\n\n`;

  if (session.symbol) {
    output += `**标的**: ${session.symbol}\n\n`;
  }

  output += `---\n\n`;

  // Group arguments by round
  const rounds: Map<number, DebateArgument[]> = new Map();
  for (const arg of session.arguments) {
    if (!rounds.has(arg.round)) {
      rounds.set(arg.round, []);
    }
    const roundArgs = rounds.get(arg.round);
    if (roundArgs) {
      roundArgs.push(arg);
    }
  }

  // Output each round
  const roundEntries = Array.from(rounds.entries());
  for (const [round, args] of roundEntries) {
    output += `## 第 ${round} 轮\n\n`;

    for (const arg of args) {
      const stanceLabel =
        arg.stance === "bull" ? "🐂 多头研究员" : "🐻 空头研究员";
      output += `### ${stanceLabel}\n\n${arg.content}\n\n`;
    }
  }

  // Output conclusion if available
  if (session.conclusion) {
    output += formatDebateConclusion(session.conclusion);
  }

  return output;
}

/**
 * Format debate conclusion / 格式化辩论结论
 */
export function formatDebateConclusion(conclusion: DebateConclusion): string {
  const verdictEmoji =
    conclusion.finalVerdict === "bullish"
      ? "📈"
      : conclusion.finalVerdict === "bearish"
        ? "📉"
        : "➖";
  const verdictText =
    conclusion.finalVerdict === "bullish"
      ? "偏多"
      : conclusion.finalVerdict === "bearish"
        ? "偏空"
        : "中性";

  let output = `---

## ⚖️ 综合结论

**最终判断**: ${verdictEmoji} ${verdictText}
**置信度**: ${conclusion.confidenceLevel}%

### 多头核心论点
${conclusion.keyBullPoints.map((p) => `- ${p}`).join("\n")}

### 空头核心论点
${conclusion.keyBearPoints.map((p) => `- ${p}`).join("\n")}`;

  if (conclusion.consensus) {
    output += `\n\n### 共识\n${conclusion.consensus}`;
  }

  if (conclusion.suggestedAction) {
    output += `\n\n### 操作建议\n${conclusion.suggestedAction}`;
  }

  if (conclusion.riskFactors.length > 0) {
    output += `\n\n### 风险因素\n${conclusion.riskFactors.map((r) => `- ${r}`).join("\n")}`;
  }

  return output;
}

// ============================================================================
// Debate Session Validation
// ============================================================================

/**
 * Check if debate is complete / 检查辩论是否完成
 */
export function isDebateComplete(session: DebateSession): boolean {
  const bullArgs = session.arguments.filter((a) => a.stance === "bull").length;
  const bearArgs = session.arguments.filter((a) => a.stance === "bear").length;

  return bullArgs >= session.rounds && bearArgs >= session.rounds;
}

/**
 * Get next speaker in debate / 获取辩论中的下一位发言者
 */
export function getNextSpeaker(
  session: DebateSession,
): "bull" | "bear" | "moderator" | null {
  const bullArgs = session.arguments.filter((a) => a.stance === "bull").length;
  const bearArgs = session.arguments.filter((a) => a.stance === "bear").length;

  // Check if debate is complete
  if (bullArgs >= session.rounds && bearArgs >= session.rounds) {
    // Check if conclusion exists
    if (!session.conclusion) {
      return "moderator";
    }
    return null;
  }

  // Alternate between bull and bear, starting with bull
  if (bullArgs <= bearArgs) {
    return "bull";
  }
  return "bear";
}

/**
 * Get current round number / 获取当前轮次
 */
export function getCurrentRound(session: DebateSession): number {
  const bullArgs = session.arguments.filter((a) => a.stance === "bull").length;
  const bearArgs = session.arguments.filter((a) => a.stance === "bear").length;

  return Math.min(Math.max(bullArgs, bearArgs) + 1, session.rounds);
}
