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
