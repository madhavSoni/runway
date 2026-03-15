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

**Formula engine** — Cells starting with `=` are evaluated by a purpose-built parser in `src/utils/formulas.ts`. Supported: `=SUM(...)`, `=AVERAGE(...)`, `=MIN(...)`, `=MAX(...)`, arithmetic (`=A1+B2*3`), and cell references. Circular references are detected at evaluation time and display `#CIRC!`. Formula cell references are color-highlighted with a 6-color palette.

**Pre-built financial scenarios** — Rather than starting with an empty grid, a scenario picker lets reviewers instantly load realistic financial data (Revenue Model, Cash Flow, Budget vs. Actuals, P&L Summary) to explore the formatting, variance, and sparkline features without manual data entry.

**Row types and variance** — Each row carries a type (`data`, `plan`, or `actual`). When a plan row is directly above an actual row, two variance rows are auto-inserted on render: absolute (`actual − plan`) and percentage. These rows are read-only and never stored — they're derived, keeping the data model simple.

**Multi-cell selection, copy/paste, and undo/redo** — Shift+Arrow/Click extends selection. Ctrl+C copies as tab-delimited text (Excel/Google Sheets compatible). Ctrl+V pastes. Ctrl+Z/Y provides full undo/redo via snapshot-based history (capped at 50 entries). These are table-stakes for any spreadsheet interaction.

**Visual polish** — Dark mode (Bloomberg Terminal-inspired navy + gold) and light mode (warm parchment), sparkline trend charts per row, column resize handles, editable row/column labels, CSV export, and a formula bar showing the active cell's address and raw value.

### Key assumptions and product decisions

- **Numbers in green, negatives in red** — Standard financial convention. Green signals gain; red signals loss. Applied in display mode only; edit mode uses neutral text so color doesn't interfere.
- **Format is per-cell, not global** — Each cell has its own format stored in a sparse `Record<string, CellFormat>`. Most cells use `'auto'` and are not in the map at all.
- **Totals always show currency** — Row and column totals are always formatted as currency regardless of per-cell format. In financial contexts, totals are the most important number and should be unambiguous.
- **`—` for zero totals** — An empty row shows `—` instead of `$0.00`. This reduces visual noise; `$0.00` in every row of a blank grid is distracting.
- **Percentage input convention** — When the user types `25` and selects Percent format, it shows `25.00%`, not `0.25%`. This matches how financial modelers typically think: they enter 25 to mean "25 percent."
- **Variance computed on the fly** — Variance rows are never stored in cell state; they are derived during render from the corresponding plan/actual row pair. This keeps the data model simple and ensures variance is always consistent.
- **Raw string storage** — Cell state stores the raw user input (`"1234.5"`, `"=SUM(A1:B3)"`). Formatting is display-only. This preserves precision and makes serialization straightforward.
- **Snapshot-based undo** — Each undoable action captures a full snapshot (grid, formats, labels, row types). More memory-intensive than command-based undo but far simpler to implement correctly and avoids bugs around operation composition.

### Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| Fixed 10×10 grid | Simple state management, predictable layout | Not dynamically sizable |
| Snapshot-based undo | Correct by construction, no operation composition bugs | ~O(n) memory per action |
| String-based cell values | Uniform handling of formulas, text, and numbers | Type coercion at display time |
| Chakra UI for Input only | Accessible, cross-browser input component | Slight inconsistency mixing Chakra + SCSS |
| `requestAnimationFrame` for focus | Avoids focus racing with React's commit phase | ~16ms imperceptible delay |
| Formula scope is grid-level | Simple evaluation, no dependency graph needed | No cross-scenario or named-range formulas |
| CSS custom properties for theming | Instant theme switching, no JS re-render needed | Requires disciplined use of variables |
| SCSS over CSS-in-JS | Full selector power, no runtime overhead | Separate from component definitions |

---

## Future Improvements

- **Persistent storage** — Serialize grid state to `localStorage` or a backend. The immutable state shape makes serialization straightforward.
- **CSV import** — The export path already serializes correctly; the reverse parse is a natural companion.
- **Named ranges** — Allow formulas like `=SUM(Revenue)` instead of `=SUM(B2:M2)` by referencing row/column labels.
- **More functions** — `=IF(...)`, `=ROUND(...)`, `=COUNT(...)`, and financial functions like `=NPV(...)` or `=IRR(...)`.
- **Conditional formatting** — Highlight cells above/below a threshold with automatic background colors.
- **Cross-scenario references** — Reference cells from other scenarios. Would require a full dependency graph for recalculation.
- **Collaborative editing** — Real-time multi-user editing via WebSocket or CRDT-based sync.
- **Virtual scrolling** — For grids larger than 10×10, virtualize rows/columns to maintain render performance.

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
- **Reference highlighting**: Formula cell references are color-coded with a 6-color palette (round-robin), making it easy to see which cells a formula depends on

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
- History stack capped at **50 entries** to prevent unbounded memory growth

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

### Editable Labels

- Double-click any row or column header to rename it
- Label changes are fully undoable
- Labels are included in CSV export

### Formula Bar

- Displays the **cell address** (e.g., "B3") and **raw value** of the active cell
- Shows an `ƒ` indicator when the active cell contains a formula
- Display-only — editing happens directly in the cell

### CSV Export

- One-click **↓ CSV** button in the toolbar
- Exports the full grid including row labels, column labels, and totals
- Filename uses the active scenario ID (or `spreadsheet` by default)

### Theme Toggle

- **Dark mode** (default): Deep navy background with gold accents — inspired by Bloomberg Terminal aesthetics
- **Light mode**: Warm parchment tones with brown accents
- All colors are driven by CSS custom properties for instant, smooth transitions
- Toggle via the sun/moon button in the header

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
│  (stateless except Cell's transient editValue)           │
└──────────────────────────────────────────────────────────┘
```

### State Ownership

All mutable state lives in `Spreadsheet.tsx`:

| State | Type | Description |
|-------|------|-------------|
| `gridData` | `string[][]` | 10×10 grid of raw cell values |
| `formatMap` | `Record<string, CellFormat>` | Sparse map of cell formats (key: `"row:col"`) |
| `selection` | `{ anchor, focus }` | Multi-cell selection range |
| `editingCell` | `CellCoord \| null` | Currently editing cell |
| `rowLabels` / `colLabels` | `string[]` | Editable header labels |
| `rowTypes` | `Record<number, RowType>` | Sparse row-type map (plan/actual/data) |
| `colWidths` | `Record<number, number>` | Per-column widths (from drag resize) |
| `showSparklines` | `boolean` | Sparkline visibility toggle |
| `scenarioId` | `ScenarioId` | Currently loaded scenario |

### Derived State (computed on render, never stored)

- `displayGrid` — Grid with formulas evaluated to display values
- `colFormats` — Detected column-level format (majority vote)
- `rowTotals` / `columnTotals` / `grandTotal` — Aggregated sums
- `renderRows` — Includes auto-inserted variance rows between plan/actual pairs

### Key Patterns

- **Immutable updates** — All grid mutations use spread/slice to create new arrays; no in-place mutation
- **Memoization** — `Cell`, `EditableHeader`, `Sparkline` are wrapped in `React.memo`; derived state uses `useMemo`
- **Ref guards** — `snapshotRef` avoids stale closures; `wasEscapedRef` prevents blur commits after Escape; `pastRef`/`futureRef` hold undo/redo stacks outside the render cycle
- **Controlled inputs** — Cell edit values are local state, committed to parent on Enter/Tab/blur

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
   └─ Pushes snapshot to undo stack
   └─ Updates gridData immutably
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
│   │   ├── Spreadsheet.tsx   # Central state container — owns all grid state
│   │   ├── Cell.tsx          # Single cell: display/edit swap, keyboard handling
│   │   ├── ColumnHeaders.tsx # Column headers with drag-to-resize handles
│   │   ├── EditableHeader.tsx# Editable row/column labels + row-type badges
│   │   ├── FormatToolbar.tsx # Format buttons (Auto/$/#/%), sparkline toggle, CSV export
│   │   ├── FormulaBar.tsx    # Display-only formula bar showing active cell address & value
│   │   ├── ScenarioPicker.tsx# Dropdown to load pre-built financial scenarios
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
