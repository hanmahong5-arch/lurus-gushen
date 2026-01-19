"use client";

/**
 * Stock Ranking Component
 * 股票排行榜组件
 *
 * Displays ranking of stocks by performance metrics
 * 按表现指标展示股票排名
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES / 类型定义
// =============================================================================

export interface StockRankingItem {
  rank: number;
  symbol: string;
  stockName: string;
  signalCount: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  maxReturn: number;
  minReturn: number;
}

interface StockRankingProps {
  data: StockRankingItem[];
  className?: string;
}

type SortField = "rank" | "signalCount" | "winRate" | "avgReturn" | "totalReturn";
type SortDirection = "asc" | "desc";

// =============================================================================
// COMPONENT / 组件
// =============================================================================

export function StockRanking({ data, className = "" }: StockRankingProps) {
  const [sortField, setSortField] = useState<SortField>("avgReturn");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAll, setShowAll] = useState(false);

  // Sort data
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "rank":
          comparison = a.rank - b.rank;
          break;
        case "signalCount":
          comparison = a.signalCount - b.signalCount;
          break;
        case "winRate":
          comparison = a.winRate - b.winRate;
          break;
        case "avgReturn":
          comparison = a.avgReturn - b.avgReturn;
          break;
        case "totalReturn":
          comparison = a.totalReturn - b.totalReturn;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Display data (limited or all)
  const displayData = showAll ? sortedData : sortedData.slice(0, 10);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  };

  if (!data || data.length === 0) {
    return (
      <div className={`bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-medium text-white">
              股票排行榜 / Stock Ranking
            </span>
          </div>
        </div>
        <div className="p-8 text-center text-white/40">
          <p>暂无数据 / No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-medium text-white">
            股票排行榜 / Stock Ranking
          </span>
        </div>
        <span className="text-xs text-white/40">
          共 {data.length} 只股票
        </span>
      </div>

      <div className="p-4">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/50 text-xs border-b border-border">
                <th
                  className="text-left py-2 px-2 cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("rank")}
                >
                  # {renderSortIndicator("rank")}
                </th>
                <th className="text-left py-2 px-2">股票 / Stock</th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("signalCount")}
                >
                  信号 {renderSortIndicator("signalCount")}
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("winRate")}
                >
                  胜率 {renderSortIndicator("winRate")}
                </th>
                <th
                  className="text-right py-2 px-2 cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("avgReturn")}
                >
                  平均收益 {renderSortIndicator("avgReturn")}
                </th>
                <th
                  className="text-right py-2 px-2 cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("totalReturn")}
                >
                  累计收益 {renderSortIndicator("totalReturn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((stock, index) => (
                <tr
                  key={stock.symbol}
                  className={cn(
                    "border-b border-border/50 hover:bg-white/5 transition",
                    index < 3 && "bg-accent/5"
                  )}
                >
                  <td className="py-2 px-2">
                    <RankBadge rank={index + 1} />
                  </td>
                  <td className="py-2 px-2">
                    <div className="text-white font-medium">{stock.stockName}</div>
                    <div className="text-xs text-white/40">{stock.symbol}</div>
                  </td>
                  <td className="py-2 px-2 text-center text-white/70">
                    {stock.signalCount}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <WinRateBadge winRate={stock.winRate} />
                  </td>
                  <td
                    className={cn(
                      "py-2 px-2 text-right font-medium",
                      stock.avgReturn >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {stock.avgReturn >= 0 ? "+" : ""}
                    {stock.avgReturn.toFixed(2)}%
                  </td>
                  <td
                    className={cn(
                      "py-2 px-2 text-right",
                      stock.totalReturn >= 0 ? "text-profit/70" : "text-loss/70"
                    )}
                  >
                    {stock.totalReturn >= 0 ? "+" : ""}
                    {stock.totalReturn.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show more/less */}
        {data.length > 10 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="px-4 py-2 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition"
            >
              {showAll ? "收起 / Collapse" : `显示全部 ${data.length} 只 / Show All`}
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-xs text-white/40">平均胜率</div>
            <div className="text-sm font-medium text-white">
              {(data.reduce((sum, d) => sum + d.winRate, 0) / data.length).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40">平均收益</div>
            <div
              className={cn(
                "text-sm font-medium",
                data.reduce((sum, d) => sum + d.avgReturn, 0) / data.length >= 0
                  ? "text-profit"
                  : "text-loss"
              )}
            >
              {(data.reduce((sum, d) => sum + d.avgReturn, 0) / data.length).toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40">盈利股票</div>
            <div className="text-sm font-medium text-profit">
              {data.filter((d) => d.avgReturn > 0).length}/{data.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS / 子组件
// =============================================================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="text-lg">🥇</span>;
  }
  if (rank === 2) {
    return <span className="text-lg">🥈</span>;
  }
  if (rank === 3) {
    return <span className="text-lg">🥉</span>;
  }
  return <span className="text-white/40">{rank}</span>;
}

function WinRateBadge({ winRate }: { winRate: number }) {
  let bgColor: string;
  let textColor: string;

  if (winRate >= 70) {
    bgColor = "bg-profit/20";
    textColor = "text-profit";
  } else if (winRate >= 50) {
    bgColor = "bg-accent/20";
    textColor = "text-accent";
  } else if (winRate >= 30) {
    bgColor = "bg-yellow-500/20";
    textColor = "text-yellow-500";
  } else {
    bgColor = "bg-loss/20";
    textColor = "text-loss";
  }

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", bgColor, textColor)}>
      {winRate.toFixed(0)}%
    </span>
  );
}

export default StockRanking;
