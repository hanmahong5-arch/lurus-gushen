"use client";

/**
 * Investment Advisor Page
 * 投资顾问页面
 *
 * Main page for the 3-Dao 6-Shu investment decision framework
 * 三道六术投资决策框架的主页面
 */

import dynamic from "next/dynamic";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Dynamic import to avoid SSR issues with chat component
// 动态导入以避免聊天组件的SSR问题
const AdvisorChat = dynamic(() => import("@/components/advisor/advisor-chat"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">加载中...</div>
    </div>
  ),
});

export default function AdvisorPage() {
  return (
    <div className="min-h-screen bg-background text-white">
      {/* Unified Dashboard Header with account status */}
      {/* 统一的仪表板头部，包含账户状态 */}
      <DashboardHeader />

      {/* Main Content */}
      {/* 主要内容 */}
      <main className="max-w-5xl mx-auto h-[calc(100vh-56px)]">
        <div className="h-full flex flex-col">
          {/* Framework Introduction (collapsible) */}
          {/* 框架介绍（可折叠） */}
          <FrameworkOverview />

          {/* Chat Interface */}
          {/* 聊天界面 */}
          <div className="flex-1 min-h-0">
            <AdvisorChat className="h-full" />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Framework Overview Component (Redesigned)
 * 框架概览组件（重新设计）
 *
 * Changed: Removed explicit "三道六术" labels, now shows compact philosophy hint
 * 修改：移除了明确的"三道六术"标签，现在显示紧凑的投资理念提示
 */
function FrameworkOverview() {
  return (
    <div className="px-4 py-2 bg-surface/30 border-b border-border">
      <div className="flex items-center justify-between text-xs">
        {/* Core Philosophy Hint */}
        {/* 核心理念提示 */}
        <div className="flex items-center gap-4 text-white/50">
          <span className="text-accent">💡</span>
          <span>
            <span className="text-white/70">决策质量</span> &gt; 执行速度 ·{" "}
            <span className="text-white/70">深度理解</span> &gt; 快速反应 ·{" "}
            <span className="text-white/70">系统思考</span> &gt; 碎片信息
          </span>
        </div>

        {/* Powered By */}
        {/* 技术支持 */}
        <div className="text-white/30">
          Powered by DeepSeek + Multi-Agent
        </div>
      </div>
    </div>
  );
}
