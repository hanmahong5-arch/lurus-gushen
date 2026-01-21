/**
 * Stock Search API
 * 股票搜索API
 *
 * GET /api/stocks/search
 *
 * Fast search for autocomplete functionality
 * 快速搜索用于自动完成功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/lib/db/queries';

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
  symbol: string;
  name: string;
  displayName: string; // "600519 贵州茅台"
  exchange: string;
  isST: boolean;
  marketCap: number | null;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const excludeST = searchParams.get('excludeST') === 'true';

    // Validate query
    if (!q || q.length < 1) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required (min 1 character)' },
        { status: 400 }
      );
    }

    // Search stocks
    const stocks = await searchStocks(q, {
      excludeST,
      status: 'active',
      limit,
    });

    // Transform to search results
    const results: SearchResult[] = stocks.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      displayName: `${stock.symbol} ${stock.name}`,
      exchange: stock.exchange || 'N/A',
      isST: stock.isST,
      marketCap: stock.marketCap,
    }));

    // Return response
    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      query: q,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API] /api/stocks/search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS Handler (CORS)
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
