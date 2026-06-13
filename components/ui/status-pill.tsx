import React from 'react';

type StatusType = 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

type StatusPillProps = {
  status: StatusType;
  label: string;
  className?: string;
};

export default function StatusPill({ status, label, className = '' }: StatusPillProps) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-primary/10 text-primary border-primary/20'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-sans font-bold tracking-widest uppercase border ${styles[status]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label}
    </span>
  );
}
