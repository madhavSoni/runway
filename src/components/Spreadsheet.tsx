import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Cell from 'components/Cell';
import ColumnHeaders from 'components/ColumnHeaders';
import EditableHeader from 'components/EditableHeader';
import FormatToolbar from 'components/FormatToolbar';
import ScenarioPicker from 'components/ScenarioPicker';
import {
  CellCoord,
  CellFormat,
  CommitDirection,
  FormatMap,
  GridData,
  NavDirection,
  Scenario,
  ScenarioId,
} from '../types';
import {
  computeColumnTotals,
  computeRowTotals,
  formatCellValue,
  formatNumber,
  isNegativeNumber,
  isNumericString,
} from '../utils/formatting';

const NUM_ROWS = 10;
const NUM_COLS = 10;

const INITIAL_GRID: GridData = _.times(NUM_ROWS, () => _.times(NUM_COLS, _.constant('')));

const Spreadsheet: React.FC = () => {
  const [gridData, setGridData] = useState<GridData>(INITIAL_GRID);
  const [formatMap, setFormatMap] = useState<FormatMap>({});
  const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [editingInitialChar, setEditingInitialChar] = useState<string | undefined>(undefined);
  const [activeFormat, setActiveFormat] = useState<CellFormat>('auto');
  const [rowLabels, setRowLabels] = useState<string[]>(Array(NUM_ROWS).fill(''));
  const [colLabels, setColLabels] = useState<string[]>(Array(NUM_COLS).fill(''));
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derived values ─────────────────────────────────────────────────────────

  const rowTotals = useMemo(() => computeRowTotals(gridData), [gridData]);
  const columnTotals = useMemo(() => computeColumnTotals(gridData), [gridData]);
  const grandTotal = useMemo(() => columnTotals.reduce((acc, t) => acc + t, 0), [columnTotals]);

  // ── Sync toolbar format when selection changes ─────────────────────────────

  useEffect(() => {
    if (selectedCell) {
      const key = `${selectedCell.row}:${selectedCell.col}`;
      setActiveFormat(formatMap[key] ?? 'auto');
    }
  }, [selectedCell, formatMap]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigateTo = useCallback((from: CellCoord, direction: NavDirection) => {
    let { row, col } = from;

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

    setSelectedCell({ row, col });
    setEditingCell(null);
    setEditingInitialChar(undefined);
  }, []);

  // ── Edit lifecycle ─────────────────────────────────────────────────────────

  const startEditing = useCallback((coord: CellCoord, initialChar?: string) => {
    setEditingCell(coord);
    setSelectedCell(coord);
    setEditingInitialChar(initialChar);
  }, []);

  const commitEdit = useCallback(
    (coord: CellCoord, direction: CommitDirection, newValue: string) => {
      setGridData((prev) => {
        const newRow = [
          ...prev[coord.row].slice(0, coord.col),
          newValue,
          ...prev[coord.row].slice(coord.col + 1),
        ];
        return [...prev.slice(0, coord.row), newRow, ...prev.slice(coord.row + 1)];
      });
      setEditingCell(null);
      setEditingInitialChar(undefined);

      const moveMap: Record<CommitDirection, NavDirection | null> = {
        enter: 'down',
        'shift-enter': 'up',
        tab: 'right',
        'shift-tab': 'left',
      };
      const move = moveMap[direction];
      if (move) {
        navigateTo(coord, move);
      } else {
        setSelectedCell(coord);
      }
    },
    [navigateTo],
  );

  const cancelEdit = useCallback((coord: CellCoord) => {
    setEditingCell(null);
    setEditingInitialChar(undefined);
    setSelectedCell(coord);
  }, []);

  const clearCell = useCallback((coord: CellCoord) => {
    setGridData((prev) => {
      const newRow = [
        ...prev[coord.row].slice(0, coord.col),
        '',
        ...prev[coord.row].slice(coord.col + 1),
      ];
      return [...prev.slice(0, coord.row), newRow, ...prev.slice(coord.row + 1)];
    });
  }, []);

  // ── Format toolbar ─────────────────────────────────────────────────────────

  const handleFormatChange = useCallback(
    (format: CellFormat) => {
      if (!selectedCell) return;
      const key = `${selectedCell.row}:${selectedCell.col}`;
      setFormatMap((prev) => ({ ...prev, [key]: format }));
      setActiveFormat(format);
    },
    [selectedCell],
  );

  // ── Scenario loader ────────────────────────────────────────────────────────

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

  // ── Label change handlers ──────────────────────────────────────────────────

  const handleRowLabelChange = useCallback((row: number, label: string) => {
    setRowLabels((prev) => [...prev.slice(0, row), label, ...prev.slice(row + 1)]);
  }, []);

  const handleColLabelChange = useCallback((col: number, label: string) => {
    setColLabels((prev) => [...prev.slice(0, col), label, ...prev.slice(col + 1)]);
  }, []);

  // ── Container keyboard handler (navigation & non-edit shortcuts) ───────────

  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedCell) return;
    if (editingCell) return; // Cell's input handles keys in edit mode

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateTo(selectedCell, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateTo(selectedCell, 'down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateTo(selectedCell, 'left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateTo(selectedCell, 'right');
        break;
      case 'Tab':
        e.preventDefault();
        navigateTo(selectedCell, e.shiftKey ? 'left' : 'right');
        break;
      case 'Enter':
        e.preventDefault();
        startEditing(selectedCell);
        break;
      case 'Home':
        e.preventDefault();
        navigateTo(selectedCell, 'home');
        break;
      case 'End':
        e.preventDefault();
        navigateTo(selectedCell, 'end');
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        clearCell(selectedCell);
        break;
      default:
        // Printable character: start editing with that character as initial value
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startEditing(selectedCell, e.key);
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
            <div className={`cell-address-box${selectedCell ? '' : ' cell-address-placeholder'}`}>
              {selectedCell
                ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
                : '—'}
            </div>
          </div>
          <ScenarioPicker activeScenarioId={activeScenarioId} onLoad={loadScenario} />
        </div>
        <FormatToolbar
          activeFormat={activeFormat}
          onFormatChange={handleFormatChange}
          disabled={selectedCell === null}
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
          {gridData.map((row, rowIdx) => (
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
                    isActive={selectedCell?.row === rowIdx && selectedCell?.col === colIdx}
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
                    onSelect={(r, c, _shiftKey) => setSelectedCell({ row: r, col: c })}
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
          ))}
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
};

export default Spreadsheet;
