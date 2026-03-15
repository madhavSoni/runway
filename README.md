# Financial Spreadsheet — Runway Frontend Exercise

A production-quality financial spreadsheet editor built on Next.js 14, React 18, TypeScript, Chakra UI, and Framer Motion.

---

## Running the Project

### Install dependencies

```bash
npm install
# or, if yarn is available:
yarn install
```

### Start the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Implementation Notes

### What I focused on and why

**Keyboard navigation fidelity** — The single most important thing in a spreadsheet is that it responds predictably to keys. I spent the most care here: arrow keys navigate in select mode but move the text cursor in edit mode; Tab/Enter commit and advance; Escape discards without committing even if the input loses focus afterward (via the `wasEscapedRef` guard). Getting this right required careful separation of "selection state" from "edit state."

**Display/edit mode duality** — Rather than using a read-only input, I swap between a `motion.div` (display) and a Chakra `Input` (edit). This allows the display cell to animate the selection state with Framer Motion's box-shadow glow while the input remains a raw, focused HTML element. It also makes right-alignment of numbers easy in display mode without fighting the browser's input rendering.

**Financial number formatting** — All formatting lives in `src/utils/formatting.ts` as pure functions. The key decision: auto-detect whether a cell value is numeric, format it with `Intl.NumberFormat('en-US')` on display, but store the raw string in state. This means you can type `1234.5` and see `1,234.50` in the cell without losing the underlying precision.

**Formula engine** — Cells starting with `=` are evaluated by a purpose-built parser in `src/utils/formulas.ts`. Supported functions: `=SUM(...)`, `=AVERAGE(...)`, `=MIN(...)`, `=MAX(...)`. Plain arithmetic (`=A1+B2*3`) and cell references are also supported. Circular references are detected at evaluation time and display `#CIRC!`.

**Row types and variance** — Each row carries a `RowType` of `plan`, `actual`, or `variance`. Plan/Actual rows are editable; Variance rows are auto-computed (`actual − plan`) and read-only. The variance row is inserted automatically whenever a plan row has a corresponding actual row directly below it.

**Sparklines** — Row headers render a miniature SVG line chart of the row's numeric values, giving an at-a-glance trend for each metric without consuming column space.

**Undo/redo** — All grid mutations are applied immutably and pushed onto a history stack. Ctrl+Z walks backward; Ctrl+Y walks forward. The history is capped to prevent unbounded memory growth.

**Multi-cell selection and copy/paste** — Shift+Arrow or Shift+Click extends the selection rectangle. Ctrl+C copies the selection as tab-delimited text (compatible with Excel and Google Sheets). Ctrl+V pastes tab-delimited text into the grid starting at the anchor cell.

**CSV export** — The toolbar exposes a one-click CSV download that serialises the current grid (labels + values) using the browser's Blob/URL API.

**Architecture legibility** — Three clear layers: `types.ts` + `formatting.ts` + `formulas.ts` (pure data/logic), `Spreadsheet.tsx` (owns all state), and leaf components (stateless except Cell's transient `editValue`). This makes it easy to trace where any state lives and extend the system.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Arrow keys | Move selected cell |
| Enter / Tab | Commit edit and advance |
| Escape | Discard edit |
| Shift+Arrow | Extend selection |
| Shift+Click | Extend selection to clicked cell |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy selection (tab-delimited) |
| Ctrl+V | Paste |

### Key assumptions and product decisions

- **Numbers in green, negatives in red** — Standard financial convention. Green carries connotations of gain; red signals loss. Applied to display mode only; edit mode uses neutral text so the color doesn't interfere with reading what you're typing.
- **Format is per-cell** — Rather than applying a global format, each cell has its own format stored in a sparse `Record<string, CellFormat>`. Most cells use `'auto'` and are not in the map at all.
- **Totals always show currency** — Row and column totals are always formatted as currency regardless of per-cell format. In a financial context, totals are the most important number and should be unambiguous.
- **`—` for zero totals** — An empty row shows `—` instead of `$0.00`. This reduces visual noise; `$0.00` in every row of a blank grid is distracting.
- **Auto mode for `%`** — When the user types `25` and selects Percent format, it shows `25.00%`, not `0.25%`. This matches how financial modelers typically think: they enter 25 to mean "25 percent."
- **Variance computed on the fly** — Variance rows are never stored in cell state; they are derived during render from the corresponding plan/actual row pair. This keeps the data model simple and ensures variance is always consistent.

### Trade-offs

- **Formula scope is row-level** — The formula engine supports cell references within the grid but does not yet handle cross-scenario references or named ranges. Adding those would require a full dependency graph for recalculation.
- **Chakra UI vs. pure CSS** — I use Chakra for the `Input` in edit mode (to get the accessible input component and ref forwarding), but all layout uses SCSS with CSS custom properties. Mixing both is slightly inconsistent, but Chakra's Input handles browser cross-compatibility better than a hand-rolled `<input>`.
- **`requestAnimationFrame` for focus** — Focusing the input in a `useEffect` that fires on `isEditing` transition requires one rAF to avoid focus racing with React's commit phase. This is a known pattern but adds a ~16ms delay before the input is focused, which is imperceptible.

---

## Future Improvements

- **Persistent storage** — The grid state could be serialized to `localStorage` or synced to a backend. The immutable state shape makes serialization straightforward.
- **Column formulas** — Currently formulas reference cells by row/column index. A named-range system would let users write `=SUM(Revenue)` instead of `=SUM(B2:M2)`.
- **More built-in functions** — `=IF(...)`, `=ROUND(...)`, `=COUNT(...)`, and financial functions like `=NPV(...)` or `=IRR(...)`.
- **Column resize** — Drag the column header borders to adjust `--cell-width` per column.
- **CSV import** — The export path already serializes correctly; the reverse parse is a natural companion.
- **Named ranges and labels** — Allow the first row/column to be treated as headers, referenced in formulas.
- **Conditional formatting** — Highlight cells above/below a threshold with a different background color.

---

## AI Usage

I used **Claude Code (claude-sonnet-4-6)** running in plan mode for this exercise.

### How I used it

1. **Exploration phase** — I asked Claude to read and summarize the starter repository structure, dependencies, and existing component code.
2. **Planning phase** — I described the requirements, aesthetic direction, and architecture I wanted. Claude produced a detailed file-by-file implementation plan including TypeScript interfaces, function signatures, state ownership decisions, and edge cases. I reviewed and approved the plan before any code was written.
3. **Implementation** — Claude wrote all the files in dependency order, then we iteratively ran `next build` to catch and fix ESLint/TypeScript errors.
4. **Decisions I made** — The aesthetic direction (Bloomberg Terminal dark theme, IBM Plex Mono, amber gold accents), the display/edit mode swap strategy, the `wasEscapedRef` blur guard pattern, the per-cell sparse format map, and the `—` for zero totals were all decisions I articulated in the plan before implementation.

The session log is attached to this submission per the exercise instructions.
