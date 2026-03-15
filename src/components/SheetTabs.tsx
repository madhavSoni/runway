import React, { useRef, useState } from 'react';
import { SheetId, SheetState, SheetTabsProps } from '../types';

const SheetTabs: React.FC<SheetTabsProps> = ({ sheets, activeSheetId, onSelectSheet, onAddSheet, onRenameSheet }) => {
  const [renamingId, setRenamingId] = useState<SheetId | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const wasEscapedRef = useRef(false);

  const startRename = (sheet: SheetState) => {
    setRenamingId(sheet.id);
    setRenameValue(sheet.name);
  };

  const commitRename = () => {
    if (renamingId) {
      onRenameSheet(renamingId, renameValue);
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    wasEscapedRef.current = true;
    setRenamingId(null);
  };

  const handleBlur = () => {
    if (wasEscapedRef.current) {
      wasEscapedRef.current = false;
      return;
    }
    commitRename();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <div className="sheet-tabs-bar" role="tablist" aria-label="Spreadsheet sheets">
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        const isRenaming = renamingId === sheet.id;
        return (
          <div
            key={sheet.id}
            className={`sheet-tab${isActive ? ' sheet-tab--active' : ''}`}
            onClick={() => {
              if (!isRenaming) onSelectSheet(sheet.id);
            }}
            onDoubleClick={() => startRename(sheet)}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            title={`${sheet.name} (double-click to rename)`}
          >
            {isRenaming ? (
              <input
                className="sheet-tab-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                aria-label={`Rename sheet: ${sheet.name}`}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="sheet-tab-label">{sheet.name}</span>
            )}
          </div>
        );
      })}
      <button
        className="sheet-tab-add"
        onClick={onAddSheet}
        title="Add new sheet"
        aria-label="Add new sheet"
      >
        +
      </button>
    </div>
  );
};

export default SheetTabs;
