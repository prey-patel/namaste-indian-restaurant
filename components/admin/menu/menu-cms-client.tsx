'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { deleteMenuItemAction } from '@/app/admin/menu/actions';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/ui/status-pill';
import GoldFrame from '@/components/ui/gold-frame';
import GoldSpinner from '@/components/ui/gold-spinner';

type Category = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string;
  name_pl: string;
  name_en: string;
  price: number;
  display_order: number;
  is_available: boolean;
  is_active: boolean;
  description_pl?: string | null;
  description_en?: string | null;
};

type MenuCmsClientProps = {
  categories: Category[];
  items: MenuItem[];
};

export default function MenuCmsClient({ categories, items }: MenuCmsClientProps) {
  const router = useRouter();
  const t = useTranslations('adminMenu');

  // Filter States
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, visible, hidden
  const [availFilter, setAvailFilter] = useState('all'); // all, available, unavailable

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? `${cat.name_pl} / ${cat.name_en}` : 'Nieznana / Unknown';
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    // 1. Search text
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.name_pl.toLowerCase().includes(searchLower) ||
      item.name_en.toLowerCase().includes(searchLower) ||
      (item.description_pl && item.description_pl.toLowerCase().includes(searchLower)) ||
      (item.description_en && item.description_en.toLowerCase().includes(searchLower));

    // 2. Category Filter
    const matchesCat = catFilter === 'all' || item.category_id === catFilter;

    // 3. Status (visibility)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'visible' && item.is_active) ||
      (statusFilter === 'hidden' && !item.is_active);

    // 4. Availability
    const matchesAvail =
      availFilter === 'all' ||
      (availFilter === 'available' && item.is_available) ||
      (availFilter === 'unavailable' && !item.is_available);

    return matchesSearch && matchesCat && matchesStatus && matchesAvail;
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteMenuItemAction(deletingId);
      if (res.success) {
        setDeletingId(null);
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
          <h2 className="text-2xl font-serif font-bold text-primary">{t('title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Zarządzaj potrawami, cenami, dostępnością i kategoriami menu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/menu/categories">
            <Button variant="outline" className="border-primary/25 hover:bg-primary/5 text-primary text-xs uppercase tracking-wider font-bold">
              {t('categoriesTab')}
            </Button>
          </Link>
          <Link href="/admin/menu/items/new">
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs uppercase tracking-wider font-bold">
              {t('createItem')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#050B1E] p-4 border border-primary/10 rounded-lg">
        
        {/* Search */}
        <div className="space-y-1">
          <label htmlFor="search" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Szukaj / Search
          </label>
          <input
            id="search"
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-xs text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-1">
          <label htmlFor="categoryFilter" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t('filterCategory')}
          </label>
          <select
            id="categoryFilter"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="all">{t('all')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_pl}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility Filter */}
        <div className="space-y-1">
          <label htmlFor="statusFilter" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t('filterStatus')}
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="all">{t('all')}</option>
            <option value="visible">{t('visibleOnly')}</option>
            <option value="hidden">{t('hiddenOnly')}</option>
          </select>
        </div>

        {/* Availability Filter */}
        <div className="space-y-1">
          <label htmlFor="availFilter" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t('filterAvailability')}
          </label>
          <select
            id="availFilter"
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="all">{t('all')}</option>
            <option value="available">{t('availableOnly')}</option>
            <option value="unavailable">{t('unavailableOnly')}</option>
          </select>
        </div>

      </div>

      {/* Main Table */}
      <GoldFrame className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary/10 text-left">
            <thead className="bg-[#050B1E] text-[10px] uppercase tracking-wider text-primary font-bold">
              <tr>
                <th className="px-6 py-4">Nazwa Dań / Dish Name</th>
                <th className="px-6 py-4">Kategoria / Category</th>
                <th className="px-6 py-4">Cena / Price</th>
                <th className="px-6 py-4">Widoczność / Active</th>
                <th className="px-6 py-4">Dostępność / Available</th>
                <th className="px-6 py-4">Sort</th>
                <th className="px-6 py-4 text-right">Akcje / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 bg-[#070B1E]/40 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    Brak wyników spełniających kryteria wyszukiwania.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{item.name_pl}</span>
                        <span className="text-[10px] text-muted-foreground/60">{item.name_en}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {getCategoryName(item.category_id)}
                    </td>
                    <td className="px-6 py-4 font-mono text-primary font-bold">
                      {item.price.toFixed(2)} PLN
                    </td>
                    <td className="px-6 py-4">
                      {item.is_active ? (
                        <StatusPill status="success" label={t('visibleOnly')} />
                      ) : (
                        <StatusPill status="neutral" label={t('hiddenOnly')} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.is_available ? (
                        <StatusPill status="success" label={t('availableOnly')} />
                      ) : (
                        <StatusPill status="error" label={t('unavailableOnly')} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {item.display_order}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2.5">
                      <Link href={`/admin/menu/items/${item.id}/edit`}>
                        <button className="text-primary hover:text-primary-foreground font-bold uppercase tracking-wider text-[10px]">
                          Edytuj / Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeletingId(item.id)}
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
