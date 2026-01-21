# GuShen Web 开发计划
# GuShen Web Development Plan

> 最后更新 Last Updated: 2026-01-22
>
> **技术栈更新**: 已全面迁移至 **Bun** (10-20x 性能提升)

---

## 一、交易面板全面重构计划 / Trading Panel Complete Redesign

### 1.1 现有问题分析 / Current Issues Analysis

经过深度分析，当前交易面板存在以下核心问题：

| 问题 | 严重程度 | 影响 |
|------|---------|------|
| **K线图数据固定死** | 🔴 严重 | 图表使用 `generateMockData()` 生成假数据，不随任何操作变化 |
| **时间周期按钮无效** | 🔴 严重 | 点击1分/5分/日线等按钮，仅更新状态变量，未触发数据刷新 |
| **交易对切换无响应** | 🔴 严重 | 左侧选择不同交易对，K线图数据不变 |
| **无实时数据连接** | 🔴 严重 | 未接入 WebSocket，无法获取实时 tick 数据 |
| **交易对列表硬编码** | 🟡 中等 | `DEFAULT_SYMBOLS` 是写死的加密货币，与 A 股平台定位不符 |
| **持仓/订单是假数据** | 🟡 中等 | `INITIAL_POSITIONS` 和 `INITIAL_ORDERS` 都是模拟数据 |
| **无交易时间判断** | 🟡 中等 | 不区分交易时段和非交易时段 |
| **K线图组件独立封闭** | 🟡 中等 | `KLineChart` 内部生成数据，外部无法传入真实数据 |

### 1.2 券商最佳实践参考 / Industry Best Practices Reference

参考同花顺、东方财富、雪球、富途牛牛等优质券商/交易软件：

#### 1.2.1 K线图核心功能
- **实时数据推送**: WebSocket 接收 tick 数据，实时更新最后一根 K 线
- **多周期切换**: 1分/5分/15分/30分/60分/日/周/月，切换时重新加载对应数据
- **技术指标叠加**: MA/EMA/BOLL/MACD/RSI/KDJ 等可选叠加
- **画线工具**: 趋势线、支撑阻力线、斐波那契回撤
- **标注功能**: 买卖点标记、事件标注
- **缩放拖拽**: 鼠标滚轮缩放、拖拽查看历史
- **十字光标**: 显示当前位置的 OHLCV 数据

#### 1.2.2 交易对选择
- **搜索功能**: 支持代码/名称/拼音搜索
- **分类展示**: 自选股、持仓股、热门股、板块分类
- **快速切换**: 最近浏览、常用交易对
- **行情预览**: 列表显示最新价、涨跌幅、成交量

#### 1.2.3 交易下单
- **闪电下单**: 一键买卖，最小操作步骤
- **条件单**: 止盈止损、突破买入、回落卖出
- **快捷比例**: 1/4、1/3、1/2、全仓快捷按钮
- **持仓联动**: 点击持仓直接填充卖出数量
- **风险提示**: 大单提醒、价格偏离提醒

#### 1.2.4 信息展示
- **Level-2 行情**: 五档/十档买卖盘口
- **分时图**: 当日价格走势 + 均价线
- **资金流向**: 主力资金、散户资金
- **交易明细**: 逐笔成交记录

### 1.3 重构方案设计 / Refactoring Design

#### Phase 5.1: K线图组件重构

**目标**: 使 K线图成为数据驱动的受控组件

```typescript
// New KLineChart Props
interface KLineChartProps {
  // Data source / 数据源
  symbol: string;
  timeframe: TimeFrame;
  data?: CandlestickData[];        // External data / 外部传入数据
  
  // Real-time updates / 实时更新
  onRequestData?: (symbol: string, timeframe: TimeFrame, range: DateRange) => void;
  realtimeTick?: TickData;         // WebSocket tick for live update
  
  // Interactivity / 交互性
  onTimeframeChange?: (tf: TimeFrame) => void;
  onSymbolChange?: (symbol: string) => void;
  onRangeChange?: (range: DateRange) => void;
  
  // Display options / 显示选项
  indicators?: IndicatorConfig[];   // Configurable indicators
  showVolume?: boolean;
  showGrid?: boolean;
  theme?: 'dark' | 'light';
  
  // Markers / 标记
  buyMarkers?: TradeMarker[];
  sellMarkers?: TradeMarker[];
  annotations?: Annotation[];
}
```

**实现步骤**:
1. 重构 `KLineChart` 接受外部数据 prop
2. 添加 `useEffect` 监听 `symbol` 和 `timeframe` 变化
3. 调用 `onRequestData` 回调请求新数据
4. 支持 `realtimeTick` 实时更新最后一根 K 线
5. 添加指标配置面板

#### Phase 5.2: 数据服务层重构

**目标**: 建立统一的市场数据服务

```typescript
// Market Data Service
interface MarketDataService {
  // Historical data / 历史数据
  getKLineData(symbol: string, timeframe: TimeFrame, range: DateRange): Promise<KLineData[]>;
  
  // Real-time data / 实时数据
  subscribeQuote(symbol: string, callback: (quote: QuoteData) => void): () => void;
  subscribeTick(symbol: string, callback: (tick: TickData) => void): () => void;
  
  // Symbol info / 股票信息
  searchSymbols(query: string): Promise<SymbolInfo[]>;
  getSymbolInfo(symbol: string): Promise<SymbolInfo>;
  
  // Market status / 市场状态
  isMarketOpen(): boolean;
  getMarketHours(): MarketHours;
  getNextOpenTime(): Date;
}
```

**数据源优先级**:
1. WebSocket 实时推送 (交易时段)
2. 前端 EastMoney API (`/api/market/kline`)
3. 后端 AData API (`/api/market/history`)
4. 缓存数据 (非交易时段)

#### Phase 5.3: 交易对选择器重构

**目标**: 提供专业的股票选择体验

```typescript
interface SymbolSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
  
  // Categories / 分类
  categories: SymbolCategory[];     // 自选、持仓、热门、板块
  recentSymbols: string[];          // 最近浏览
  
  // Search / 搜索
  onSearch: (query: string) => Promise<SymbolSearchResult[]>;
  
  // Display / 显示
  showQuote?: boolean;              // 显示实时行情
  showChange?: boolean;             // 显示涨跌
}
```

**A股定制**:
- 支持 6 位股票代码
- 支持股票名称搜索
- 支持拼音首字母搜索 (ZGPA -> 中国平安)
- 分类: 沪市/深市/创业板/科创板/北交所/ETF

#### Phase 5.4: 下单面板重构

**目标**: 提供高效安全的下单体验

**功能增强**:
- 买卖盘口 (五档行情)
- 快捷数量: 100股/500股/1000股/全仓
- 金额输入: 输入金额自动计算股数 (取整到手)
- 当日可买/可卖数量显示
- 委托确认弹窗 (可关闭)
- T+1 提醒 (A 股当日买入不可卖)

#### Phase 5.5: WebSocket 实时数据

**目标**: 接入实时行情推送

```typescript
// WebSocket Message Types
type WSMessage = 
  | { type: 'quote', symbol: string, data: QuoteData }
  | { type: 'tick', symbol: string, data: TickData }
  | { type: 'depth', symbol: string, data: DepthData }
  | { type: 'trade', symbol: string, data: TradeData };

// React Hook
function useRealtimeQuote(symbol: string) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('wss://gushen.lurus.cn/ws');
    ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'quote' && msg.symbol === symbol) {
        setQuote(msg.data);
      }
    };
    return () => ws.close();
  }, [symbol]);
  
  return quote;
}
```

#### Phase 5.6: 交易时间智能化

**目标**: 根据交易时间显示不同状态

```typescript
interface TradingTimeService {
  // Current status / 当前状态
  isPreMarket(): boolean;           // 集合竞价 9:15-9:25
  isMarketOpen(): boolean;          // 连续竞价 9:30-11:30, 13:00-15:00
  isLunchBreak(): boolean;          // 午休 11:30-13:00
  isAfterHours(): boolean;          // 盘后 15:00-
  
  // Time info / 时间信息
  getCurrentTradingDay(): Date;
  getNextTradingDay(): Date;
  getTimeToNextOpen(): number;      // milliseconds
  
  // Display / 显示
  getStatusText(): string;          // "交易中" | "午休" | "已收盘"
  getStatusColor(): string;         // "green" | "yellow" | "gray"
}
```

**UI 行为**:
- 交易时段: 实时更新，显示"交易中"标签
- 午休时段: 显示"午休"，显示上午收盘数据
- 盘后时段: 显示"已收盘"，显示当日收盘数据
- 节假日: 显示"休市"，显示上一交易日数据

### 1.4 技术实现细节 / Technical Implementation Details

#### 1.4.1 K线数据获取流程

```
用户切换时间周期/股票
        ↓
触发 onRequestData(symbol, timeframe)
        ↓
调用 /api/market/kline?symbol=xxx&period=1d&count=200
        ↓
返回 K 线数据数组
        ↓
KLineChart.setData(data)
        ↓
如果是交易时段，启动 WebSocket 订阅
        ↓
收到 tick → 更新最后一根 K 线
```

#### 1.4.2 文件结构

```
src/
├── components/
│   └── trading/
│       ├── kline-chart/
│       │   ├── index.tsx           # Main chart component
│       │   ├── use-kline-data.ts   # Data fetching hook
│       │   ├── use-realtime.ts     # WebSocket hook
│       │   ├── indicators.ts       # Technical indicators
│       │   └── types.ts            # Type definitions
│       ├── symbol-selector/
│       │   ├── index.tsx           # Symbol picker
│       │   ├── search-input.tsx    # Search component
│       │   └── symbol-list.tsx     # List component
│       ├── order-panel/
│       │   ├── index.tsx           # Order entry panel
│       │   ├── depth-chart.tsx     # Order book display
│       │   └── quick-order.tsx     # Quick order buttons
│       ├── position-table.tsx      # Positions display
│       ├── order-table.tsx         # Orders display
│       └── market-status.tsx       # Trading time status
├── hooks/
│   ├── use-trading-time.ts         # Trading time utilities
│   ├── use-market-data.ts          # Market data hooks (已存在)
│   └── use-websocket.ts            # WebSocket connection (已存在)
├── lib/
│   └── trading/
│       ├── time-utils.ts           # Trading time calculations
│       ├── order-validator.ts      # Order validation
│       └── symbol-utils.ts         # Symbol utilities
└── app/
    └── dashboard/
        └── trading/
            └── page.tsx            # Refactored trading page
```

### 1.5 实施优先级 / Implementation Priority

```
Phase 5.1: K线图数据驱动重构     ← 最高优先
    ↓
Phase 5.2: 数据服务层重构
    ↓
Phase 5.3: 交易对选择器
    ↓
Phase 5.4: 下单面板增强
    ↓
Phase 5.5: WebSocket 实时数据
    ↓
Phase 5.6: 交易时间智能化
```

### 1.6 验收标准 / Acceptance Criteria

| 功能 | 验收标准 |
|------|---------|
| K线时间周期切换 | 点击不同周期按钮，K线数据正确切换 |
| 交易对切换 | 选择不同股票，K线和行情同步更新 |
| 实时更新 | 交易时段内，最新价格每秒更新 |
| 数据准确性 | K线数据与同花顺/东财数据一致 |
| 搜索功能 | 支持代码、名称、拼音搜索股票 |
| 交易时间显示 | 正确显示当前交易状态 |
| 下单验证 | 数量必须是 100 的整数倍 (A股) |
| 响应式布局 | 在不同屏幕尺寸下正常显示 |

---

## 二、已完成功能 / Completed Features

### 2.1 数据服务修复 (Phase 1)
- ✅ 诊断 `/api/market/status` 和 `/api/market/indices` 返回 404 问题
- ✅ 修复 IngressRoute 配置，将前端 market API 正确路由
- ✅ 验证 EastMoney 数据源正常工作

### 2.2 回测系统增强 (Phase 2)
- ✅ 实现一手规则 (`src/lib/backtest/lot-size.ts`)
  - A股: 100股/手
  - ETF: 100份/手
  - 可转债: 10张/手
- ✅ 详细交易记录 (`DetailedTrade` 类型)
  - 信号价格 vs 成交价格
  - 滑点和手续费明细
  - 手数计算过程
  - 持仓变化追踪
- ✅ 每日回测日志 (`BacktestDailyLog` 类型)
  - 每日 OHLCV 数据
  - 指标值快照
  - 信号和操作记录
  - 投资组合状态

---

## 三、待实现功能 / Pending Features

### 3.1 参数提取与编辑 (Phase 3)
- [ ] 从生成代码中提取可调参数
- [ ] 参数编辑器 UI 组件
- [ ] 参数修改后代码实时更新

### 3.2 历史记录持久化 (Phase 6)
- [ ] localStorage 本地存储
- [ ] IndexedDB 大数据存储
- [ ] 云端同步 (登录后)

### 3.3 AI 顾问 MCP 集成 (Phase 7)
- [ ] 后端 MCP 服务器
- [ ] 实时数据工具
- [ ] 前端集成

### 3.4 用户系统 (Phase 8)
- [ ] NextAuth.js 完整实现
- [ ] 用户分级
- [ ] 支付集成

---

## 四、技术债务 / Technical Debt

| 项目 | 描述 | 优先级 |
|------|------|--------|
| K线组件解耦 | 当前 `KLineChart` 内部生成数据，无法接收外部数据 | 🔴 高 |
| WebSocket 重连 | 断线重连逻辑需要增强 | 🟡 中 |
| 错误边界 | 图表组件需要添加 ErrorBoundary | 🟡 中 |
| 性能优化 | 大量 K 线数据时需要虚拟化 | 🟢 低 |

---

## 五、风险评估 / Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| EastMoney API 变更 | 数据获取失败 | 多数据源备份 |
| WebSocket 连接不稳定 | 实时数据中断 | 自动重连 + HTTP 降级 |
| 大量数据内存压力 | 页面卡顿 | 数据分页 + 虚拟滚动 |
| A股数据延迟 | 用户体验差 | 明确显示数据时间戳 |
