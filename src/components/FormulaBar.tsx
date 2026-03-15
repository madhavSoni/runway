import React from 'react';
import { FormulaBarProps } from '../types';

const FormulaBar: React.FC<FormulaBarProps> = ({ value, hasActiveCell, cellAddress }) => {
  const isFormula = value.startsWith('=');
  return (
    <div className="formula-bar">
      <span className="formula-bar-cell-ref">{hasActiveCell ? cellAddress : '—'}</span>
      <span className={`formula-bar-icon${isFormula ? ' formula-bar-icon--active' : ''}`}>ƒ</span>
      <div className="formula-bar-display">
        {value || <span className="formula-bar-empty">—</span>}
      </div>
    </div>
  );
};

export default FormulaBar;
