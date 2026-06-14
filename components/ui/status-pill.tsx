import React from 'react';

type StatusType = 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

type StatusPillProps = {
  status: StatusType;
  label: string;
  className?: string;
};

export default function StatusPill({ status, label, className = '' }: StatusPillProps) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 border-yellow-500/20 [.admin-theme_&]:bg-yellow-100/80 [.admin-theme_&]:text-yellow-800 [.admin-theme_&]:border-yellow-300',
    success: 'bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20 [.admin-theme_&]:bg-green-100/80 [.admin-theme_&]:text-green-800 [.admin-theme_&]:border-green-300',
    warning: 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20 [.admin-theme_&]:bg-orange-100/80 [.admin-theme_&]:text-orange-800 [.admin-theme_&]:border-orange-300',
    error: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 [.admin-theme_&]:bg-red-100/80 [.admin-theme_&]:text-red-800 [.admin-theme_&]:border-red-300',
    info: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20 [.admin-theme_&]:bg-blue-100/80 [.admin-theme_&]:text-blue-800 [.admin-theme_&]:border-blue-300',
    neutral: 'bg-primary/10 text-primary border-primary/20 [.admin-theme_&]:bg-muted/80 [.admin-theme_&]:text-muted-foreground [.admin-theme_&]:border-border'
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
