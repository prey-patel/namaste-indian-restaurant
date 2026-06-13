import React, { ButtonHTMLAttributes } from 'react';

type PremiumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export default function PremiumButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: PremiumButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-bold uppercase tracking-widest transition-all duration-300 rounded disabled:opacity-50 disabled:pointer-events-none';
  
  const sizeStyles = {
    sm: 'text-[10px] px-4 py-2',
    md: 'text-xs px-6 py-3',
    lg: 'text-sm px-8 py-4'
  };

  const variantStyles = {
    primary: 'bg-gold-gradient text-[#070B1E] hover:shadow-lg hover:shadow-primary/20 hover:brightness-105 active:scale-[0.98]',
    outline: 'border border-primary/45 text-primary hover:bg-primary hover:text-[#070B1E] active:scale-[0.98]',
    text: 'text-primary/90 hover:text-primary hover:bg-primary/5'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
