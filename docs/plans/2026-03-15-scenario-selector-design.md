# Design: Scenario Selector + Named Row/Column Headers

**Date:** 2026-03-15
**Status:** Approved

---

## Problem

The spreadsheet is a blank 10×10 grid. A reviewer cannot tell what it's for without typing data manually. There are no real financial use cases demonstrated out of the box.

## Solution

Add:
1. **Named row/column headers** — editable labels alongside the grid (separate from data)
2. **Scenario selector** — a picker that loads pre-built financial templates (labels + data + formats) in one action

---

## Architecture

### New State (Spreadsheet.tsx)

```ts
const [rowLabels, setRowLabels] = useState<string[]>(Array(10).fill(''));
const [colLabels, setColLabels] = useState<string[]>(Array(10).fill(''));
```

Labels are independent of `GridData`. Totals computation is unchanged.

### loadScenario()

Atomically replaces `gridData`, `rowLabels`, `colLabels`, and `formatMap` in one state batch:

```ts
const loadScenario = useCallback((scenario: Scenario | null) => {
  setGridData(scenario?.data ?? INITIAL_GRID);
  setRowLabels(scenario?.rowLabels ?? Array(NUM_ROWS).fill(''));
  setColLabels(scenario?.colLabels ?? Array(NUM_COLS).fill(''));
  setFormatMap(scenario?.formatMap ?? {});
  setSelectedCell(null);
  setEditingCell(null);
}, []);
```

---

## New Files

### `src/scenarios/index.ts`
Exports a `SCENARIOS` array of `Scenario` objects. Each has:
```ts
interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  rowLabels: string[];
  colLabels: string[];
  data: GridData;
  formatMap: FormatMap;
}
```

**4 scenarios:**

1. **Revenue Model** (`revenue-model`)
   - Rows: SaaS, Services, Marketplace, Other Revenue, [6 empty]
   - Cols: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct
   - Data: realistic monthly revenue numbers, currency format

2. **Cash Flow Forecast** (`cash-flow`)
   - Rows: Customer Revenue, Professional Services, Total Inflows, Payroll, COGS, Marketing, R&D, G&A, Total Outflows, Net Cash Flow
   - Cols: Q1, Q2, Q3, Q4, FY Total, [5 empty]
   - Data: realistic quarterly cash flow numbers, currency format

3. **Budget vs. Actuals** (`budget-vs-actuals`)
   - Rows: Revenue, COGS, Gross Profit, Sales & Marketing, R&D, G&A, Total OpEx, EBITDA, [2 empty]
   - Cols: Budget, Actual, Variance, Var %, [6 empty]
   - Data: realistic numbers, mix of currency + percentage formats

4. **P&L Summary** (`pnl-summary`)
   - Rows: Revenue, Cost of Revenue, Gross Profit, S&M, R&D, G&A, Operating Income, Interest, EBITDA, Net Income
   - Cols: FY 2022, FY 2023, FY 2024, LTM, NTM, [5 empty]
   - Data: realistic annual P&L numbers, currency format

### `src/components/ScenarioPicker.tsx`
Pill-style selector in the toolbar. Shows scenario name + description on hover. "Blank" option clears everything.

### `src/components/EditableHeader.tsx`
A reusable click-to-edit label cell. Used for both row headers (leftmost column) and column headers (top row). Has its own local edit state; commits on blur/Enter, cancels on Escape.

---

## Modified Files

### `src/components/ColumnHeaders.tsx`
- Accept `colLabels: string[]` and `onColLabelChange: (col: number, label: string) => void`
- Render `EditableHeader` for each column instead of static A–J letters
- Keep the `col-active` highlight behavior

### `src/components/Spreadsheet.tsx`
- Add `rowLabels`, `colLabels` state
- Add `loadScenario()` callback
- Pass `rowLabels[rowIdx]` to row header (via `EditableHeader`)
- Pass `colLabels` + `onColLabelChange` to `ColumnHeaders`
- Wire `ScenarioPicker` into the toolbar area

### `src/types.ts`
Add:
```ts
export type ScenarioId = 'blank' | 'revenue-model' | 'cash-flow' | 'budget-vs-actuals' | 'pnl-summary';

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  rowLabels: string[];
  colLabels: string[];
  data: GridData;
  formatMap: FormatMap;
}
```

### `src/styles.scss`
- Style `EditableHeader` cells (distinct from data cells: slightly bolder, accent-colored label)
- Style `ScenarioPicker` pills

---

## Data Flow

```
scenarios/index.ts
       ↓
ScenarioPicker (user picks)
       ↓
Spreadsheet.loadScenario()
       ↓
state: { gridData, rowLabels, colLabels, formatMap }
       ↓
ColumnHeaders (colLabels) + row header EditableHeaders (rowLabels) + Cells (gridData)
```

---

## Key Decisions

- **Labels are separate from data** — `rowLabels`/`colLabels` are not in `GridData`. Totals computation ignores them entirely.
- **Labels are editable** — Any scenario's labels can be customized after loading.
- **Atomic scenario load** — All state updates happen in one batch to avoid intermediate render states.
- **FormatMap in scenarios** — Budget vs. Actuals scenario pre-formats the % variance column as `percentage`.
- **"Blank" is a valid scenario** — Clears everything back to an empty grid.

---

## Out of Scope

- Formula engine
- Multi-cell selection
- Undo/redo
- Persistence
