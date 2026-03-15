import type { GridData } from '../types';

export type FormulaResult = { value: number; error: undefined } | { value: null; error: string };

/** Parse "B3" → { row: 2, col: 1 }. Returns null if invalid or out of 10x10 bounds. */
function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.trim().match(/^([A-J])(\d{1,2})$/i);
  if (!match) return null;
  const col = match[1].toUpperCase().charCodeAt(0) - 65; // A=0
  const row = parseInt(match[2], 10) - 1; // 1-indexed → 0-indexed
  if (row < 0 || row > 9 || col < 0 || col > 9) return null;
  return { row, col };
}

/** Get a cell's numeric value, evaluating formulas recursively. Returns null for non-numeric or circular refs. */
function getCellNumeric(
  row: number,
  col: number,
  gridData: GridData,
  visiting: Set<string>,
): number | null {
  const key = `${row}:${col}`;
  if (visiting.has(key)) return null; // circular reference guard
  const raw = gridData[row]?.[col] ?? '';
  if (raw.startsWith('=')) {
    visiting.add(key);
    const result = evalExpr(raw.slice(1).trim(), gridData, visiting);
    visiting.delete(key);
    return result.error != null ? null : result.value;
  }
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Get all numeric values in a range string like "A1:B3". */
function getRangeValues(
  rangeStr: string,
  gridData: GridData,
  visiting: Set<string>,
): number[] | null {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return null;
  const values: number[] = [];
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      const v = getCellNumeric(r, c, gridData, visiting);
      if (v !== null) values.push(v);
    }
  }
  return values;
}

/** Evaluate an expression string (without the leading "="). */
function evalExpr(expr: string, gridData: GridData, visiting: Set<string>): FormulaResult {
  const trimmed = expr.trim();

  // Range functions: SUM(...), AVERAGE(...), AVG(...), MIN(...), MAX(...)
  const funcMatch = trimmed.match(/^(SUM|AVERAGE|AVG|MIN|MAX)\(([^)]+)\)$/i);
  if (funcMatch) {
    const fn = funcMatch[1].toUpperCase();
    const values = getRangeValues(funcMatch[2].trim(), gridData, visiting);
    if (!values || values.length === 0) return { value: null, error: '#REF!' };
    switch (fn) {
      case 'SUM':
        return { value: values.reduce((a, b) => a + b, 0), error: undefined };
      case 'AVERAGE':
      case 'AVG':
        return { value: values.reduce((a, b) => a + b, 0) / values.length, error: undefined };
      case 'MIN':
        return { value: Math.min(...values), error: undefined };
      case 'MAX':
        return { value: Math.max(...values), error: undefined };
      default:
        return { value: null, error: '#ERR!' };
    }
  }

  // Arithmetic with cell references: replace each ref with its numeric value
  let arithmetic = trimmed;
  const cellRefRe = /\b([A-J]\d{1,2})\b/gi;
  const cellMatches = Array.from(trimmed.matchAll(cellRefRe));
  for (const m of cellMatches) {
    const coord = parseCellRef(m[1]);
    if (!coord) return { value: null, error: '#REF!' };
    const val = getCellNumeric(coord.row, coord.col, gridData, visiting);
    if (val === null) return { value: null, error: '#REF!' };
    arithmetic = arithmetic.replace(new RegExp(`\\b${m[1]}\\b`, 'gi'), String(val));
  }

  // Safety: only allow digits, operators, parens, dots, spaces — reject anything else
  if (!/^[\d+\-*/().%\s]+$/.test(arithmetic)) {
    return { value: null, error: '#ERR!' };
  }

  try {
    // Function constructor is safer than eval: strict mode, no closure scope access
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const result = new Function('"use strict"; return (' + arithmetic + ')')() as number;
    if (!isFinite(result)) return { value: null, error: '#DIV/0!' };
    if (isNaN(result)) return { value: null, error: '#NAN!' };
    return { value: result, error: undefined };
  } catch {
    return { value: null, error: '#ERR!' };
  }
}

/**
 * Evaluate a formula string (must start with "=").
 * Returns { value: number } on success or { error: string } on failure.
 *
 * Supported:
 *   =SUM(A1:B3)       — sum a range
 *   =AVERAGE(A1:A10)  — average of range (also =AVG)
 *   =MIN(B1:B5)       — minimum value in range
 *   =MAX(B1:B5)       — maximum value in range
 *   =B2-B1            — arithmetic with cell refs
 *   =B2/A2*100        — mixed arithmetic and cell refs
 */
export function evaluateFormula(formula: string, gridData: GridData): FormulaResult {
  if (!formula.startsWith('=')) return { value: null, error: '#ERR!' };
  const expr = formula.slice(1).trim();
  if (!expr) return { value: null, error: '#ERR!' };
  return evalExpr(expr, gridData, new Set());
}

/** Returns true if the value is a formula (starts with "="). */
export function isFormula(value: string): boolean {
  return value.startsWith('=');
}
