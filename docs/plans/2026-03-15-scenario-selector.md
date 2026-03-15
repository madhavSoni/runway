# Scenario Selector + Named Headers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add editable row/column labels and a scenario picker that loads 4 pre-built financial templates (Revenue Model, Cash Flow, Budget vs. Actuals, P&L Summary) into the spreadsheet.

**Architecture:** `rowLabels`/`colLabels` string arrays live alongside `GridData` in `Spreadsheet.tsx`. A `loadScenario()` callback atomically replaces all state. Scenarios are pure data objects in `src/scenarios/index.ts`. Row/column header cells become `EditableHeader` components — click to edit, Enter/Escape to commit/cancel.

**Tech Stack:** React 18, TypeScript, Next.js 14, SCSS (CSS custom properties), Framer Motion (existing), Chakra UI (existing)

---

## Task 1: Extend types.ts with Scenario types

**Files:**
- Modify: `src/types.ts`

**Step 1: Add the new types**

Open `src/types.ts` and append after the existing `ColumnHeadersProps` interface:

```ts
export type ScenarioId =
  | 'blank'
  | 'revenue-model'
  | 'cash-flow'
  | 'budget-vs-actuals'
  | 'pnl-summary';

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  rowLabels: string[];
  colLabels: string[];
  data: GridData;
  formatMap: FormatMap;
}

export interface EditableHeaderProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  isActive?: boolean;
  className?: string;
}
```

Also update `ColumnHeadersProps` to accept labels:

```ts
export interface ColumnHeadersProps {
  columnCount: number;
  selectedCol: number | null;
  colLabels: string[];
  onColLabelChange: (col: number, label: string) => void;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (new types don't break existing code yet).

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Scenario and EditableHeader types"
```

---

## Task 2: Create scenario data

**Files:**
- Create: `src/scenarios/index.ts`

**Step 1: Create the file with all 4 scenarios**

```ts
import { CellFormat, FormatMap, GridData, Scenario } from '../types';

const NUM_ROWS = 10;
const NUM_COLS = 10;

function emptyGrid(): GridData {
  return Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(''));
}

function emptyLabels(n: number): string[] {
  return Array(n).fill('');
}

function buildFormatMap(
  entries: Array<{ row: number; col: number; format: CellFormat }>
): FormatMap {
  return entries.reduce<FormatMap>((acc, { row, col, format }) => {
    acc[`${row}:${col}`] = format;
    return acc;
  }, {});
}

// ── Revenue Model ──────────────────────────────────────────────────────────────

const revenueModelData: GridData = emptyGrid();
// Row 0: SaaS
[120000, 125000, 131000, 138000, 144000, 152000, 159000, 167000, 175000, 183000].forEach(
  (v, c) => { revenueModelData[0][c] = String(v); }
);
// Row 1: Services
[45000, 42000, 48000, 51000, 47000, 55000, 58000, 61000, 64000, 67000].forEach(
  (v, c) => { revenueModelData[1][c] = String(v); }
);
// Row 2: Marketplace
[18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000, 42000, 45000].forEach(
  (v, c) => { revenueModelData[2][c] = String(v); }
);
// Row 3: Other Revenue
[8000, 7500, 9000, 8500, 10000, 9500, 11000, 10500, 12000, 11500].forEach(
  (v, c) => { revenueModelData[3][c] = String(v); }
);

const revenueModelFormats: FormatMap = buildFormatMap(
  Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: NUM_COLS }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const revenueModel: Scenario = {
  id: 'revenue-model',
  name: 'Revenue Model',
  description: 'Monthly revenue by stream',
  rowLabels: ['SaaS', 'Services', 'Marketplace', 'Other Revenue', '', '', '', '', '', ''],
  colLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  data: revenueModelData,
  formatMap: revenueModelFormats,
};

// ── Cash Flow Forecast ─────────────────────────────────────────────────────────

const cashFlowData: GridData = emptyGrid();
const cashFlowRows = [
  [850000, 920000, 1010000, 1100000, 3880000],   // 0 Customer Revenue
  [120000, 135000, 145000, 160000, 560000],       // 1 Pro Services
  [970000, 1055000, 1155000, 1260000, 4440000],   // 2 Total Inflows
  [420000, 435000, 450000, 465000, 1770000],      // 3 Payroll
  [180000, 195000, 215000, 235000, 825000],       // 4 COGS
  [95000, 105000, 115000, 125000, 440000],        // 5 Marketing
  [150000, 155000, 160000, 165000, 630000],       // 6 R&D
  [55000, 57000, 59000, 61000, 232000],           // 7 G&A
  [900000, 947000, 999000, 1051000, 3897000],     // 8 Total Outflows
  [70000, 108000, 156000, 209000, 543000],        // 9 Net Cash Flow
];
cashFlowRows.forEach((row, r) => row.forEach((v, c) => { cashFlowData[r][c] = String(v); }));

const cashFlowFormats: FormatMap = buildFormatMap(
  Array.from({ length: NUM_ROWS }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const cashFlow: Scenario = {
  id: 'cash-flow',
  name: 'Cash Flow Forecast',
  description: 'Quarterly inflows and outflows',
  rowLabels: [
    'Customer Revenue', 'Pro Services', 'Total Inflows',
    'Payroll', 'COGS', 'Marketing', 'R&D', 'G&A',
    'Total Outflows', 'Net Cash Flow',
  ],
  colLabels: ['Q1', 'Q2', 'Q3', 'Q4', 'FY Total', '', '', '', '', ''],
  data: cashFlowData,
  formatMap: cashFlowFormats,
};

// ── Budget vs. Actuals ─────────────────────────────────────────────────────────

const bvaData: GridData = emptyGrid();
const bvaRows = [
  [1200000, 1158000, -42000,   -3.5],  // 0 Revenue
  [ 480000,  475000,   5000,    1.04], // 1 Cost of Revenue
  [ 720000,  683000, -37000,   -5.14], // 2 Gross Profit
  [ 180000,  195000, -15000,   -8.33], // 3 Sales & Mktg
  [ 240000,  228000,  12000,    5.0],  // 4 R&D
  [  96000,  102000,  -6000,   -6.25], // 5 G&A
  [ 516000,  525000,  -9000,   -1.74], // 6 Total OpEx
  [ 204000,  158000, -46000,  -22.55], // 7 EBITDA
];
bvaRows.forEach((row, r) => row.forEach((v, c) => { bvaData[r][c] = String(v); }));

const bvaFormats: FormatMap = buildFormatMap([
  // cols 0-2: currency for rows 0-7
  ...Array.from({ length: 8 }, (_, r) => [
    { row: r, col: 0, format: 'currency' as CellFormat },
    { row: r, col: 1, format: 'currency' as CellFormat },
    { row: r, col: 2, format: 'currency' as CellFormat },
    { row: r, col: 3, format: 'percentage' as CellFormat },
  ]).flat(),
]);

const budgetVsActuals: Scenario = {
  id: 'budget-vs-actuals',
  name: 'Budget vs. Actuals',
  description: 'Plan vs. performance with variance',
  rowLabels: [
    'Revenue', 'Cost of Revenue', 'Gross Profit',
    'Sales & Mktg', 'R&D', 'G&A', 'Total OpEx', 'EBITDA', '', '',
  ],
  colLabels: ['Budget', 'Actual', 'Variance', 'Var %', '', '', '', '', '', ''],
  data: bvaData,
  formatMap: bvaFormats,
};

// ── P&L Summary ───────────────────────────────────────────────────────────────

const pnlData: GridData = emptyGrid();
const pnlRows = [
  [3200000, 4150000, 5500000, 5800000, 7200000],  // 0 Revenue
  [1280000, 1620000, 2090000, 2204000, 2664000],  // 1 Cost of Revenue
  [1920000, 2530000, 3410000, 3596000, 4536000],  // 2 Gross Profit
  [ 640000,  830000, 1100000, 1160000, 1440000],  // 3 Sales & Marketing
  [ 480000,  622000,  825000,  870000, 1080000],  // 4 R&D
  [ 192000,  249000,  330000,  348000,  432000],  // 5 G&A
  [1312000, 1701000, 2255000, 2378000, 2952000],  // 6 Operating Exp
  [ 608000,  829000, 1155000, 1218000, 1584000],  // 7 Operating Income
  [ -45000,  -38000,  -25000,  -20000,   15000],  // 8 Interest & Other
  [ 563000,  791000, 1130000, 1198000, 1599000],  // 9 Net Income
];
pnlRows.forEach((row, r) => row.forEach((v, c) => { pnlData[r][c] = String(v); }));

const pnlFormats: FormatMap = buildFormatMap(
  Array.from({ length: NUM_ROWS }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const pnlSummary: Scenario = {
  id: 'pnl-summary',
  name: 'P&L Summary',
  description: 'Multi-year income statement',
  rowLabels: [
    'Revenue', 'Cost of Revenue', 'Gross Profit',
    'Sales & Marketing', 'R&D', 'G&A',
    'Operating Exp', 'Operating Income', 'Interest & Other', 'Net Income',
  ],
  colLabels: ['FY 2022', 'FY 2023', 'FY 2024', 'LTM', 'NTM', '', '', '', '', ''],
  data: pnlData,
  formatMap: pnlFormats,
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [revenueModel, cashFlow, budgetVsActuals, pnlSummary];
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/scenarios/index.ts
git commit -m "feat: add 4 financial scenario templates"
```

---

## Task 3: Create EditableHeader component

**Files:**
- Create: `src/components/EditableHeader.tsx`

**Step 1: Create the component**

```tsx
import React, { useEffect, useRef, useState } from 'react';

import { EditableHeaderProps } from '../types';

const EditableHeader: React.FC<EditableHeaderProps> = ({
  value,
  placeholder,
  onChange,
  isActive = false,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep editValue in sync when value changes externally (e.g. scenario load)
  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    onChange(editValue);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`editable-header-input ${className}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        aria-label={`Edit label: ${placeholder}`}
      />
    );
  }

  return (
    <div
      className={`editable-header-display${isActive ? ' active' : ''} ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit label"
      role="button"
      tabIndex={-1}
    >
      {value || <span className="editable-header-placeholder">{placeholder}</span>}
    </div>
  );
};

export default EditableHeader;
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/EditableHeader.tsx
git commit -m "feat: add EditableHeader click-to-edit component"
```

---

## Task 4: Update ColumnHeaders to use editable labels

**Files:**
- Modify: `src/components/ColumnHeaders.tsx`

**Step 1: Read the current file, then replace its contents**

```tsx
import React from 'react';

import { ColumnHeadersProps } from '../types';
import EditableHeader from './EditableHeader';

const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
  columnCount,
  selectedCol,
  colLabels,
  onColLabelChange,
}) => {
  return (
    <div className="col-header-row" role="row">
      <div className="row-header-spacer" />
      {Array.from({ length: columnCount }, (_, colIdx) => (
        <div
          key={colIdx}
          className={`col-header-cell${selectedCol === colIdx ? ' col-active' : ''}`}
        >
          <EditableHeader
            value={colLabels[colIdx] ?? ''}
            placeholder={String.fromCharCode(65 + colIdx)}
            onChange={(val) => onColLabelChange(colIdx, val)}
            isActive={selectedCol === colIdx}
            className="col-header-editable"
          />
        </div>
      ))}
      <div className="col-header-cell col-header-total">Row Total</div>
    </div>
  );
};

export default ColumnHeaders;
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/ColumnHeaders.tsx
git commit -m "feat: replace static column labels with EditableHeader"
```

---

## Task 5: Create ScenarioPicker component

**Files:**
- Create: `src/components/ScenarioPicker.tsx`

**Step 1: Create the component**

```tsx
import React, { useRef, useState } from 'react';

import { SCENARIOS } from '../scenarios';
import { Scenario } from '../types';

interface ScenarioPickerProps {
  activeScenarioId: string | null;
  onLoad: (scenario: Scenario | null) => void;
}

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ activeScenarioId, onLoad }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) ?? null;

  const handleSelect = (scenario: Scenario | null) => {
    onLoad(scenario);
    setOpen(false);
  };

  return (
    <div className="scenario-picker" ref={containerRef}>
      <button
        type="button"
        className="scenario-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="scenario-picker-label">Scenario</span>
        <span className="scenario-picker-name">
          {activeScenario ? activeScenario.name : 'Blank'}
        </span>
        <span className="scenario-picker-chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="scenario-picker-dropdown" role="listbox">
          <button
            type="button"
            className={`scenario-option${activeScenarioId === null ? ' active' : ''}`}
            role="option"
            aria-selected={activeScenarioId === null}
            onClick={() => handleSelect(null)}
          >
            <span className="scenario-option-name">Blank</span>
            <span className="scenario-option-desc">Empty grid</span>
          </button>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
              role="option"
              aria-selected={activeScenarioId === s.id}
              onClick={() => handleSelect(s)}
            >
              <span className="scenario-option-name">{s.name}</span>
              <span className="scenario-option-desc">{s.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenarioPicker;
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/ScenarioPicker.tsx
git commit -m "feat: add ScenarioPicker dropdown component"
```

---

## Task 6: Wire everything into Spreadsheet.tsx

**Files:**
- Modify: `src/components/Spreadsheet.tsx`

**Step 1: Add new imports at the top**

Add after the existing imports:
```tsx
import EditableHeader from 'components/EditableHeader';
import ScenarioPicker from 'components/ScenarioPicker';
import { SCENARIOS } from '../scenarios';
import { Scenario } from '../types';
```

**Step 2: Add new state variables after `activeFormat` state**

```tsx
const [rowLabels, setRowLabels] = useState<string[]>(Array(NUM_ROWS).fill(''));
const [colLabels, setColLabels] = useState<string[]>(Array(NUM_COLS).fill(''));
const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
```

**Step 3: Add `loadScenario` callback after the existing callbacks**

```tsx
const loadScenario = useCallback((scenario: Scenario | null) => {
  setGridData(scenario ? scenario.data.map((row) => [...row]) : INITIAL_GRID);
  setRowLabels(scenario ? [...scenario.rowLabels] : Array(NUM_ROWS).fill(''));
  setColLabels(scenario ? [...scenario.colLabels] : Array(NUM_COLS).fill(''));
  setFormatMap(scenario ? { ...scenario.formatMap } : {});
  setActiveScenarioId(scenario ? scenario.id : null);
  setSelectedCell(null);
  setEditingCell(null);
  setEditingInitialChar(undefined);
}, []);
```

**Step 4: Add label change handlers**

```tsx
const handleRowLabelChange = useCallback((row: number, label: string) => {
  setRowLabels((prev) => {
    const next = [...prev];
    next[row] = label;
    return next;
  });
}, []);

const handleColLabelChange = useCallback((col: number, label: string) => {
  setColLabels((prev) => {
    const next = [...prev];
    next[col] = label;
    return next;
  });
}, []);
```

**Step 5: Update the return JSX**

Replace the `<FormatToolbar ... />` line and the `<div className="spreadsheet-container">` section:

```tsx
return (
  <div>
    <div className="toolbar-bar">
      <div className="toolbar-left">
        <div className="cell-address">
          <div className={`cell-address-box${selectedCell ? '' : ' cell-address-placeholder'}`}>
            {selectedCell
              ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
              : '—'}
          </div>
        </div>
        <ScenarioPicker
          activeScenarioId={activeScenarioId}
          onLoad={loadScenario}
        />
      </div>
      <FormatToolbar
        activeFormat={activeFormat}
        onFormatChange={handleFormatChange}
        disabled={selectedCell === null}
        selectedCell={selectedCell}
      />
    </div>
    <div
      ref={containerRef}
      className="spreadsheet-container"
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onClick={() => containerRef.current?.focus()}
      role="grid"
      aria-label="Financial spreadsheet"
    >
      <div className="spreadsheet-grid">
        <ColumnHeaders
          columnCount={NUM_COLS}
          selectedCol={selectedCell?.col ?? null}
          colLabels={colLabels}
          onColLabelChange={handleColLabelChange}
        />
        {gridData.map((row, rowIdx) => {
          const fmt: CellFormat = formatMap[`${rowIdx}:${colIdx}`] ?? 'auto';  // remove this line, it's inside the map
          return (
            <div key={rowIdx} className="spreadsheet-row" role="row">
              <div className={`row-header${selectedCell?.row === rowIdx ? ' row-active' : ''}`}>
                <EditableHeader
                  value={rowLabels[rowIdx] ?? ''}
                  placeholder={String(rowIdx + 1)}
                  onChange={(val) => handleRowLabelChange(rowIdx, val)}
                  isActive={selectedCell?.row === rowIdx}
                  className="row-header-editable"
                />
              </div>
              {row.map((cellValue, colIdx) => {
                const fmt: CellFormat = formatMap[`${rowIdx}:${colIdx}`] ?? 'auto';
                const numeric = isNumericString(cellValue);
                const negative = isNegativeNumber(cellValue);
                return (
                  <Cell
                    key={`${rowIdx}:${colIdx}`}
                    value={cellValue}
                    displayValue={formatCellValue(cellValue, fmt)}
                    isSelected={selectedCell?.row === rowIdx && selectedCell?.col === colIdx}
                    isEditing={editingCell?.row === rowIdx && editingCell?.col === colIdx}
                    isNumeric={numeric}
                    isNegative={negative}
                    format={fmt}
                    row={rowIdx}
                    col={colIdx}
                    initialEditValue={
                      editingCell?.row === rowIdx && editingCell?.col === colIdx
                        ? editingInitialChar
                        : undefined
                    }
                    onSelect={setSelectedCell}
                    onStartEdit={startEditing}
                    onCommit={commitEdit}
                    onCancel={cancelEdit}
                    onNavigate={navigateTo}
                  />
                );
              })}
              <div className={`total-cell${rowTotals[rowIdx] === 0 ? ' zero' : ''}`}>
                {rowTotals[rowIdx] === 0 ? '—' : formatNumber(rowTotals[rowIdx], 'currency')}
              </div>
            </div>
          );
        })}
        <div className="spreadsheet-row totals-row" role="row">
          <div className="row-header">Σ</div>
          {columnTotals.map((total, colIdx) => (
            <div
              key={colIdx}
              className={`total-cell${total === 0 ? ' zero' : ''}`}
              style={{ borderLeft: 'none', borderRight: '1px solid var(--grid-border)' }}
            >
              {total === 0 ? '—' : formatNumber(total, 'currency')}
            </div>
          ))}
          <div className={`total-cell grand-total${grandTotal === 0 ? ' zero' : ''}`}>
            {grandTotal === 0 ? '—' : formatNumber(grandTotal, 'currency')}
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

**Note:** The code above shows the structure. When implementing, copy the actual existing return JSX and make the targeted modifications rather than replacing everything. The key changes are:
1. Add `<ScenarioPicker>` in toolbar-left div
2. Pass `colLabels` and `onColLabelChange` to `<ColumnHeaders>`
3. Replace the static `row-header` div content with `<EditableHeader>`
4. Move the cell address display into the toolbar-left div

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any type errors before proceeding.

**Step 7: Commit**

```bash
git add src/components/Spreadsheet.tsx
git commit -m "feat: wire scenario loader and editable row/col labels into Spreadsheet"
```

---

## Task 7: Add styles

**Files:**
- Modify: `src/styles.scss`

**Step 1: Widen the row header to fit labels**

Find the `:root` block and update:
```scss
--row-header-width: 120px;
```

**Step 2: Add EditableHeader styles** (append to end of file before `@media` block)

```scss
// ── Editable headers ──────────────────────────────────────────────────────────

.editable-header-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--accent);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 3px;
  transition: background 0.1s ease, color 0.1s ease;

  &:hover {
    background: var(--accent-dim);
  }

  &.active {
    color: var(--accent);
  }
}

.editable-header-placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

.editable-header-input {
  width: 100%;
  height: 100%;
  padding: 0 8px;
  border: none;
  background: var(--cell-input-bg);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: 3px;
  caret-color: var(--accent);
  transition: background 0.25s ease;
}

// Row header gets full width for the editable header
.row-header {
  padding: 0;

  .editable-header-display,
  .editable-header-input {
    justify-content: flex-start;
  }
}

// Col header: center-aligned labels
.col-header-editable {
  width: 100%;

  &.editable-header-display {
    justify-content: center;
    text-align: center;
  }

  &.editable-header-input {
    text-align: center;
  }
}
```

**Step 3: Add ScenarioPicker styles** (append after editable header styles)

```scss
// ── Scenario picker ───────────────────────────────────────────────────────────

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scenario-picker {
  position: relative;
}

.scenario-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid var(--grid-border);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: var(--surface-alt);
    border-color: var(--grid-border-strong);
  }
}

.scenario-picker-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  user-select: none;
  transition: color 0.25s ease;
}

.scenario-picker-name {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  user-select: none;
  transition: color 0.25s ease;
}

.scenario-picker-chevron {
  font-size: 10px;
  color: var(--text-muted);
  user-select: none;
}

.scenario-picker-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--surface-bg);
  border: 1px solid var(--grid-border-strong);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
  overflow: hidden;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.scenario-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid var(--grid-border);
  transition: background 0.1s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--surface-alt);
  }

  &.active {
    background: var(--accent-dim);

    .scenario-option-name {
      color: var(--accent);
    }
  }
}

.scenario-option-name {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.25s ease;
}

.scenario-option-desc {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-muted);
  transition: color 0.25s ease;
}
```

**Step 4: Verify the app runs without visual errors**

```bash
npm run dev
```

Open http://localhost:3000. Check:
- [ ] Row headers are wider and show placeholder numbers when blank
- [ ] Column headers show A–J placeholders when blank
- [ ] Clicking a row/column header opens an input
- [ ] Typing a label and pressing Enter commits it
- [ ] Pressing Escape reverts the label
- [ ] The scenario picker button appears in the toolbar

**Step 5: Commit**

```bash
git add src/styles.scss
git commit -m "feat: add styles for EditableHeader and ScenarioPicker"
```

---

## Task 8: Load a scenario and verify end-to-end

**Step 1: Manual smoke test**

With `npm run dev` running:

1. Click the "Scenario" button in the toolbar
2. Select "Revenue Model"
   - Expected: Grid fills with SaaS/Services/Marketplace/Other Revenue row labels, Jan–Oct column labels, pre-formatted currency numbers
   - Expected: Row totals and grand total update to reflect the data
3. Click a row label (e.g., "SaaS")
   - Expected: Input opens, you can rename it
4. Press Escape
   - Expected: Label reverts to "SaaS"
5. Select "Budget vs. Actuals"
   - Expected: Grid reloads with budget data, Var % column shows percentage format
6. Select "Blank"
   - Expected: Grid clears, labels clear, all cells empty
7. Click a column header (e.g., "A" placeholder)
   - Expected: Input opens with empty value, you can type a new label

**Step 2: Close the dropdown when clicking outside**

If the dropdown doesn't close on outside click, add a `useEffect` to `ScenarioPicker.tsx`:

```tsx
useEffect(() => {
  if (!open) return;
  const handler = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [open]);
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete scenario selector with named row/col headers"
```

---

## Checklist

- [ ] Task 1: Types added, compiles clean
- [ ] Task 2: 4 scenario data objects created
- [ ] Task 3: EditableHeader component created
- [ ] Task 4: ColumnHeaders updated to use editable labels
- [ ] Task 5: ScenarioPicker dropdown created
- [ ] Task 6: Spreadsheet.tsx wired with new state + callbacks
- [ ] Task 7: Styles added for headers and picker
- [ ] Task 8: End-to-end smoke test passes
