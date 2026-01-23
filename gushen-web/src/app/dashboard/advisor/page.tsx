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
 * Framework Overview Component
 * 框架概览组件
 */
function FrameworkOverview() {
  return (
    <div className="px-4 py-3 bg-surface/50 border-b border-border">
      <div className="flex items-start gap-6 text-xs">
        {/* Three Dao */}
        {/* 三道 */}
        <div>
          <h4 className="text-accent font-semibold mb-1">三道（战略层）</h4>
          <div className="space-y-0.5 text-white/50">
            <div>
              <span className="text-white/70">天道</span> 宏观环境·周期·政策
            </div>
            <div>
              <span className="text-white/70">地道</span> 市场结构·行业·技术
            </div>
            <div>
              <span className="text-white/70">人道</span> 情绪资金·持仓·行为
            </div>
          </div>
        </div>

        {/* Six Shu */}
        {/* 六术 */}
        <div>
          <h4 className="text-accent font-semibold mb-1">六术（战术层）</h4>
          <div className="flex gap-4 text-white/50">
            <div className="space-y-0.5">
              <div>
                <span className="text-white/70">政策术</span> 政策解读
              </div>
              <div>
                <span className="text-white/70">资金术</span> 资金追踪
              </div>
              <div>
                <span className="text-white/70">基本术</span> 估值分析
              </div>
            </div>
            <div className="space-y-0.5">
              <div>
                <span className="text-white/70">技术术</span> 形态信号
              </div>
              <div>
                <span className="text-white/70">情绪术</span> 情绪监控
              </div>
              <div>
                <span className="text-white/70">风控术</span> 风险管理
              </div>
            </div>
          </div>
        </div>

        {/* Core Philosophy + Powered By */}
        {/* 核心理念 + 技术支持 */}
        <div className="ml-auto text-right">
          <h4 className="text-accent font-semibold mb-1">核心理念</h4>
          <div className="text-white/50">
            <div>决策质量 &gt; 执行速度</div>
            <div>深度理解 &gt; 快速反应</div>
            <div>系统思考 &gt; 碎片信息</div>
          </div>
          <div className="mt-2 pt-2 border-t border-border text-white/30">
            Powered by DeepSeek + 三道六术
          </div>
        </div>
      </div>
    </div>
  );
}
