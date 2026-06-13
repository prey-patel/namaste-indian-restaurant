'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { menuItemFormSchema } from '@/lib/validation/admin-menu';
import { createMenuItemAction, updateMenuItemAction } from '@/app/admin/menu/actions';
import { Button } from '@/components/ui/button';
import GoldSpinner from '@/components/ui/gold-spinner';
import ImageUploader from './image-uploader';
import PreviewCard from './preview-card';

type CategoryOption = {
  id: string;
  name_pl: string;
  name_en: string;
};

type ItemFormProps = {
  categories: CategoryOption[];
  initialData?: {
    id: string;
    category_id: string;
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
    is_available: boolean;
    is_active: boolean;
    display_order: number;
  };
};

export default function ItemForm({ categories, initialData }: ItemFormProps) {
  const router = useRouter();
  const t = useTranslations('adminMenu');

  const [categoryId, setCategoryId] = useState(initialData?.category_id || categories[0]?.id || '');
  const [namePl, setNamePl] = useState(initialData?.name_pl || '');
  const [nameEn, setNameEn] = useState(initialData?.name_en || '');
  const [descriptionPl, setDescriptionPl] = useState(initialData?.description_pl || '');
  const [descriptionEn, setDescriptionEn] = useState(initialData?.description_en || '');
  const [price, setPrice] = useState(initialData?.price !== undefined ? initialData.price.toString() : '0');
  const [sortOrder, setSortOrder] = useState(initialData?.display_order !== undefined ? initialData.display_order.toString() : '0');
  const [spiciness, setSpiciness] = useState(initialData?.spiciness !== undefined ? initialData.spiciness.toString() : '0');
  const [allergensText, setAllergensText] = useState(initialData?.allergens ? initialData.allergens.join(', ') : '');
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.image_url || null);

  // Flags
  const [isVegetarian, setIsVegetarian] = useState(initialData?.is_vegetarian || false);
  const [isVegan, setIsVegan] = useState(initialData?.is_vegan || false);
  const [isGlutenFree, setIsGlutenFree] = useState(initialData?.is_gluten_free || false);
  const [isChefSpecial, setIsChefSpecial] = useState(initialData?.is_chef_special || false);
  const [isPopular, setIsPopular] = useState(initialData?.is_popular || false);
  const [isNew, setIsNew] = useState(initialData?.is_new || false);
  const [isAvailable, setIsAvailable] = useState(initialData?.is_available !== undefined ? initialData.is_available : true);
  const [isActive, setIsActive] = useState(initialData?.is_active !== undefined ? initialData.is_active : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedPrice = parseFloat(price);
    const parsedSort = parseInt(sortOrder, 10);
    const parsedSpicy = parseInt(spiciness, 10);
    const allergens = allergensText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload = {
      category_id: categoryId,
      name_pl: namePl,
      name_en: nameEn,
      description_pl: descriptionPl || null,
      description_en: descriptionEn || null,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      display_order: isNaN(parsedSort) ? 0 : parsedSort,
      spiciness: isNaN(parsedSpicy) ? 0 : parsedSpicy,
      allergens,
      is_vegetarian: isVegetarian,
      is_vegan: isVegan,
      is_gluten_free: isGlutenFree,
      is_chef_special: isChefSpecial,
      is_popular: isPopular,
      is_new: isNew,
      image_url: imageUrl || null,
    };

    // Zod schema validation
    const result = menuItemFormSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Walidacja nie powiodła się / Validation failed');
      setLoading(false);
      return;
    }

    try {
      let res;
      if (initialData?.id) {
        res = await updateMenuItemAction(initialData.id, {
          ...payload,
          is_available: isAvailable,
          is_active: isActive,
        });
      } else {
        res = await createMenuItemAction(payload);
      }

      if (res.success) {
        router.push('/admin/menu');
        router.refresh();
      } else {
        setError(res.error || t('errorSave'));
      }
    } catch (err: any) {
      setError(err.message || t('errorSave'));
    } finally {
      setLoading(false);
    }
  };

  const previewData = {
    name_pl: namePl,
    name_en: nameEn,
    description_pl: descriptionPl || null,
    description_en: descriptionEn || null,
    price: parseFloat(price) || 0,
    image_url: imageUrl,
    spiciness: parseInt(spiciness, 10) || 0,
    allergens: allergensText.split(',').map((x) => x.trim()).filter((x) => x.length > 0),
    is_vegetarian: isVegetarian,
    is_vegan: isVegan,
    is_gluten_free: isGlutenFree,
    is_chef_special: isChefSpecial,
    is_popular: isPopular,
    is_new: isNew,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
      
      {/* Form Area */}
      <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6 bg-[#050B1E] p-6 border border-primary/20 rounded-lg">
        <h3 className="text-xl font-serif font-bold text-primary border-b border-primary/10 pb-3">
          {initialData ? t('editItem') : t('createItem')}
        </h3>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Section: Category */}
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('categoryLabel')}
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_pl} / {cat.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Section: Names PL/EN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="name_pl" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('namePlLabel')}
            </label>
            <input
              id="name_pl"
              type="text"
              value={namePl}
              onChange={(e) => setNamePl(e.target.value)}
              required
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name_en" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('nameEnLabel')}
            </label>
            <input
              id="name_en"
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* Section: Descriptions PL/EN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="desc_pl" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('descriptionPlLabel')}
            </label>
            <textarea
              id="desc_pl"
              value={descriptionPl}
              onChange={(e) => setDescriptionPl(e.target.value)}
              rows={3}
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="desc_en" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('descriptionEnLabel')}
            </label>
            <textarea
              id="desc_en"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>
        </div>

        {/* Section: Price, Sort Order, Spiciness */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="price" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('priceLabel')}
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sort_order" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('displayOrderLabel')}
            </label>
            <input
              id="sort_order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              required
              min="0"
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="spiciness" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {t('spicinessLabel')}
            </label>
            <input
              id="spiciness"
              type="number"
              min="0"
              max="3"
              value={spiciness}
              onChange={(e) => setSpiciness(e.target.value)}
              required
              className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* Section: Allergens */}
        <div className="space-y-1.5">
          <label htmlFor="allergens" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('allergensLabel')}
          </label>
          <input
            id="allergens"
            type="text"
            value={allergensText}
            onChange={(e) => setAllergensText(e.target.value)}
            placeholder="np. nerkowce, gluten, nabiał / e.g. cashews, gluten, dairy"
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Section: Image Uploader */}
        <div className="space-y-1.5 border-t border-primary/10 pt-4">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-2">
            {t('imageLabel')}
          </label>
          <ImageUploader value={imageUrl} onChange={setImageUrl} />
        </div>

        {/* Section: Dietary Flags */}
        <div className="border-t border-primary/10 pt-4 space-y-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium block">
            Cechy potrawy / Dietary & Promo Tags
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isVegetarian}
                onChange={(e) => setIsVegetarian(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('vegetarianLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isVegan}
                onChange={(e) => setIsVegan(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('veganLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isGlutenFree}
                onChange={(e) => setIsGlutenFree(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('glutenFreeLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isChefSpecial}
                onChange={(e) => setIsChefSpecial(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('chefSpecialLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('popularLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('newLabel')}</span>
            </label>
          </div>
        </div>

        {/* Section: Status (Available & Active) */}
        <div className="border-t border-primary/10 pt-4 space-y-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium block">
            Status Widoczności i Dostępności / Visibility & Availability
          </span>
          <div className="flex space-x-6">
            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('availableLabel')}</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
              />
              <span>{t('activeLabel')}</span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex space-x-3 pt-6 border-t border-primary/10">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium tracking-wide uppercase text-xs py-3"
          >
            {loading ? <GoldSpinner size="sm" /> : t('saveButton')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/menu')}
            className="border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wide px-6"
          >
            {t('cancelButton')}
          </Button>
        </div>
      </form>

      {/* Live Preview Area */}
      <div className="lg:col-span-4 sticky top-6 space-y-4">
        <PreviewCard itemData={previewData} />
      </div>

    </div>
  );
}
