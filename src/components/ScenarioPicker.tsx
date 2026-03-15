import React, { useEffect, useRef, useState } from 'react';

import { SCENARIOS } from '../scenarios';
import { Scenario } from '../types';

interface ScenarioPickerProps {
  activeScenarioId: string | null;
  onLoad: (scenario: Scenario | null) => void;
}

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ activeScenarioId, onLoad }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) ?? null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (scenario: Scenario | null) => {
    onLoad(scenario);
    setOpen(false);
  };

  return (
    <div className="scenario-picker" ref={containerRef}>
      <button
        type="button"
        className="scenario-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="scenario-picker-label">Scenario</span>
        <span className="scenario-picker-name">
          {activeScenario ? activeScenario.name : 'Blank'}
        </span>
        <span className="scenario-picker-chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="scenario-picker-dropdown" role="listbox">
          <button
            type="button"
            className={`scenario-option${activeScenarioId === null ? ' active' : ''}`}
            role="option"
            aria-selected={activeScenarioId === null}
            onClick={() => handleSelect(null)}
          >
            <span className="scenario-option-name">Blank</span>
            <span className="scenario-option-desc">Empty grid</span>
          </button>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
              role="option"
              aria-selected={activeScenarioId === s.id}
              onClick={() => handleSelect(s)}
            >
              <span className="scenario-option-name">{s.name}</span>
              <span className="scenario-option-desc">{s.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenarioPicker;
