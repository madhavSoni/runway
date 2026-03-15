import { parseFormulaRefs } from './formulas';

describe('parseFormulaRefs', () => {
  it('returns [] for non-formula string', () => {
    expect(parseFormulaRefs('hello')).toEqual([]);
    expect(parseFormulaRefs('')).toEqual([]);
    expect(parseFormulaRefs('42')).toEqual([]);
  });

  it('returns [] for formula with no cell refs', () => {
    expect(parseFormulaRefs('=1+2')).toEqual([]);
  });

  it('extracts a single cell ref', () => {
    const result = parseFormulaRefs('=A1');
    expect(result).toHaveLength(1);
    expect(result[0].coord).toEqual({ row: 0, col: 0 });
    expect(result[0].color).toBe('#3b82f6');
  });

  it('extracts multiple cell refs with distinct colors', () => {
    const result = parseFormulaRefs('=A1+B2');
    expect(result).toHaveLength(2);
    expect(result[0].coord).toEqual({ row: 0, col: 0 }); // A1
    expect(result[1].coord).toEqual({ row: 1, col: 1 }); // B2
    expect(result[0].color).not.toBe(result[1].color);
  });

  it('deduplicates repeated cell refs', () => {
    const result = parseFormulaRefs('=A1+A1');
    expect(result).toHaveLength(1);
    expect(result[0].coord).toEqual({ row: 0, col: 0 });
  });

  it('handles range refs — extracts endpoints only', () => {
    const result = parseFormulaRefs('=SUM(A1:A3)');
    expect(result).toHaveLength(2);
    const coords = result.map(r => r.coord);
    expect(coords).toContainEqual({ row: 0, col: 0 }); // A1
    expect(coords).toContainEqual({ row: 2, col: 0 }); // A3
  });

  it('wraps colors after 6 unique refs', () => {
    const result = parseFormulaRefs('=A1+B1+C1+D1+E1+F1+G1');
    expect(result).toHaveLength(7);
    expect(result[6].color).toBe(result[0].color); // wraps to first color
  });

  it('handles boundary cells A10 and J10 (valid)', () => {
    const result = parseFormulaRefs('=A10+J10');
    expect(result).toHaveLength(2);
  });

  it('is case-insensitive for cell refs', () => {
    const result = parseFormulaRefs('=a1+b2');
    expect(result).toHaveLength(2);
    expect(result[0].coord).toEqual({ row: 0, col: 0 });
    expect(result[1].coord).toEqual({ row: 1, col: 1 });
  });
});
