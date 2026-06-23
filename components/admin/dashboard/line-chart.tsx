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
  const paddingTop = 25;
  const paddingBottom = 35;
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

  // Generate smooth curved path (Cubic Bezier S-curve approximation)
  const linePath = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 3;
    const cpY1 = prev.y;
    const cpX2 = prev.x + 2 * (p.x - prev.x) / 3;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

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
        className="overflow-visible font-sans animate-fade-in"
      >
        <defs>
          {/* Main Gradient */}
          <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="50%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx} className="opacity-30">
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="4 4"
                className="text-border"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                className="fill-muted-foreground font-semibold font-mono"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* Vertical day guides */}
        {points.map((p, idx) => (
          <line
            key={`guide-${idx}`}
            x1={p.x}
            y1={paddingTop}
            x2={p.x}
            y2={paddingTop + graphHeight}
            stroke="hsl(var(--border) / 0.15)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        ))}

        {/* X-axis labels */}
        {points.map((p, idx) => (
          <text
            key={`x-label-${idx}`}
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

        {/* Glowing line behind the main line */}
        {points.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={5}
            opacity={0.12}
            filter="url(#glow)"
          />
        )}

        {/* Main Line */}
        {points.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
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
            strokeWidth={1.2}
            strokeDasharray="3 3"
            className="opacity-45"
          />
        )}

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={`point-${idx}`}>
            {/* Outer glowing ring on hover */}
            {hoveredIdx === idx && (
              <circle
                cx={p.x}
                cy={p.y}
                r={7.5}
                fill={color}
                opacity={0.25}
                className="animate-pulse"
              />
            )}
            {/* Main point marker */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 4.5 : 3}
              fill="hsl(var(--background))"
              stroke={color}
              strokeWidth={hoveredIdx === idx ? 2.5 : 1.8}
              className="transition-all duration-150 cursor-pointer"
            />
            {/* Interactive hover overlay circle */}
            <circle
              cx={p.x}
              cy={p.y}
              r={16}
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
            {/* Drop Shadow Filter */}
            <filter id="tooltipShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.15" />
            </filter>
            
            {/* Tooltip Shadow Box */}
            <g filter="url(#tooltipShadow)">
              <rect
                x={Math.max(paddingLeft, Math.min(svgWidth - paddingRight - 85, points[hoveredIdx].x - 42.5))}
                y={points[hoveredIdx].y - 42}
                width={85}
                height={28}
                rx={6}
                fill="hsl(var(--popover))"
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text
                x={Math.max(paddingLeft + 42.5, Math.min(svgWidth - paddingRight - 42.5, points[hoveredIdx].x))}
                y={points[hoveredIdx].y - 24}
                textAnchor="middle"
                fontSize={10}
                className="fill-popover-foreground font-bold font-mono"
              >
                {formatValue(points[hoveredIdx].value)} PLN
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
