'use client';

import React from 'react';

interface DonutChartProps {
  segments: { value: number; color: string; label: string }[];
  centerValue?: string;
  centerLabel?: string;
  size?: number; // default 140
}

export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 140
}: DonutChartProps) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  // SVG parameters
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~263.89

  let accumulatedPercent = 0;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="hsl(var(--border) / 0.4)"
            strokeWidth={strokeWidth}
          />
          {total === 0 ? (
            // Empty state placeholder segment
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="hsl(var(--muted-foreground) / 0.1)"
              strokeWidth={strokeWidth}
            />
          ) : (
            segments.map((segment, idx) => {
              const percent = segment.value / total;
              if (percent === 0) return null;
              
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })
          )}
        </svg>

        {/* Center label */}
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            {centerValue && (
              <span className="text-xl font-bold font-serif text-primary leading-none">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1.5 font-sans leading-none">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
