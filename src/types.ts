export type CellFormat = 'auto' | 'currency' | 'number' | 'percentage';

export interface CellCoord {
  row: number;
  col: number;
}

export type GridData = string[][];

// Sparse map of per-cell format overrides; key is "row:col"
export type FormatMap = Record<string, CellFormat>;

export type CommitDirection = 'enter' | 'shift-enter' | 'tab' | 'shift-tab';
export type NavDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end';

export interface CellProps {
  value: string;
  displayValue: string;
  isSelected: boolean;
  isEditing: boolean;
  isNumeric: boolean;
  isNegative: boolean;
  format: CellFormat;
  row: number;
  col: number;
  initialEditValue?: string;
  onSelect: (coord: CellCoord) => void;
  onStartEdit: (coord: CellCoord) => void;
  onCommit: (coord: CellCoord, direction: CommitDirection, newValue: string) => void;
  onCancel: (coord: CellCoord) => void;
  onNavigate: (coord: CellCoord, direction: NavDirection) => void;
}

export interface FormatToolbarProps {
  activeFormat: CellFormat;
  onFormatChange: (format: CellFormat) => void;
  disabled: boolean;
}

export interface ColumnHeadersProps {
  columnCount: number;
  selectedCol: number | null;
  colLabels: string[];
  onColLabelChange: (col: number, label: string) => void;
}

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
