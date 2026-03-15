# Financial Spreadsheet — Runway Frontend Exercise

A production-quality financial spreadsheet editor built with **Next.js 15**, **React 19**, **TypeScript 5.8**, **Chakra UI**, **Framer Motion**, and **SCSS**.

> **Live demo**: Run `yarn dev` and open [http://localhost:3000](http://localhost:3000).

---

## Table of Contents

- [Running the Project](#running-the-project)
- [Implementation Notes](#implementation-notes)
  - [What I Focused On](#what-i-focused-on-and-why)
  - [Key Assumptions & Product Decisions](#key-assumptions-and-product-decisions)
  - [Trade-offs](#trade-offs)
- [Future Improvements](#future-improvements)
- [AI Usage](#ai-usage)
- [Appendix: Full Reference](#appendix-full-reference)
  - [Features](#features)
  - [Architecture](#architecture)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Project Structure](#project-structure)
  - [Tech Stack](#tech-stack)
  - [Testing](#testing)

---

## Running the Project

```bash
# Install dependencies
yarn install
# or: npm install

# Start the dev server
yarn dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
# Other commands
yarn build       # Production build
yarn lint        # ESLint
yarn prettier    # Format code
npx jest         # Run tests
```

---

## Implementation Notes

### What I focused on and why

**Keyboard navigation fidelity** — The single most important quality in a spreadsheet is predictable keyboard response. I spent the most care here: arrow keys navigate in select mode but move the text cursor in edit mode; Tab/Enter commit and advance; Escape discards without committing even if the input loses focus afterward (via the `wasEscapedRef` guard). Getting this right required careful separation of "selection state" from "edit state."

**Display/edit mode duality** — Rather than using a read-only input, I swap between a `motion.div` (display) and a Chakra `Input` (edit). This lets the display cell animate the selection glow with Framer Motion while the input remains a raw, focused HTML element. It also makes right-alignment of numbers easy without fighting the browser's input rendering.

**Financial number formatting** — All formatting lives in `src/utils/formatting.ts` as pure functions. The key decision: auto-detect whether a cell value is numeric, format with `Intl.NumberFormat('en-US')` on display, but store the raw string in state. You can type `1234.5` and see `$1,234.50` in the cell without losing the underlying precision. Four format modes (auto, currency, number, percentage) can be applied per-cell or across a selection.

**Formula engine** — Cells starting with `=` are evaluated by a purpose-built parser in `src/utils/formulas.ts`. Supported: `=SUM(...)`, `=AVERAGE(...)`, `=MIN(...)`, `=MAX(...)`, arithmetic (`=A1+B2*3`), and cell references. Circular references are detected at evaluation time and display `#CIRC!`. When the formula bar is active, formula cell references are color-highlighted with a 6-color palette so you can visually trace which cells a formula depends on.

**Pre-built financial scenarios** — Rather than starting with an empty grid, a scenario picker lets reviewers instantly load realistic financial data (Revenue Model, Cash Flow, Budget vs. Actuals, P&L Summary) to explore the formatting, variance, and sparkline features without manual data entry.

**Row types and variance** — Each row carries a type (`data`, `plan`, or `actual`). When a plan row is directly above an actual row, two variance rows are auto-inserted on render: absolute (`actual − plan`) and percentage. These rows are read-only and never stored — they're derived, keeping the data model simple.

**Multi-sheet support** — The spreadsheet supports multiple sheets via a tab bar at the bottom. Each sheet maintains its own grid data, formatting, labels, row types, and independent undo/redo history. Users can add new sheets, switch between them, and rename tabs by double-clicking.

**Interactive charts** — Select a range of cells and click the Chart button to visualize the data as a bar or line chart. The chart panel appears alongside the grid with Framer Motion animations, supports toggling between chart types, and auto-updates when the underlying data changes.

**Multi-cell selection, copy/paste, and undo/redo** — Shift+Arrow/Click extends selection. Ctrl+C copies as tab-delimited text (Excel/Google Sheets compatible). Ctrl+V pastes. Ctrl+Z/Y provides full undo/redo via snapshot-based history (capped at 50 entries per sheet). These are table-stakes for any spreadsheet interaction.

**Visual polish** — Dark mode (Bloomberg Terminal-inspired navy + gold) and light mode (warm parchment), sparkline trend charts per row, column resize handles, editable row/column labels, CSV export, and a toggleable formula bar showing the active cell's address and raw value.

### Key assumptions and product decisions

- **Numbers in green, negatives in red** — Standard financial convention. Green signals gain; red signals loss. Applied in display mode only; edit mode uses neutral text so color doesn't interfere.
- **Format is per-cell, not global** — Each cell has its own format stored in a sparse `Record<string, CellFormat>`. Most cells use `'auto'` and are not in the map at all.
- **Totals always show currency** — Row and column totals are always formatted as currency regardless of per-cell format. In financial contexts, totals are the most important number and should be unambiguous.
- **`—` for zero totals** — An empty row shows `—` instead of `$0.00`. This reduces visual noise; `$0.00` in every row of a blank grid is distracting.
- **Percentage input convention** — When the user types `25` and selects Percent format, it shows `25.00%`, not `0.25%`. This matches how financial modelers typically think: they enter 25 to mean "25 percent."
- **Variance computed on the fly** — Variance rows are never stored in cell state; they are derived during render from the corresponding plan/actual row pair. This keeps the data model simple and ensures variance is always consistent.
- **Raw string storage** — Cell state stores the raw user input (`"1234.5"`, `"=SUM(A1:B3)"`). Formatting is display-only. This preserves precision and makes serialization straightforward.
- **Snapshot-based undo** — Each undoable action captures a full snapshot (grid, formats, labels, row types). More memory-intensive than command-based undo but far simpler to implement correctly and avoids bugs around operation composition.
- **Per-sheet undo history** — Each sheet has its own independent undo/redo stack so switching sheets doesn't interfere with undo context.

### Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| Fixed 10×10 grid | Simple state management, predictable layout | Not dynamically sizable |
| Snapshot-based undo | Correct by construction, no operation composition bugs | ~O(n) memory per action |
| String-based cell values | Uniform handling of formulas, text, and numbers | Type coercion at display time |
| Chakra UI for Input only | Accessible, cross-browser input component | Slight inconsistency mixing Chakra + SCSS |
| `requestAnimationFrame` for focus | Avoids focus racing with React's commit phase | ~16ms imperceptible delay |
| Formula scope is grid-level | Simple evaluation, no dependency graph needed | No cross-sheet or named-range formulas |
| CSS custom properties for theming | Instant theme switching, no JS re-render needed | Requires disciplined use of variables |
| SCSS over CSS-in-JS | Full selector power, no runtime overhead | Separate from component definitions |
| Per-sheet state in array | Simple multi-sheet model, independent histories | Linear scan to find active sheet |
| Formula ref highlighting tied to formula bar | Keeps the grid clean by default | Users must toggle formula bar to see highlights |

---

## Future Improvements

- **Persistent storage** — Serialize grid state to `localStorage` or a backend. The immutable state shape makes serialization straightforward.
- **CSV import** — The export path already serializes correctly; the reverse parse is a natural companion.
- **Named ranges** — Allow formulas like `=SUM(Revenue)` instead of `=SUM(B2:M2)` by referencing row/column labels.
- **More functions** — `=IF(...)`, `=ROUND(...)`, `=COUNT(...)`, and financial functions like `=NPV(...)` or `=IRR(...)`.
- **Conditional formatting** — Highlight cells above/below a threshold with automatic background colors.
- **Cross-sheet formulas** — Reference cells from other sheets (e.g., `=Sheet2!B3`). Would require a dependency graph for recalculation.
- **Collaborative editing** — Real-time multi-user editing via WebSocket or CRDT-based sync.
- **Virtual scrolling** — For grids larger than 10×10, virtualize rows/columns to maintain render performance.
- **Inline formula bar editing** — Currently display-only; editing the formula directly in the formula bar would match Excel's UX.
- **Chart persistence** — Charts currently close when switching sheets; persisting chart config per-sheet would improve the workflow.

---

## AI Usage

I used **Claude Code (claude-sonnet-4-6)** running in plan mode for this exercise.

### How I used it

1. **Exploration phase** — I asked Claude to read and summarize the starter repository structure, dependencies, and existing component code.
2. **Planning phase** — I described the requirements, aesthetic direction, and architecture I wanted. Claude produced a detailed file-by-file implementation plan including TypeScript interfaces, function signatures, state ownership decisions, and edge cases. I reviewed and approved the plan before any code was written.
3. **Implementation** — Claude wrote all the files in dependency order, then we iteratively ran `next build` to catch and fix ESLint/TypeScript errors.
4. **Decisions I made** — The aesthetic direction (Bloomberg Terminal dark theme, gold accents), the display/edit mode swap strategy, the `wasEscapedRef` blur guard pattern, the per-cell sparse format map, and the `—` for zero totals were all decisions I articulated in the plan before implementation.

The session log is attached to this submission per the exercise instructions.

---

---

# Appendix: Full Reference

The sections below provide deeper technical detail for reviewers who want to explore the implementation.

---

## Features

### Cell Editing

- **Display/edit mode swap** — Cells render as `motion.div` (display) or Chakra `Input` (edit). Display mode supports Framer Motion glow animations; edit mode is a focused, accessible HTML input.
- **Edit triggers** — Double-click, press Enter, or type any printable character to start editing. Typing a character replaces the cell content with that character as the initial value.
- **Commit** — Tab, Enter, or clicking away commits the edit. Shift+Tab and Shift+Enter commit and move in the reverse direction.
- **Cancel** — Escape discards the edit, even if the input loses focus afterward (via a `wasEscapedRef` guard that prevents blur-triggered commits).

### Financial Number Formatting

Four format modes, applied per-cell or across a selection:

| Format | Input | Display | Notes |
|--------|-------|---------|-------|
| **Auto** | `1234.5` | `1,234.50` | Detects integer vs. float; integers show no decimals |
| **Currency ($)** | `1234.5` | `$1,234.50` | Locale-aware via `Intl.NumberFormat` |
| **Number (#)** | `1234.5` | `1,234.50` | Thousands separators, no currency symbol |
| **Percentage (%)** | `25` | `25.00%` | User enters 25 to mean 25% (financial convention) |

- Raw string values are always preserved in state — formatting is display-only.
- Totals always display in currency format for unambiguous readability.
- Zero totals show `—` (em-dash) instead of `$0.00` to reduce visual noise.

### Formula Engine

Cells starting with `=` are evaluated by a purpose-built parser (`src/utils/formulas.ts`):

- **Functions**: `=SUM(A1:B3)`, `=AVERAGE(A1:A10)`, `=MIN(...)`, `=MAX(...)`, `=AVG(...)`
- **Arithmetic**: `=A1+B2*3`, `=C1/D1-10`
- **Cell references**: Auto-resolve to their numeric values at evaluation time
- **Error handling**: `#REF!` (invalid reference), `#ERR!` (parse error), `#DIV/0!` (division by zero), `#NAN!` (not a number), `#CIRC!` (circular reference)
- **Formula indicator**: Cells containing formulas show an `ƒ` badge in display mode
- **Reference highlighting**: When the formula bar is toggled on, cells referenced by the active formula are color-highlighted with a 6-color palette (blue, red, green, amber, purple, pink), cycling round-robin. Each referenced cell gets a matching colored glow via Framer Motion's `boxShadow`.

### Formula Bar

- Toggle via the **ƒ Formula** button in the toolbar
- Displays the **cell address** (e.g., "B3") and **raw value** of the active cell
- Shows an `ƒ` indicator when the active cell contains a formula
- Activates **formula reference highlighting** — cells referenced by the formula glow with color-coded borders
- Display-only — editing happens directly in the cell

### Pre-Built Scenarios

A dropdown **Scenario Picker** provides four ready-to-explore financial templates:

1. **Revenue Model** — Monthly revenue by stream (SaaS, Services, Marketplace, Other), 4 rows × 10 columns, all currency-formatted
2. **Cash Flow** — Quarterly inflows/outflows with paired plan/actual rows, auto-generates 3 variance rows on render
3. **Budget vs. Actuals** — 8 rows × 4 columns with mixed currency + percentage formats; Variance and Var % columns
4. **P&L Summary** — 10-row income statement (Revenue → Net Income) across 5 fiscal years (FY 2022–NTM)

Each scenario populates row labels, column labels, cell data, format maps, and row types.

### Row Types & Variance

- **Three row types**: `data` (default), `plan` (P badge), `actual` (A badge)
- Click the row-type badge on any row header to cycle through types
- When a `plan` row is directly followed by an `actual` row, two **auto-computed variance rows** are inserted:
  - **Absolute variance**: `actual − plan` (with ▲/▼ arrows, green for positive, red for negative)
  - **Percentage variance**: `(actual − plan) / |plan| × 100`
- Variance rows are **read-only** and **never stored** — they are derived during render, keeping the data model simple and always consistent

### Multi-Sheet Support

- **Sheet tabs** at the bottom of the spreadsheet, modeled after Excel/Google Sheets
- **Add sheets** via the `+` button — each new sheet starts with a blank 10×10 grid
- **Switch sheets** by clicking a tab — selection and edit state reset on switch
- **Rename sheets** by double-clicking a tab name (with Enter/Escape commit/cancel)
- **Independent state** — each sheet maintains its own grid data, format map, labels, row types, active scenario, and undo/redo history
- Sheets start with two tabs (Sheet 1, Sheet 2) by default

### Interactive Charts

- **Toggle** via the **▦ Chart** button in the toolbar (requires a cell selection)
- **Chart types**: Bar chart and Line chart, switchable via buttons in the chart panel header
- **Data source**: Charts visualize all numeric values in the current selection
- **Color coding**: Bars are green (positive values) or red (negative values); line charts color based on overall trend direction
- **Animated panel**: Slides in/out with Framer Motion; includes a close button
- **SVG rendering**: 280×180px canvas with labeled axes, baseline at zero, and rotated labels for dense data (>5 points)
- Charts auto-update when the underlying cell data changes

### Multi-Cell Selection

- **Click** to select a single cell
- **Shift+Click** to extend the selection rectangle to the clicked cell
- **Shift+Arrow** to extend the selection in any direction
- Selected cells are highlighted with a blue tint; the active cell has a gold glow

### Copy & Paste

- **Ctrl+C** copies the selected range as tab-delimited text — directly compatible with Excel and Google Sheets
- **Ctrl+V** pastes tab-delimited text starting at the anchor cell, expanding as needed
- **Delete/Backspace** clears all selected cells

### Undo / Redo

- **Ctrl+Z** to undo, **Ctrl+Y** (or Ctrl+Shift+Z) to redo
- Full snapshot-based history: grid data, cell formats, row/column labels, and row types are all restored
- History stack capped at **50 entries per sheet** to prevent unbounded memory growth
- Each sheet has its own undo/redo stack — switching sheets doesn't affect undo context

### Row & Column Totals

- **Row totals** — Sum of all numeric values in each row (rightmost column)
- **Column totals** — Sum of all numeric values in each column (bottom row)
- **Grand total** — Sum of all row totals (bottom-right cell)
- Percentage-format columns are excluded from totals
- Always displayed in currency format for clarity

### Sparklines

- Toggle via the **〜 Trend** button in the toolbar
- Renders an SVG mini line chart in the row header area for each row
- **Color-coded**: green (upward trend), red (downward), gray (flat)
- Filters out non-finite / NaN values before rendering

### Column Resize

- Drag the resize handle on any column header border
- Minimum width: 48px
- Per-column widths are stored in component state
- Row header width is also resizable

### Editable Labels

- Double-click any row or column header to rename it
- Label changes are fully undoable
- Labels are included in CSV export

### CSV Export

- One-click **↓ CSV** button in the toolbar
- Exports the full grid including row labels, column labels, and totals
- Filename uses the active scenario ID (or `spreadsheet` by default)

### Theme Toggle

- **Dark mode** (default): Deep navy background (`#0f1117`) with gold accents (`#d4af37`)
- **Light mode**: Warm parchment (`#f5f2ec`) with brown accents (`#76613d`)
- All colors are driven by CSS custom properties for instant, smooth transitions
- Toggle via the ☀/☾ button in the header
- Positive values: green (`#34d399` dark / `#1a7a4a` light); Negative values: red (`#f87171` dark / `#b91c1c` light)

### Accessibility

- Full ARIA markup: `role="grid"`, `role="row"`, `role="gridcell"`, `role="tab"`, `role="tablist"`
- `aria-selected` on active/selected cells and active sheet tabs
- `aria-label` on every interactive element (cells, buttons, inputs)
- `aria-pressed` on toggle buttons (format, sparklines, formula bar, chart)
- `prefers-reduced-motion` support — disables Framer Motion animations when enabled

---

## Architecture

### Three-Layer Design

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Pure Data & Logic                              │
│  types.ts  ·  formatting.ts  ·  formulas.ts              │
│  (no React dependencies — fully testable in isolation)   │
├──────────────────────────────────────────────────────────┤
│  Layer 2: State Container                                │
│  Spreadsheet.tsx                                         │
│  (owns ALL state — single source of truth)               │
├──────────────────────────────────────────────────────────┤
│  Layer 3: Leaf Components                                │
│  Cell · ColumnHeaders · EditableHeader · FormatToolbar    │
│  FormulaBar · ScenarioPicker · Sparkline                 │
│  ChartPanel · SheetTabs                                  │
│  (stateless except Cell's transient editValue)           │
└──────────────────────────────────────────────────────────┘
```

### State Ownership

All mutable state lives in `Spreadsheet.tsx`:

| State | Type | Description |
|-------|------|-------------|
| `sheets` | `SheetState[]` | Array of sheet objects, each holding its own grid/format/labels/history |
| `activeSheetId` | `SheetId` | Currently visible sheet |
| `selection` | `{ anchor, focus }` | Multi-cell selection range |
| `editingCell` | `CellCoord \| null` | Currently editing cell |
| `colWidths` | `number[]` | Per-column widths (from drag resize) |
| `rowHeaderWidth` | `number` | Resizable row header width |
| `showSparklines` | `boolean` | Sparkline visibility toggle |
| `showFormulaBar` | `boolean` | Formula bar visibility toggle |
| `chartConfig` | `ChartConfig \| null` | Active chart type (bar/line) or null if hidden |

Each `SheetState` contains: `gridData`, `formatMap`, `rowLabels`, `colLabels`, `rowTypes`, `activeScenarioId`, `past` (undo stack), `future` (redo stack).

### Derived State (computed on render, never stored)

- `activeSheet` — The sheet object matching `activeSheetId`
- `displayGrid` — Grid with formulas evaluated to display values
- `colFormats` — Detected column-level format (majority vote)
- `rowTotals` / `columnTotals` / `grandTotal` — Aggregated sums
- `renderRows` — Includes auto-inserted variance rows between plan/actual pairs
- `refHighlightMap` — Formula reference → color map (active only when formula bar is shown)
- `chartData` — Numeric data points extracted from the current selection for charting

### Key Patterns

- **Immutable updates** — All grid mutations use spread/slice to create new arrays; no in-place mutation
- **Memoization** — `Cell`, `EditableHeader`, `Sparkline` are wrapped in `React.memo`; derived state uses `useMemo`
- **Ref guards** — `snapshotRef` avoids stale closures; `wasEscapedRef` prevents blur commits after Escape; `sheetsRef` keeps current sheets accessible in callbacks
- **Controlled inputs** — Cell edit values are local state, committed to parent on Enter/Tab/blur
- **Sheet-scoped updates** — `updateActiveSheet()` helper applies mutations only to the active sheet, leaving others untouched
- **Snapshot-per-sheet** — `pushSnapshotToSheet()` captures undo snapshots within the sheet, keeping histories independent

### Data Flow: Editing a Cell

```
1. User presses Enter on cell
   └─ handleContainerKeyDown → startEditing(activeCell)
2. Spreadsheet sets editingCell state
   └─ Cell renders <Input> instead of <motion.div>
3. Input auto-focuses via requestAnimationFrame
4. User types new value → Cell's local editValue updates
5. User presses Tab
   └─ Cell.handleKeyDown → onCommit(coord, 'tab', editValue)
6. Spreadsheet.commitEdit:
   └─ updateActiveSheet: pushes snapshot, updates gridData
   └─ Clears editingCell
   └─ Moves selection to next cell
7. Grid re-renders with new value
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Arrow keys** | Move selected cell (in selection mode) / move cursor (in edit mode) |
| **Enter** | Start editing / commit edit and move down |
| **Shift+Enter** | Commit edit and move up |
| **Tab** | Commit edit and move right |
| **Shift+Tab** | Commit edit and move left |
| **Escape** | Discard current edit |
| **Home** | Jump to first column |
| **End** | Jump to last column |
| **Delete / Backspace** | Clear selected cells |
| **Shift+Arrow** | Extend selection rectangle |
| **Shift+Click** | Extend selection to clicked cell |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** / **Ctrl+Shift+Z** | Redo |
| **Ctrl+C** | Copy selection (tab-delimited, Excel-compatible) |
| **Ctrl+V** | Paste from clipboard |
| **Any printable character** | Start editing with that character |

---

## Project Structure

```
react-interview/
├── pages/
│   ├── _app.tsx              # App wrapper, global style imports
│   ├── _document.tsx         # Custom HTML document, Google Fonts (Fira Sans / Fira Code)
│   └── index.tsx             # Entry point → renders <App />
├── src/
│   ├── components/
│   │   ├── App.tsx           # Root shell: ChakraProvider, theme toggle, header
│   │   ├── Spreadsheet.tsx   # Central state container — owns all grid/sheet state
│   │   ├── Cell.tsx          # Single cell: display/edit swap, keyboard handling
│   │   ├── ChartPanel.tsx    # Interactive SVG charts (bar + line) with Framer Motion
│   │   ├── ColumnHeaders.tsx # Column headers with drag-to-resize handles
│   │   ├── EditableHeader.tsx# Editable row/column labels + row-type badges
│   │   ├── FormatToolbar.tsx # Format buttons (Auto/$/#/%), sparkline/formula/chart/CSV toggles
│   │   ├── FormulaBar.tsx    # Toggleable formula bar: cell address + raw value display
│   │   ├── ScenarioPicker.tsx# Dropdown to load pre-built financial scenarios
│   │   ├── SheetTabs.tsx     # Multi-sheet tab bar: add, switch, rename sheets
│   │   └── Sparkline.tsx     # SVG mini trend chart per row
│   ├── scenarios/
│   │   └── index.ts          # 4 pre-built scenario templates (Revenue, Cash Flow, Budget, P&L)
│   ├── utils/
│   │   ├── formulas.ts       # Formula parser & evaluator (SUM, AVERAGE, MIN, MAX, arithmetic)
│   │   ├── formulas.test.ts  # Unit tests for parseFormulaRefs
│   │   └── formatting.ts     # Number formatting (currency, percentage, auto-detect)
│   ├── types.ts              # All TypeScript types & interfaces
│   └── styles.scss           # Full SCSS theme system (dark + light modes)
├── styles.scss               # Root SCSS entry (imports src/styles.scss)
├── package.json
├── tsconfig.json
├── next.config.js
├── .eslintrc.js
└── .prettierrc.json
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js | 15.3.3 |
| **UI Library** | React | 19.1.0 |
| **Language** | TypeScript | 5.8.3 |
| **Styling** | SCSS + CSS Custom Properties | — |
| **Component Library** | Chakra UI (Input only) | 2.10.9 |
| **Animation** | Framer Motion | 12.0.0 |
| **Utilities** | Lodash | 4.17.23 |
| **Testing** | Jest + ts-jest | 30.3.0 |
| **Fonts** | Fira Sans (UI) + Fira Code (cells) | Google Fonts |
| **Code Quality** | ESLint (70+ rules) + Prettier | — |

---

## Testing

Tests are located alongside their source files:

```bash
# Run all tests
npx jest

# Run with coverage
npx jest --coverage
```

### Current Test Coverage

- **`src/utils/formulas.test.ts`** — Unit tests for `parseFormulaRefs`:
  - Non-formula strings return empty array
  - Formulas with no cell references
  - Single and multiple cell references with correct color assignments
  - Deduplication of repeated references
  - Range parsing (`A1:B3`)
  - Color wrapping (round-robin at 6 colors)
  - Boundary cells (`A1`, `J10`)
  - Case-insensitive matching

### What's testable in isolation

The architecture deliberately separates pure logic from React components:

- `formatting.ts` — All formatting functions are pure: `isNumericString`, `parseRawNumber`, `formatNumber`, `formatCellValue`, `sumValues`, `computeRowTotals`, `computeColumnTotals`
- `formulas.ts` — Formula evaluation, cell reference parsing, circular reference detection
- `scenarios/index.ts` — Scenario data integrity
