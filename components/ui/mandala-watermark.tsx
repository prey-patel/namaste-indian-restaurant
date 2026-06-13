import React from 'react';

type MandalaWatermarkProps = {
  className?: string;
};

export default function MandalaWatermark({ className = '' }: MandalaWatermarkProps) {
  return (
    <div
      className={`absolute pointer-events-none select-none opacity-[0.03] text-primary ${className}`}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full md:animate-[spin_240s_linear_infinite] animate-none motion-reduce:!animate-none"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        {/* Concentric Traditional Mandala Pattern */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.25" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1,1" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.2" />
        
        {/* Center hub */}
        <circle cx="50" cy="50" r="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
        
        {/* Outer spikes/petals */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <g key={i} transform={`rotate(${angle} 50 50)`}>
              <path d="M50 2 L48 8 L50 6 L52 8 Z" />
              <line x1="50" y1="50" x2="50" y2="8" stroke="currentColor" strokeWidth="0.15" />
              <circle cx="50" cy="12" r="0.8" />
            </g>
          );
        })}

        {/* Inner petals ring */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          return (
            <g key={`inner-${i}`} transform={`rotate(${angle + 15} 50 50)`}>
              <path d="M50 20 C46 30, 54 30, 50 20" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="26" r="0.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
