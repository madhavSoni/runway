import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Cell from 'components/Cell';
import ChartPanel from 'components/ChartPanel';
import ColumnHeaders from 'components/ColumnHeaders';
import EditableHeader from 'components/EditableHeader';
import FormatToolbar from 'components/FormatToolbar';
import FormulaBar from 'components/FormulaBar';
import ScenarioPicker from 'components/ScenarioPicker';
import SheetTabs from 'components/SheetTabs';
import { Sparkline } from './Sparkline';
import {
  CellCoord,
  CellFormat,
  ChartConfig,
  ChartDataPoint,
  CommitDirection,
  FormatMap,
  GridData,
  NavDirection,
  RenderRow,
  RowTypeMap,
  Scenario,
  ScenarioId,
  Selection,
  SheetId,
  SheetState,
  SnapshotState,
} from '../types';
import {
  formatCellValue,
  formatNumber,
  isNegativeNumber,
  isNumericString,
  parseRawNumber,
} from '../utils/formatting';
import { evaluateFormula, isFormula, parseFormulaRefs } from '../utils/formulas';
import { SCENARIOS } from '../scenarios';

const NUM_ROWS = 10;
const NUM_COLS = 10;
const DEFAULT_COL_WIDTH = 112;

// ── Sheet helpers ─────────────────────────────────────────────────────────────

function makeBlankGrid(): GridData {
  return _.times(NUM_ROWS, () => _.times(NUM_COLS, _.constant('')));
}

function makeBlankSheet(id: string, name: string): SheetState {
  return {
    id,
    name,
    gridData: makeBlankGrid(),
    formatMap: {},
    rowLabels: Array(NUM_ROWS).fill(''),
    colLabels: Array(NUM_COLS).fill(''),
    rowTypes: {},
    activeScenarioId: null,
    past: [],
    future: [],
  };
}

function pushSnapshotToSheet(sheet: SheetState): SheetState {
  const snap: SnapshotState = {
    gridData: sheet.gridData,
    formatMap: sheet.formatMap,
    rowLabels: sheet.rowLabels,
    colLabels: sheet.colLabels,
    rowTypes: sheet.rowTypes,
  };
  return { ...sheet, past: [...sheet.past.slice(-49), snap], future: [] };
}

function updateActiveSheet(
  sheets: SheetState[],
  activeSheetId: SheetId,
  updater: (s: SheetState) => Partial<SheetState>,
): SheetState[] {
  return sheets.map((s) => (s.id === activeSheetId ? { ...s, ...updater(s) } : s));
}

// ── Pure helper: build render rows (defined outside component for stability) ──

function buildRenderRows(numRows: number, types: RowTypeMap): RenderRow[] {
  const rows: RenderRow[] = [];
  for (let i = 0; i < numRows; i++) {
    rows.push({ kind: 'data', rowIndex: i });
    if (types[i] === 'plan' && types[i + 1] === 'actual') {
      rows.push({ kind: 'variance', planRow: i, actualRow: i + 1 });
      rows.push({ kind: 'variance-pct', planRow: i, actualRow: i + 1 });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_SHEETS: SheetState[] = [
  makeBlankSheet('sheet-1', 'Sheet 1'),
  makeBlankSheet('sheet-2', 'Sheet 2'),
];

const Spreadsheet: React.FC = () => {
  const [sheets, setSheets] = useState<SheetState[]>(INITIAL_SHEETS);
  const [activeSheetId, setActiveSheetId] = useState<SheetId>('sheet-1');
  const sheetsRef = useRef<SheetState[]>(INITIAL_SHEETS);
  useEffect(() => {
    sheetsRef.current = sheets;
  }, [sheets]);

  // Derive active sheet — same variable names so downstream JSX doesn't change
  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const { gridData, formatMap, rowLabels, colLabels, rowTypes, activeScenarioId } = activeSheet;

  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [editingInitialChar, setEditingInitialChar] = useState<string | undefined>(undefined);
  const [showSparklines, setShowSparklines] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>(() =>
    Array(NUM_COLS).fill(DEFAULT_COL_WIDTH),
  );
  const [rowHeaderWidth, setRowHeaderWidth] = useState(120);

  // Formula bar and chart state
  const [showFormulaBar, setShowFormulaBar] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Selection helpers ───────────────────────────────────────────────────────

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

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayGrid = useMemo(() => {
    return gridData.map((row) =>
      row.map((cell) => {
        if (!isFormula(cell)) return cell;
        const result = evaluateFormula(cell, gridData);
        if (result.error) return result.error;
        return String(result.value);
      }),
    );
  }, [gridData]);

  // Detect which columns are percentage-typed (skip them in totals — summing % is meaningless)
  const colFormats = useMemo<CellFormat[]>(
    () =>
      Array.from({ length: NUM_COLS }, (_x, ci) => {
        for (let ri = 0; ri < NUM_ROWS; ri++) {
          if (formatMap[`${ri}:${ci}`] === 'percentage') return 'percentage';
        }
        return 'auto';
      }),
    [formatMap],
  );

  const rowTotals = useMemo(
    () =>
      displayGrid.map((row) =>
        row.reduce((sum, val, ci) => {
          if (colFormats[ci] === 'percentage') return sum;
          const n = parseRawNumber(val);
          return isNaN(n) ? sum : sum + n;
        }, 0),
      ),
    [displayGrid, colFormats],
  );

  const columnTotals = useMemo(
    () =>
      Array.from({ length: NUM_COLS }, (_x, ci) => {
        if (colFormats[ci] === 'percentage') return null; // shown as —
        return displayGrid.reduce((sum, row) => {
          const n = parseRawNumber(row[ci]);
          return isNaN(n) ? sum : sum + n;
        }, 0);
      }),
    [displayGrid, colFormats],
  );

  const grandTotal = useMemo(() => rowTotals.reduce((acc, t) => acc + t, 0), [rowTotals]);

  const rowNumericValues = useMemo(() => {
    return displayGrid.map((row) => row.map((cell) => parseRawNumber(cell)));
  }, [displayGrid]);

  const renderRows = useMemo(() => buildRenderRows(NUM_ROWS, rowTypes), [rowTypes]);

  // Active scenario for description display
  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeScenarioId) ?? null,
    [activeScenarioId],
  );

  // Column resize handler
  const handleResizeCol = useCallback((col: number, width: number) => {
    setColWidths((prev) => prev.map((w, i) => (i === col ? width : w)));
  }, []);

  // ── Cell address display ───────────────────────────────────────────────────

  const activeCell = getActiveCell(selection);
  const activeCellAddress = activeCell
    ? `${String.fromCharCode(65 + activeCell.col)}${activeCell.row + 1}`
    : '';

  // ── Active format (derived directly, no useEffect needed) ─────────────────

  const activeFormat: CellFormat = activeCell
    ? (formatMap[`${activeCell.row}:${activeCell.col}`] ?? 'auto')
    : 'auto';

  // ── Formula bar derived values ─────────────────────────────────────────────

  const formulaBarValue = activeCell ? gridData[activeCell.row][activeCell.col] : '';

  const refHighlightMap = useMemo<Record<string, string>>(() => {
    if (!showFormulaBar || !activeCell) return {};
    const formula = gridData[activeCell.row][activeCell.col];
    return Object.fromEntries(
      parseFormulaRefs(formula).map(({ coord, color }) => [`${coord.row}:${coord.col}`, color]),
    );
  }, [showFormulaBar, activeCell, gridData]);

  // ── Chart derived values ───────────────────────────────────────────────────

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!selection) return [];
    const { minRow, maxRow, minCol, maxCol } = getSelectionBounds(selection);
    const points: ChartDataPoint[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const num = parseRawNumber(displayGrid[r][c]);
        if (isFinite(num)) {
          points.push({ label: `${String.fromCharCode(65 + c)}${r + 1}`, value: num });
        }
      }
    }
    return points;
  }, [selection, displayGrid]);

  const handleToggleChart = useCallback(() => {
    setChartConfig((prev) => (prev ? null : selection ? { type: 'bar' } : null));
  }, [selection]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigateTo(row: number, col: number, shiftKey = false) {
    const clampedRow = Math.max(0, Math.min(NUM_ROWS - 1, row));
    const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, col));
    const newFocus: CellCoord = { row: clampedRow, col: clampedCol };
    if (shiftKey && selection) {
      setSelection({ anchor: selection.anchor, focus: newFocus });
    } else {
      setSelection({ anchor: newFocus, focus: newFocus });
    }
  }

  // Legacy navigateTo used by Cell's onNavigate (coord + direction)
  const handleNavFromCell = useCallback((coord: CellCoord, direction: NavDirection) => {
    let { row, col } = coord;
    switch (direction) {
      case 'up':
        row = Math.max(0, row - 1);
        break;
      case 'down':
        row = Math.min(NUM_ROWS - 1, row + 1);
        break;
      case 'left':
        col = Math.max(0, col - 1);
        break;
      case 'right':
        col = Math.min(NUM_COLS - 1, col + 1);
        break;
      case 'home':
        col = 0;
        break;
      case 'end':
        col = NUM_COLS - 1;
        break;
      default:
        break;
    }
    setSelection({ anchor: { row, col }, focus: { row, col } });
    setEditingCell(null);
    setEditingInitialChar(undefined);
  }, []);

  // ── Cell selection ──────────────────────────────────────────────────────────

  function handleCellSelect(row: number, col: number, shiftKey: boolean) {
    setEditingCell(null);
    if (shiftKey && selection) {
      setSelection({ anchor: selection.anchor, focus: { row, col } });
    } else {
      setSelection({ anchor: { row, col }, focus: { row, col } });
    }
  }

  // ── Edit lifecycle ─────────────────────────────────────────────────────────

  const startEditing = useCallback((coord: CellCoord, initialChar?: string) => {
    setEditingCell(coord);
    setSelection({ anchor: coord, focus: coord });
    setEditingInitialChar(initialChar);
  }, []);

  const commitEdit = useCallback(
    (coord: CellCoord, direction: CommitDirection, newValue: string) => {
      if (!editingCell) return;
      setSheets((prev) => {
        const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
        return updateActiveSheet(withSnap, activeSheetId, (s) => {
          const newRow = [
            ...s.gridData[coord.row].slice(0, coord.col),
            newValue,
            ...s.gridData[coord.row].slice(coord.col + 1),
          ];
          return {
            gridData: [
              ...s.gridData.slice(0, coord.row),
              newRow,
              ...s.gridData.slice(coord.row + 1),
            ],
          };
        });
      });
      setEditingCell(null);
      setEditingInitialChar(undefined);

      const dirMap: Record<CommitDirection, [number, number]> = {
        enter: [1, 0],
        'shift-enter': [-1, 0],
        tab: [0, 1],
        'shift-tab': [0, -1],
      };
      const [dr, dc] = dirMap[direction];
      const nextRow = Math.max(0, Math.min(NUM_ROWS - 1, coord.row + dr));
      const nextCol = Math.max(0, Math.min(NUM_COLS - 1, coord.col + dc));
      setSelection({ anchor: { row: nextRow, col: nextCol }, focus: { row: nextRow, col: nextCol } });
    },
    [editingCell, activeSheetId],
  );

  const cancelEdit = useCallback((coord: CellCoord) => {
    setEditingCell(null);
    setEditingInitialChar(undefined);
    setSelection({ anchor: coord, focus: coord });
  }, []);

  // ── Clear cells ─────────────────────────────────────────────────────────────

  function clearCell() {
    if (!selection) return;
    const bounds = getSelectionBounds(selection);
    setSheets((prev) => {
      const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
      return updateActiveSheet(withSnap, activeSheetId, (s) => ({
        gridData: s.gridData.map((row, ri) =>
          ri >= bounds.minRow && ri <= bounds.maxRow
            ? row.map((cell, ci) => (ci >= bounds.minCol && ci <= bounds.maxCol ? '' : cell))
            : row,
        ),
      }));
    });
  }

  // ── Format toolbar ─────────────────────────────────────────────────────────

  function handleFormatChange(format: CellFormat) {
    if (!selection) return;
    const bounds = getSelectionBounds(selection);
    setSheets((prev) => {
      const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
      return updateActiveSheet(withSnap, activeSheetId, (s) => {
        const next: FormatMap = { ...s.formatMap };
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
        return { formatMap: next };
      });
    });
  }

  // ── Undo / redo ─────────────────────────────────────────────────────────────

  function undo() {
    setSheets((prev) => {
      const sheet = prev.find((s) => s.id === activeSheetId) ?? prev[0];
      if (sheet.past.length === 0) return prev;
      const snapshot = sheet.past[sheet.past.length - 1];
      const currentSnap: SnapshotState = {
        gridData: sheet.gridData,
        formatMap: sheet.formatMap,
        rowLabels: sheet.rowLabels,
        colLabels: sheet.colLabels,
        rowTypes: sheet.rowTypes,
      };
      return prev.map((s) =>
        s.id === activeSheetId
          ? {
              ...s,
              ...snapshot,
              past: s.past.slice(0, -1),
              future: [currentSnap, ...s.future.slice(0, 49)],
            }
          : s,
      );
    });
  }

  function redo() {
    setSheets((prev) => {
      const sheet = prev.find((s) => s.id === activeSheetId) ?? prev[0];
      if (sheet.future.length === 0) return prev;
      const snapshot = sheet.future[0];
      const currentSnap: SnapshotState = {
        gridData: sheet.gridData,
        formatMap: sheet.formatMap,
        rowLabels: sheet.rowLabels,
        colLabels: sheet.colLabels,
        rowTypes: sheet.rowTypes,
      };
      return prev.map((s) =>
        s.id === activeSheetId
          ? {
              ...s,
              ...snapshot,
              past: [...s.past.slice(-49), currentSnap],
              future: s.future.slice(1),
            }
          : s,
      );
    });
  }

  // ── Copy / paste ────────────────────────────────────────────────────────────

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
    try {
      await navigator.clipboard.writeText(rows.join('\n'));
    } catch {
      // clipboard access denied in some environments
    }
  }

  async function pasteFromClipboard() {
    const ac = getActiveCell(selection);
    if (!ac) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const pastedRows = text.split('\n').map((r) => r.split('\t'));
      setSheets((prev) => {
        const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
        return updateActiveSheet(withSnap, activeSheetId, (s) => ({
          gridData: s.gridData.map((row, ri) => {
            const pasteRowIdx = ri - ac.row;
            if (pasteRowIdx < 0 || pasteRowIdx >= pastedRows.length) return row;
            return row.map((cell, ci) => {
              const pasteColIdx = ci - ac.col;
              if (pasteColIdx < 0 || pasteColIdx >= pastedRows[pasteRowIdx].length) return cell;
              return pastedRows[pasteRowIdx][pasteColIdx];
            });
          }),
        }));
      });
    } catch {
      // clipboard access denied
    }
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

  function exportCsv() {
    const headers = ['', ...colLabels, 'Total'];
    const csvRows: string[] = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];

    gridData.forEach((row, ri) => {
      const rowTotal = displayGrid[ri].reduce((sum, cell) => {
        const n = parseRawNumber(cell);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      const cells = row.map((_cell, ci) => {
        const fmt = formatMap[`${ri}:${ci}`] ?? 'auto';
        const display = formatCellValue(displayGrid[ri][ci], fmt);
        return `"${display.replace(/"/g, '""')}"`;
      });
      const label = `"${rowLabels[ri].replace(/"/g, '""')}"`;
      const total = `"${rowTotal}"`;
      csvRows.push([label, ...cells, total].join(','));
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScenarioId ?? 'spreadsheet'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Scenario loader ────────────────────────────────────────────────────────

  const loadScenario = useCallback(
    (scenario: Scenario | null) => {
      setSheets((prev) => {
        const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
        return updateActiveSheet(withSnap, activeSheetId, (_s) => ({
          gridData: scenario ? scenario.data.map((row) => [...row]) : makeBlankGrid(),
          rowLabels: scenario ? [...scenario.rowLabels] : Array(NUM_ROWS).fill(''),
          colLabels: scenario ? [...scenario.colLabels] : Array(NUM_COLS).fill(''),
          formatMap: scenario ? { ...scenario.formatMap } : {},
          activeScenarioId: scenario ? scenario.id : null,
          rowTypes: scenario?.rowTypes ?? {},
        }));
      });
      setSelection(null);
      setEditingCell(null);
      setEditingInitialChar(undefined);
    },
    [activeSheetId],
  );

  // ── Label change handlers ──────────────────────────────────────────────────

  const handleRowLabelChange = useCallback(
    (row: number, label: string) => {
      setSheets((prev) => {
        const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
        return updateActiveSheet(withSnap, activeSheetId, (s) => ({
          rowLabels: [...s.rowLabels.slice(0, row), label, ...s.rowLabels.slice(row + 1)],
        }));
      });
    },
    [activeSheetId],
  );

  const handleColLabelChange = useCallback(
    (col: number, label: string) => {
      setSheets((prev) => {
        const withSnap = updateActiveSheet(prev, activeSheetId, pushSnapshotToSheet);
        return updateActiveSheet(withSnap, activeSheetId, (s) => ({
          colLabels: [...s.colLabels.slice(0, col), label, ...s.colLabels.slice(col + 1)],
        }));
      });
    },
    [activeSheetId],
  );

  // ── Sheet management ───────────────────────────────────────────────────────

  const handleSelectSheet = useCallback((id: SheetId) => {
    setSelection(null);
    setEditingCell(null);
    setEditingInitialChar(undefined);
    setChartConfig(null);
    setActiveSheetId(id);
  }, []);

  const handleAddSheet = useCallback(() => {
    const id = `sheet-${Date.now()}`;
    setSheets((prev) => {
      const newSheet = makeBlankSheet(id, `Sheet ${prev.length + 1}`);
      return [...prev, newSheet];
    });
    handleSelectSheet(id);
  }, [handleSelectSheet]);

  const handleRenameSheet = useCallback((id: SheetId, name: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)),
    );
  }, []);

  // ── Container keyboard handler ─────────────────────────────────────────────

  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ac = getActiveCell(selection);

    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'c') {
        e.preventDefault();
        copySelection().catch(() => {});
        return;
      }
      if (e.key === 'v') {
        e.preventDefault();
        pasteFromClipboard().catch(() => {});
        return;
      }
    }

    if (!ac) return;
    if (editingCell) return; // Cell's input handles keys in edit mode

    // Shift+Arrow for multi-cell selection
    if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          navigateTo(ac.row, ac.col + 1, true);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          navigateTo(ac.row, ac.col - 1, true);
          return;
        case 'ArrowDown':
          e.preventDefault();
          navigateTo(ac.row + 1, ac.col, true);
          return;
        case 'ArrowUp':
          e.preventDefault();
          navigateTo(ac.row - 1, ac.col, true);
          return;
        default:
          break;
      }
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateTo(ac.row - 1, ac.col);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateTo(ac.row + 1, ac.col);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateTo(ac.row, ac.col - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateTo(ac.row, ac.col + 1);
        break;
      case 'Tab':
        e.preventDefault();
        navigateTo(ac.row, e.shiftKey ? ac.col - 1 : ac.col + 1);
        break;
      case 'Enter':
        e.preventDefault();
        startEditing(ac);
        break;
      case 'Home':
        e.preventDefault();
        navigateTo(ac.row, 0);
        break;
      case 'End':
        e.preventDefault();
        navigateTo(ac.row, NUM_COLS - 1);
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        clearCell();
        break;
      default:
        // Printable character: start editing with that character as initial value
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startEditing(ac, e.key);
        }
        break;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="toolbar-bar">
        <div className="toolbar-left">
          <div className="cell-address">
            <div className={`cell-address-box${activeCell ? '' : ' cell-address-placeholder'}`}>
              {activeCell ? activeCellAddress : '—'}
            </div>
          </div>
          <ScenarioPicker activeScenarioId={activeScenarioId} onLoad={loadScenario} />
          {activeScenario?.description && (
            <span className="scenario-description">{activeScenario.description}</span>
          )}
        </div>
        <FormatToolbar
          activeFormat={activeFormat}
          onFormatChange={handleFormatChange}
          disabled={selection === null}
          showSparklines={showSparklines}
          onToggleSparklines={() => setShowSparklines((v) => !v)}
          onExportCsv={exportCsv}
          showFormulaBar={showFormulaBar}
          onToggleFormulaBar={() => setShowFormulaBar((v) => !v)}
          chartActive={chartConfig !== null}
          onToggleChart={handleToggleChart}
          selectionExists={selection !== null}
        />
      </div>
      {showFormulaBar && (
        <FormulaBar
          value={formulaBarValue}
          hasActiveCell={!!activeCell}
          cellAddress={activeCellAddress}
        />
      )}
      <div className="spreadsheet-with-chart">
        <div>
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
                selectedCol={activeCell?.col ?? null}
                colLabels={colLabels}
                onColLabelChange={handleColLabelChange}
                colWidths={colWidths}
                onResizeCol={handleResizeCol}
                showSparklines={showSparklines}
                rowHeaderWidth={rowHeaderWidth}
                onResizeRowHeader={setRowHeaderWidth}
              />
              {renderRows.map((renderRow, idx) => {
                if (renderRow.kind === 'data') {
                  const ri = renderRow.rowIndex;
                  return (
                    <div key={`row-${ri}`} className="spreadsheet-row" role="row">
                      <div
                        className={`row-header${activeCell?.row === ri ? ' row-active' : ''}`}
                        style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
                      >
                        <EditableHeader
                          value={rowLabels[ri] ?? ''}
                          placeholder={String(ri + 1)}
                          onChange={(v) => {
                            handleRowLabelChange(ri, v);
                          }}
                          isActive={false}
                          className="row-header-editable"
                          rowType={rowTypes[ri] ?? 'data'}
                          onRowTypeChange={(type) => {
                            setSheets((prev) => {
                              const withSnap = updateActiveSheet(
                                prev,
                                activeSheetId,
                                pushSnapshotToSheet,
                              );
                              return updateActiveSheet(withSnap, activeSheetId, (s) => {
                                if (type === 'data') {
                                  const next = { ...s.rowTypes };
                                  delete next[ri];
                                  return { rowTypes: next };
                                }
                                return { rowTypes: { ...s.rowTypes, [ri]: type } };
                              });
                            });
                          }}
                        />
                      </div>
                      {showSparklines && (
                        <div className="sparkline-col">
                          <Sparkline values={rowNumericValues[ri]} />
                        </div>
                      )}
                      {gridData[ri].map((cellValue, ci) => {
                        const fmt: CellFormat = formatMap[`${ri}:${ci}`] ?? 'auto';
                        const numeric = isNumericString(cellValue);
                        const negative = isNegativeNumber(cellValue);
                        return (
                          <Cell
                            key={`${ri}:${ci}`}
                            value={cellValue}
                            displayValue={
                              displayGrid[ri][ci] !== cellValue
                                ? displayGrid[ri][ci]
                                : formatCellValue(cellValue, fmt)
                            }
                            isActive={activeCell?.row === ri && activeCell?.col === ci}
                            isSelected={isCellInSelection(ri, ci, selection)}
                            isEditing={editingCell?.row === ri && editingCell?.col === ci}
                            isNumeric={numeric}
                            isNegative={negative}
                            format={fmt}
                            row={ri}
                            col={ci}
                            width={colWidths[ci]}
                            initialEditValue={
                              editingCell?.row === ri && editingCell?.col === ci
                                ? editingInitialChar
                                : undefined
                            }
                            onSelect={handleCellSelect}
                            onStartEdit={startEditing}
                            onCommit={commitEdit}
                            onCancel={cancelEdit}
                            onNavigate={handleNavFromCell}
                            refHighlightColor={refHighlightMap[`${ri}:${ci}`]}
                          />
                        );
                      })}
                      <div
                        className={`total-cell${rowTotals[ri] === 0 ? ' zero' : ''}`}
                        role="gridcell"
                        aria-label={`Row ${ri + 1} total`}
                      >
                        {rowTotals[ri] !== 0
                          ? formatCellValue(String(rowTotals[ri]), 'currency')
                          : '—'}
                      </div>
                    </div>
                  );
                }

                if (renderRow.kind === 'variance' || renderRow.kind === 'variance-pct') {
                  const { planRow, actualRow } = renderRow;
                  const isPct = renderRow.kind === 'variance-pct';
                  const label = isPct ? '└ Var %' : '└ Variance';

                  const cells = Array.from({ length: NUM_COLS }, (_el, ci) => {
                    const planVal = parseRawNumber(displayGrid[planRow][ci]);
                    const actualVal = parseRawNumber(displayGrid[actualRow][ci]);
                    if (isNaN(planVal) || isNaN(actualVal)) return null;
                    if (isPct) {
                      if (planVal === 0) return null;
                      return ((actualVal - planVal) / Math.abs(planVal)) * 100;
                    }
                    return actualVal - planVal;
                  });

                  return (
                    <div
                      key={`${renderRow.kind}-${planRow}-${idx}`}
                      className="spreadsheet-row variance-row"
                      role="row"
                    >
                      <div
                        className="row-header-cell variance-label"
                        style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
                      >
                        {label}
                      </div>
                      {showSparklines && <div className="sparkline-col" />}
                      {cells.map((v, ci) => {
                        const cellStyle = { width: colWidths[ci], minWidth: colWidths[ci] };
                        if (v === null || v === 0) {
                          return (
                            <div
                              key={ci}
                              className="cell cell--variance"
                              style={cellStyle}
                              role="gridcell"
                            >
                              —
                            </div>
                          );
                        }
                        const sign = v > 0 ? 'positive' : 'negative';
                        const arrow = v > 0 ? '▲' : '▼';
                        const formatted = isPct
                          ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
                          : `${v >= 0 ? '+' : '-'}${formatCellValue(
                              String(Math.abs(v)),
                              'currency',
                            )}`;
                        return (
                          <div
                            key={ci}
                            className={`cell cell--variance cell-value--${sign}`}
                            style={cellStyle}
                            role="gridcell"
                          >
                            <span className="variance-arrow">{arrow} </span>
                            {formatted}
                          </div>
                        );
                      })}
                      <div className="total-cell zero" role="gridcell" />
                    </div>
                  );
                }

                return null;
              })}
              <div className="spreadsheet-row totals-row" role="row">
                <div
                  className="row-header"
                  style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
                  title="Sum of each column"
                >
                  Σ
                </div>
                {showSparklines && <div className="sparkline-col" />}
                {columnTotals.map((total, colIdx) => (
                  <div
                    key={colIdx}
                    className={`total-cell${!total || total === 0 ? ' zero' : ''}`}
                    style={{
                      width: colWidths[colIdx],
                      minWidth: colWidths[colIdx],
                      borderLeft: 'none',
                      borderRight: '1px solid var(--grid-border)',
                    }}
                  >
                    {total === null ? '—' : total === 0 ? '—' : formatNumber(total, 'currency')}
                  </div>
                ))}
                <div className={`total-cell grand-total${grandTotal === 0 ? ' zero' : ''}`}>
                  {grandTotal === 0 ? '—' : formatNumber(grandTotal, 'currency')}
                </div>
              </div>
            </div>
          </div>
          <SheetTabs
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSelectSheet={handleSelectSheet}
            onAddSheet={handleAddSheet}
            onRenameSheet={handleRenameSheet}
          />
        </div>
        <AnimatePresence>
          {chartConfig && (
            <ChartPanel
              data={chartData}
              config={chartConfig}
              onTypeChange={(type) => setChartConfig({ type })}
              onClose={() => setChartConfig(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Spreadsheet;
