import React, { ReactNode } from 'react';

type PremiumCardProps = {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
};

export default function PremiumCard({
  children,
  className = '',
  hoverable = true
}: PremiumCardProps) {
  return (
    <div
      className={`relative rounded-xl border border-primary/20 bg-[#0A1128]/85 p-6 transition-all duration-300 ${
        hoverable ? 'hover:border-primary/45 hover:-translate-y-1 gold-border-glow' : ''
      } ${className}`}
    >
      {/* Subtle gold inner accent border representing double-bordered design */}
      <div className="absolute inset-1.5 rounded-[8px] border border-primary/5 pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
