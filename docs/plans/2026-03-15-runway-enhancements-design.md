# Design: Runway-Inspired Spreadsheet Enhancements

**Date:** 2026-03-15
**Status:** Approved

## Context

The financial spreadsheet has solid core editing, formatting, and scenario loading. To align more closely with Runway's product vision and demonstrate both financial domain depth and polished spreadsheet fundamentals, we are adding 7 features.

## Feature Set

1. **Undo/Redo** — Ctrl+Z / Ctrl+Y with 50-state history
2. **Multi-cell selection** — Shift+Arrow, Shift+Click to select ranges
3. **Copy/Paste** — Ctrl+C/V compatible with Excel/Google Sheets clipboard format
4. **CSV Export** — Button to download current grid as `.csv`
5. **Formula Engine** — `=SUM`, `=AVERAGE`, `=MIN`, `=MAX`, arithmetic with cell refs
6. **Row Types + Variance Rows** — Mark rows as Plan/Actual; auto-compute Variance and Variance % rows
7. **Sparklines** — Toggle to show SVG mini trend charts in row headers

## Architecture

### New Files
- `src/utils/formulas.ts` — Formula parser & evaluator (pure functions)
- `src/components/Sparkline.tsx` — SVG sparkline component

### Modified Files
- `src/types.ts` — `RowType`, `RowTypeMap`, `Selection`, `SnapshotState`, `RenderRow`
- `src/components/Spreadsheet.tsx` — History stack, selection, rowTypes, renderRows, copy/paste, CSV
- `src/components/Cell.tsx` — `displayValue` prop, formula indicator, selection highlighting
- `src/components/EditableHeader.tsx` — Row type badge cycling button
- `src/components/FormatToolbar.tsx` — Multi-cell format, sparkline toggle, CSV export
- `styles.scss` — Selection, variance row, badge, sparkline styles

## Key Design Decisions

### Undo/Redo
Use `useRef` for `past`/`future` stacks (avoids extra renders). Snapshot includes `gridData`, `formatMap`, `rowLabels`, `colLabels`, `rowTypes`. Every committing action calls `pushSnapshot()` before applying changes.

### Multi-cell Selection
Replace `selectedCell: CellCoord | null` with `selection: Selection | null` where `Selection = { anchor, focus }`. The active cell is always `focus`. Shift+Arrow extends focus; plain Arrow collapses selection.

### Formula Engine
Pure function `evaluateFormula(formula, gridData)` in `formulas.ts`. Memoized `displayGrid` in Spreadsheet computes display values for all formula cells. Cell.tsx receives `displayValue` override. Edit mode always shows raw formula.

### Row Types + Variance
`RowTypeMap` is sparse (missing = 'data'). When a `plan` row is immediately followed by an `actual` row, `buildRenderRows()` injects two read-only computed rows: Variance and Variance %. These are computed in the render loop, not stored in state.

### Sparklines
Pure SVG `<polyline>` component. Rendered in row headers when `showSparklines` is true. Color = green (last > first), red (last < first), gray (flat).

## Data Flow

```
User action → pushSnapshot() → setState → useMemo(displayGrid) → useMemo(renderRows) → Render
```

## Implementation Order

1. `src/types.ts`
2. `src/utils/formulas.ts`
3. `src/components/Sparkline.tsx`
4. `src/components/Spreadsheet.tsx`
5. `src/components/Cell.tsx`
6. `src/components/EditableHeader.tsx`
7. `src/components/FormatToolbar.tsx`
8. `styles.scss`
9. `src/scenarios/index.ts`
