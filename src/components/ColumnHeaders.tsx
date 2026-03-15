import React from 'react';

import { ColumnHeadersProps } from '../types';
import EditableHeader from './EditableHeader';

const MIN_COL_WIDTH = 48;
const MIN_ROW_HEADER_WIDTH = 60;

const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
  columnCount,
  selectedCol,
  colLabels,
  onColLabelChange,
  colWidths,
  onResizeCol,
  showSparklines,
  rowHeaderWidth,
  onResizeRowHeader,
}) => {
  const startResize = (
    e: React.MouseEvent,
    startWidth: number,
    minWidth: number,
    onUpdate: (w: number) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(minWidth, startWidth + (ev.clientX - startX));
      onUpdate(newWidth);
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="col-header-row" role="row">
      {/* Row-header spacer — has its own resize handle */}
      <div
        className="row-header-spacer"
        style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
      >
        <div
          className="col-resize-handle"
          onMouseDown={(e) =>
            startResize(e, rowHeaderWidth, MIN_ROW_HEADER_WIDTH, onResizeRowHeader)
          }
          title="Drag to resize row label column"
          aria-hidden="true"
        />
      </div>
      {showSparklines && <div className="sparkline-col sparkline-col-spacer" />}
      {Array.from({ length: columnCount }, (_, colIdx) => (
        <div
          key={colIdx}
          className={`col-header-cell${selectedCol === colIdx ? ' col-active' : ''}`}
          style={{ width: colWidths[colIdx], minWidth: colWidths[colIdx] }}
        >
          <EditableHeader
            value={colLabels[colIdx] ?? ''}
            placeholder={String.fromCharCode(65 + colIdx)}
            onChange={(val) => onColLabelChange(colIdx, val)}
            isActive={selectedCol === colIdx}
            className="col-header-editable"
          />
          <div
            className="col-resize-handle"
            onMouseDown={(e) =>
              startResize(e, colWidths[colIdx], MIN_COL_WIDTH, (w) => onResizeCol(colIdx, w))
            }
            title="Drag to resize column"
            aria-hidden="true"
          />
        </div>
      ))}
      <div className="col-header-cell col-header-total">Row Total</div>
    </div>
  );
};

export default ColumnHeaders;
