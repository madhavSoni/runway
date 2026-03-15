import React, { useEffect, useRef, useState } from 'react';

import { EditableHeaderProps } from '../types';

const EditableHeader: React.FC<EditableHeaderProps> = ({
  value,
  placeholder,
  onChange,
  isActive = false,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasEscapedRef = useRef(false);

  // Keep editValue in sync when value changes externally (e.g. scenario load)
  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    onChange(editValue);
  };

  const cancel = () => {
    wasEscapedRef.current = true;
    setIsEditing(false);
    setEditValue(value);
  };

  const handleBlur = () => {
    if (wasEscapedRef.current) {
      wasEscapedRef.current = false;
      return;
    }
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const handleDisplayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`editable-header-input ${className}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        aria-label={`Edit label: ${placeholder}`}
      />
    );
  }

  return (
    <div
      className={`editable-header-display${isActive ? ' active' : ''} ${className}`}
      onClick={() => setIsEditing(true)}
      onKeyDown={handleDisplayKeyDown}
      title="Click to edit label"
      role="button"
      tabIndex={0}
      aria-label={value || placeholder}
    >
      {value || <span className="editable-header-placeholder">{placeholder}</span>}
    </div>
  );
};

export default React.memo(EditableHeader);
