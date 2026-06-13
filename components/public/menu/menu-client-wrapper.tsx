'use client';

import React, { useState, useTransition } from 'react';
import CategoryTabs, { PublicCategory } from './category-tabs';
import MenuFilterBar from './menu-filter-bar';
import MenuSection from './menu-section';
import MenuEmptyState from './menu-empty-state';
import { PublicMenuItem } from './menu-item-card';

type MenuClientWrapperProps = {
  categories: PublicCategory[];
  items: PublicMenuItem[];
  locale: string;
};

export default function MenuClientWrapper({
  categories,
  items,
  locale,
}: MenuClientWrapperProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [, startTransition] = useTransition();

  // Reset all filters helper
  const handleResetFilters = () => {
    startTransition(() => {
      setActiveCategory(null);
      setSearchQuery('');
      setIsVegetarian(false);
      setIsVegan(false);
      setIsGlutenFree(false);
      setIsSpicy(false);
    });
  };

  // Filtering logic
  const filteredItems = items.filter((item) => {
    // 1. Category Filter
    if (activeCategory && item.category_id !== activeCategory) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const name = (locale === 'pl' ? item.name_pl : item.name_en).toLowerCase();
      const desc = ((locale === 'pl' ? item.description_pl : item.description_en) || '').toLowerCase();
      
      if (!name.includes(query) && !desc.includes(query)) {
        return false;
      }
    }

    // 3. Dietary Checkboxes
    if (isVegetarian && !item.is_vegetarian) return false;
    if (isVegan && !item.is_vegan) return false;
    if (isGlutenFree && !item.is_gluten_free) return false;
    if (isSpicy && item.spiciness <= 0) return false;

    return true;
  });

  const isSearchOrFilterActive = 
    searchQuery !== '' || isVegetarian || isVegan || isGlutenFree || isSpicy;

  // Group categories that have at least one matching item
  const categoriesToShow = activeCategory 
    ? categories.filter(c => c.id === activeCategory)
    : categories;

  const hasVisibleItems = filteredItems.length > 0;

  return (
    <div className="space-y-8">
      {/* Filtering Control Bar */}
      <MenuFilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => startTransition(() => setSearchQuery(val))}
        isVegetarian={isVegetarian}
        onVegetarianChange={(val) => startTransition(() => setIsVegetarian(val))}
        isVegan={isVegan}
        onVeganChange={(val) => startTransition(() => setIsVegan(val))}
        isGlutenFree={isGlutenFree}
        onGlutenFreeChange={(val) => startTransition(() => setIsGlutenFree(val))}
        isSpicy={isSpicy}
        onSpicyChange={(val) => startTransition(() => setIsSpicy(val))}
        onReset={handleResetFilters}
      />

      {/* Category Horizontal Navigation */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(val) => startTransition(() => setActiveCategory(val))}
        locale={locale}
      />

      {/* Menu List Grid */}
      {hasVisibleItems ? (
        <div className="space-y-12 pt-4">
          {categoriesToShow.map((category) => {
            const categoryItems = filteredItems.filter(
              (item) => item.category_id === category.id
            );
            return (
              <MenuSection
                key={category.id}
                category={category}
                items={categoryItems}
                locale={locale}
              />
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <MenuEmptyState
          isSearchOrFilterActive={isSearchOrFilterActive || activeCategory !== null}
          onResetFilters={handleResetFilters}
        />
      )}
    </div>
  );
}
