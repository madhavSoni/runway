import { CellFormat, FormatMap, GridData, Scenario } from '../types';

const NUM_ROWS = 10;
const NUM_COLS = 10;

function emptyGrid(): GridData {
  return Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(''));
}

function buildFormatMap(
  entries: Array<{ row: number; col: number; format: CellFormat }>
): FormatMap {
  return entries.reduce<FormatMap>((acc, { row, col, format }) => {
    acc[`${row}:${col}`] = format;
    return acc;
  }, {});
}

// ── Revenue Model ──────────────────────────────────────────────────────────────

const revenueModelData: GridData = emptyGrid();
[120000, 125000, 131000, 138000, 144000, 152000, 159000, 167000, 175000, 183000].forEach(
  (v, c) => { revenueModelData[0][c] = String(v); }
);
[45000, 42000, 48000, 51000, 47000, 55000, 58000, 61000, 64000, 67000].forEach(
  (v, c) => { revenueModelData[1][c] = String(v); }
);
[18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000, 42000, 45000].forEach(
  (v, c) => { revenueModelData[2][c] = String(v); }
);
[8000, 7500, 9000, 8500, 10000, 9500, 11000, 10500, 12000, 11500].forEach(
  (v, c) => { revenueModelData[3][c] = String(v); }
);

const revenueModelFormats: FormatMap = buildFormatMap(
  Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: NUM_COLS }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const revenueModel: Scenario = {
  id: 'revenue-model',
  name: 'Revenue Model',
  description: 'Monthly revenue by stream',
  rowLabels: ['SaaS', 'Services', 'Marketplace', 'Other Revenue', '', '', '', '', '', ''],
  colLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  data: revenueModelData,
  formatMap: revenueModelFormats,
};

// ── Cash Flow Forecast ─────────────────────────────────────────────────────────

const cashFlowData: GridData = emptyGrid();
const cashFlowRows = [
  [850000, 920000, 1010000, 1100000, 3880000],
  [120000, 135000, 145000, 160000, 560000],
  [970000, 1055000, 1155000, 1260000, 4440000],
  [420000, 435000, 450000, 465000, 1770000],
  [180000, 195000, 215000, 235000, 825000],
  [95000, 105000, 115000, 125000, 440000],
  [150000, 155000, 160000, 165000, 630000],
  [55000, 57000, 59000, 61000, 232000],
  [900000, 947000, 999000, 1051000, 3897000],
  [70000, 108000, 156000, 209000, 543000],
];
cashFlowRows.forEach((row, r) => row.forEach((v, c) => { cashFlowData[r][c] = String(v); }));

const cashFlowFormats: FormatMap = buildFormatMap(
  Array.from({ length: NUM_ROWS }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const cashFlow: Scenario = {
  id: 'cash-flow',
  name: 'Cash Flow Forecast',
  description: 'Quarterly inflows and outflows',
  rowLabels: [
    'Customer Revenue', 'Pro Services', 'Total Inflows',
    'Payroll', 'COGS', 'Marketing', 'R&D', 'G&A',
    'Total Outflows', 'Net Cash Flow',
  ],
  colLabels: ['Q1', 'Q2', 'Q3', 'Q4', 'FY Total', '', '', '', '', ''],
  data: cashFlowData,
  formatMap: cashFlowFormats,
};

// ── Budget vs. Actuals ─────────────────────────────────────────────────────────

const bvaData: GridData = emptyGrid();
const bvaRows = [
  [1200000, 1158000, -42000,   -3.5],
  [ 480000,  475000,   5000,    1.04],
  [ 720000,  683000, -37000,   -5.14],
  [ 180000,  195000, -15000,   -8.33],
  [ 240000,  228000,  12000,    5.0],
  [  96000,  102000,  -6000,   -6.25],
  [ 516000,  525000,  -9000,   -1.74],
  [ 204000,  158000, -46000,  -22.55],
];
bvaRows.forEach((row, r) => row.forEach((v, c) => { bvaData[r][c] = String(v); }));

const bvaFormats: FormatMap = buildFormatMap(
  Array.from({ length: 8 }, (_, r) => [
    { row: r, col: 0, format: 'currency' as CellFormat },
    { row: r, col: 1, format: 'currency' as CellFormat },
    { row: r, col: 2, format: 'currency' as CellFormat },
    { row: r, col: 3, format: 'percentage' as CellFormat },
  ]).flat()
);

const budgetVsActuals: Scenario = {
  id: 'budget-vs-actuals',
  name: 'Budget vs. Actuals',
  description: 'Plan vs. performance with variance',
  rowLabels: [
    'Revenue', 'Cost of Revenue', 'Gross Profit',
    'Sales & Mktg', 'R&D', 'G&A', 'Total OpEx', 'EBITDA', '', '',
  ],
  colLabels: ['Budget', 'Actual', 'Variance', 'Var %', '', '', '', '', '', ''],
  data: bvaData,
  formatMap: bvaFormats,
};

// ── P&L Summary ───────────────────────────────────────────────────────────────

const pnlData: GridData = emptyGrid();
const pnlRows = [
  [3200000, 4150000, 5500000, 5800000, 7200000],
  [1280000, 1620000, 2090000, 2204000, 2664000],
  [1920000, 2530000, 3410000, 3596000, 4536000],
  [ 640000,  830000, 1100000, 1160000, 1440000],
  [ 480000,  622000,  825000,  870000, 1080000],
  [ 192000,  249000,  330000,  348000,  432000],
  [1312000, 1701000, 2255000, 2378000, 2952000],
  [ 608000,  829000, 1155000, 1218000, 1584000],
  [ -45000,  -38000,  -25000,  -20000,   15000],
  [ 563000,  791000, 1130000, 1198000, 1599000],
];
pnlRows.forEach((row, r) => row.forEach((v, c) => { pnlData[r][c] = String(v); }));

const pnlFormats: FormatMap = buildFormatMap(
  Array.from({ length: NUM_ROWS }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => ({ row: r, col: c, format: 'currency' as CellFormat }))
  ).flat()
);

const pnlSummary: Scenario = {
  id: 'pnl-summary',
  name: 'P&L Summary',
  description: 'Multi-year income statement',
  rowLabels: [
    'Revenue', 'Cost of Revenue', 'Gross Profit',
    'Sales & Marketing', 'R&D', 'G&A',
    'Operating Exp', 'Operating Income', 'Interest & Other', 'Net Income',
  ],
  colLabels: ['FY 2022', 'FY 2023', 'FY 2024', 'LTM', 'NTM', '', '', '', '', ''],
  data: pnlData,
  formatMap: pnlFormats,
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [revenueModel, cashFlow, budgetVsActuals, pnlSummary];
