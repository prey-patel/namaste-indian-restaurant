import React from 'react';
import { useTranslations } from 'next-intl';

type BadgeType = 'vegetarian' | 'vegan' | 'gluten_free' | 'chef_special' | 'popular' | 'new';

type DietaryBadgeProps = {
  type: BadgeType;
  className?: string;
};

export default function DietaryBadge({ type, className = '' }: DietaryBadgeProps) {
  const t = useTranslations('menu.dietary');

  // Determine icon and theme
  let icon = null;
  let label = '';
  let themeStyles = '';

  switch (type) {
    case 'vegetarian':
      label = t('vegetarian');
      themeStyles = 'border-green-500/20 bg-green-500/5 text-green-400';
      icon = (
        <span className="relative flex h-2 w-2 mr-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      );
      break;
    case 'vegan':
      label = t('vegan');
      themeStyles = 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707-.707m0-12.728l.707.707m12.728 12.728l-.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      break;
    case 'gluten_free':
      label = t('gluten_free');
      themeStyles = 'border-amber-500/20 bg-amber-500/5 text-amber-400';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case 'chef_special':
      label = t('chef_special');
      themeStyles = 'border-primary/30 bg-primary/5 text-primary';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      );
      break;
    case 'popular':
      label = t('popular');
      themeStyles = 'border-red-500/20 bg-red-500/5 text-red-400';
      icon = (
        <svg className="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'new':
      label = t('new');
      themeStyles = 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400';
      icon = (
        <span className="text-[9px] font-sans font-black mr-1 uppercase" aria-hidden="true">
          ★
        </span>
      );
      break;
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase font-sans ${themeStyles} ${className}`}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
