import React from 'react';
import MenuItemCard, { PublicMenuItem } from './menu-item-card';

export type PublicCategory = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
};

type MenuSectionProps = {
  category: PublicCategory;
  items: PublicMenuItem[];
  locale: string;
};

export default function MenuSection({ category, items, locale }: MenuSectionProps) {
  const isPl = locale === 'pl';
  const categoryName = isPl ? category.name_pl : category.name_en;

  if (items.length === 0) return null;

  return (
    <section 
      id={`category-${category.slug}`} 
      className="space-y-6 scroll-mt-24"
    >
      {/* Category Section Header */}
      <div className="flex items-center space-x-4">
        <h2 className="font-serif font-black text-xl sm:text-2xl text-primary tracking-wide whitespace-nowrap">
          {categoryName}
        </h2>
        <div className="flex-grow h-[1px] bg-gradient-to-r from-primary/25 to-transparent" />
      </div>

      {/* Grid of Dishes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="h-full">
            <MenuItemCard item={item} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
