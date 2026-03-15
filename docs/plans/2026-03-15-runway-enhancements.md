# Runway-Inspired Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 7 features to the financial spreadsheet: undo/redo, multi-cell selection, copy/paste, CSV export, formula engine, row types with variance rows, and sparklines.

**Architecture:** Formulas are evaluated in a memoized `displayGrid` derived from raw `gridData`. Multi-cell selection replaces `selectedCell` with `Selection { anchor, focus }`. Variance rows are virtual (not in state) — built from a `renderRows` array that injects computed rows after Plan/Actual pairs. Undo uses immutable snapshots stored in refs.

**Tech Stack:** React 19, Next.js 15, TypeScript, SCSS, no new dependencies needed.

> **Note:** Unit tests are explicitly out of scope for this exercise. Each task ends with a browser verification step instead of automated tests.

---

### Task 1: Add new types to types.ts

**Files:**
- Modify: `src/types.ts`

**Step 1: Add the new types**

Open `src/types.ts` and add after the existing type definitions:

```ts
// Row type for Plan/Actual variance analysis
export type RowType = 'data' | 'plan' | 'actual';
export type RowTypeMap = Record<number, RowType>; // sparse; missing key = 'data'

// Multi-cell selection
export type Selection = {
  anchor: CellCoord; // where selection started
  focus: CellCoord;  // current selection end (may equal anchor)
};

// Snapshot for undo/redo history
export type SnapshotState = {
  gridData: GridData;
  formatMap: FormatMap;
  rowLabels: string[];
  colLabels: string[];
  rowTypes: RowTypeMap;
};

// Virtual row types for rendering (includes computed variance rows)
export type RenderRow =
  | { kind: 'data'; rowIndex: number }
  | { kind: 'variance'; planRow: number; actualRow: number }
  | { kind: 'variancePct'; planRow: number; actualRow: number };
```

Also update `CellProps` in the same file to add new props:

```ts
export interface CellProps {
  row: number;
  col: number;
  value: string;
  displayValue?: string;    // ADD: formula-evaluated display value
  isActive: boolean;        // RENAME from: was implied by selectedCell
  isSelected: boolean;      // ADD: cell is in multi-cell selection (not just active)
  format: CellFormat;
  onSelect: (row: number, col: number, shiftKey: boolean) => void;  // ADD shiftKey param
  onStartEdit: (row: number, col: number, initialChar?: string) => void;
  onCommit: (value: string, direction: CommitDirection) => void;
  onCancel: () => void;
  onNavigate: (dir: NavDirection) => void;
  onClear: () => void;
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors referencing old `CellProps.isSelected` / `onSelect` signature — that's fine, we'll fix them in later tasks.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Selection, RowType, SnapshotState, RenderRow types"
```

---

### Task 2: Create formula engine

**Files:**
- Create: `src/utils/formulas.ts`

**Step 1: Create the file**

```ts
import type { GridData } from '../types';

export type FormulaResult =
  | { value: number; error: undefined }
  | { value: null; error: string };

/** Parse "B3" → { row: 2, col: 1 }. Returns null if invalid. */
function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.trim().match(/^([A-J])(\d{1,2})$/i);
  if (!match) return null;
  const col = match[1].toUpperCase().charCodeAt(0) - 65; // A=0
  const row = parseInt(match[2], 10) - 1; // 1-indexed → 0-indexed
  if (row < 0 || row > 9 || col < 0 || col > 9) return null;
  return { row, col };
}

/** Get a cell's numeric value, evaluating formulas recursively. Returns null for non-numeric or circular. */
function getCellNumeric(
  row: number,
  col: number,
  gridData: GridData,
  visiting: Set<string>
): number | null {
  const key = `${row}:${col}`;
  if (visiting.has(key)) return null; // circular reference
  const raw = gridData[row]?.[col] ?? '';
  if (raw.startsWith('=')) {
    visiting.add(key);
    const result = evalExpr(raw.slice(1).trim(), gridData, visiting);
    visiting.delete(key);
    return result.error != null ? null : result.value;
  }
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Get all numeric values in a range string like "A1:B3". */
function getRangeValues(
  rangeStr: string,
  gridData: GridData,
  visiting: Set<string>
): number[] | null {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return null;
  const values: number[] = [];
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      const v = getCellNumeric(r, c, gridData, visiting);
      if (v !== null) values.push(v);
    }
  }
  return values;
}

/** Evaluate an expression string (without the leading "="). */
function evalExpr(
  expr: string,
  gridData: GridData,
  visiting: Set<string>
): FormulaResult {
  const trimmed = expr.trim();

  // Range function: SUM(...), AVERAGE(...), MIN(...), MAX(...)
  const funcMatch = trimmed.match(/^(SUM|AVERAGE|AVG|MIN|MAX)\(([^)]+)\)$/i);
  if (funcMatch) {
    const fn = funcMatch[1].toUpperCase();
    const values = getRangeValues(funcMatch[2].trim(), gridData, visiting);
    if (!values || values.length === 0) return { value: null, error: '#REF!' };
    switch (fn) {
      case 'SUM':
        return { value: values.reduce((a, b) => a + b, 0), error: undefined };
      case 'AVERAGE':
      case 'AVG':
        return { value: values.reduce((a, b) => a + b, 0) / values.length, error: undefined };
      case 'MIN':
        return { value: Math.min(...values), error: undefined };
      case 'MAX':
        return { value: Math.max(...values), error: undefined };
    }
  }

  // Arithmetic with cell references: replace each ref with its value
  let arithmetic = trimmed;
  const cellRefRe = /\b([A-J]\d{1,2})\b/gi;
  const matches = Array.from(trimmed.matchAll(cellRefRe));
  for (const m of matches) {
    const coord = parseCellRef(m[1]);
    if (!coord) return { value: null, error: '#REF!' };
    const val = getCellNumeric(coord.row, coord.col, gridData, visiting);
    if (val === null) return { value: null, error: '#REF!' };
    arithmetic = arithmetic.replace(new RegExp(`\\b${m[1]}\\b`, 'gi'), String(val));
  }

  // Safety: only allow digits, operators, parens, dots, spaces
  if (!/^[\d+\-*/().%\s]+$/.test(arithmetic)) {
    return { value: null, error: '#ERR!' };
  }

  try {
    // Use Function constructor (safer than eval — strict mode, no scope access)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const result = new Function('"use strict"; return (' + arithmetic + ')')() as number;
    if (!isFinite(result)) return { value: null, error: '#DIV/0!' };
    if (isNaN(result)) return { value: null, error: '#NAN!' };
    return { value: result, error: undefined };
  } catch {
    return { value: null, error: '#ERR!' };
  }
}

/**
 * Evaluate a formula string (must start with "=").
 * Returns { value: number } on success or { error: string } on failure.
 */
export function evaluateFormula(formula: string, gridData: GridData): FormulaResult {
  if (!formula.startsWith('=')) return { value: null, error: '#ERR!' };
  const expr = formula.slice(1).trim();
  if (!expr) return { value: null, error: '#ERR!' };
  return evalExpr(expr, gridData, new Set());
}

/** Check if a string is a formula (starts with =). */
export function isFormula(value: string): boolean {
  return value.startsWith('=');
}
```

**Step 2: Verify TypeScript**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npx tsc --noEmit 2>&1 | grep "formulas" | head -10
```

Expected: no errors from `formulas.ts`.

**Step 3: Commit**

```bash
git add src/utils/formulas.ts
git commit -m "feat: add formula engine with SUM/AVERAGE/MIN/MAX and arithmetic"
```

---

### Task 3: Create Sparkline component

**Files:**
- Create: `src/components/Sparkline.tsx`

**Step 1: Create the component**

```tsx
import React from 'react';

interface SparklineProps {
  /** Raw numeric values to plot (non-finite values are filtered out) */
  values: number[];
  width?: number;
  height?: number;
}

/**
 * SVG mini line chart showing the trend of values in a row.
 * Color: green if trending up, red if trending down, muted if flat.
 */
export const Sparkline = React.memo(function Sparkline({
  values,
  width = 60,
  height = 18,
}: SparklineProps) {
  const numeric = values.filter((v) => isFinite(v) && !isNaN(v));
  if (numeric.length < 2) return null;

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max === min ? 1 : max - min;
  const padding = 2;

  const points = numeric
    .map((v, i) => {
      const x = ((i / (numeric.length - 1)) * width).toFixed(1);
      const y = (height - padding - ((v - min) / range) * (height - padding * 2)).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');

  const first = numeric[0];
  const last = numeric[numeric.length - 1];
  const color =
    last > first
      ? 'var(--positive)'
      : last < first
        ? 'var(--negative)'
        : 'var(--text-muted)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
```

**Step 2: Commit**

```bash
git add src/components/Sparkline.tsx
git commit -m "feat: add Sparkline SVG component"
```

---

### Task 4: Update Cell.tsx for new props

**Files:**
- Modify: `src/components/Cell.tsx`

**Step 1: Read the current file first**

Read `src/components/Cell.tsx` completely to understand current structure before modifying.

**Step 2: Update the component**

Key changes needed:
- Accept `displayValue?: string` prop — used in display mode instead of raw `value`
- Accept `isSelected: boolean` — for multi-cell selection tint
- Rename `isActive` (was implied by `selectedCell === this cell`) — now explicit
- Update `onSelect` call signature to pass `shiftKey`
- Show `ƒ` formula indicator when `value.startsWith('=')`
- Remove the old "selected" class (now use `isActive` + `isSelected`)

The display mode div should use `displayValue ?? value` for formatting.

**Changes to make in Cell.tsx:**

1. Update props destructuring:
```tsx
function Cell({
  row, col, value,
  displayValue,      // NEW
  isActive,          // renamed from being implied
  isSelected,        // NEW
  format,
  onSelect, onStartEdit, onCommit, onCancel, onNavigate, onClear,
}: CellProps)
```

2. In display mode, use `displayValue ?? value` for formatting:
```tsx
const displayVal = displayValue ?? value;
// then use displayVal where value was used for display formatting
```

3. Update the display div to add `isSelected` class:
```tsx
className={`cell ${isActive ? 'cell--active' : ''} ${isSelected ? 'cell--selected' : ''} ...`}
```

4. Update mouse click handler to pass shiftKey:
```tsx
onClick={(e) => onSelect(row, col, e.shiftKey)}
```

5. Add formula indicator inside the display div (only when isActive or isSelected so it's not distracting):
```tsx
{value.startsWith('=') && (
  <span className="formula-indicator" aria-hidden="true">ƒ</span>
)}
```

**Step 3: Verify TypeScript**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npx tsc --noEmit 2>&1 | grep "Cell" | head -10
```

**Step 4: Commit**

```bash
git add src/components/Cell.tsx
git commit -m "feat: Cell supports displayValue, multi-select, formula indicator"
```

---

### Task 5: Update EditableHeader for row type badge

**Files:**
- Modify: `src/components/EditableHeader.tsx`

**Step 1: Read the current file**

Read `src/components/EditableHeader.tsx` completely.

**Step 2: Add row type badge support**

Add two optional props to `EditableHeaderProps` in `types.ts` (already there if you added them) OR add them directly as local props:

```tsx
interface EditableHeaderProps {
  // ... existing props ...
  rowType?: RowType;                           // NEW: only for row headers
  onRowTypeChange?: (type: RowType) => void;   // NEW: callback to cycle type
}
```

Add a badge button that cycles `data → plan → actual → data`:

```tsx
const CYCLE: RowType[] = ['data', 'plan', 'actual'];
const BADGE_LABEL: Record<RowType, string> = { data: '·', plan: 'P', actual: 'A' };

// Inside the component, render a badge button if rowType is provided:
{rowType !== undefined && onRowTypeChange && (
  <button
    className={`row-type-badge row-type-badge--${rowType}`}
    onClick={(e) => {
      e.stopPropagation();
      const next = CYCLE[(CYCLE.indexOf(rowType) + 1) % CYCLE.length];
      onRowTypeChange(next);
    }}
    title={`Row type: ${rowType} (click to change)`}
    aria-label={`Row type: ${rowType}`}
  >
    {BADGE_LABEL[rowType]}
  </button>
)}
```

Place the badge button BEFORE the label text in the row header layout.

**Step 3: Commit**

```bash
git add src/components/EditableHeader.tsx
git commit -m "feat: EditableHeader supports row type badge cycling"
```

---

### Task 6: Update FormatToolbar for multi-cell format, sparklines toggle, CSV export

**Files:**
- Modify: `src/components/FormatToolbar.tsx`
- Modify: `src/types.ts` (update FormatToolbarProps)

**Step 1: Update FormatToolbarProps in types.ts**

```ts
export interface FormatToolbarProps {
  activeFormat: CellFormat | null;
  onFormatChange: (format: CellFormat) => void;
  activeCell: string | null; // e.g. "B5" — null if no selection
  showSparklines: boolean;   // NEW
  onToggleSparklines: () => void;  // NEW
  onExportCsv: () => void;   // NEW
}
```

**Step 2: Update FormatToolbar.tsx**

Read the current file first, then add:
- A `[〜 Trend]` sparkline toggle button with `.active` class when `showSparklines` is true
- A `[↓ CSV]` export button

```tsx
<div className="toolbar-right">
  <button
    className={`toolbar-btn sparkline-toggle ${showSparklines ? 'active' : ''}`}
    onClick={onToggleSparklines}
    title="Toggle sparkline trend charts"
    aria-pressed={showSparklines}
  >
    〜 Trend
  </button>
  <button
    className="toolbar-btn csv-export"
    onClick={onExportCsv}
    title="Export as CSV"
  >
    ↓ CSV
  </button>
</div>
```

**Step 3: Commit**

```bash
git add src/components/FormatToolbar.tsx src/types.ts
git commit -m "feat: FormatToolbar adds sparkline toggle and CSV export button"
```

---

### Task 7: Major Spreadsheet.tsx rewrite — all state and logic

This is the biggest task. Read the current `src/components/Spreadsheet.tsx` completely before starting.

**Files:**
- Modify: `src/components/Spreadsheet.tsx`

**Step 1: Add imports**

```tsx
import { useRef, useMemo, useCallback } from 'react';
import { evaluateFormula, isFormula } from '../utils/formulas';
import { Sparkline } from './Sparkline';
import type {
  Selection, SnapshotState, RenderRow, RowType, RowTypeMap
} from '../types';
import { parseRawNumber, isNumericString } from '../utils/formatting';
```

**Step 2: Replace `selectedCell` state with `selection`**

```tsx
// REMOVE: const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);
// ADD:
const [selection, setSelection] = useState<Selection | null>(null);
```

**Step 3: Add new state**

```tsx
const [rowTypes, setRowTypes] = useState<RowTypeMap>({});
const [showSparklines, setShowSparklines] = useState(false);
```

**Step 4: Add undo/redo refs**

```tsx
const pastRef = useRef<SnapshotState[]>([]);
const futureRef = useRef<SnapshotState[]>([]);

function currentSnapshot(): SnapshotState {
  return { gridData, formatMap, rowLabels, colLabels, rowTypes };
}

function pushSnapshot(snapshot: SnapshotState) {
  pastRef.current = [...pastRef.current.slice(-49), snapshot];
  futureRef.current = [];
}
```

**Step 5: Add selection helpers**

```tsx
function getActiveCell(sel: Selection | null): CellCoord | null {
  return sel ? sel.focus : null;
}

function isCellInSelection(row: number, col: number, sel: Selection | null): boolean {
  if (!sel) return false;
  const minR = Math.min(sel.anchor.row, sel.focus.row);
  const maxR = Math.max(sel.anchor.row, sel.focus.row);
  const minC = Math.min(sel.anchor.col, sel.focus.col);
  const maxC = Math.max(sel.anchor.col, sel.focus.col);
  return row >= minR && row <= maxR && col >= minC && col <= maxC;
}

function getSelectionBounds(sel: Selection) {
  return {
    minRow: Math.min(sel.anchor.row, sel.focus.row),
    maxRow: Math.max(sel.anchor.row, sel.focus.row),
    minCol: Math.min(sel.anchor.col, sel.focus.col),
    maxCol: Math.max(sel.anchor.col, sel.focus.col),
  };
}
```

**Step 6: Update `navigateTo` to work with Selection**

```tsx
function navigateTo(row: number, col: number, shiftKey = false) {
  const clampedRow = Math.max(0, Math.min(NUM_ROWS - 1, row));
  const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, col));
  const newFocus = { row: clampedRow, col: clampedCol };
  if (shiftKey && selection) {
    setSelection({ anchor: selection.anchor, focus: newFocus });
  } else {
    setSelection({ anchor: newFocus, focus: newFocus });
  }
}
```

**Step 7: Update `handleCellSelect`**

```tsx
function handleCellSelect(row: number, col: number, shiftKey: boolean) {
  if (shiftKey && selection) {
    setSelection({ anchor: selection.anchor, focus: { row, col } });
  } else {
    setSelection({ anchor: { row, col }, focus: { row, col } });
  }
  setEditingCell(null);
}
```

**Step 8: Update `commitEdit` to call `pushSnapshot`**

```tsx
function commitEdit(value: string, direction: CommitDirection) {
  if (!editingCell) return;
  pushSnapshot(currentSnapshot());
  const { row, col } = editingCell;
  setGridData(prev => {
    const next = prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r);
    return next;
  });
  // ... rest of commit (navigation) unchanged
}
```

**Step 9: Update `clearCell`**

```tsx
function clearCell() {
  const active = getActiveCell(selection);
  if (!active) return;
  pushSnapshot(currentSnapshot());
  // If multi-cell selection, clear all cells in range
  if (selection) {
    const bounds = getSelectionBounds(selection);
    setGridData(prev =>
      prev.map((row, ri) =>
        ri >= bounds.minRow && ri <= bounds.maxRow
          ? row.map((cell, ci) => ci >= bounds.minCol && ci <= bounds.maxCol ? '' : cell)
          : row
      )
    );
  }
}
```

**Step 10: Update `handleFormatChange`**

```tsx
function handleFormatChange(format: CellFormat) {
  if (!selection) return;
  pushSnapshot(currentSnapshot());
  const bounds = getSelectionBounds(selection);
  setFormatMap(prev => {
    const next = { ...prev };
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const key = `${r}:${c}`;
        if (format === 'auto') {
          delete next[key];
        } else {
          next[key] = format;
        }
      }
    }
    return next;
  });
}
```

**Step 11: Add undo/redo handlers**

```tsx
function undo() {
  if (pastRef.current.length === 0) return;
  const prev = pastRef.current[pastRef.current.length - 1];
  pastRef.current = pastRef.current.slice(0, -1);
  futureRef.current = [currentSnapshot(), ...futureRef.current];
  setGridData(prev.gridData);
  setFormatMap(prev.formatMap);
  setRowLabels(prev.rowLabels);
  setColLabels(prev.colLabels);
  setRowTypes(prev.rowTypes);
}

function redo() {
  if (futureRef.current.length === 0) return;
  const next = futureRef.current[0];
  futureRef.current = futureRef.current.slice(1);
  pastRef.current = [...pastRef.current, currentSnapshot()];
  setGridData(next.gridData);
  setFormatMap(next.formatMap);
  setRowLabels(next.rowLabels);
  setColLabels(next.colLabels);
  setRowTypes(next.rowTypes);
}
```

**Step 12: Add copy/paste handlers**

```tsx
async function copySelection() {
  if (!selection) return;
  const bounds = getSelectionBounds(selection);
  const rows: string[] = [];
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    const cols: string[] = [];
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      cols.push(displayGrid[r][c]);
    }
    rows.push(cols.join('\t'));
  }
  await navigator.clipboard.writeText(rows.join('\n'));
}

async function pasteFromClipboard() {
  const active = getActiveCell(selection);
  if (!active) return;
  try {
    const text = await navigator.clipboard.readText();
    const rows = text.split('\n').map(r => r.split('\t'));
    pushSnapshot(currentSnapshot());
    setGridData(prev =>
      prev.map((row, ri) => {
        const pasteRow = ri - active.row;
        if (pasteRow < 0 || pasteRow >= rows.length) return row;
        return row.map((cell, ci) => {
          const pasteCol = ci - active.col;
          if (pasteCol < 0 || pasteCol >= rows[pasteRow].length) return cell;
          return rows[pasteRow][pasteCol];
        });
      })
    );
  } catch {
    // clipboard access denied — silently ignore
  }
}
```

**Step 13: Add CSV export**

```tsx
function exportCsv() {
  const headers = ['', ...colLabels, 'Total'];
  const lines: string[] = [headers.map(h => `"${h}"`).join(',')];
  gridData.forEach((row, ri) => {
    const total = row.reduce((sum, cell) => {
      const n = parseRawNumber(cell);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const cells = row.map((cell, ci) => {
      const fmt = formatMap[`${ri}:${ci}`] ?? 'auto';
      return `"${formatCellValue(cell, fmt)}"`;
    });
    lines.push([`"${rowLabels[ri]}"`, ...cells, `"${total}"`].join(','));
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${activeScenarioId ?? 'spreadsheet'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 14: Add `displayGrid` useMemo**

```tsx
const displayGrid = useMemo(() => {
  return gridData.map(row =>
    row.map(cell => {
      if (!isFormula(cell)) return cell;
      const result = evaluateFormula(cell, gridData);
      if (result.error) return result.error;
      return String(result.value);
    })
  );
}, [gridData]);
```

**Step 15: Add `renderRows` useMemo**

```tsx
function buildRenderRows(numRows: number, types: RowTypeMap): RenderRow[] {
  const rows: RenderRow[] = [];
  for (let i = 0; i < numRows; i++) {
    rows.push({ kind: 'data', rowIndex: i });
    // After a plan row immediately followed by actual row, inject variance rows
    if (types[i] === 'plan' && types[i + 1] === 'actual') {
      rows.push({ kind: 'variance', planRow: i, actualRow: i + 1 });
      rows.push({ kind: 'variancePct', planRow: i, actualRow: i + 1 });
    }
  }
  return rows;
}

const renderRows = useMemo(() => buildRenderRows(NUM_ROWS, rowTypes), [rowTypes]);
```

**Step 16: Add row numeric values for sparklines**

```tsx
const rowNumericValues = useMemo(() => {
  return gridData.map(row =>
    row.map(cell => {
      const display = isFormula(cell)
        ? (() => { const r = evaluateFormula(cell, gridData); return r.error ? '' : String(r.value); })()
        : cell;
      return parseRawNumber(display);
    })
  );
}, [gridData]);
```

**Step 17: Update the keyboard handler**

In the existing `onKeyDown` handler on the container, add:

```tsx
// Undo/Redo
if (e.ctrlKey || e.metaKey) {
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
  if (e.key === 'c') { e.preventDefault(); copySelection(); return; }
  if (e.key === 'v') { e.preventDefault(); pasteFromClipboard(); return; }
}

// Shift+Arrow for multi-cell selection (when not editing)
if (!editingCell && e.shiftKey) {
  const active = getActiveCell(selection);
  if (!active) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); navigateTo(active.row, active.col + 1, true); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); navigateTo(active.row, active.col - 1, true); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateTo(active.row + 1, active.col, true); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); navigateTo(active.row - 1, active.col, true); return; }
}
```

**Step 18: Update the row rendering**

Replace the current `_.times(NUM_ROWS, ...)` render with a loop over `renderRows`:

```tsx
{renderRows.map((renderRow, idx) => {
  if (renderRow.kind === 'data') {
    const ri = renderRow.rowIndex;
    return (
      <div key={`row-${ri}`} className="spreadsheet-row" role="row">
        {/* Row header with type badge and optional sparkline */}
        <EditableHeader
          value={rowLabels[ri]}
          onChange={(v) => handleRowLabelChange(ri, v)}
          isActive={getActiveCell(selection)?.col === undefined}
          rowType={rowTypes[ri] ?? 'data'}
          onRowTypeChange={(type) => {
            pushSnapshot(currentSnapshot());
            setRowTypes(prev => ({ ...prev, [ri]: type }));
          }}
        />
        {showSparklines && (
          <Sparkline values={rowNumericValues[ri]} />
        )}
        {/* Data cells */}
        {gridData[ri].map((cellValue, ci) => (
          <Cell
            key={`${ri}:${ci}`}
            row={ri} col={ci}
            value={cellValue}
            displayValue={displayGrid[ri][ci] !== cellValue ? displayGrid[ri][ci] : undefined}
            isActive={getActiveCell(selection)?.row === ri && getActiveCell(selection)?.col === ci}
            isSelected={isCellInSelection(ri, ci, selection)}
            format={formatMap[`${ri}:${ci}`] ?? 'auto'}
            onSelect={handleCellSelect}
            onStartEdit={startEditing}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            onNavigate={handleNavFromCell}
            onClear={clearCell}
          />
        ))}
        {/* Row total cell */}
        <div className="cell cell--total" role="gridcell">
          {formatCellValue(String(rowTotals[ri]), 'currency')}
        </div>
      </div>
    );
  }

  // Variance rows (read-only, computed)
  if (renderRow.kind === 'variance' || renderRow.kind === 'variancePct') {
    const { planRow, actualRow } = renderRow;
    const isVariancePct = renderRow.kind === 'variancePct';
    const label = isVariancePct ? '└ Var %' : '└ Variance';

    const cells = Array.from({ length: NUM_COLS }, (_, ci) => {
      const planVal = parseRawNumber(displayGrid[planRow][ci]);
      const actualVal = parseRawNumber(displayGrid[actualRow][ci]);
      if (isNaN(planVal) || isNaN(actualVal)) return null;
      if (isVariancePct) {
        if (planVal === 0) return null;
        return (actualVal - planVal) / Math.abs(planVal) * 100;
      }
      return actualVal - planVal;
    });

    return (
      <div key={`variance-${planRow}-${isVariancePct ? 'pct' : 'abs'}-${idx}`}
           className="spreadsheet-row variance-row" role="row">
        <div className="row-header-cell variance-label">{label}</div>
        {showSparklines && <div style={{ width: 60 }} />}
        {cells.map((v, ci) => {
          const isEmpty = v === null;
          const formatted = isEmpty ? '—' : isVariancePct
            ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
            : formatCellValue(String(v), 'currency').replace(/^\$/, v >= 0 ? '+$' : '-$').replace('+-', '-');
          const sign = isEmpty ? '' : v > 0 ? 'positive' : v < 0 ? 'negative' : '';
          const arrow = isEmpty ? '' : v > 0 ? '▲ ' : v < 0 ? '▼ ' : '';
          return (
            <div key={ci} className={`cell cell--variance cell-value--${sign}`} role="gridcell">
              {!isEmpty && <span className="variance-arrow">{arrow}</span>}
              {formatted}
            </div>
          );
        })}
        <div className="cell cell--total" role="gridcell" />
      </div>
    );
  }

  return null;
})}
```

**Step 19: Wire FormatToolbar**

Update the FormatToolbar call to pass new props:

```tsx
<FormatToolbar
  activeFormat={activeFormat}
  onFormatChange={handleFormatChange}
  activeCell={activeCellAddress}
  showSparklines={showSparklines}
  onToggleSparklines={() => setShowSparklines(v => !v)}
  onExportCsv={exportCsv}
/>
```

**Step 20: Update loadScenario to reset rowTypes**

```tsx
function loadScenario(scenario: Scenario | null) {
  pushSnapshot(currentSnapshot());
  // ... existing reset logic ...
  setRowTypes({}); // reset row types when loading scenario
  setSelection(null);
}
```

**Step 21: Verify TypeScript**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npx tsc --noEmit 2>&1 | head -40
```

Fix any type errors before committing.

**Step 22: Commit**

```bash
git add src/components/Spreadsheet.tsx
git commit -m "feat: Spreadsheet adds undo/redo, multi-select, copy/paste, CSV, formulas, row types, sparklines"
```

---

### Task 8: Update styles.scss

**Files:**
- Modify: `styles.scss`

**Step 1: Read the current file**

Read `styles.scss` completely to understand existing variable names and patterns.

**Step 2: Add new styles**

Add at the end of `styles.scss`:

```scss
// ============================================================
// Multi-cell selection
// ============================================================
.cell--selected {
  background: rgba(59, 130, 246, 0.12) !important;
  // Only active cell gets the gold glow (handled by cell--active)
}

// ============================================================
// Row type badges
// ============================================================
.row-type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.15s;
  background: transparent;
  color: var(--text-muted);

  &:hover { opacity: 1; }

  &--plan {
    background: rgba(20, 184, 166, 0.18);
    color: #14b8a6;
    opacity: 1;
  }

  &--actual {
    background: rgba(245, 158, 11, 0.18);
    color: #f59e0b;
    opacity: 1;
  }
}

// ============================================================
// Sparklines in row headers
// ============================================================
.row-header-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

// ============================================================
// Variance rows
// ============================================================
.variance-row {
  opacity: 0.88;

  .row-header-cell.variance-label {
    padding-left: 1.25rem;
    font-size: 0.78em;
    color: var(--text-muted);
    font-style: italic;
    font-weight: 400;
  }

  .cell--variance {
    font-style: italic;
    font-size: 0.85em;
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1px;
  }

  .variance-arrow {
    font-size: 0.7em;
  }

  .cell-value--positive {
    color: var(--positive);
  }

  .cell-value--negative {
    color: var(--negative);
  }
}

// ============================================================
// Formula indicator
// ============================================================
.formula-indicator {
  position: absolute;
  top: 2px;
  left: 3px;
  font-size: 9px;
  font-style: italic;
  color: var(--accent);
  opacity: 0.7;
  pointer-events: none;
  line-height: 1;
}

// ============================================================
// Toolbar additions
// ============================================================
.sparkline-toggle,
.csv-export {
  // Uses existing .toolbar-btn styles; these override for state
}

.sparkline-toggle.active {
  color: var(--accent);
  border-color: var(--accent);
  opacity: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
```

**Step 3: Verify the app builds**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npm run build 2>&1 | tail -20
```

**Step 4: Commit**

```bash
git add styles.scss
git commit -m "feat: add styles for selection, badges, variance rows, sparklines, formula indicator"
```

---

### Task 9: Update Budget vs. Actuals scenario with row types

**Files:**
- Modify: `src/scenarios/index.ts`
- Modify: `src/types.ts` (add `rowTypes` to `Scenario`)

**Step 1: Add `rowTypes` to Scenario type in types.ts**

```ts
export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  rowLabels: string[];
  colLabels: string[];
  data: GridData;
  formatMap: FormatMap;
  rowTypes?: RowTypeMap;  // NEW: optional, pre-configured row types
}
```

**Step 2: Update budgetVsActuals scenario in scenarios/index.ts**

Read the current file, then add `rowTypes` to the `budgetVsActuals` scenario object.

The Budget vs. Actuals scenario has rows like:
- Row 0: Revenue (Plan)
- Row 1: Revenue (Actual)
- etc.

Add to the scenario object:
```ts
rowTypes: { 0: 'plan', 1: 'actual', 2: 'plan', 3: 'actual', 4: 'plan', 5: 'actual' },
```

(Adjust based on actual row structure in the scenario.)

**Step 3: Update `loadScenario` in Spreadsheet.tsx to apply scenario rowTypes**

```tsx
function loadScenario(scenario: Scenario | null) {
  pushSnapshot(currentSnapshot());
  if (!scenario) {
    // ... reset to blank ...
    setRowTypes({});
  } else {
    // ... apply scenario data ...
    setRowTypes(scenario.rowTypes ?? {});
  }
  setSelection(null);
}
```

**Step 4: Verify TypeScript and run dev server**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npx tsc --noEmit 2>&1 | head -20
npm run dev &
```

Open http://localhost:3000 and verify:
- Load "Budget vs. Actuals" scenario → variance rows appear automatically
- Toggle sparklines on → trend charts visible in row headers
- Edit a cell → Ctrl+Z undoes the change
- Enter `=SUM(A1:A5)` in a cell → shows computed sum
- Shift+Arrow to extend selection → cells highlight
- Ctrl+C then Ctrl+V → values paste
- Click "↓ CSV" → downloads file

**Step 5: Commit**

```bash
git add src/scenarios/index.ts src/types.ts src/components/Spreadsheet.tsx
git commit -m "feat: scenario supports rowTypes; budget vs actuals pre-configured with Plan/Actual"
```

---

### Task 10: Final polish and lint

**Step 1: Run lint**

```bash
cd /Users/madhavsoni/Documents/GitHub/react-interview && npm run lint 2>&1
```

Fix any lint errors.

**Step 2: Run production build**

```bash
npm run build 2>&1 | tail -30
```

Fix any build errors.

**Step 3: Update README with new features**

Open `README.md` and add to the "Future improvements" section (or update):

```markdown
## Recent Additions

- **Formula engine**: `=SUM(A1:A5)`, `=AVERAGE(...)`, `=MIN/MAX(...)`, arithmetic with cell refs (`=B2-B1`)
- **Row types (Plan/Actual)**: Click the `·` badge on any row header to mark it as Plan (teal `P`) or Actual (amber `A`). When a Plan row is immediately followed by an Actual row, Variance and Variance % rows appear automatically.
- **Sparklines**: Click `〜 Trend` in the toolbar to show SVG mini trend charts in row headers
- **Undo/Redo**: Ctrl+Z / Ctrl+Y (50 states)
- **Multi-cell selection**: Shift+Arrow or Shift+Click to select ranges
- **Copy/Paste**: Ctrl+C / Ctrl+V (Excel-compatible tab/newline format)
- **CSV Export**: Click `↓ CSV` to download the current grid
```

**Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: update README with new feature list"
```

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` produces a production build
- [ ] `npm run lint` passes with no errors
- [ ] Formula: `=SUM(A1:A3)` shows correct sum, updates when referenced cells change
- [ ] Formula: `=B2-B1` shows arithmetic result
- [ ] Formula error: `=SUM(Z1:Z5)` (out of bounds) shows `#REF!`
- [ ] Undo: edit a cell → Ctrl+Z → value reverts
- [ ] Redo: after undo, Ctrl+Y → value returns
- [ ] Multi-select: Shift+Arrow extends selection with blue tint
- [ ] Copy/Paste: Ctrl+C on a range → Ctrl+V in another cell → values replicated
- [ ] CSV: click "↓ CSV" → file downloads with correct headers and formatted values
- [ ] Row types: set row to Plan, next to Actual → Variance rows appear with color coding
- [ ] Sparklines: toggle on → SVG trend charts appear; trending up = green, down = red
- [ ] Load "Budget vs. Actuals" scenario → pre-configured variance rows visible
- [ ] Dark/light theme still works with all new elements styled correctly
