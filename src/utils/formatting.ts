import { CellFormat, GridData } from '../types';

// Strip currency and thousands separators from a raw string
function cleanNumericString(value: string): string {
  return value.trim().replace(/[$,]/g, '');
}

export function isNumericString(value: string): boolean {
  if (!value || !value.trim()) return false;
  const cleaned = cleanNumericString(value);
  const n = parseFloat(cleaned);
  return !isNaN(n) && isFinite(n) && cleaned !== '';
}

export function isNegativeNumber(value: string): boolean {
  if (!isNumericString(value)) return false;
  return parseRawNumber(value) < 0;
}

export function parseRawNumber(value: string): number {
  return parseFloat(cleanNumericString(value));
}

export function formatNumber(value: number, format: CellFormat): string {
  if (!isFinite(value)) return '—';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case 'percentage':
      // Treat raw value as the percentage integer: 25 → "25.00%"
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value / 100);

    case 'auto':
    default: {
      // Integers: no decimals; floats: up to 2 decimal places
      const isInteger = Number.isInteger(value);
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: isInteger ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
  }
}

export function formatCellValue(rawValue: string, format: CellFormat): string {
  if (!isNumericString(rawValue)) return rawValue;
  return formatNumber(parseRawNumber(rawValue), format);
}

export function sumValues(values: string[]): number {
  return values.reduce((acc, v) => {
    if (!isNumericString(v)) return acc;
    return acc + parseRawNumber(v);
  }, 0);
}

export function computeRowTotals(grid: GridData): number[] {
  return grid.map((row) => sumValues(row));
}

export function computeColumnTotals(grid: GridData): number[] {
  if (grid.length === 0) return [];
  const numCols = grid[0].length;
  return Array.from({ length: numCols }, (_, colIdx) =>
    sumValues(grid.map((row) => row[colIdx]))
  );
}
