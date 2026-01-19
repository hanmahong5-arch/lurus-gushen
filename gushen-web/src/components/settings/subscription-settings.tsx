"use client";

import { useState } from "react";

/**
 * Subscription plan type
 */
type PlanId = "free" | "standard" | "premium";

/**
 * Plan configuration
 */
interface Plan {
  id: PlanId;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Array<{ text: string; included: boolean }>;
  highlighted?: boolean;
}

/**
 * Subscription plans data
 */
const PLANS: Plan[] = [
  {
    id: "free",
    name: "顾婶",
    nameEn: "GuShen Aunt",
    icon: "👵",
    description: "投资小白的贴心助手",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: "基础市场资讯", included: true },
      { text: "术语解释和入门教育", included: true },
      { text: "每日3次AI对话", included: true },
      { text: "行业轮动分析", included: false },
      { text: "个股深度分析", included: false },
      { text: "邮件推送服务", included: false },
      { text: "实时信号通知", included: false },
    ],
  },
  {
    id: "standard",
    name: "估神",
    nameEn: "GuShen Master",
    icon: "🧙",
    description: "把握大势的方向指南",
    priceMonthly: 99,
    priceYearly: 999,
    features: [
      { text: "包含顾婶所有功能", included: true },
      { text: "行业轮动分析", included: true },
      { text: "宏观政策解读", included: true },
      { text: "三道六术框架分析", included: true },
      { text: "每日50次AI对话", included: true },
      { text: "个股深度分析", included: false },
      { text: "邮件推送服务", included: false },
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "股神",
    nameEn: "GuShen God",
    icon: "🏆",
    description: "精准选股的私人顾问",
    priceMonthly: 999,
    priceYearly: 9999,
    features: [
      { text: "包含估神所有功能", included: true },
      { text: "个股深度分析", included: true },
      { text: "AI选股推荐", included: true },
      { text: "每日邮件推送", included: true },
      { text: "实时信号通知", included: true },
      { text: "私人投顾1对1", included: true },
      { text: "无限AI对话", included: true },
    ],
  },
];

/**
 * Subscription Settings Component
 * 订阅管理组件
 *
 * Features:
 * - Current plan display
 * - Plan comparison
 * - Upgrade/downgrade options
 * - Billing history
 * - Usage statistics
 */
export function SubscriptionSettings() {
  // Mock current subscription - in production, this would come from API
  const [currentPlan] = useState<PlanId>("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Mock usage data
  const usage = {
    conversationsUsed: 2,
    conversationsLimit: 3,
    analysisUsed: 0,
    analysisLimit: 0,
    resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  };

  /**
   * Handle plan upgrade
   */
  const handleUpgrade = async (planId: PlanId) => {
    if (planId === currentPlan) return;

    setIsUpgrading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    alert(`升级到${PLANS.find((p) => p.id === planId)?.name}功能即将推出！\nUpgrade to ${planId} coming soon!`);

    setIsUpgrading(false);
  };

  /**
   * Format price display
   */
  const formatPrice = (price: number): string => {
    if (price === 0) return "免费";
    return `¥${price}`;
  };

  /**
   * Get current plan details
   */
  const currentPlanDetails = PLANS.find((p) => p.id === currentPlan);

  return (
    <div className="space-y-8">
      {/* Current subscription */}
      <div className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center text-3xl">
              {currentPlanDetails?.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  {currentPlanDetails?.name}
                </h3>
                <span className="text-sm text-white/50">
                  {currentPlanDetails?.nameEn}
                </span>
              </div>
              <p className="text-sm text-white/60 mt-1">
                {currentPlanDetails?.description}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-2 py-0.5 text-xs rounded-full bg-profit/20 text-profit border border-profit/30">
                  ✓ 当前套餐
                </span>
                {currentPlan === "free" && (
                  <span className="text-xs text-white/40">
                    永久免费使用
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage statistics */}
      <div>
        <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
          📊 使用量统计
          <span className="text-white/40 font-normal">Usage</span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Conversations */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">AI对话</span>
              <span className="text-sm text-white">
                {usage.conversationsUsed} / {usage.conversationsLimit === Infinity ? "∞" : usage.conversationsLimit}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{
                  width: `${Math.min((usage.conversationsUsed / usage.conversationsLimit) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              {usage.resetDate.toLocaleDateString("zh-CN")} 重置
            </p>
          </div>

          {/* Analysis */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">深度分析</span>
              <span className="text-sm text-white">
                {usage.analysisLimit === 0 ? (
                  <span className="text-white/40">不可用</span>
                ) : (
                  `${usage.analysisUsed} / ${usage.analysisLimit}`
                )}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/20 rounded-full"
                style={{ width: "0%" }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              升级后解锁
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Plan comparison */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            💎 套餐对比
            <span className="text-white/40 font-normal">Plans</span>
          </h3>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                billingCycle === "monthly"
                  ? "bg-accent text-primary-600 font-medium"
                  : "text-white/60 hover:text-white"
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                billingCycle === "yearly"
                  ? "bg-accent text-primary-600 font-medium"
                  : "text-white/60 hover:text-white"
              }`}
            >
              年付
              <span className="ml-1 text-xs text-profit">省17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-5 rounded-xl border transition ${
                plan.highlighted
                  ? "bg-accent/5 border-accent/40"
                  : "bg-white/5 border-white/10"
              } ${plan.id === currentPlan ? "ring-2 ring-accent" : ""}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs rounded-full bg-accent text-primary-600 font-medium">
                  推荐
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">{plan.icon}</div>
                <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                <p className="text-xs text-white/50">{plan.nameEn}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-white">
                  {formatPrice(billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly)}
                </div>
                {plan.priceMonthly > 0 && (
                  <p className="text-xs text-white/40">
                    /{billingCycle === "monthly" ? "月" : "年"}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center gap-2 text-xs ${
                      feature.included ? "text-white/70" : "text-white/30"
                    }`}
                  >
                    <span className={feature.included ? "text-profit" : "text-white/20"}>
                      {feature.included ? "✓" : "✗"}
                    </span>
                    {feature.text}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === currentPlan || isUpgrading}
                className={`w-full py-2 text-sm rounded-lg font-medium transition ${
                  plan.id === currentPlan
                    ? "bg-white/10 text-white/50 cursor-not-allowed"
                    : plan.highlighted
                    ? "bg-accent text-primary-600 hover:bg-accent/90"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {plan.id === currentPlan
                  ? "当前套餐"
                  : plan.id === "free"
                  ? "降级"
                  : "升级"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Billing history hint */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <h4 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
          🧾 账单历史
          <span className="text-white/40 font-normal">Billing History</span>
        </h4>
        <p className="text-xs text-white/50 mb-3">
          查看历史账单和发票下载
        </p>
        <button
          onClick={() => alert("账单历史功能即将推出 / Billing history coming soon")}
          className="text-sm text-accent hover:text-accent/80 transition"
        >
          查看账单历史 →
        </button>
      </div>

      {/* FAQ */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <h4 className="text-sm font-medium text-white mb-3">
          常见问题
        </h4>
        <div className="space-y-3 text-xs">
          <details className="group">
            <summary className="text-white/70 cursor-pointer hover:text-white transition">
              如何升级套餐？
            </summary>
            <p className="text-white/50 mt-1 pl-4">
              选择您需要的套餐并点击升级按钮，按照指引完成支付即可。
            </p>
          </details>
          <details className="group">
            <summary className="text-white/70 cursor-pointer hover:text-white transition">
              可以随时取消订阅吗？
            </summary>
            <p className="text-white/50 mt-1 pl-4">
              是的，您可以随时取消订阅。取消后，您可以继续使用到当前计费周期结束。
            </p>
          </details>
          <details className="group">
            <summary className="text-white/70 cursor-pointer hover:text-white transition">
              支持哪些支付方式？
            </summary>
            <p className="text-white/50 mt-1 pl-4">
              目前支持支付宝、微信支付和银行卡支付。
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
