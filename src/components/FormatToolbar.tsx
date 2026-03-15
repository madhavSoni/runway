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
    </div>
  );
};

export default FormatToolbar;
