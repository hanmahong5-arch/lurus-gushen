/**
 * Database Schema Definitions
 * 数据库Schema定义
 *
 * PostgreSQL database schema for GuShen trading platform
 * GuShen交易平台的PostgreSQL数据库模式
 *
 * Tables:
 * - stocks: Stock basic information (股票基本信息)
 * - sectors: Industry sectors (行业板块)
 * - stock_sector_mapping: Stock-sector relationships (股票-板块映射)
 * - kline_daily: Daily K-line data (日K线数据) - Core table
 * - data_update_log: Data update history (数据更新日志)
 * - validation_cache: Validation result cache (验证结果缓存)
 * - validation_presets: User preset configurations (用户预设配置)
 */

import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  real,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// Table 1: Stocks (股票基本信息)
// ============================================================================

/**
 * Stocks table - Store basic information of all A-share stocks
 * 股票表 - 存储所有A股的基本信息
 *
 * Estimated rows: ~5,000 (total A-share listed companies)
 */
export const stocks = pgTable(
  'stocks',
  {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 10 }).notNull().unique(),
    name: varchar('name', { length: 50 }).notNull(),
    listingDate: varchar('listing_date', { length: 10 }), // "2001-08-27"
    isST: boolean('is_st').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, suspended, delisted
    marketCap: real('market_cap'), // Market cap in 亿元
    exchange: varchar('exchange', { length: 10 }), // SH, SZ
    industry: varchar('industry', { length: 50 }), // Industry category
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    symbolIdx: index('idx_stocks_symbol').on(table.symbol),
    statusIdx: index('idx_stocks_status').on(table.status),
    isSTIdx: index('idx_stocks_st').on(table.isST),
    nameIdx: index('idx_stocks_name').on(table.name),
  })
);

// ============================================================================
// Table 2: Sectors (行业板块)
// ============================================================================

/**
 * Sectors table - Industry sector classifications
 * 板块表 - 行业板块分类
 *
 * Estimated rows: ~150 (all industry sectors)
 */
export const sectors = pgTable(
  'sectors',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).notNull().unique(), // "BK0478"
    name: varchar('name', { length: 50 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }),
    level: integer('level').default(1).notNull(), // 1=primary, 2=secondary
    parentId: integer('parent_id'), // Parent sector ID
    stockCount: integer('stock_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('idx_sectors_code').on(table.code),
    parentIdx: index('idx_sectors_parent').on(table.parentId),
  })
);

// ============================================================================
// Table 3: Stock-Sector Mapping (股票-板块映射)
// ============================================================================

/**
 * Stock-sector mapping table
 * 股票-板块映射表
 *
 * Estimated rows: ~10,000 (one stock can belong to multiple sectors)
 */
export const stockSectorMapping = pgTable(
  'stock_sector_mapping',
  {
    id: serial('id').primaryKey(),
    stockId: integer('stock_id')
      .notNull()
      .references(() => stocks.id, { onDelete: 'cascade' }),
    sectorId: integer('sector_id')
      .notNull()
      .references(() => sectors.id, { onDelete: 'cascade' }),
    weight: real('weight').default(1.0).notNull(), // Weight if sector is weighted
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stockIdx: index('idx_mapping_stock').on(table.stockId),
    sectorIdx: index('idx_mapping_sector').on(table.sectorId),
    uniquePair: uniqueIndex('unique_stock_sector').on(table.stockId, table.sectorId),
  })
);

// ============================================================================
// Table 4: K-line Daily Data (日K线数据) ⭐ CORE TABLE
// ============================================================================

/**
 * K-line daily data table - Store historical daily K-line data
 * 日K线数据表 - 存储历史日K线数据
 *
 * Estimated rows: ~2,500,000 (5,000 stocks × 500 trading days)
 * Storage: ~300MB for 2 years, ~1.5GB for 5 years
 *
 * This is the CORE table for backtesting and validation
 */
export const klineDaily = pgTable(
  'kline_daily',
  {
    id: serial('id').primaryKey(),
    stockId: integer('stock_id')
      .notNull()
      .references(() => stocks.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // "2024-01-15"
    open: real('open').notNull(),
    high: real('high').notNull(),
    low: real('low').notNull(),
    close: real('close').notNull(),
    volume: real('volume').notNull(), // Volume in shares
    amount: real('amount'), // Amount in CNY
    adjFactor: real('adj_factor').default(1.0).notNull(), // Adjustment factor for splits/dividends
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stockDateIdx: index('idx_kline_stock_date').on(table.stockId, table.date),
    dateIdx: index('idx_kline_date').on(table.date),
    stockIdIdx: index('idx_kline_stock_id').on(table.stockId),
    uniqueStockDate: uniqueIndex('unique_stock_date').on(table.stockId, table.date),
  })
);

// ============================================================================
// Table 5: Data Update Log (数据更新日志)
// ============================================================================

/**
 * Data update log table - Track daily data update tasks
 * 数据更新日志表 - 跟踪每日数据更新任务
 */
export const dataUpdateLog = pgTable(
  'data_update_log',
  {
    id: serial('id').primaryKey(),
    updateDate: varchar('update_date', { length: 10 }).notNull(), // "2024-01-15"
    updateType: varchar('update_type', { length: 20 }).notNull(), // daily, full, manual
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    status: varchar('status', { length: 20 }).notNull(), // running, success, failed
    recordsUpdated: integer('records_updated').default(0).notNull(),
    recordsFailed: integer('records_failed').default(0).notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index('idx_log_date').on(table.updateDate),
    statusIdx: index('idx_log_status').on(table.status),
    typeIdx: index('idx_log_type').on(table.updateType),
  })
);

// ============================================================================
// Table 6: Validation Cache (验证结果缓存)
// ============================================================================

/**
 * Validation cache table - Cache validation results for performance
 * 验证结果缓存表 - 缓存验证结果以提升性能
 *
 * TTL: 24 hours
 * Cache hit rate target: 30-40%
 */
export const validationCache = pgTable(
  'validation_cache',
  {
    id: serial('id').primaryKey(),
    cacheKey: varchar('cache_key', { length: 64 }).notNull().unique(), // MD5 hash
    config: text('config').notNull(), // JSON serialized config
    result: text('result').notNull(), // JSON serialized result
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(), // Expire after 24h
    hitCount: integer('hit_count').default(0).notNull(),
  },
  (table) => ({
    keyIdx: index('idx_cache_key').on(table.cacheKey),
    expiresIdx: index('idx_cache_expires').on(table.expiresAt),
  })
);

// ============================================================================
// Table 7: Validation Presets (用户预设配置)
// ============================================================================

/**
 * Validation presets table - User saved stock combinations
 * 验证预设表 - 用户保存的股票组合
 */
export const validationPresets = pgTable(
  'validation_presets',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    symbols: text('symbols').notNull(), // JSON array: ["600519", "000858"]
    config: text('config'), // JSON serialized config
    isFavorite: boolean('is_favorite').default(false).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    useCount: integer('use_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('idx_presets_name').on(table.name),
    favoriteIdx: index('idx_presets_favorite').on(table.isFavorite),
  })
);

// ============================================================================
// Multi-Tenant History Tables (Phase B-2)
// 多租户历史记录表
// ============================================================================

/**
 * Tenants table - Organization/team information
 * 租户表 - 组织/团队信息
 */
export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    /** Tenant display name / 租户显示名称 */
    name: varchar('name', { length: 100 }).notNull(),
    /** URL-friendly slug / URL友好的标识符 */
    slug: varchar('slug', { length: 50 }).unique().notNull(),
    /** Owner user ID / 所有者用户ID */
    ownerId: varchar('owner_id', { length: 255 }).notNull(),
    /** Subscription plan / 订阅计划 */
    plan: varchar('plan', { length: 20 }).default('free').notNull(),
    /** Maximum members allowed / 最大成员数 */
    maxMembers: integer('max_members').default(5).notNull(),
    /** Tenant settings JSON / 租户设置JSON */
    settings: text('settings'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('idx_tenants_slug').on(table.slug),
    ownerIdx: index('idx_tenants_owner').on(table.ownerId),
  })
);

/**
 * Tenant members table - User-tenant relationships
 * 租户成员表 - 用户与租户的关系
 */
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: serial('id').primaryKey(),
    /** Reference to tenant / 租户引用 */
    tenantId: integer('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    /** User ID / 用户ID */
    userId: varchar('user_id', { length: 255 }).notNull(),
    /** Member role: owner, admin, member, viewer / 成员角色 */
    role: varchar('role', { length: 20 }).default('member').notNull(),
    /** Invitation status: pending, accepted, rejected / 邀请状态 */
    status: varchar('status', { length: 20 }).default('accepted').notNull(),
    /** Invited by user ID / 邀请人用户ID */
    invitedBy: varchar('invited_by', { length: 255 }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_tenant_members_tenant').on(table.tenantId),
    userIdx: index('idx_tenant_members_user').on(table.userId),
    uniqueMember: index('idx_tenant_members_unique').on(table.tenantId, table.userId),
  })
);

/**
 * Strategy history table - Version-controlled strategy storage
 * 策略历史表 - 版本控制的策略存储
 */
export const strategyHistory = pgTable(
  'strategy_history',
  {
    id: serial('id').primaryKey(),
    /** User who created this version / 创建此版本的用户 */
    userId: varchar('user_id', { length: 255 }).notNull(),
    /** Optional tenant reference / 可选的租户引用 */
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    /** Strategy display name / 策略显示名称 */
    strategyName: varchar('strategy_name', { length: 100 }).notNull(),
    /** Strategy description / 策略描述 */
    description: text('description'),
    /** Strategy code (Python) / 策略代码 */
    strategyCode: text('strategy_code').notNull(),
    /** Parameters JSON / 参数JSON */
    parameters: text('parameters').notNull(),
    /** Strategy type: ai_generated, manual, imported / 策略类型 */
    strategyType: varchar('strategy_type', { length: 20 }).default('ai_generated').notNull(),
    /** Version number / 版本号 */
    version: integer('version').default(1).notNull(),
    /** Parent version ID for tracking history / 父版本ID用于追踪历史 */
    parentVersionId: integer('parent_version_id'),
    /** Tags for categorization / 分类标签 */
    tags: text('tags'),
    /** Is this the current active version / 是否为当前活动版本 */
    isActive: boolean('is_active').default(true).notNull(),
    /** Is starred/favorited / 是否收藏 */
    isStarred: boolean('is_starred').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_strategy_history_user').on(table.userId),
    tenantIdx: index('idx_strategy_history_tenant').on(table.tenantId),
    nameIdx: index('idx_strategy_history_name').on(table.strategyName),
    activeIdx: index('idx_strategy_history_active').on(table.isActive),
  })
);

/**
 * Backtest history table - Cached backtest results
 * 回测历史表 - 缓存的回测结果
 */
export const backtestHistory = pgTable(
  'backtest_history',
  {
    id: serial('id').primaryKey(),
    /** User who ran the backtest / 运行回测的用户 */
    userId: varchar('user_id', { length: 255 }).notNull(),
    /** Optional tenant reference / 可选的租户引用 */
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    /** Reference to strategy version / 策略版本引用 */
    strategyHistoryId: integer('strategy_history_id').references(() => strategyHistory.id, {
      onDelete: 'set null',
    }),
    /** Stock symbol / 股票代码 */
    symbol: varchar('symbol', { length: 20 }).notNull(),
    /** Stock name for display / 股票名称用于显示 */
    stockName: varchar('stock_name', { length: 50 }),
    /** Backtest start date / 回测开始日期 */
    startDate: varchar('start_date', { length: 10 }).notNull(),
    /** Backtest end date / 回测结束日期 */
    endDate: varchar('end_date', { length: 10 }).notNull(),
    /** Timeframe: 1d, 1w, etc. / 时间周期 */
    timeframe: varchar('timeframe', { length: 10 }).default('1d').notNull(),
    /** Full config JSON / 完整配置JSON */
    config: text('config').notNull(),
    /** Full result JSON / 完整结果JSON */
    result: text('result').notNull(),
    /** Data source: database, api, mock / 数据来源 */
    dataSource: varchar('data_source', { length: 30 }).notNull(),
    /** Data coverage rate / 数据覆盖率 */
    dataCoverage: real('data_coverage'),
    /** Key metrics for quick display / 关键指标用于快速显示 */
    totalReturn: real('total_return'),
    sharpeRatio: real('sharpe_ratio'),
    maxDrawdown: real('max_drawdown'),
    winRate: real('win_rate'),
    /** Execution time in ms / 执行时间（毫秒） */
    executionTime: integer('execution_time'),
    /** Notes/comments / 备注 */
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_backtest_history_user').on(table.userId),
    tenantIdx: index('idx_backtest_history_tenant').on(table.tenantId),
    strategyIdx: index('idx_backtest_history_strategy').on(table.strategyHistoryId),
    symbolIdx: index('idx_backtest_history_symbol').on(table.symbol),
    dateIdx: index('idx_backtest_history_date').on(table.createdAt),
  })
);

/**
 * Trading history table - Trade records (paper/live)
 * 交易历史表 - 交易记录（模拟/实盘）
 */
export const tradingHistory = pgTable(
  'trading_history',
  {
    id: serial('id').primaryKey(),
    /** User who made the trade / 交易用户 */
    userId: varchar('user_id', { length: 255 }).notNull(),
    /** Optional tenant reference / 可选的租户引用 */
    tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    /** Optional strategy reference / 可选的策略引用 */
    strategyHistoryId: integer('strategy_history_id').references(() => strategyHistory.id, {
      onDelete: 'set null',
    }),
    /** Stock symbol / 股票代码 */
    symbol: varchar('symbol', { length: 20 }).notNull(),
    /** Stock name / 股票名称 */
    stockName: varchar('stock_name', { length: 50 }),
    /** Trade side: buy, sell / 交易方向 */
    side: varchar('side', { length: 10 }).notNull(),
    /** Order type: market, limit / 订单类型 */
    orderType: varchar('order_type', { length: 20 }).default('market').notNull(),
    /** Execution price / 成交价格 */
    price: real('price').notNull(),
    /** Trade size (shares) / 交易数量（股） */
    size: integer('size').notNull(),
    /** Total amount / 交易金额 */
    amount: real('amount').notNull(),
    /** Commission paid / 手续费 */
    commission: real('commission'),
    /** Order status: pending, filled, cancelled, rejected / 订单状态 */
    status: varchar('status', { length: 20 }).default('filled').notNull(),
    /** Realized P&L for this trade / 此交易实现的盈亏 */
    realizedPnl: real('realized_pnl'),
    /** Is paper trade or live trade / 是否为模拟交易 */
    isPaperTrade: boolean('is_paper_trade').default(true).notNull(),
    /** Broker used / 券商 */
    broker: varchar('broker', { length: 30 }).default('mock').notNull(),
    /** External order ID / 外部订单ID */
    externalOrderId: varchar('external_order_id', { length: 100 }),
    /** Trade notes / 交易备注 */
    notes: text('notes'),
    /** Trade execution time / 交易执行时间 */
    executedAt: timestamp('executed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_trading_history_user').on(table.userId),
    tenantIdx: index('idx_trading_history_tenant').on(table.tenantId),
    symbolIdx: index('idx_trading_history_symbol').on(table.symbol),
    dateIdx: index('idx_trading_history_date').on(table.executedAt),
    statusIdx: index('idx_trading_history_status').on(table.status),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

export type Sector = typeof sectors.$inferSelect;
export type NewSector = typeof sectors.$inferInsert;

export type StockSectorMapping = typeof stockSectorMapping.$inferSelect;
export type NewStockSectorMapping = typeof stockSectorMapping.$inferInsert;

export type KLineDaily = typeof klineDaily.$inferSelect;
export type NewKLineDaily = typeof klineDaily.$inferInsert;

export type DataUpdateLog = typeof dataUpdateLog.$inferSelect;
export type NewDataUpdateLog = typeof dataUpdateLog.$inferInsert;

export type ValidationCache = typeof validationCache.$inferSelect;
export type NewValidationCache = typeof validationCache.$inferInsert;

export type ValidationPreset = typeof validationPresets.$inferSelect;
export type NewValidationPreset = typeof validationPresets.$inferInsert;

// Multi-tenant history types
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;

export type StrategyHistory = typeof strategyHistory.$inferSelect;
export type NewStrategyHistory = typeof strategyHistory.$inferInsert;

export type BacktestHistory = typeof backtestHistory.$inferSelect;
export type NewBacktestHistory = typeof backtestHistory.$inferInsert;

export type TradingHistory = typeof tradingHistory.$inferSelect;
export type NewTradingHistory = typeof tradingHistory.$inferInsert;
