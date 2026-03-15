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

  // Keep editValue in sync when value changes externally (e.g. scenario load)
  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    onChange(editValue);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`editable-header-input ${className}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        aria-label={`Edit label: ${placeholder}`}
      />
    );
  }

  return (
    <div
      className={`editable-header-display${isActive ? ' active' : ''} ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit label"
      role="button"
      tabIndex={-1}
    >
      {value || <span className="editable-header-placeholder">{placeholder}</span>}
    </div>
  );
};

export default EditableHeader;
