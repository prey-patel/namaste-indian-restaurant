'use client';

import React, { useState } from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number; // default 200
  color?: string; // default hsl(var(--primary))
  formatValue?: (v: number) => string;
}

export default function LineChart({
  data,
  height = 200,
  color = 'hsl(var(--primary))',
  formatValue = (v: number) => Math.round(v).toLocaleString()
}: LineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        No data available
      </div>
    );
  }

  // Dimensions
  const svgWidth = 500;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;
  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.value), 0);
  const yMax = maxVal === 0 ? 100 : maxVal * 1.15; // 15% padding on top

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + graphWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * graphWidth;
  };

  const getY = (value: number) => {
    return paddingTop + graphHeight - (value / yMax) * graphHeight;
  };

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    label: d.label,
    value: d.value
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`
    : '';

  // Y-axis grid values (4 lines)
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];

  return (
    <div className="w-full relative select-none">
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${svgWidth} ${height}`} 
        preserveAspectRatio="none"
        className="overflow-visible font-sans"
      >
        <defs>
          <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx} className="opacity-40">
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                strokeWidth={1}
                className="text-border"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                className="fill-muted-foreground font-semibold"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {points.map((p, idx) => (
          <text
            key={idx}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fontSize={9}
            className="fill-muted-foreground font-semibold"
          >
            {p.label}
          </text>
        ))}

        {/* Area under the line */}
        {points.length > 0 && (
          <path
            d={areaPath}
            fill="url(#lineChartGradient)"
          />
        )}

        {/* Line */}
        {points.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        )}

        {/* Hover vertical line guide */}
        {hoveredIdx !== null && (
          <line
            x1={points[hoveredIdx].x}
            y1={paddingTop}
            x2={points[hoveredIdx].x}
            y2={paddingTop + graphHeight}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            className="opacity-30"
          />
        )}

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 5 : 3}
              fill={hoveredIdx === idx ? 'hsl(var(--background))' : color}
              stroke={color}
              strokeWidth={hoveredIdx === idx ? 2.5 : 1.5}
              className="transition-all duration-150"
            />
            {/* Interactive hover overlay circle */}
            <circle
              cx={p.x}
              cy={p.y}
              r={15}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}

        {/* Tooltip */}
        {hoveredIdx !== null && (
          <g className="pointer-events-none transition-all duration-150">
            {/* Tooltip Shadow Box */}
            <rect
              x={Math.max(paddingLeft, Math.min(svgWidth - paddingRight - 80, points[hoveredIdx].x - 40))}
              y={points[hoveredIdx].y - 36}
              width={80}
              height={24}
              rx={4}
              fill="hsl(var(--popover))"
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <text
              x={Math.max(paddingLeft + 40, Math.min(svgWidth - paddingRight - 40, points[hoveredIdx].x))}
              y={points[hoveredIdx].y - 20}
              textAnchor="middle"
              fontSize={10}
              className="fill-popover-foreground font-bold"
            >
              {formatValue(points[hoveredIdx].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
