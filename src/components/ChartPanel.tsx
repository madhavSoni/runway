import React from 'react';
import { motion } from 'framer-motion';
import { ChartPanelProps, ChartDataPoint, ChartType } from '../types';

const SVG_WIDTH = 280;
const SVG_HEIGHT = 180;
const PAD = { top: 20, right: 10, bottom: 40, left: 40 };
const CHART_W = SVG_WIDTH - PAD.left - PAD.right;
const CHART_H = SVG_HEIGHT - PAD.top - PAD.bottom;

interface ChartCanvasProps {
  data: ChartDataPoint[];
  type: ChartType;
}

function ChartCanvas({ data, type }: ChartCanvasProps) {
  if (data.length === 0) {
    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        aria-hidden="true"
      >
        <text
          x={SVG_WIDTH / 2}
          y={SVG_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="var(--text-muted)"
        >
          Select a range and open chart
        </text>
      </svg>
    );
  }

  const minVal = Math.min(0, ...data.map((d) => d.value));
  const maxVal = Math.max(0, ...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const toY = (v: number) => PAD.top + (1 - (v - minVal) / range) * CHART_H;
  const baselineY = toY(0);

  const manyPoints = data.length > 5;

  if (type === 'bar') {
    const slotW = CHART_W / data.length;
    const barW = slotW * 0.7;

    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        aria-hidden="true"
      >
        {/* Baseline */}
        <line
          x1={PAD.left}
          y1={baselineY}
          x2={SVG_WIDTH - PAD.right}
          y2={baselineY}
          stroke="var(--text-muted)"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const barX = PAD.left + i * slotW + slotW * 0.15;
          const y = toY(d.value);
          const barTop = Math.min(y, baselineY);
          const barHeight = Math.abs(y - baselineY);
          const fill = d.value >= 0 ? 'var(--positive)' : 'var(--negative)';
          const labelX = barX + barW / 2;
          const labelY = SVG_HEIGHT - PAD.bottom + 14;

          return (
            <g key={i}>
              <rect
                x={barX}
                y={barTop}
                width={barW}
                height={barHeight || 1}
                fill={fill}
                opacity={0.85}
              />
              <text
                x={labelX}
                y={labelY}
                fontSize="9"
                textAnchor="middle"
                fill="var(--text-muted)"
                transform={
                  manyPoints ? `rotate(-30, ${labelX}, ${labelY})` : undefined
                }
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Line chart
  const pointXY = data.map((d, i) => {
    const x = PAD.left + (i / Math.max(data.length - 1, 1)) * CHART_W;
    const y = toY(d.value);
    return { x, y, label: d.label, value: d.value };
  });

  const polylinePoints = pointXY.map((p) => `${p.x},${p.y}`).join(' ');

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const lineColor =
    last > first
      ? 'var(--positive)'
      : last < first
        ? 'var(--negative)'
        : 'var(--text-muted)';

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      aria-hidden="true"
    >
      {/* Baseline */}
      <line
        x1={PAD.left}
        y1={baselineY}
        x2={SVG_WIDTH - PAD.right}
        y2={baselineY}
        stroke="var(--text-muted)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      <polyline
        points={polylinePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pointXY.map((p, i) => {
        const labelY = SVG_HEIGHT - PAD.bottom + 14;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={lineColor} />
            <text
              x={p.x}
              y={labelY}
              fontSize="9"
              textAnchor="middle"
              fill="var(--text-muted)"
              transform={
                manyPoints ? `rotate(-30, ${p.x}, ${labelY})` : undefined
              }
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const ChartPanel: React.FC<ChartPanelProps> = ({ data, config, onTypeChange, onClose }) => {
  return (
    <motion.div
      className="chart-panel"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="chart-panel-header">
        <span className="chart-panel-title">Chart</span>
        <div className="chart-panel-type-btns">
          <button
            className={`toolbar-btn${config.type === 'bar' ? ' active' : ''}`}
            onClick={() => onTypeChange('bar')}
            title="Bar chart"
          >Bar</button>
          <button
            className={`toolbar-btn${config.type === 'line' ? ' active' : ''}`}
            onClick={() => onTypeChange('line')}
            title="Line chart"
          >Line</button>
        </div>
        <button className="chart-panel-close" onClick={onClose} title="Close chart">✕</button>
      </div>
      <div className="chart-panel-body">
        <ChartCanvas data={data} type={config.type} />
      </div>
    </motion.div>
  );
};

export default ChartPanel;
