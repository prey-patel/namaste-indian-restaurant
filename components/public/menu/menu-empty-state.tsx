import React from 'react';
import { useTranslations } from 'next-intl';
import EmptyState from '@/components/ui/empty-state';

type MenuEmptyStateProps = {
  isSearchOrFilterActive: boolean;
  onResetFilters?: () => void;
};

export default function MenuEmptyState({
  isSearchOrFilterActive,
  onResetFilters
}: MenuEmptyStateProps) {
  const t = useTranslations('menu');

  const title = isSearchOrFilterActive 
    ? t('emptyState.noResultsTitle')
    : t('emptyState.emptyMenuTitle');

  const description = isSearchOrFilterActive
    ? t('emptyState.noResultsDesc')
    : t('emptyState.emptyMenuDesc');

  const icon = (
    <svg className="w-12 h-12 stroke-current text-primary opacity-60" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  const action = isSearchOrFilterActive && onResetFilters ? (
    <button
      onClick={onResetFilters}
      className="px-4 py-2 border border-primary text-primary hover:bg-primary/10 rounded font-sans text-xs font-bold uppercase tracking-widest transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B1E]"
    >
      {t('resetFilters')}
    </button>
  ) : undefined;

  return (
    <div className="py-12">
      <EmptyState
        title={title}
        description={description}
        icon={icon}
        action={action}
      />
    </div>
  );
}
