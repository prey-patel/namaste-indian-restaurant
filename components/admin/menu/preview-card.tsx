'use client';

import React, { useState, useEffect } from 'react';
import MenuItemCard, { PublicMenuItem } from '@/components/public/menu/menu-item-card';
import { getSingleSignedUrlAction } from '@/app/admin/menu/actions';
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/utils';

type PreviewCardProps = {
  itemData: {
    name_pl: string;
    name_en: string;
    description_pl: string | null;
    description_en: string | null;
    price: number;
    image_url: string | null;
    spiciness: number;
    allergens: string[];
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_gluten_free: boolean;
    is_chef_special: boolean;
    is_popular: boolean;
    is_new: boolean;
  };
};

export default function PreviewCard({ itemData }: PreviewCardProps) {
  const locale = useLocale();
  const l = (text: string) => getLocalizedText(text, locale);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolvePreviewImage() {
      if (!itemData.image_url) {
        setSignedUrl(null);
        return;
      }
      try {
        const url = await getSingleSignedUrlAction(itemData.image_url);
        if (active) {
          setSignedUrl(url);
        }
      } catch (err) {
        console.error('Error signing preview image:', err);
        if (active) {
          setSignedUrl(null);
        }
      }
    }

    resolvePreviewImage();

    return () => {
      active = false;
    };
  }, [itemData.image_url]);

  // Construct a dummy PublicMenuItem for the card
  const dummyItem: PublicMenuItem = {
    id: 'preview-id',
    category_id: 'preview-cat',
    name_pl: itemData.name_pl || 'Nazwa potrawy',
    name_en: itemData.name_en || 'Dish name',
    description_pl: itemData.description_pl,
    description_en: itemData.description_en,
    price: itemData.price || 0,
    image_url: itemData.image_url,
    spiciness: itemData.spiciness || 0,
    allergens: itemData.allergens || [],
    is_vegetarian: itemData.is_vegetarian,
    is_vegan: itemData.is_vegan,
    is_gluten_free: itemData.is_gluten_free,
    is_chef_special: itemData.is_chef_special,
    is_popular: itemData.is_popular,
    is_new: itemData.is_new,
    display_order: 0,
    signed_image_url: signedUrl,
    is_available: true,
  };

  return (
    <div className="space-y-4 font-sans text-left">
      <div className="flex border-b border-border pb-2">
        <span className="text-xs uppercase tracking-wider text-primary font-bold">
          {l('Podgląd Menu / Menu Preview')}
        </span>
      </div>
      <div className="max-w-[320px] mx-auto">
        <MenuItemCard item={dummyItem} locale={locale as 'pl' | 'en'} />
      </div>
    </div>
  );
}
