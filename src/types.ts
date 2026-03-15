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
  displayValue?: string;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  isNumeric: boolean;
  isNegative: boolean;
  format: CellFormat;
  row: number;
  col: number;
  initialEditValue?: string;
  onSelect: (row: number, col: number, shiftKey: boolean) => void;
  onStartEdit: (coord: CellCoord) => void;
  onCommit: (coord: CellCoord, direction: CommitDirection, newValue: string) => void;
  onCancel: (coord: CellCoord) => void;
  onNavigate: (coord: CellCoord, direction: NavDirection) => void;
}

export interface FormatToolbarProps {
  activeFormat: CellFormat;
  onFormatChange: (format: CellFormat) => void;
  disabled: boolean;
  showSparklines: boolean;
  onToggleSparklines: () => void;
  onExportCsv: () => void;
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
  rowTypes?: RowTypeMap;
}

export interface ScenarioPickerProps {
  activeScenarioId: ScenarioId | null;
  onLoad: (scenario: Scenario | null) => void;
}

export interface EditableHeaderProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  isActive?: boolean;
  className?: string;
  rowType?: RowType;
  onRowTypeChange?: (type: RowType) => void;
}

export type RowType = 'data' | 'plan' | 'actual';
export type RowTypeMap = Record<number, RowType>; // sparse; missing key = 'data'

export type Selection = {
  anchor: CellCoord;
  focus: CellCoord;
};

export type SnapshotState = {
  gridData: GridData;
  formatMap: FormatMap;
  rowLabels: string[];
  colLabels: string[];
  rowTypes: RowTypeMap;
};

export type RenderRow =
  | { kind: 'data'; rowIndex: number }
  | { kind: 'variance'; planRow: number; actualRow: number }
  | { kind: 'variance-pct'; planRow: number; actualRow: number };
