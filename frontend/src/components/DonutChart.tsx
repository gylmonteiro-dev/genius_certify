import React from 'react';

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: number;
}

const CX = 80;
const CY = 80;
const RADIUS = 54;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  centerLabel,
  centerValue,
}) => {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0" aria-hidden>
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          segments
            .filter((item) => item.value > 0)
            .map((item) => {
              const length = (item.value / total) * CIRCUMFERENCE;
              const circle = (
                <circle
                  key={item.label}
                  cx={CX}
                  cy={CY}
                  r={RADIUS}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${length} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${CX} ${CY})`}
                />
              );
              offset += length;
              return circle;
            })}
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: '22px', fontWeight: 800 }}
        >
          {centerValue}
        </text>
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em' }}
        >
          {centerLabel.toUpperCase()}
        </text>
      </svg>
      <ul className="space-y-2 w-full">
        {segments.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-600 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
            <span className="font-bold text-slate-900 tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
