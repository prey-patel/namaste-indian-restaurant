import React from 'react';
import { useTranslations } from 'next-intl';

type MenuFilterBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isVegetarian: boolean;
  onVegetarianChange: (val: boolean) => void;
  isVegan: boolean;
  onVeganChange: (val: boolean) => void;
  isGlutenFree: boolean;
  onGlutenFreeChange: (val: boolean) => void;
  isSpicy: boolean;
  onSpicyChange: (val: boolean) => void;
  onReset: () => void;
};

export default function MenuFilterBar({
  searchQuery,
  onSearchChange,
  isVegetarian,
  onVegetarianChange,
  isVegan,
  onVeganChange,
  isGlutenFree,
  onGlutenFreeChange,
  isSpicy,
  onSpicyChange,
  onReset,
}: MenuFilterBarProps) {
  const t = useTranslations('menu');

  const hasActiveFilters = searchQuery !== '' || isVegetarian || isVegan || isGlutenFree || isSpicy;

  return (
    <div className="w-full bg-[#0A1128]/60 border border-primary/10 rounded-lg p-4 sm:p-6 space-y-4">
      {/* Search Input Section */}
      <div className="flex flex-col space-y-1.5">
        <label 
          htmlFor="menu-search-input" 
          className="text-[10px] sm:text-xs font-bold text-primary tracking-widest uppercase font-sans"
        >
          {t('searchPlaceholder')}
        </label>
        <div className="relative">
          <input
            id="menu-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-[#070B1E]/80 border border-primary/20 rounded px-4 py-3 pl-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary/45" aria-hidden="true">
            <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground outline-none focus-visible:text-foreground"
              aria-label="Clear search query"
            >
              <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dietary Checkboxes & Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div 
          className="flex flex-wrap gap-x-6 gap-y-3"
          role="group"
          aria-label="Dietary filters"
        >
          {/* Vegetarian Filter */}
          <label className="inline-flex items-center text-xs font-semibold tracking-wide uppercase font-sans text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isVegetarian}
              onChange={(e) => onVegetarianChange(e.target.checked)}
              className="rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/30 focus:ring-offset-[#070B1E] mr-2 h-4.5 w-4.5"
            />
            {t('filterVegetarian')}
          </label>

          {/* Vegan Filter */}
          <label className="inline-flex items-center text-xs font-semibold tracking-wide uppercase font-sans text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isVegan}
              onChange={(e) => onVeganChange(e.target.checked)}
              className="rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/30 focus:ring-offset-[#070B1E] mr-2 h-4.5 w-4.5"
            />
            {t('filterVegan')}
          </label>

          {/* Gluten Free Filter */}
          <label className="inline-flex items-center text-xs font-semibold tracking-wide uppercase font-sans text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGlutenFree}
              onChange={(e) => onGlutenFreeChange(e.target.checked)}
              className="rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/30 focus:ring-offset-[#070B1E] mr-2 h-4.5 w-4.5"
            />
            {t('filterGlutenFree')}
          </label>

          {/* Spicy Filter */}
          <label className="inline-flex items-center text-xs font-semibold tracking-wide uppercase font-sans text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSpicy}
              onChange={(e) => onSpicyChange(e.target.checked)}
              className="rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/30 focus:ring-offset-[#070B1E] mr-2 h-4.5 w-4.5"
            />
            {t('filterSpicy')}
          </label>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="self-start sm:self-auto text-xs font-bold text-primary/80 hover:text-primary tracking-widest uppercase font-sans border border-primary/10 rounded px-3.5 py-2 hover:bg-primary/5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('resetFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
