import React from 'react';

type DividerProps = {
  className?: string;
};

export default function Divider({ className = '' }: DividerProps) {
  return (
    <div className={`flex items-center justify-center my-8 ${className}`} role="presentation">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-primary/30" />
      <div className="mx-4 text-primary opacity-80 flex items-center justify-center">
        {/* Elegant Diamond Indian Hospitality Motif SVG */}
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.8L18.2 12 12 18.2 5.8 12 12 5.8z" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </div>
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-primary/30" />
    </div>
  );
}
