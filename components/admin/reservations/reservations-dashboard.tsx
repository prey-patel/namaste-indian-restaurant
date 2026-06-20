'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/ui/status-pill';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';

import { 
  confirmReservationAction, 
  rejectReservationAction, 
  cancelReservationAction, 
  completeReservationAction, 
  markNoShowAction,
  assignReservationTableAction,
  removeReservationTableAction
} from '@/app/admin/reservations/actions';
import { Calendar, Users, Clock, Search, Table, RefreshCw, X, Check, Eye } from 'lucide-react';

type DiningTable = {
  id: string;
  table_number: number;
  capacity: number;
  section: string;
  is_active: boolean;
};

type Reservation = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  reservation_start_at: string;
  reservation_end_at: string;
  timezone: string;
  guests_count: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
  rejection_reason: string | null;
  cancellation_reason: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  token: string;
  table_id: string | null;
  created_at: string;
  dining_tables?: {
    table_number: number;
    capacity: number;
    section: string;
  } | null;
};

type Metrics = {
  pendingCount: number;
  confirmedToday: number;
  upcomingCount: number;
  cancelledCount: number;
};

type Props = {
  initialReservations: Reservation[];
  tables: DiningTable[];
  metrics: Metrics;
  filters: {
    status: string;
    date: string;
    query: string;
  };
};

export default function ReservationsDashboard({ initialReservations, tables, metrics, filters }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-reservations-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const t = useTranslations('adminReservations');
  const [isPending, startTransition] = useTransition();


  // Filter local states
  const [search, setSearch] = useState(filters.query);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [dateFilter, setDateFilter] = useState(filters.date);

  // Dialog / Action States
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [actionType, setActionType] = useState<'reject' | 'cancel' | 'assign' | 'details' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger filters
  const applyFilters = (status = statusFilter, date = dateFilter, query = search) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (date) params.set('date', date);
    if (query) params.set('query', query);
    router.push(`/admin/reservations?${params.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
    router.push('/admin/reservations');
  };

  // Mutators
  const handleConfirm = async (id: string, defaultTableId?: string | null) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await confirmReservationAction(id, defaultTableId);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleComplete = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await completeReservationAction(id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleMarkNoShow = async (id: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await markNoShowAction(id);
      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const handleOpenActionModal = (res: Reservation, type: 'reject' | 'cancel' | 'assign' | 'details') => {
    setSelectedRes(res);
    setActionType(type);
    setActionReason('');
    setSelectedTableId(res.table_id || '');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedRes(null);
    setActionType(null);
    setActionReason('');
    setSelectedTableId('');
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes || !actionType) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      let res: { success: boolean; error?: string } = { success: false };

      if (actionType === 'reject') {
        res = await rejectReservationAction(selectedRes.id, actionReason);
      } else if (actionType === 'cancel') {
        res = await cancelReservationAction(selectedRes.id, actionReason);
      } else if (actionType === 'assign') {
        if (!selectedTableId) {
          res = await removeReservationTableAction(selectedRes.id);
        } else {
          res = await assignReservationTableAction(selectedRes.id, selectedTableId);
        }
      }

      if (res.success) {
        setSuccessMessage(t('successUpdate'));
        handleCloseModal();
        router.refresh();
      } else {
        setErrorMessage(res.error || t('errorUpdate'));
      }
    });
  };

  const getStatusPillType = (status: string): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'pending': return 'pending';
      case 'confirmed': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'warning';
      case 'completed': return 'info';
      case 'no_show': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and track guest table reservations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => router.refresh()}
            className="border border-border bg-background text-muted-foreground hover:text-foreground text-xs p-2.5 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-400 text-center leading-relaxed">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 text-xs bg-green-500/10 border border-green-500/30 rounded text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 text-center leading-relaxed">
          {successMessage}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard hoverable={false} className="border-yellow-500/25 bg-yellow-500/5 [.admin-theme_&]:border-yellow-300/60 [.admin-theme_&]:bg-yellow-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('pendingCount')}
          </p>
          <p className="text-3xl font-bold text-yellow-600 [.admin-theme_&]:text-yellow-800 dark:text-yellow-400 font-serif">{metrics.pendingCount}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-green-500/25 bg-green-500/5 [.admin-theme_&]:border-green-300/60 [.admin-theme_&]:bg-green-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('confirmedToday')}
          </p>
          <p className="text-3xl font-bold text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 font-serif">{metrics.confirmedToday}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-primary/25 bg-primary/5 [.admin-theme_&]:border-primary/30/60 [.admin-theme_&]:bg-primary/5/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('upcomingCount')}
          </p>
          <p className="text-3xl font-bold text-primary font-serif">{metrics.upcomingCount}</p>
        </PremiumCard>

        <PremiumCard hoverable={false} className="border-orange-500/25 bg-orange-500/5 [.admin-theme_&]:border-orange-300/60 [.admin-theme_&]:bg-orange-50/50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            {t('cancelledCount')}
          </p>
          <p className="text-3xl font-bold text-orange-600 [.admin-theme_&]:text-orange-800 dark:text-orange-400 font-serif">{metrics.cancelledCount}</p>
        </PremiumCard>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card border border-border rounded-lg items-end lg:items-center">
        
        {/* Search */}
        <div className="w-full lg:w-72 relative space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">Search Request</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-background border border-border rounded pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status */}
        <div className="w-full lg:w-48 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">{t('filterStatus')}</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              applyFilters(e.target.value, dateFilter, search);
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
            <option value="no_show">No-show</option>
          </select>
        </div>

        {/* Date */}
        <div className="w-full lg:w-48 space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold block">{t('filterDate')}</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              applyFilters(statusFilter, e.target.value, search);
            }}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full lg:w-auto pt-2 lg:pt-0 justify-end lg:ml-auto">
          <Button
            onClick={() => applyFilters(statusFilter, dateFilter, search)}
            className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 border border-primary/20"
          >
            Filter
          </Button>
          <Button
            onClick={handleResetFilters}
            className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider px-4 py-2"
          >
            Reset
          </Button>
        </div>

      </div>

      {/* Grid / Table Container */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                <th className="p-4">Customer</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4 text-center">Guests</th>
                <th className="p-4">Assigned Table</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground/60 italic">
                    No reservations found matching active filters.
                  </td>
                </tr>
              ) : (
                initialReservations.map((res) => {
                  const startDate = new Date(res.reservation_start_at);
                  const timeStr = mounted 
                    ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                    : '--:--';
                  const dateStr = mounted 
                    ? startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) 
                    : '--- --, ----';

                  return (
                    <tr key={res.id} className="hover:bg-muted/50 transition-colors">
                      {/* Customer Info */}
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-foreground text-sm">{res.customer_name}</div>
                        <div className="text-muted-foreground/60">{res.customer_phone}</div>
                        {res.customer_email && (
                          <div className="text-muted-foreground/45 text-[10px] truncate max-w-[200px]">
                            {res.customer_email}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="p-4 space-y-0.5">
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {dateStr}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground/75 text-[10px]">
                          <Clock className="w-3.5 h-3.5 text-primary/70" />
                          {timeStr}
                        </div>
                      </td>

                      {/* Guests */}
                      <td className="p-4 text-center text-sm font-semibold text-foreground">
                        {res.guests_count}
                      </td>

                      {/* Table Assignment */}
                      <td className="p-4">
                        {res.dining_tables ? (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Table className="w-3.5 h-3.5" />
                            <span className="font-medium text-xs">
                              Table {res.dining_tables.table_number} ({res.dining_tables.section})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 italic">Not Assigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusPill 
                          status={getStatusPillType(res.status)} 
                          label={t(`status.${res.status}` as any)} 
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5 space-y-1">
                        
                        {/* View details */}
                        <Button
                          onClick={() => handleOpenActionModal(res, 'details')}
                          className="border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] py-1 px-2 font-medium"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 inline" />
                          Details
                        </Button>

                        {/* Pending transitions: Confirm, Reject */}
                        {res.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => {
                                // Recommend dining table with capacity
                                const matchingTable = tables.find(t => t.is_active && t.capacity >= res.guests_count);
                                handleConfirm(res.id, matchingTable?.id || null);
                              }}
                              disabled={isPending}
                              className="bg-green-500 hover:bg-green-600 text-white text-[10px] py-1 px-2.5 font-semibold"
                            >
                              <Check className="w-3 h-3 mr-1 inline" />
                              {t('confirmButton')}
                            </Button>

                            <Button
                              onClick={() => handleOpenActionModal(res, 'reject')}
                              disabled={isPending}
                              className="bg-red-500 hover:bg-red-600 text-white text-[10px] py-1 px-2.5 font-semibold"
                            >
                              <X className="w-3 h-3 mr-1 inline" />
                              {t('rejectButton')}
                            </Button>
                          </>
                        )}

                        {/* Confirmed transitions: Complete, Cancel, No-Show */}
                        {res.status === 'confirmed' && (
                          <>
                            <Button
                              onClick={() => handleComplete(res.id)}
                              disabled={isPending}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] py-1 px-2.5 font-semibold"
                            >
                              Complete
                            </Button>

                            <Button
                              onClick={() => handleOpenActionModal(res, 'cancel')}
                              disabled={isPending}
                              className="border border-orange-500/30 text-orange-600 [.admin-theme_&]:text-orange-700 dark:text-orange-400 bg-transparent hover:bg-orange-500/10 text-[10px] py-1 px-2.5 font-semibold"
                            >
                              Cancel
                            </Button>

                            <Button
                              onClick={() => handleMarkNoShow(res.id)}
                              disabled={isPending}
                              className="border border-red-500/30 text-red-600 [.admin-theme_&]:text-red-700 dark:text-red-400 bg-transparent hover:bg-red-500/10 text-[10px] py-1 px-2.5 font-semibold"
                            >
                              No-Show
                            </Button>
                          </>
                        )}

                        {/* Table manual allocation (for pending or confirmed) */}
                        {(res.status === 'pending' || res.status === 'confirmed') && (
                          <Button
                            onClick={() => handleOpenActionModal(res, 'assign')}
                            className="border border-primary/30 bg-transparent hover:bg-primary/5 text-primary text-[10px] py-1 px-2 font-medium"
                          >
                            <Table className="w-3 h-3 mr-1 inline" />
                            {res.table_id ? 'Reassign' : t('assignTable')}
                          </Button>
                        )}

                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action / Detail Modal */}
      {actionType && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden shadow-2xl animate-scale-up text-foreground">
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/50">
              <h3 className="text-sm uppercase tracking-wider text-primary font-bold font-serif">
                {actionType === 'details' && 'Reservation Details'}
                {actionType === 'reject' && t('rejectDialogTitle')}
                {actionType === 'cancel' && t('cancelDialogTitle')}
                {actionType === 'assign' && t('assignTable')}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              
              {/* DETAILS MODE */}
              {actionType === 'details' && (
                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Customer</span>
                      <strong className="text-foreground text-sm block">{selectedRes.customer_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Status</span>
                      <StatusPill status={getStatusPillType(selectedRes.status)} label={t(`status.${selectedRes.status}` as any)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Phone</span>
                      <span className="text-foreground block">{selectedRes.customer_phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Email</span>
                      <span className="text-foreground block break-all">{selectedRes.customer_email || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Date & Time</span>
                      <span className="text-foreground block font-medium">
                        {mounted 
                          ? new Date(selectedRes.reservation_start_at).toLocaleDateString([], { dateStyle: 'medium' }) 
                          : '--- --, ----'
                        }
                      </span>
                      <span className="text-muted-foreground block text-[10px]">
                        {mounted 
                          ? new Date(selectedRes.reservation_start_at).toLocaleTimeString([], { timeStyle: 'short' }) 
                          : '--:--'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Guests Count</span>
                      <span className="text-foreground font-semibold text-sm block">{selectedRes.guests_count}</span>
                    </div>
                  </div>

                  {selectedRes.dining_tables && (
                    <div className="pb-3 border-b border-border">
                      <span className="text-[10px] uppercase text-muted-foreground/60 block">Assigned Table</span>
                      <span className="text-primary font-medium">
                        Table {selectedRes.dining_tables.table_number} ({selectedRes.dining_tables.section}, Cap: {selectedRes.dining_tables.capacity})
                      </span>
                    </div>
                  )}

                  {selectedRes.customer_notes && (
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block mb-1">Customer Notes</span>
                      <p className="p-2.5 bg-background border border-border rounded italic font-light text-muted-foreground/90 leading-relaxed">
                        {selectedRes.customer_notes}
                      </p>
                    </div>
                  )}

                  {selectedRes.admin_notes && (
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground/60 block mb-1">Admin Metadata</span>
                      <p className="p-2.5 bg-background border border-border rounded font-mono text-[10px] text-muted-foreground select-all leading-tight">
                        {selectedRes.admin_notes}
                      </p>
                    </div>
                  )}

                  {selectedRes.rejection_reason && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-400 text-xs">
                      <span className="font-semibold block mb-0.5">Rejection Reason:</span>
                      &quot;{selectedRes.rejection_reason}&quot;
                    </div>
                  )}

                  {selectedRes.cancellation_reason && (
                    <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded text-orange-600 [.admin-theme_&]:text-orange-800 dark:text-orange-400 text-xs">
                      <span className="font-semibold block mb-0.5">Cancellation Reason:</span>
                      &quot;{selectedRes.cancellation_reason}&quot;
                    </div>
                  )}

                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button 
                      type="button" 
                      onClick={handleCloseModal}
                      className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider py-2 border border-primary/20"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* REJECT MODE */}
              {actionType === 'reject' && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground leading-relaxed text-left">
                    Rejecting table request for <strong className="text-foreground">{selectedRes.customer_name}</strong> ({selectedRes.guests_count} guests) on {mounted ? new Date(selectedRes.reservation_start_at).toLocaleDateString() : '---'}.
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="reject_reason" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('reasonLabel')}
                    </label>
                    <textarea
                      id="reject_reason"
                      required
                      rows={3}
                      placeholder="e.g. Fully booked for this time slot. Please contact us for alternative slots."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button 
                      type="button" 
                      onClick={handleCloseModal}
                      className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider py-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider py-2"
                    >
                      {isPending ? <GoldSpinner size="sm" /> : t('confirmAction')}
                    </Button>
                  </div>
                </div>
              )}

              {/* CANCEL MODE */}
              {actionType === 'cancel' && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground leading-relaxed text-left">
                    Cancelling reservation for <strong className="text-foreground">{selectedRes.customer_name}</strong> ({selectedRes.guests_count} guests) on {mounted ? new Date(selectedRes.reservation_start_at).toLocaleDateString() : '---'}.
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="cancel_reason" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('reasonLabel')}
                    </label>
                    <textarea
                      id="cancel_reason"
                      required
                      rows={3}
                      placeholder="e.g. Cancelled per customer request."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button 
                      type="button" 
                      onClick={handleCloseModal}
                      className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider py-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-2"
                    >
                      {isPending ? <GoldSpinner size="sm" /> : t('confirmAction')}
                    </Button>
                  </div>
                </div>
              )}

              {/* TABLE ASSIGNMENT MODE */}
              {actionType === 'assign' && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground leading-relaxed text-left">
                    Assign a table manually for <strong className="text-foreground">{selectedRes.customer_name}</strong> ({selectedRes.guests_count} guests). Only active tables with sufficient capacity are listed below.
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="dining_table_select" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('tableLabel')}
                    </label>
                    <select
                      id="dining_table_select"
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2.5 py-2.5 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{t('selectPlaceholder')}</option>
                      {tables
                        .filter(tab => tab.is_active && tab.capacity >= selectedRes.guests_count)
                        .map(tab => (
                          <option key={tab.id} value={tab.id}>
                            Table {tab.table_number} ({tab.section}, Cap: {tab.capacity})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button 
                      type="button" 
                      onClick={handleCloseModal}
                      className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider py-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider py-2 border border-primary/20"
                    >
                      {isPending ? <GoldSpinner size="sm" /> : 'Save Table'}
                    </Button>
                  </div>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
