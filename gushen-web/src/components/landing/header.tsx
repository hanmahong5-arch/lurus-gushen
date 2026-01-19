"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-400 flex items-center justify-center">
              <span className="text-primary-600 font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold text-white">
              GuShen
              <span className="text-accent">.</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-white/70 hover:text-white transition"
            >
              策略编辑 / Strategy
            </Link>
            <Link
              href="/dashboard/trading"
              className="text-white/70 hover:text-white transition"
            >
              交易面板 / Trading
            </Link>
            <Link
              href="/dashboard/advisor"
              className="text-white/70 hover:text-white transition"
            >
              投资顾问 / Advisor
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
            ) : session ? (
              // Logged in state
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white hidden sm:block">
                    {session.user?.name || session.user?.email}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="text-sm font-medium text-white truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {session.user?.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                        {(session.user as any)?.role === "premium"
                          ? "Premium"
                          : (session.user as any)?.role === "standard"
                            ? "Standard"
                            : "Free"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      控制台
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      账户设置
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Logged out state
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    登录 / Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">免费试用</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
