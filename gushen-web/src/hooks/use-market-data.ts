/**
 * React Hooks for Market Data
 * 市场数据 React Hooks
 *
 * Provides easy-to-use hooks for fetching and managing market data
 * 提供易用的市场数据获取和管理 hooks
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  StockQuote,
  KLineData,
  IndexQuote,
  CapitalFlow,
  NorthBoundFlow,
  KLineTimeFrame,
  ServiceStats,
  ServiceHealth,
} from "@/lib/data-service/types";

// =============================================================================
// TYPES / 类型
// =============================================================================

interface UseMarketDataOptions {
  refreshInterval?: number; // Auto refresh interval in ms / 自动刷新间隔（毫秒）
  enabled?: boolean;        // Whether to enable fetching / 是否启用获取
}

interface UseMarketDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdate: number | null;
  source: string | null;
  cached: boolean;
}

// =============================================================================
// FETCH UTILITIES / 获取工具
// =============================================================================

async function fetchApi<T>(endpoint: string): Promise<{
  success: boolean;
  data: T | null;
  error?: string;
  source?: string;
  cached?: boolean;
}> {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}

// =============================================================================
// HOOKS / Hooks
// =============================================================================

/**
 * Hook for fetching stock quote
 * 获取股票行情的 Hook
 */
export function useStockQuote(
  symbol: string | null,
  options: UseMarketDataOptions = {}
): UseMarketDataResult<StockQuote> {
  const { refreshInterval = 0, enabled = true } = options;
  const [data, setData] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<StockQuote>(`/api/market/quote?symbol=${symbol}`);

    if (result.success && result.data) {
      setData(result.data);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch quote");
    }

    setLoading(false);
  }, [symbol, enabled]);

  // Initial fetch and auto refresh
  // 初始获取和自动刷新
  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}

/**
 * Hook for fetching K-line data
 * 获取K线数据的 Hook
 */
export function useKLineData(
  symbol: string | null,
  timeframe: KLineTimeFrame = "1d",
  limit: number = 200,
  options: UseMarketDataOptions = {}
): UseMarketDataResult<KLineData[]> {
  const { refreshInterval = 0, enabled = true } = options;
  const [data, setData] = useState<KLineData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<KLineData[]>(
      `/api/market/kline?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
    );

    if (result.success && result.data) {
      setData(result.data);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch K-line data");
    }

    setLoading(false);
  }, [symbol, timeframe, limit, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}

/**
 * Hook for fetching major indices
 * 获取主要指数的 Hook
 */
export function useMajorIndices(
  options: UseMarketDataOptions = {}
): UseMarketDataResult<IndexQuote[]> {
  const { refreshInterval = 10000, enabled = true } = options;
  const [data, setData] = useState<IndexQuote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<IndexQuote[]>("/api/market/indices");

    if (result.success && result.data) {
      setData(result.data);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch indices");
    }

    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}

/**
 * Hook for fetching capital flow
 * 获取资金流向的 Hook
 */
export function useCapitalFlow(
  symbol: string | null,
  options: UseMarketDataOptions = {}
): UseMarketDataResult<CapitalFlow> {
  const { refreshInterval = 30000, enabled = true } = options;
  const [data, setData] = useState<CapitalFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<CapitalFlow>(`/api/market/flow?symbol=${symbol}`);

    if (result.success && result.data) {
      setData(result.data);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch capital flow");
    }

    setLoading(false);
  }, [symbol, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}

/**
 * Hook for fetching north-bound capital flow
 * 获取北向资金的 Hook
 */
export function useNorthBoundFlow(
  options: UseMarketDataOptions = {}
): UseMarketDataResult<NorthBoundFlow> {
  const { refreshInterval = 60000, enabled = true } = options;
  const [data, setData] = useState<NorthBoundFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<NorthBoundFlow>("/api/market/flow?type=northbound");

    if (result.success && result.data) {
      setData(result.data);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch north-bound flow");
    }

    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}

/**
 * Hook for fetching service status
 * 获取服务状态的 Hook
 */
export function useServiceStatus(
  options: UseMarketDataOptions = {}
): UseMarketDataResult<{ stats: ServiceStats; health: ServiceHealth[] }> {
  const { refreshInterval = 30000, enabled = true } = options;
  const [data, setData] = useState<{ stats: ServiceStats; health: ServiceHealth[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<{ stats: ServiceStats; health: ServiceHealth[] }>(
      "/api/market/status"
    );

    if (result.success && result.data) {
      setData(result.data);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch service status");
    }

    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source: null,
    cached: false,
  };
}

/**
 * Hook for fetching multiple quotes
 * 获取多个股票行情的 Hook
 */
export function useBatchQuotes(
  symbols: string[],
  options: UseMarketDataOptions = {}
): UseMarketDataResult<Record<string, StockQuote>> {
  const { refreshInterval = 5000, enabled = true } = options;
  const [data, setData] = useState<Record<string, StockQuote> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create stable key for symbols
  // 为股票列表创建稳定的键
  const symbolsKey = symbols.sort().join(",");

  const fetchData = useCallback(async () => {
    if (symbols.length === 0 || !enabled) return;

    setLoading(true);
    setError(null);

    const result = await fetchApi<Record<string, StockQuote>>(
      `/api/market/quote?symbols=${symbolsKey}`
    );

    if (result.success && result.data) {
      // Extract quotes from nested response
      // 从嵌套响应中提取行情
      const quotes: Record<string, StockQuote> = {};
      for (const [sym, resp] of Object.entries(result.data)) {
        const respData = resp as unknown as { success: boolean; data: StockQuote };
        if (respData.success && respData.data) {
          quotes[sym] = respData.data;
        }
      }
      setData(quotes);
      setSource(result.source ?? null);
      setCached(result.cached ?? false);
      setLastUpdate(Date.now());
    } else {
      setError(result.error ?? "Failed to fetch quotes");
    }

    setLoading(false);
  }, [symbolsKey, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    lastUpdate,
    source,
    cached,
  };
}
