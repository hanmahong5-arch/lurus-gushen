"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { SubscriptionSettings } from "@/components/settings/subscription-settings";

/**
 * Settings tab type
 */
type SettingsTab = "profile" | "security" | "notifications" | "subscription";

/**
 * Tab configuration with metadata
 */
const TABS: Array<{
  id: SettingsTab;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
}> = [
  {
    id: "profile",
    label: "个人资料",
    labelEn: "Profile",
    icon: "👤",
    description: "管理您的个人信息和偏好设置",
  },
  {
    id: "security",
    label: "安全设置",
    labelEn: "Security",
    icon: "🔒",
    description: "密码、两步验证和登录设备管理",
  },
  {
    id: "notifications",
    label: "通知设置",
    labelEn: "Notifications",
    icon: "🔔",
    description: "配置邮件、推送和系统通知",
  },
  {
    id: "subscription",
    label: "订阅管理",
    labelEn: "Subscription",
    icon: "💎",
    description: "查看套餐详情和升级服务",
  },
];

/**
 * User Settings Page
 * 用户设置页面
 *
 * Features:
 * - Profile management (display name, avatar, timezone)
 * - Security settings (password change, 2FA, sessions)
 * - Notification preferences (email, push, system)
 * - Subscription management (plan details, upgrade)
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  /**
   * Render active tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "security":
        return <SecuritySettings />;
      case "notifications":
        return <NotificationSettings />;
      case "subscription":
        return <SubscriptionSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-400 flex items-center justify-center">
                <span className="text-primary-600 font-bold">G</span>
              </div>
              <span className="text-lg font-bold text-white">
                GuShen<span className="text-accent">.</span>
              </span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-white/60 hover:text-white text-sm transition"
              >
                策略编辑器
              </Link>
              <Link
                href="/dashboard/advisor"
                className="text-white/60 hover:text-white text-sm transition"
              >
                投资顾问
              </Link>
              <Link
                href="/dashboard/trading"
                className="text-white/60 hover:text-white text-sm transition"
              >
                交易面板
              </Link>
              <Link
                href="/dashboard/history"
                className="text-white/60 hover:text-white text-sm transition"
              >
                历史记录
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-accent text-sm font-medium"
              >
                设置
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">演示账户</span>
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-sm">D</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            账户设置
            <span className="text-base font-normal text-white/50 ml-2">
              / Account Settings
            </span>
          </h1>
          <p className="text-white/60">
            管理您的账户信息、安全设置和订阅服务
          </p>
        </div>

        {/* Settings layout */}
        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? "bg-accent/10 border border-accent/30 text-accent"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{tab.label}</div>
                    <div className="text-xs text-white/40 truncate">
                      {tab.labelEn}
                    </div>
                  </div>
                  {activeTab === tab.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </nav>

            {/* Help link */}
            <div className="mt-8 p-4 bg-surface rounded-lg border border-border">
              <h4 className="text-sm font-medium text-white mb-2">
                需要帮助？
              </h4>
              <p className="text-xs text-white/50 mb-3">
                查看帮助文档或联系客服获取支持
              </p>
              <Link
                href="/docs"
                className="text-xs text-accent hover:text-accent/80 transition"
              >
                查看帮助文档 →
              </Link>
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Tab header */}
            <div className="mb-6 pb-4 border-b border-border">
              {TABS.filter((t) => t.id === activeTab).map((tab) => (
                <div key={tab.id}>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span>{tab.icon}</span>
                    {tab.label}
                    <span className="text-sm font-normal text-white/40">
                      {tab.labelEn}
                    </span>
                  </h2>
                  <p className="text-sm text-white/50 mt-1">{tab.description}</p>
                </div>
              ))}
            </div>

            {/* Tab content */}
            <div className="bg-surface rounded-xl border border-border p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
