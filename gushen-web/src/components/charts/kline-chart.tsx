"use client";

/**
 * K-Line Chart Component using TradingView Lightweight Charts
 * 使用 TradingView Lightweight Charts 的 K 线图组件
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  CrosshairMode,
  ColorType,
} from "lightweight-charts";

// Chart theme colors matching GuShen brand
// 与 GuShen 品牌匹配的图表主题色
const CHART_COLORS = {
  background: "#0f1117",
  text: "rgba(255, 255, 255, 0.6)",
  grid: "rgba(255, 255, 255, 0.06)",
  upColor: "#10b981", // Green for gains / 上涨绿色
  downColor: "#ef4444", // Red for losses / 下跌红色
  volumeUp: "rgba(16, 185, 129, 0.5)",
  volumeDown: "rgba(239, 68, 68, 0.5)",
  crosshair: "#f5a623", // Gold accent / 金色强调
};

// Time frame options
// 时间周期选项
export const TIME_FRAMES = [
  { label: "1分", value: "1m" },
  { label: "5分", value: "5m" },
  { label: "15分", value: "15m" },
  { label: "1小时", value: "1h" },
  { label: "日线", value: "1d" },
  { label: "周线", value: "1w" },
] as const;

export type TimeFrame = (typeof TIME_FRAMES)[number]["value"];

interface KLineChartProps {
  symbol?: string;
  timeFrame?: TimeFrame;
  height?: number;
  showVolume?: boolean;
  showMA?: boolean;
  maWindows?: number[];
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
}

/**
 * Generate mock candlestick data for demonstration
 * 生成模拟K线数据用于演示
 */
function generateMockData(
  days: number = 200,
  startPrice: number = 100,
): { candles: CandlestickData<Time>[]; volumes: HistogramData<Time>[] } {
  const candles: CandlestickData<Time>[] = [];
  const volumes: HistogramData<Time>[] = [];

  let currentPrice = startPrice;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const time = (date.getTime() / 1000) as Time;

    // Generate realistic price movement
    // 生成真实的价格波动
    const volatility = 0.02;
    const trend = Math.sin(i / 30) * 0.001; // Slight trend pattern / 轻微趋势
    const change = (Math.random() - 0.5) * 2 * volatility + trend;

    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });

    // Generate volume data
    // 生成成交量数据
    const baseVolume = 1000000 + Math.random() * 500000;
    const volumeMultiplier = 1 + Math.abs(change) * 10; // Higher volume on big moves
    volumes.push({
      time,
      value: Math.round(baseVolume * volumeMultiplier),
      color: close >= open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    });

    currentPrice = close;
  }

  return { candles, volumes };
}

/**
 * Calculate Simple Moving Average
 * 计算简单移动平均线
 */
function calculateSMA(
  data: CandlestickData<Time>[],
  window: number,
): { time: Time; value: number }[] {
  const result: { time: Time; value: number }[] = [];

  for (let i = window - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      const item = data[i - j];
      if (item) {
        sum += item.close;
      }
    }
    const currentItem = data[i];
    if (currentItem) {
      result.push({
        time: currentItem.time,
        value: parseFloat((sum / window).toFixed(2)),
      });
    }
  }

  return result;
}

// MA line colors
// 均线颜色
const MA_COLORS = ["#f5a623", "#3b82f6", "#a855f7", "#ec4899"];

export function KLineChart({
  symbol = "BTC/USDT",
  timeFrame = "1d",
  height = 500,
  showVolume = true,
  showMA = true,
  maWindows = [5, 20, 60],
}: KLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>(timeFrame);
  const [crosshairData, setCrosshairData] = useState<{
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    time: string | null;
  }>({
    price: null,
    change: null,
    changePercent: null,
    volume: null,
    time: null,
  });

  // Initialize chart
  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    // 创建图表实例
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
        horzLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: CHART_COLORS.crosshair,
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    // 添加K线序列
    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderVisible: false,
      wickUpColor: CHART_COLORS.upColor,
      wickDownColor: CHART_COLORS.downColor,
    });
    candleSeriesRef.current = candleSeries;

    // Add volume series
    // 添加成交量序列
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: CHART_COLORS.volumeUp,
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Add MA lines
    // 添加均线
    if (showMA) {
      maSeriesRefs.current = maWindows.map((_, index) => {
        return chart.addLineSeries({
          color: MA_COLORS[index % MA_COLORS.length],
          lineWidth: 1,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
      });
    }

    // Generate and set mock data
    // 生成并设置模拟数据
    const { candles, volumes } = generateMockData(200, 45000);
    candleSeries.setData(candles);

    if (showVolume && volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumes);
    }

    // Calculate and set MA data
    // 计算并设置均线数据
    if (showMA) {
      maWindows.forEach((window, index) => {
        const maData = calculateSMA(candles, window);
        maSeriesRefs.current[index]?.setData(maData);
      });
    }

    // Fit content
    // 适应内容
    chart.timeScale().fitContent();

    // Handle crosshair move
    // 处理十字线移动
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData({
          price: null,
          change: null,
          changePercent: null,
          volume: null,
          time: null,
        });
        return;
      }

      const candleData = param.seriesData.get(candleSeries) as
        | CandlestickData<Time>
        | undefined;
      const volumeData = volumeSeriesRef.current
        ? (param.seriesData.get(volumeSeriesRef.current) as
            | HistogramData<Time>
            | undefined)
        : undefined;

      if (candleData) {
        const change = candleData.close - candleData.open;
        const changePercent = (change / candleData.open) * 100;

        // Format time
        // 格式化时间
        const date = new Date((param.time as number) * 1000);
        const timeStr = date.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });

        setCrosshairData({
          price: candleData.close,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          volume: volumeData?.value ?? null,
          time: timeStr,
        });
      }
    });

    // Handle resize
    // 处理调整大小
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    // 清理
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [height, showVolume, showMA, maWindows]);

  // Format volume for display
  // 格式化成交量显示
  const formatVolume = useCallback((value: number | null): string => {
    if (value === null) return "-";
    if (value >= 1000000) return (value / 1000000).toFixed(2) + "M";
    if (value >= 1000) return (value / 1000).toFixed(2) + "K";
    return value.toString();
  }, []);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{symbol}</span>
            <span className="text-xs text-white/40 uppercase">
              {selectedTimeFrame}
            </span>
          </div>

          {/* Price info from crosshair */}
          {crosshairData.price !== null && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white font-medium">
                {crosshairData.price.toLocaleString()}
              </span>
              <span
                className={`${
                  (crosshairData.change ?? 0) >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {(crosshairData.change ?? 0) >= 0 ? "+" : ""}
                {crosshairData.change} ({crosshairData.changePercent}%)
              </span>
              <span className="text-white/50">
                Vol: {formatVolume(crosshairData.volume)}
              </span>
              <span className="text-white/40">{crosshairData.time}</span>
            </div>
          )}
        </div>

        {/* Time frame selector */}
        <div className="flex items-center gap-1">
          {TIME_FRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeFrame(tf.value)}
              className={`px-3 py-1 text-xs rounded transition ${
                selectedTimeFrame === tf.value
                  ? "bg-accent text-primary-600 font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* MA Legend */}
      {showMA && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
          {maWindows.map((window, index) => (
            <div key={window} className="flex items-center gap-1 text-xs">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: MA_COLORS[index % MA_COLORS.length] }}
              />
              <span style={{ color: MA_COLORS[index % MA_COLORS.length] }}>
                MA{window}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
