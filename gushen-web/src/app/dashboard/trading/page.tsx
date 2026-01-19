"use client";

/**
 * Trading Dashboard Page with K-line Chart and Real-time Data
 * 交易面板页面，包含K线图表和实时数据
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMajorIndices, useNorthBoundFlow } from "@/hooks/use-market-data";
import { DataStatusPanel } from "@/components/dashboard/data-status-panel";

// Dynamically import chart to avoid SSR issues with canvas
// 动态导入图表以避免 SSR 与 canvas 的兼容问题
const KLineChart = dynamic(
  () => import("@/components/charts/kline-chart").then((mod) => mod.KLineChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-surface rounded-xl border border-border h-[500px] flex items-center justify-center">
        <div className="text-white/50">加载图表中...</div>
      </div>
    ),
  },
);

// Position type definition
// 持仓类型定义
interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

// Order type definition
// 订单类型定义
interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market" | "stop-loss";
  price: number;
  size: number;
  filled: number;
  status: "open" | "filled" | "cancelled";
  time: string;
}

// Initial mock position data
// 初始模拟持仓数据
const INITIAL_POSITIONS: Position[] = [
  {
    symbol: "BTC/USDT",
    side: "long",
    size: 0.5,
    entryPrice: 43250.0,
    currentPrice: 45120.0,
    pnl: 935.0,
    pnlPercent: 4.32,
  },
  {
    symbol: "ETH/USDT",
    side: "long",
    size: 5.0,
    entryPrice: 2280.0,
    currentPrice: 2350.0,
    pnl: 350.0,
    pnlPercent: 3.07,
  },
  {
    symbol: "SOL/USDT",
    side: "short",
    size: 50,
    entryPrice: 98.5,
    currentPrice: 95.2,
    pnl: 165.0,
    pnlPercent: 3.35,
  },
];

// Initial mock order data
// 初始模拟订单数据
const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD001",
    symbol: "BTC/USDT",
    side: "buy",
    type: "limit",
    price: 44000.0,
    size: 0.2,
    filled: 0,
    status: "open",
    time: "2026-01-17 10:30:00",
  },
  {
    id: "ORD002",
    symbol: "ETH/USDT",
    side: "sell",
    type: "stop-loss",
    price: 2200.0,
    size: 2.5,
    filled: 0,
    status: "open",
    time: "2026-01-17 09:15:00",
  },
];

// Default symbol list (fallback when API is unavailable)
// 默认交易对列表（API不可用时的备用）
const DEFAULT_SYMBOLS = [
  { symbol: "BTC/USDT", price: 45120.0, change: 2.35 },
  { symbol: "ETH/USDT", price: 2350.0, change: 1.82 },
  { symbol: "SOL/USDT", price: 95.2, change: -1.25 },
  { symbol: "BNB/USDT", price: 312.5, change: 0.95 },
  { symbol: "XRP/USDT", price: 0.582, change: -0.45 },
  { symbol: "ADA/USDT", price: 0.485, change: 3.21 },
];

/**
 * Format large numbers to readable format
 * 格式化大数字为可读格式
 */
function formatAmount(num: number): string {
  if (Math.abs(num) >= 100000000) return (num / 100000000).toFixed(2) + "亿";
  if (Math.abs(num) >= 10000) return (num / 10000).toFixed(2) + "万";
  return num.toFixed(2);
}

export default function TradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "market">(
    "market",
  );
  const [positions, setPositions] = useState<Position[]>(INITIAL_POSITIONS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop-loss">(
    "limit",
  );
  const [orderPrice, setOrderPrice] = useState("");
  const [orderSize, setOrderSize] = useState("");
  const [balance, setBalance] = useState(50000);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch real-time market data
  // 获取实时市场数据
  const {
    data: indices,
    loading: indicesLoading,
    error: indicesError,
  } = useMajorIndices({
    refreshInterval: 10000,
  });

  const { data: northBound, loading: northBoundLoading } = useNorthBoundFlow({
    refreshInterval: 60000,
  });

  // Use real indices if available, otherwise use defaults
  // 如果可用则使用真实指数，否则使用默认值
  const SYMBOLS = DEFAULT_SYMBOLS;

  // Show notification helper
  // 显示通知辅助函数
  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    },
    [],
  );

  // Calculate total PnL
  // 计算总盈亏
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPositionValue = positions.reduce(
    (sum, pos) => sum + pos.currentPrice * pos.size,
    0,
  );

  // Get current symbol price
  // 获取当前交易对价格
  const currentSymbolPrice =
    SYMBOLS.find((s) => s.symbol === selectedSymbol)?.price || 0;

  // Close position handler
  // 平仓处理函数
  const handleClosePosition = useCallback(
    (symbol: string) => {
      const position = positions.find((p) => p.symbol === symbol);
      if (!position) return;

      setBalance(
        (prev) => prev + position.currentPrice * position.size + position.pnl,
      );
      setPositions((prev) => prev.filter((p) => p.symbol !== symbol));
      showNotification(
        "success",
        `已平仓 ${symbol}，盈亏: ${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)}`,
      );
    },
    [positions, showNotification],
  );

  // Cancel order handler
  // 撤单处理函数
  const handleCancelOrder = useCallback(
    (orderId: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showNotification("success", `订单 ${orderId} 已撤销`);
    },
    [showNotification],
  );

  // Place order handler
  // 下单处理函数
  const handlePlaceOrder = useCallback(
    (side: "buy" | "sell") => {
      const price =
        orderType === "market" ? currentSymbolPrice : parseFloat(orderPrice);
      const size = parseFloat(orderSize);

      if (!size || size <= 0) {
        showNotification("error", "请输入有效的数量");
        return;
      }

      if (orderType !== "market" && (!price || price <= 0)) {
        showNotification("error", "请输入有效的价格");
        return;
      }

      const orderValue = price * size;
      if (side === "buy" && orderValue > balance) {
        showNotification("error", "余额不足");
        return;
      }

      if (orderType === "market") {
        if (side === "buy") {
          setBalance((prev) => prev - orderValue);
          const newPosition: Position = {
            symbol: selectedSymbol,
            side: "long",
            size,
            entryPrice: price,
            currentPrice: price,
            pnl: 0,
            pnlPercent: 0,
          };
          setPositions((prev) => [...prev, newPosition]);
          showNotification(
            "success",
            `市价买入 ${size} ${selectedSymbol} @ $${price.toLocaleString()}`,
          );
        } else {
          const existingPosition = positions.find(
            (p) => p.symbol === selectedSymbol && p.side === "long",
          );
          if (existingPosition && existingPosition.size >= size) {
            const pnl = (price - existingPosition.entryPrice) * size;
            setBalance((prev) => prev + price * size);
            if (existingPosition.size === size) {
              setPositions((prev) =>
                prev.filter(
                  (p) => p.symbol !== selectedSymbol || p.side !== "long",
                ),
              );
            } else {
              setPositions((prev) =>
                prev.map((p) =>
                  p.symbol === selectedSymbol && p.side === "long"
                    ? { ...p, size: p.size - size }
                    : p,
                ),
              );
            }
            showNotification(
              "success",
              `市价卖出 ${size} ${selectedSymbol}，盈亏: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
            );
          } else {
            setBalance((prev) => prev - orderValue);
            const newPosition: Position = {
              symbol: selectedSymbol,
              side: "short",
              size,
              entryPrice: price,
              currentPrice: price,
              pnl: 0,
              pnlPercent: 0,
            };
            setPositions((prev) => [...prev, newPosition]);
            showNotification(
              "success",
              `开空 ${size} ${selectedSymbol} @ $${price.toLocaleString()}`,
            );
          }
        }
      } else {
        const newOrder: Order = {
          id: `ORD${Date.now().toString().slice(-6)}`,
          symbol: selectedSymbol,
          side,
          type: orderType,
          price,
          size,
          filled: 0,
          status: "open",
          time: new Date().toLocaleString("zh-CN"),
        };
        setOrders((prev) => [...prev, newOrder]);
        showNotification(
          "success",
          `${orderType === "limit" ? "限价" : "止损"}${side === "buy" ? "买入" : "卖出"}订单已提交`,
        );
      }

      setOrderPrice("");
      setOrderSize("");
    },
    [
      orderType,
      orderPrice,
      orderSize,
      selectedSymbol,
      currentSymbolPrice,
      balance,
      positions,
      showNotification,
    ],
  );

  // Set size percentage
  // 设置数量百分比
  const handleSetSizePercentage = useCallback(
    (percentage: number) => {
      const price =
        orderType === "market"
          ? currentSymbolPrice
          : parseFloat(orderPrice) || currentSymbolPrice;
      const maxSize = balance / price;
      setOrderSize(((maxSize * percentage) / 100).toFixed(4));
    },
    [balance, currentSymbolPrice, orderPrice, orderType],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === "success" ? "bg-profit/90" : "bg-loss/90"
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4">
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
                href="/dashboard/trading"
                className="text-accent text-sm font-medium"
              >
                交易面板
              </Link>
              <Link
                href="/dashboard/advisor"
                className="text-white/60 hover:text-white text-sm transition"
              >
                投资顾问
              </Link>
              <Link
                href="/dashboard/history"
                className="text-white/60 hover:text-white text-sm transition"
              >
                历史记录
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
      <main className="max-w-[1920px] mx-auto p-4">
        {/* Market Overview Bar */}
        <div className="mb-4 bg-surface rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            {/* Indices */}
            <div className="flex items-center gap-6">
              {indicesLoading && !indices ? (
                <div className="text-white/50 text-sm">加载指数...</div>
              ) : indicesError ? (
                <div className="text-loss text-sm">指数加载失败</div>
              ) : indices && indices.length > 0 ? (
                indices.slice(0, 5).map((idx) => (
                  <div key={idx.symbol} className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{idx.name}</span>
                    <span className="text-sm font-medium text-white">
                      {idx.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs ${
                        idx.changePercent >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {idx.changePercent >= 0 ? "+" : ""}
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-white/50 text-sm">暂无指数数据</div>
              )}
            </div>

            {/* North-bound Flow */}
            <div className="flex items-center gap-4">
              {northBound && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">北向资金</span>
                    <span
                      className={`text-sm font-medium ${
                        northBound.total >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {northBound.total >= 0 ? "+" : ""}
                      {formatAmount(northBound.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">沪股通</span>
                    <span
                      className={`text-xs ${
                        northBound.shConnect >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatAmount(northBound.shConnect)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">深股通</span>
                    <span
                      className={`text-xs ${
                        northBound.szConnect >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatAmount(northBound.szConnect)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left sidebar - Symbol list */}
          <div className="col-span-2">
            <div className="bg-surface rounded-xl border border-border p-3">
              <h3 className="text-sm font-medium text-white mb-3">
                交易对 / Symbols
              </h3>
              <div className="space-y-1">
                {SYMBOLS.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                      selectedSymbol === item.symbol
                        ? "bg-accent/10 border border-accent/30"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        selectedSymbol === item.symbol
                          ? "text-accent"
                          : "text-white"
                      }`}
                    >
                      {item.symbol}
                    </span>
                    <div className="text-right">
                      <div className="text-xs text-white/70">
                        {item.price.toLocaleString()}
                      </div>
                      <div
                        className={`text-xs ${
                          item.change >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {item.change >= 0 ? "+" : ""}
                        {item.change}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Chart */}
          <div className="col-span-7">
            <KLineChart
              symbol={selectedSymbol}
              height={500}
              showVolume={true}
              showMA={true}
              maWindows={[5, 20, 60]}
            />
          </div>

          {/* Right sidebar - Order entry */}
          <div className="col-span-3">
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-medium text-white mb-4">
                下单 / Place Order
              </h3>

              {/* Order type tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrderType("limit")}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                    orderType === "limit"
                      ? "bg-accent/10 text-accent"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  限价单
                </button>
                <button
                  onClick={() => setOrderType("market")}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                    orderType === "market"
                      ? "bg-accent/10 text-accent"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  市价单
                </button>
                <button
                  onClick={() => setOrderType("stop-loss")}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                    orderType === "stop-loss"
                      ? "bg-accent/10 text-accent"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  止损单
                </button>
              </div>

              {/* Price input */}
              <div className="mb-3">
                <label className="block text-xs text-white/50 mb-1">
                  价格 / Price {orderType === "market" && "(市价)"}
                </label>
                <input
                  type="number"
                  placeholder={
                    orderType === "market"
                      ? currentSymbolPrice.toLocaleString()
                      : "0.00"
                  }
                  value={orderType === "market" ? "" : orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  disabled={orderType === "market"}
                  className={`w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent ${
                    orderType === "market"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                />
              </div>

              {/* Size input */}
              <div className="mb-3">
                <label className="block text-xs text-white/50 mb-1">
                  数量 / Size
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={orderSize}
                  onChange={(e) => setOrderSize(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {/* Size percentage buttons */}
              <div className="flex gap-2 mb-4">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSetSizePercentage(pct)}
                    className="flex-1 py-1 text-xs text-white/50 hover:text-white border border-border rounded hover:border-accent/50 transition"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Buy/Sell buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handlePlaceOrder("buy")}
                  className="flex-1 py-3 bg-profit hover:bg-profit/80 text-white font-medium rounded-lg transition"
                >
                  买入 / Buy
                </button>
                <button
                  onClick={() => handlePlaceOrder("sell")}
                  className="flex-1 py-3 bg-loss hover:bg-loss/80 text-white font-medium rounded-lg transition"
                >
                  卖出 / Sell
                </button>
              </div>

              {/* Account summary */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/50">可用余额</span>
                  <span className="text-white">
                    ${balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/50">持仓市值</span>
                  <span className="text-white">
                    ${totalPositionValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">总盈亏</span>
                  <span className={totalPnL >= 0 ? "text-profit" : "text-loss"}>
                    {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom - Positions, Orders, and Market Data */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Main table section */}
          <div className="col-span-9">
            <div className="bg-surface rounded-xl border border-border">
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("market")}
                  className={`px-6 py-3 text-sm font-medium transition ${
                    activeTab === "market"
                      ? "text-accent border-b-2 border-accent"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  实时行情 / Market
                </button>
                <button
                  onClick={() => setActiveTab("positions")}
                  className={`px-6 py-3 text-sm font-medium transition ${
                    activeTab === "positions"
                      ? "text-accent border-b-2 border-accent"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  持仓 / Positions ({positions.length})
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`px-6 py-3 text-sm font-medium transition ${
                    activeTab === "orders"
                      ? "text-accent border-b-2 border-accent"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  挂单 / Orders ({orders.length})
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {activeTab === "market" ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-white/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-medium">
                          指数名称
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          最新价
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          涨跌
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          涨跌幅
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          成交量
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          成交额
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {indices && indices.length > 0 ? (
                        indices.map((idx) => (
                          <tr
                            key={idx.symbol}
                            className="text-sm border-b border-border/50 hover:bg-white/5"
                          >
                            <td className="px-4 py-3 text-white font-medium">
                              {idx.name}
                            </td>
                            <td className="px-4 py-3 text-right text-white">
                              {idx.price.toLocaleString()}
                            </td>
                            <td
                              className={`px-4 py-3 text-right ${
                                idx.change >= 0 ? "text-profit" : "text-loss"
                              }`}
                            >
                              {idx.change >= 0 ? "+" : ""}
                              {idx.change.toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-medium ${
                                idx.changePercent >= 0
                                  ? "text-profit"
                                  : "text-loss"
                              }`}
                            >
                              {idx.changePercent >= 0 ? "+" : ""}
                              {idx.changePercent.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-right text-white/70">
                              {formatAmount(idx.volume)}
                            </td>
                            <td className="px-4 py-3 text-right text-white/70">
                              {formatAmount(idx.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-white/50"
                          >
                            {indicesLoading ? "加载中..." : "暂无数据"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : activeTab === "positions" ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-white/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-medium">
                          交易对
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          方向
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          数量
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          开仓价
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          现价
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          盈亏
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos, index) => (
                        <tr
                          key={index}
                          className="text-sm border-b border-border/50 hover:bg-white/5"
                        >
                          <td className="px-4 py-3 text-white font-medium">
                            {pos.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                pos.side === "long"
                                  ? "bg-profit/20 text-profit"
                                  : "bg-loss/20 text-loss"
                              }`}
                            >
                              {pos.side === "long" ? "多" : "空"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {pos.size}
                          </td>
                          <td className="px-4 py-3 text-right text-white/70">
                            {pos.entryPrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {pos.currentPrice.toLocaleString()}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${
                              pos.pnl >= 0 ? "text-profit" : "text-loss"
                            }`}
                          >
                            {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)} (
                            {pos.pnlPercent >= 0 ? "+" : ""}
                            {pos.pnlPercent}%)
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.symbol)}
                              className="px-3 py-1 text-xs text-loss border border-loss/30 rounded hover:bg-loss/10 transition"
                            >
                              平仓
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-white/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-medium">
                          订单号
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          交易对
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          方向
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          类型
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          价格
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          数量
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          时间
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className="text-sm border-b border-border/50 hover:bg-white/5"
                        >
                          <td className="px-4 py-3 text-white/50 font-mono text-xs">
                            {order.id}
                          </td>
                          <td className="px-4 py-3 text-white font-medium">
                            {order.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                order.side === "buy"
                                  ? "bg-profit/20 text-profit"
                                  : "bg-loss/20 text-loss"
                              }`}
                            >
                              {order.side === "buy" ? "买入" : "卖出"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/70 text-xs uppercase">
                            {order.type}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {order.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {order.size}
                          </td>
                          <td className="px-4 py-3 text-right text-white/50 text-xs">
                            {order.time}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-3 py-1 text-xs text-loss border border-loss/30 rounded hover:bg-loss/10 transition"
                            >
                              撤单
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Data Status Panel */}
          <div className="col-span-3">
            <DataStatusPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
