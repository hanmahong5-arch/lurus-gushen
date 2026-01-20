/**
 * GuShen Agentic Advisor - Main Module Index
 *
 * Comprehensive investment advisory system combining:
 * - Multi-Agent architecture (analysts, researchers, masters)
 * - Prediction system (proactive monitoring and alerts)
 * - Reaction system (real-time analysis and debates)
 * - Dynamic context building with token management
 *
 * Reference: ai-hedge-fund, TradingAgents (UCLA), FinRobot
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  InvestmentPhilosophy,
  AnalysisMethod,
  TradingStyle,
  SpecialtyStrategy,
  AgentType,

  // Agent types
  AgentRole,
  AnalystAgent,
  ResearcherAgent,
  ResearcherStance,
  MasterAgent,

  // Context types
  AdvisorContext,
  ChatMode,
  AnalysisRequest,
  MarketDataSnapshot,
  TokenBudget,

  // Debate types
  DebateSession,
  DebateArgument,
  DebateConclusion,

  // Alert types
  AlertType,
  AlertPriority,
  ProactiveAlert,

  // User types
  NotificationPreferences,
  UserFeedback,
  SavedAdvisorPreferences,
} from "./agent/types";

export { TOKEN_LIMITS } from "./agent/types";

// ============================================================================
// Agent Exports
// ============================================================================

// Analysts
export {
  FUNDAMENTALS_ANALYST,
  TECHNICAL_ANALYST,
  SENTIMENT_ANALYST,
  MACRO_ANALYST,
  ALL_ANALYSTS,
  getAnalystById,
  getAnalystsByMethod,
  recommendAnalyst,
} from "./agent/analyst-agents";

// Researchers
export {
  BULL_RESEARCHER,
  BEAR_RESEARCHER,
  DEBATE_MODERATOR,
  ALL_RESEARCHERS,
  getDebateTeam,
  generateDebatePrompt,
  generateModeratorPrompt,
} from "./agent/researcher-agents";

// Master Investors
export {
  BUFFETT_AGENT,
  LYNCH_AGENT,
  LIVERMORE_AGENT,
  SIMONS_AGENT,
  ALL_MASTER_AGENTS,
  getMasterAgentById,
  getMasterAgentByPhilosophy,
  getMasterAgentSummaries,
} from "./agent/master-agents";

// Orchestrator
export {
  selectAgents,
  getAllAgents,
  estimateTokens,
  calculateTokenBudget,
  buildContextPrompt,
  buildAgentPrompt,
  buildDebatePrompt as buildDebatePromptFromOrchestrator,
  buildModeratorPrompt as buildModeratorPromptFromOrchestrator,
  createExecutionPlan,
  type AgentExecutionPlan,
} from "./agent/agent-orchestrator";

// ============================================================================
// Philosophy Exports
// ============================================================================

export {
  PHILOSOPHY_DEFINITIONS,
  ANALYSIS_METHOD_DEFINITIONS,
  TRADING_STYLE_DEFINITIONS,
  SPECIALTY_STRATEGY_DEFINITIONS,
  getPhilosophyPrompt,
  getAnalysisMethodPrompt,
  getTradingStylePrompt,
  getSpecialtyStrategyPrompt,
  getPhilosophyOptions,
  getAnalysisMethodOptions,
  getTradingStyleOptions,
  getSpecialtyStrategyOptions,
  type PhilosophyDefinition,
  type AnalysisMethodDefinition,
  type TradingStyleDefinition,
  type SpecialtyStrategyDefinition,
} from "./philosophies";

// ============================================================================
// Context Builder Exports
// ============================================================================

export {
  buildAdvisorSystemPrompt,
  getDefaultAdvisorContext,
  normalizeContext,
  getContextSummary,
  estimateTokens as estimateContextTokens,
  type BuiltContext,
} from "./context-builder";

// ============================================================================
// Prediction System Exports
// ============================================================================

export {
  generatePriceBreakoutAlert,
  generateVolumeSurgeAlert,
  generateTechnicalSignalAlert,
  generateRiskWarningAlert,
  generateOpportunityAlert,
  generateMorningBriefingAlert,
  generateClosingSummaryAlert,
  sortAlerts,
  filterExpiredAlerts,
  filterAlertsByType,
  getUnreadAlerts,
  markAlertAsRead,
  getAlertCountByPriority,
} from "./prediction/alert-generator";

// ============================================================================
// Reaction System Exports
// ============================================================================

export {
  createDebateSession,
  addDebateArgument,
  setDebateConclusion,
  generateDebatePrompts,
  parseModeratorConclusion,
  formatDebateSession,
  formatDebateConclusion,
  isDebateComplete,
  getNextSpeaker,
  getCurrentRound,
  type DebateConfig,
  type DebatePrompts,
} from "./reaction/debate-engine";

// ============================================================================
// Utility Functions for UI
// ============================================================================

/**
 * Get all agent options for UI display / 获取所有 Agent 选项用于前端展示
 */
export function getAgentOptions() {
  return {
    analysts: [
      {
        id: "fundamental_analyst",
        name: "基本面分析师",
        nameEn: "Fundamentals Analyst",
        icon: "📊",
      },
      {
        id: "technical_analyst",
        name: "技术分析师",
        nameEn: "Technical Analyst",
        icon: "📈",
      },
      {
        id: "sentiment_analyst",
        name: "情绪分析师",
        nameEn: "Sentiment Analyst",
        icon: "💭",
      },
      {
        id: "macro_analyst",
        name: "宏观分析师",
        nameEn: "Macro Analyst",
        icon: "🌍",
      },
    ],
    researchers: [
      {
        id: "bull_researcher",
        name: "多头研究员",
        nameEn: "Bull Researcher",
        icon: "🐂",
      },
      {
        id: "bear_researcher",
        name: "空头研究员",
        nameEn: "Bear Researcher",
        icon: "🐻",
      },
    ],
    masters: [
      {
        id: "buffett_agent",
        name: "巴菲特视角",
        nameEn: "Warren Buffett",
        icon: "🏛️",
        philosophy: "value",
      },
      {
        id: "lynch_agent",
        name: "彼得·林奇视角",
        nameEn: "Peter Lynch",
        icon: "🔍",
        philosophy: "growth",
      },
      {
        id: "livermore_agent",
        name: "利弗莫尔视角",
        nameEn: "Jesse Livermore",
        icon: "📉",
        philosophy: "trend",
      },
      {
        id: "simons_agent",
        name: "西蒙斯视角",
        nameEn: "Jim Simons",
        icon: "🔢",
        philosophy: "quantitative",
      },
    ],
  };
}

/**
 * Get chat mode options for UI / 获取对话模式选项
 */
export function getChatModeOptions() {
  return [
    {
      id: "quick",
      name: "快速问答",
      nameEn: "Quick Q&A",
      icon: "⚡",
      description: "简洁快速的回答，适合简单问题",
      tokenLimit: 1500,
    },
    {
      id: "deep",
      name: "深度分析",
      nameEn: "Deep Analysis",
      icon: "🔍",
      description: "全面深入的分析报告",
      tokenLimit: 3000,
    },
    {
      id: "debate",
      name: "多空辩论",
      nameEn: "Bull vs Bear",
      icon: "⚔️",
      description: "多空双方辩论，获取平衡观点",
      tokenLimit: 4000,
    },
    {
      id: "diagnose",
      name: "组合诊断",
      nameEn: "Portfolio Diagnosis",
      icon: "🏥",
      description: "多维度分析持仓组合",
      tokenLimit: 2500,
    },
  ];
}

/**
 * Get alert type labels for UI / 获取预警类型标签
 */
export function getAlertTypeLabels(): Record<
  string,
  { name: string; icon: string }
> {
  return {
    price_breakout: { name: "价格突破", icon: "📊" },
    volume_surge: { name: "放量异动", icon: "📈" },
    sentiment_reversal: { name: "情绪反转", icon: "🔄" },
    news_impact: { name: "重大新闻", icon: "📰" },
    technical_signal: { name: "技术信号", icon: "📉" },
    risk_warning: { name: "风险预警", icon: "⚠️" },
    opportunity: { name: "投资机会", icon: "💡" },
    portfolio_rebalance: { name: "组合调仓", icon: "⚖️" },
    morning_briefing: { name: "每日晨报", icon: "🌅" },
    closing_summary: { name: "收盘总结", icon: "🌙" },
  };
}

/**
 * Get priority labels for UI / 获取优先级标签
 */
export function getPriorityLabels(): Record<
  string,
  { name: string; color: string }
> {
  return {
    urgent: { name: "紧急", color: "red" },
    high: { name: "高", color: "orange" },
    medium: { name: "中", color: "yellow" },
    low: { name: "低", color: "green" },
  };
}
