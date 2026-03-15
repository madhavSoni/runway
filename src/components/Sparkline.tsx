import React from 'react';

interface SparklineProps {
  /** Raw numeric values to plot (non-finite values are filtered out) */
  values: number[];
  width?: number;
  height?: number;
}

/**
 * SVG mini line chart showing the trend of values in a row.
 * Color: green if last value > first value (trending up),
 *        red if trending down, muted gray if flat.
 */
export const Sparkline = React.memo(function Sparkline({
  values,
  width = 60,
  height = 18,
}: SparklineProps) {
  const numeric = values.filter((v) => isFinite(v) && !isNaN(v));
  if (numeric.length < 2) return null;

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max === min ? 1 : max - min;
  const padding = 2;

  const points = numeric
    .map((v, i) => {
      const x = ((i / (numeric.length - 1)) * width).toFixed(1);
      const y = (height - padding - ((v - min) / range) * (height - padding * 2)).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');

  const first = numeric[0];
  const last = numeric[numeric.length - 1];
  const color =
    last > first
      ? 'var(--positive)'
      : last < first
        ? 'var(--negative)'
        : 'var(--text-muted)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
