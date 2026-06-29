'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import StatusPill from '@/components/ui/status-pill';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';

import {
  updateInquiryStatusAction,
  replyToInquiryAction
} from '@/app/admin/inquiries/actions';
import {
  Mail, MailOpen, Inbox, Search, RefreshCw, X, Check, Eye, Archive, Send,
  Clock, Globe, Phone, User, AlertCircle
} from 'lucide-react';

type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  source_language: string;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
};

type Metrics = {
  newCount: number;
  repliedCount: number;
  archivedCount: number;
  totalCount: number;
};

type Props = {
  initialInquiries: ContactInquiry[];
  metrics: Metrics;
  filters: {
    status: string;
    query: string;
  };
};

export default function InquiriesDashboard({ initialInquiries, metrics, filters }: Props) {
  const router = useRouter();
  const t = useTranslations('adminInquiries');
  const [isPending, startTransition] = useTransition();

  const [inquiries, setInquiries] = useState<ContactInquiry[]>(initialInquiries);
  const latestInquiryUpdates = useRef<Record<string, { inquiry: ContactInquiry; updated_at: string }>>({});

  useEffect(() => {
    setInquiries(initialInquiries);
  }, [initialInquiries]);

  // Realtime subscription for contact inquiries
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-contact-inquiries-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_inquiries' },
        (payload) => {
          console.log('[Realtime] Contact inquiry event:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedInq = payload.new as ContactInquiry;
            latestInquiryUpdates.current[updatedInq.id] = {
              inquiry: updatedInq,
              updated_at: updatedInq.updated_at
            };
            setInquiries(prev => prev.map(i => i.id === updatedInq.id ? { ...i, ...updatedInq } : i));
          } else if (payload.eventType === 'INSERT') {
            const newInq = payload.new as ContactInquiry;
            setInquiries(prev => [newInq, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            const deletedInq = payload.old as { id: string };
            setInquiries(prev => prev.filter(i => i.id !== deletedInq.id));
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Filter local states
  const [search, setSearch] = useState(filters.query);
  const [statusFilter, setStatusFilter] = useState(filters.status);

  // Dialog / Action States
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [actionType, setActionType] = useState<'reply' | 'details' | null>(null);
  const [replyText, setReplyText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter router updates
  const handleSearchChange = (val: string) => {
    setSearch(val);
    const params = new URLSearchParams(window.location.search);
    if (val) params.set('query', val);
    else params.delete('query');
    router.push(`/admin/inquiries?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    const params = new URLSearchParams(window.location.search);
    if (status && status !== 'all') params.set('status', status);
    else params.delete('status');
    router.push(`/admin/inquiries?${params.toString()}`);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  // Actions
  const handleOpenDetails = (inq: ContactInquiry) => {
    setSelectedInquiry(inq);
    setActionType('details');

    // Automatically mark as read if it's 'new'
    if (inq.status === 'new') {
      startTransition(async () => {
        const res = await updateInquiryStatusAction(inq.id, 'read');
        if (res.success) {
          // Update local status immediately for smooth transition
          setInquiries(prev =>
            prev.map(item => item.id === inq.id ? { ...item, status: 'read' as const } : item)
          );
        }
      });
    }
  };

  const handleOpenReply = (inq: ContactInquiry) => {
    setSelectedInquiry(inq);
    setReplyText('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setActionType('reply');
  };

  const handleArchive = (inq: ContactInquiry) => {
    startTransition(async () => {
      const res = await updateInquiryStatusAction(inq.id, 'archived');
      if (res.success) {
        setSuccessMessage(t('notifications.archivedSuccess'));
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || t('notifications.archiveFailed'));
        setTimeout(() => setErrorMessage(null), 5000);
      }
    });
  };

  const handleSendReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedInquiry) return;

    startTransition(async () => {
      setErrorMessage(null);
      const res = await replyToInquiryAction(selectedInquiry.id, replyText);
      if (res.success) {
        setSuccessMessage(t('notifications.replySentSuccess'));
        setActionType(null);
        setSelectedInquiry(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || t('notifications.replyFailed'));
      }
    });
  };

  const getInquiryStatusInfo = (status: string): { type: 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
    switch (status) {
      case 'new': return { type: 'warning', label: t('filters.new') };
      case 'read': return { type: 'info', label: t('filters.read') };
      case 'replied': return { type: 'success', label: t('filters.replied') };
      case 'archived': return { type: 'neutral', label: t('filters.archived') };
      default: return { type: 'neutral', label: status };
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 font-sans">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-serif font-black tracking-wide text-foreground">
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center p-2 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground transition-all duration-200"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ Alert Messages ═══ */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-sm animate-pulse-once">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs font-semibold shadow-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* ═══ Metrics Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('metrics.new')}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-amber-500">{metrics.newCount}</p>
          </div>
          <Mail className="w-8 h-8 text-amber-500/20" />
        </PremiumCard>

        <PremiumCard className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('metrics.replied')}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-500">{metrics.repliedCount}</p>
          </div>
          <Send className="w-8 h-8 text-emerald-500/20" />
        </PremiumCard>

        <PremiumCard className="p-4 flex items-center justify-between border-l-4 border-l-slate-400">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('metrics.archived')}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-500">{metrics.archivedCount}</p>
          </div>
          <Archive className="w-8 h-8 text-slate-500/20" />
        </PremiumCard>

        <PremiumCard className="p-4 flex items-center justify-between border-l-4 border-l-indigo-500">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('metrics.total')}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-indigo-500">{metrics.totalCount}</p>
          </div>
          <Inbox className="w-8 h-8 text-indigo-500/20" />
        </PremiumCard>
      </div>

      {/* ═══ Filters and Search ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['new', 'read', 'replied', 'archived', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => handleStatusFilter(st)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/10'
                  : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`filters.${st}`)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Data Table / Grid ═══ */}
      <PremiumCard className="overflow-hidden">
        {inquiries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/50">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-xs font-medium">{t('emptyState')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">{t('table.customer')}</th>
                  <th className="px-6 py-4">{t('table.subject')}</th>
                  <th className="px-6 py-4">{t('table.message')}</th>
                  <th className="px-6 py-4">{t('table.status')}</th>
                  <th className="px-6 py-4">{t('table.date')}</th>
                  <th className="px-6 py-4 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {inquiries.map((inq) => (
                  <tr
                    key={inq.id}
                    className={`hover:bg-muted/10 transition-colors ${
                      inq.status === 'new' ? 'font-semibold bg-primary/[0.02]' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{inq.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{inq.email}</div>
                      {inq.phone && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{inq.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate text-foreground" title={inq.subject}>
                        {inq.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[320px] truncate text-muted-foreground" title={inq.message}>
                        {inq.message}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const statusInfo = getInquiryStatusInfo(inq.status);
                        return <StatusPill status={statusInfo.type} label={statusInfo.label} />;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {formatDateTime(inq.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(inq)}
                          className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {inq.status !== 'replied' && inq.status !== 'archived' && (
                          <button
                            onClick={() => handleOpenReply(inq)}
                            className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                            title="Reply"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inq.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(inq)}
                            className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCard>

      {/* ═══ Details/Reply Modal ═══ */}
      {selectedInquiry && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-serif font-black uppercase tracking-wider text-sm text-foreground">
                {actionType === 'reply' ? t('modal.replyTitle') : t('modal.detailsTitle')}
              </h3>
              <button
                onClick={() => {
                  setSelectedInquiry(null);
                  setActionType(null);
                }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Inquiry Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 p-4 rounded-lg border border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>Customer</span>
                  </div>
                  <div className="font-bold text-foreground">{selectedInquiry.name}</div>
                  <div className="text-[10px] text-muted-foreground">{selectedInquiry.email}</div>
                  {selectedInquiry.phone && <div className="text-[10px] text-muted-foreground">{selectedInquiry.phone}</div>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Submitted On</span>
                  </div>
                  <div className="font-mono text-foreground">{formatDateTime(selectedInquiry.created_at)}</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <Globe className="w-3 h-3" />
                    <span>Language: {selectedInquiry.source_language.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Subject & Message */}
              <div className="space-y-1.5 border-t border-border pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Subject</h4>
                <div className="text-sm font-semibold text-foreground">{selectedInquiry.subject}</div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Message</h4>
                <div className="text-xs bg-muted/30 border border-border p-4 rounded-lg text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Already Replied Section */}
              {selectedInquiry.status === 'replied' && selectedInquiry.admin_reply && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-500">Sent Reply</h4>
                  <div className="text-xs bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-lg text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedInquiry.admin_reply}
                  </div>
                  {selectedInquiry.replied_at && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Replied on {formatDateTime(selectedInquiry.replied_at)}
                    </div>
                  )}
                </div>
              )}

              {/* Reply Form */}
              {actionType === 'reply' && (
                <form onSubmit={handleSendReplySubmit} className="space-y-4 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reply" className="block text-xs font-bold uppercase tracking-wide text-primary">
                      Write Reply Email
                    </label>
                    <textarea
                      id="reply"
                      rows={5}
                      required
                      placeholder="Type your response to the customer here. Brevo will send this message on submit."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isPending}
                      className="w-full p-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedInquiry(null);
                        setActionType(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !replyText.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Reply
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
