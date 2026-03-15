import React from 'react';

import { ColumnHeadersProps } from '../types';
import EditableHeader from './EditableHeader';

const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
  columnCount,
  selectedCol,
  colLabels,
  onColLabelChange,
}) => {
  return (
    <div className="col-header-row" role="row">
      <div className="row-header-spacer" />
      {Array.from({ length: columnCount }, (_, colIdx) => (
        <div
          key={colIdx}
          className={`col-header-cell${selectedCol === colIdx ? ' col-active' : ''}`}
        >
          <EditableHeader
            value={colLabels[colIdx] ?? ''}
            placeholder={String.fromCharCode(65 + colIdx)}
            onChange={(val) => onColLabelChange(colIdx, val)}
            isActive={selectedCol === colIdx}
            className="col-header-editable"
          />
        </div>
      ))}
      <div className="col-header-cell col-header-total">Row Total</div>
    </div>
  );
};

export default ColumnHeaders;
