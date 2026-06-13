'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { deleteCategoryAction } from '@/app/admin/menu/actions';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/ui/status-pill';
import GoldFrame from '@/components/ui/gold-frame';
import GoldSpinner from '@/components/ui/gold-spinner';
import CategoryForm from './category-form';

type Category = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
  is_active: boolean;
};

type CategoriesCmsClientProps = {
  categories: Category[];
};

export default function CategoriesCmsClient({ categories }: CategoriesCmsClientProps) {
  const router = useRouter();
  const t = useTranslations('adminMenu');

  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteCategoryAction(deletingId);
      if (res.success) {
        setDeletingId(null);
        if (editingCategory?.id === deletingId) {
          setEditingCategory(undefined);
        }
        router.refresh();
      } else {
        setDeleteError(res.error || t('errorDelete'));
      }
    } catch (err: any) {
      setDeleteError(err.message || t('errorDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-primary/10 pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">{t('categoriesTab')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Zarządzaj sekcjami karty dań. Kolejność określa pozycję na stronie głównej menu.
          </p>
        </div>
        <Link href="/admin/menu">
          <Button variant="outline" className="border-primary/25 hover:bg-primary/5 text-primary text-xs uppercase tracking-wider font-bold">
            ← Wróć do Menu / Back to CMS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Categories Table (Left Column) */}
        <div className="lg:col-span-7 space-y-4">
          <GoldFrame className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-primary/10 text-left">
                <thead className="bg-[#050B1E] text-[10px] uppercase tracking-wider text-primary font-bold">
                  <tr>
                    <th className="px-6 py-4">Nazwa / Name</th>
                    <th className="px-6 py-4">Slug</th>
                    <th className="px-6 py-4">Widoczność / Active</th>
                    <th className="px-6 py-4">Sort</th>
                    <th className="px-6 py-4 text-right">Akcje / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 bg-[#070B1E]/40 text-xs">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        {t('noCategories')}
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr
                        key={cat.id}
                        className={`hover:bg-primary/5 transition-colors ${
                          editingCategory?.id === cat.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-medium text-foreground">
                          <div className="flex flex-col">
                            <span>{cat.name_pl}</span>
                            <span className="text-[10px] text-muted-foreground/60">{cat.name_en}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-muted-foreground">
                          {cat.slug}
                        </td>
                        <td className="px-6 py-4">
                          {cat.is_active ? (
                            <StatusPill status="success" label={t('visibleOnly')} />
                          ) : (
                            <StatusPill status="neutral" label={t('hiddenOnly')} />
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono">
                          {cat.display_order}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2.5">
                          <button
                            onClick={() => setEditingCategory(cat)}
                            className="text-primary hover:text-primary-foreground font-bold uppercase tracking-wider text-[10px]"
                          >
                            Edytuj / Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(cat.id)}
                            className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[10px]"
                          >
                            {t('deleteButton')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GoldFrame>
        </div>

        {/* Category Form (Right Column) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <CategoryForm
            key={editingCategory?.id || 'new'}
            initialData={editingCategory}
            onSuccess={() => {
              setEditingCategory(undefined);
              router.refresh();
            }}
          />
          {editingCategory && (
            <Button
              variant="ghost"
              onClick={() => setEditingCategory(undefined)}
              className="w-full text-xs uppercase tracking-wider hover:bg-primary/5 text-muted-foreground hover:text-foreground"
            >
              Anuluj Edycję / Cancel Editing
            </Button>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-[#070B1E]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#050B1E] border border-red-500/25 p-6 rounded-lg max-w-sm w-full space-y-4">
            <h3 className="text-lg font-serif font-bold text-red-400">
              {t('confirmDeleteTitle')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('confirmDeleteDesc')}
            </p>
            {deleteError && (
              <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded text-center">
                {deleteError}
              </p>
            )}
            <div className="flex space-x-3 pt-2">
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-xs uppercase tracking-wider"
              >
                {isDeleting ? <GoldSpinner size="sm" /> : t('deleteButton')}
              </Button>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingId(null);
                  setDeleteError(null);
                }}
                className="flex-1 border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider"
              >
                {t('cancelButton')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
