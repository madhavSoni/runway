import { Input } from '@chakra-ui/react';
import { motion, useReducedMotion } from 'framer-motion';
import React, { memo, useEffect, useRef, useState } from 'react';

import { CellCoord, CellProps } from '../types';

const Cell: React.FC<CellProps> = ({
  value,
  displayValue,
  isActive,
  isSelected,
  isEditing,
  isNumeric,
  isNegative,
  row,
  col,
  width,
  initialEditValue,
  onSelect,
  onStartEdit,
  onCommit,
  onCancel,
  refHighlightColor,
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasEscapedRef = useRef(false);
  const coord: CellCoord = { row, col };
  const prefersReducedMotion = useReducedMotion();

  // Sync edit value and focus when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const startValue = initialEditValue !== undefined ? initialEditValue : value;
      setEditValue(startValue);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (initialEditValue !== undefined) {
            // Cursor at end when a character keystroke starts editing
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
          } else {
            // Select all when Enter or double-click starts editing
            inputRef.current.select();
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const textColor = isNegative
    ? 'var(--negative)'
    : isNumeric
      ? 'var(--positive)'
      : 'var(--text-primary)';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        wasEscapedRef.current = true;
        onCancel(coord);
        break;
      case 'Enter':
        e.preventDefault();
        onCommit(coord, e.shiftKey ? 'shift-enter' : 'enter', editValue);
        break;
      case 'Tab':
        e.preventDefault();
        onCommit(coord, e.shiftKey ? 'shift-tab' : 'tab', editValue);
        break;
      default:
        // Arrow keys and other keys: let input handle naturally
        break;
    }
  };

  const handleBlur = () => {
    if (!wasEscapedRef.current) {
      onCommit(coord, 'tab', editValue);
    }
    wasEscapedRef.current = false;
  };

  // Use displayValue (formula result) when available, otherwise raw value
  const displayVal = displayValue ?? value;

  // Respect prefers-reduced-motion for active cell animation
  const selectionShadow = isActive
    ? '0 0 0 2px #d4af37, 0 0 14px 2px rgba(212, 175, 55, 0.22)'
    : '0 0 0 0px transparent';

  // Class names: active cell gets glow via Framer Motion; selected (non-active) cells get blue tint
  const cellClassName = [
    'cell-display',
    isActive ? 'cell-active' : '',
    isSelected && !isActive ? 'cell--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="cell-wrapper"
      style={width !== undefined ? { width, minWidth: width } : undefined}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          className="cell-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          focusBorderColor="transparent"
          errorBorderColor="transparent"
          aria-label={`Cell ${String.fromCharCode(65 + col)}${row + 1}, editing`}
        />
      ) : (
        <motion.div
          className={cellClassName}
          animate={{ boxShadow: selectionShadow }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.1, ease: 'easeOut' }}
          style={{
            color: textColor,
            justifyContent: isNumeric ? 'flex-end' : 'flex-start',
            position: 'relative',
          }}
          onClick={(e) => onSelect(row, col, e.shiftKey)}
          onMouseDown={(e) => onSelect(row, col, e.shiftKey)}
          onDoubleClick={() => onStartEdit(coord)}
          role="gridcell"
          aria-label={`Cell ${String.fromCharCode(65 + col)}${row + 1}: ${displayVal || 'empty'}`}
          aria-selected={isActive || isSelected}
        >
          {value.startsWith('=') && (
            <span className="formula-indicator" aria-hidden="true">
              ƒ
            </span>
          )}
          {displayVal || '\u00A0'}
        </motion.div>
      )}
    </div>
  );
};

export default memo(Cell);
