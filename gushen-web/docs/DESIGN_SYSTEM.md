# GuShen Design System: The Quant's Cockpit

**Philosophy**: This interface is a professional tool, not a toy. It prioritizes **Control**, **Speed**, **Precision**, and **Insight**.

## 1. Core Principles

- **Dark Mode Only**: We use deep, rich voids (`bg-void`), not pure black.
- **Data Density**: High information density with clear hierarchy.
- **Visual Feedback**: Every interaction must feel tactile and responsive.
- **Financial Precision**: All numbers must be monospaced and tabular.

## 2. Color System (Tailwind Classes)

### Backgrounds

| Class              | Hex       | Usage                                  |
| ------------------ | --------- | -------------------------------------- |
| `bg-void`          | `#09090b` | Main application background (The Void) |
| `bg-surface`       | `#18181b` | Cards, panels, sidebars                |
| `bg-surface-hover` | `#27272a` | Interactive elements on hover          |

### Accents

| Class                         | Usage                                               |
| ----------------------------- | --------------------------------------------------- |
| `text-primary` / `bg-primary` | **Trust/Action**. Main buttons, active tabs, links. |
| `text-accent` / `bg-accent`   | **Warning/VIP**. Critical alerts, premium features. |

### Market Sentiment (Dynamic)

| Class              | Usage                                               |
| ------------------ | --------------------------------------------------- |
| `text-profit`      | **Positive Outcome** (Red in CN, Green in US).      |
| `text-loss`        | **Negative Outcome** (Green in CN, Red in US).      |
| `text-profit-neon` | **Glowing Positive**. Use for active signals/pills. |
| `text-loss-neon`   | **Glowing Negative**. Use for active signals/pills. |

## 3. Typography

### Font Stacks

- **UI / Headings**: `font-sans` (Inter)
- **Data / Code**: `font-mono` (JetBrains Mono)

### Text Utilities

- **`tabular-nums`**: **MANDATORY** for all financial data (prices, %, dates).
- **`text-data-xs`** to **`text-data-2xl`**: Specialized sizes for data grids.
- **`text-stat-sm`** to **`text-stat-xl`**: Large display numbers for KPIs.

## 4. Common Components

### Glass Panel

Use for floating elements (modals, sticky headers, chat windows).

```tsx
<div className="glass-panel p-4 rounded-lg">{/* Content */}</div>
```

### Stat Card

Standard KPI display.

```tsx
<div className="stat-card">
  <span className="stat-label">Total Equity</span>
  <span className="stat-value text-profit tabular-nums">¥1,245,000.00</span>
</div>
```

### Ticker Tape

Scrolling market data strip.

```tsx
<div className="ticker-tape">
  <span>SHCOMP: 3200.50</span>
  <span className="text-profit">+1.2%</span>
</div>
```

## 5. Animation & Interaction

- **Tactile Buttons**: Add `btn-tactile` to primary actions for a press effect.
- **Live Updates**: Add `animate-pulse-profit` or `animate-pulse-loss` to a cell when data changes.
- **Active Glow**: Add `glow-active` to selected tabs or active strategy cards.

## 6. Do's and Don'ts

- **DO** use `tabular-nums` for every single number that might change.
- **DO** use `text-neutral-400` for labels to let the white/colored data pop.
- **DON'T** use bright backgrounds. Keep it dark.
- **DON'T** use rounded corners larger than `rounded-lg` for data containers (keep it sharp).
