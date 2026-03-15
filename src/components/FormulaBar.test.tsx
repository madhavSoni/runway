import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormulaBar from './FormulaBar';

describe('FormulaBar', () => {
  it('shows — in ref and display when no active cell', () => {
    render(<FormulaBar value="" hasActiveCell={false} cellAddress="" />);
    // Cell ref area shows —
    const spans = screen.getAllByText('—');
    expect(spans.length).toBeGreaterThanOrEqual(1);
    // Icon does not have active class
    const icon = document.querySelector('.formula-bar-icon');
    expect(icon?.classList.contains('formula-bar-icon--active')).toBe(false);
  });

  it('shows cellAddress in ref span when active cell exists', () => {
    render(<FormulaBar value="" hasActiveCell={true} cellAddress="B3" />);
    expect(screen.getByText('B3')).toBeInTheDocument();
  });

  it('shows value in display when value is non-empty', () => {
    render(<FormulaBar value="12345" hasActiveCell={true} cellAddress="A1" />);
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('adds formula-bar-icon--active class when value is a formula', () => {
    render(<FormulaBar value="=SUM(A1:A3)" hasActiveCell={true} cellAddress="B1" />);
    const icon = document.querySelector('.formula-bar-icon');
    expect(icon?.classList.contains('formula-bar-icon--active')).toBe(true);
    expect(screen.getByText('=SUM(A1:A3)')).toBeInTheDocument();
  });

  it('does not add formula-bar-icon--active when no active cell even if value starts with =', () => {
    render(<FormulaBar value="=SUM(A1:A3)" hasActiveCell={false} cellAddress="" />);
    const icon = document.querySelector('.formula-bar-icon');
    expect(icon?.classList.contains('formula-bar-icon--active')).toBe(false);
  });
});
