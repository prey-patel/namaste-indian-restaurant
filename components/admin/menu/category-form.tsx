'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { categoryFormSchema } from '@/lib/validation/admin-menu';
import { createCategoryAction, updateCategoryAction } from '@/app/admin/menu/actions';
import { Button } from '@/components/ui/button';
import GoldSpinner from '@/components/ui/gold-spinner';

type CategoryFormProps = {
  initialData?: {
    id: string;
    name_pl: string;
    name_en: string;
    slug: string;
    display_order: number;
    is_active: boolean;
  };
  onSuccess?: () => void;
};

export default function CategoryForm({ initialData, onSuccess }: CategoryFormProps) {
  const router = useRouter();
  const t = useTranslations('adminMenu');
  
  const [namePl, setNamePl] = useState(initialData?.name_pl || '');
  const [nameEn, setNameEn] = useState(initialData?.name_en || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [displayOrder, setDisplayOrder] = useState(initialData?.display_order !== undefined ? initialData.display_order.toString() : '0');
  const [isActive, setIsActive] = useState(initialData?.is_active !== undefined ? initialData.is_active : true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedOrder = parseInt(displayOrder, 10);
    const payload = {
      name_pl: namePl,
      name_en: nameEn,
      slug: slug,
      display_order: isNaN(parsedOrder) ? 0 : parsedOrder,
      is_active: isActive,
    };

    // Form validation
    const result = categoryFormSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Walidacja nie powiodła się / Validation failed');
      setLoading(false);
      return;
    }

    try {
      let res;
      if (initialData?.id) {
        res = await updateCategoryAction(initialData.id, payload);
      } else {
        res = await createCategoryAction(payload);
      }

      if (res.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/admin/menu');
          router.refresh();
        }
      } else {
        setError(res.error || t('errorSave'));
      }
    } catch (err: any) {
      setError(err.message || t('errorSave'));
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from English name if not edited
  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!initialData) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-'); // collapse duplicate hyphens
      setSlug(generatedSlug);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left bg-[#050B1E] p-6 border border-primary/20 rounded-lg max-w-lg w-full">
      <h3 className="text-lg font-serif font-bold text-primary mb-2">
        {initialData ? t('editCategory') : t('createCategory')}
      </h3>

      {error && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 text-center">
          {error}
        </div>
      )}

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
            onChange={(e) => handleNameEnChange(e.target.value)}
            required
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Slug / URL path
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="display_order" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('displayOrderLabel')}
          </label>
          <input
            id="display_order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            required
            min="0"
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <input
          id="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
          {t('activeLabel')}
        </label>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-primary/10">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium"
        >
          {loading ? <GoldSpinner size="sm" /> : t('saveButton')}
        </Button>
      </div>
    </form>
  );
}
