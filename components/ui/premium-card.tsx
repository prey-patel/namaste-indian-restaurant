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
      className={`relative rounded-xl border border-border bg-card p-6 transition-all duration-300 ${
        hoverable ? 'hover:border-primary/50 hover:-translate-y-1 gold-border-glow' : ''
      } ${className}`}
    >
      {/* Subtle gold inner accent border representing double-bordered design */}
      <div className="absolute inset-1.5 rounded-[8px] border border-primary/5 [.admin-theme_&]:border-primary/10 pointer-events-none" />
      <div className="relative z-10 text-foreground">
        {children}
      </div>
    </div>
  );
}
