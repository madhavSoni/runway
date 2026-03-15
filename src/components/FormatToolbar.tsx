import React from 'react';

import { CellFormat, FormatToolbarProps } from '../types';

interface FormatOption {
  value: CellFormat;
  label: string;
  symbol: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'auto', label: 'Auto', symbol: '~' },
  { value: 'currency', label: 'Currency', symbol: '$' },
  { value: 'number', label: 'Number', symbol: '#' },
  { value: 'percentage', label: 'Percent', symbol: '%' },
];

const FormatToolbar: React.FC<FormatToolbarProps> = ({
  activeFormat,
  onFormatChange,
  disabled,
  showSparklines,
  onToggleSparklines,
  onExportCsv,
  showFormulaBar,
  onToggleFormulaBar,
  chartActive,
  onToggleChart,
  selectionExists,
}) => {
  return (
    <div className="format-toolbar">
      <span className="toolbar-label">Format</span>
      {FORMAT_OPTIONS.map(({ value, label, symbol }) => (
        <button
          key={value}
          type="button"
          className={`toolbar-btn${activeFormat === value ? ' active' : ''}`}
          disabled={disabled}
          onClick={() => onFormatChange(value)}
          title={label}
          aria-label={`Format as ${label}`}
          aria-pressed={activeFormat === value}
        >
          <span>{symbol}</span>
          <span>{label}</span>
        </button>
      ))}
      <div className="toolbar-right">
        <button
          className={`toolbar-btn sparkline-toggle${showSparklines ? ' active' : ''}`}
          onClick={onToggleSparklines}
          title="Toggle sparkline trend charts (shows mini charts in row headers)"
          aria-pressed={showSparklines}
        >
          〜 Trend
        </button>
        <button
          className="toolbar-btn csv-export"
          onClick={onExportCsv}
          title="Export current grid as CSV file"
        >
          ↓ CSV
        </button>
        <button
          className={`toolbar-btn${showFormulaBar ? ' active' : ''}`}
          onClick={onToggleFormulaBar}
          title="Toggle formula bar"
          aria-pressed={showFormulaBar}
        >
          <span>ƒ</span>
          <span>Formula</span>
        </button>
        <button
          className={`toolbar-btn${chartActive ? ' active' : ''}`}
          onClick={onToggleChart}
          disabled={!selectionExists && !chartActive}
          title="Chart selection"
          aria-pressed={chartActive}
        >
          <span>▦</span>
          <span>Chart</span>
        </button>
      </div>
    </div>
  );
};

export default FormatToolbar;
