/**
 * K-Line Data API Route
 * K线数据API路由
 *
 * GET /api/market/kline?symbol=600519&timeframe=1d&limit=200
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getKLineData,
  generateMockKLineData,
  KLineTimeFrame,
} from "@/lib/data-service";

// Environment flag for using mock data
// 使用模拟数据的环境标志
const USE_MOCK = process.env.USE_MOCK_DATA === "true";

// Valid timeframes
// 有效的时间周期
const VALID_TIMEFRAMES: KLineTimeFrame[] = [
  "1m",
  "5m",
  "15m",
  "30m",
  "60m",
  "1d",
  "1w",
  "1M",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const timeframe = (searchParams.get("timeframe") || "1d") as KLineTimeFrame;
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  // Validate input
  // 验证输入
  if (!symbol) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameter: symbol",
      },
      { status: 400 },
    );
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid timeframe. Valid options: ${VALID_TIMEFRAMES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid limit. Must be between 1 and 1000",
      },
      { status: 400 },
    );
  }

  try {
    if (USE_MOCK) {
      // Generate mock data with appropriate starting price
      // 使用适当的起始价格生成模拟数据
      const mockData = generateMockKLineData(symbol, limit);
      return NextResponse.json({
        success: true,
        data: mockData,
        source: "mock",
        cached: false,
        timestamp: Date.now(),
        latency: 0,
      });
    }

    const result = await getKLineData(symbol, timeframe, limit);
    return NextResponse.json(result);
  } catch (err) {
    console.error("K-line API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
