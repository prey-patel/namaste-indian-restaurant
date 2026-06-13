import React, { ReactNode } from 'react';
import PremiumCard from './premium-card';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <PremiumCard hoverable={false} className={`max-w-md mx-auto text-center py-10 ${className}`}>
      {icon && <div className="text-primary mb-4 flex justify-center">{icon}</div>}
      <h3 className="font-serif text-lg font-bold text-primary mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-6">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </PremiumCard>
  );
}
