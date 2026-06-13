import React, { ReactNode } from 'react';

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

export default function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`glass-panel p-6 rounded-2xl shadow-xl shadow-black/10 ${className}`}>
      {children}
    </div>
  );
}
