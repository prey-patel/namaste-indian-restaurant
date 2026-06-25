'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import StatusPill from '@/components/ui/status-pill';
import GoldSpinner from '@/components/ui/gold-spinner';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  Download,
  ChevronRight,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  ShoppingBag,
  Star,
  TrendingUp,
  BarChart2,
  Award,
  RefreshCw,
  Inbox,
  Filter,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_type: 'delivery' | 'takeaway';
  status: string;
  delivery_address: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_apartment: string | null;
  total_amount: number;
  items_subtotal: number;
  packaging_total: number;
  delivery_fee: number;
  payment_status: string;
  payment_method: string;
  customer_notes: string | null;
  created_at: string;
  completed_at: string | null;
};

type CrmStats = {
  totalOrders: number;
  ltv: number;
  aov: number;
};

type PastOrder = {
  id: string;
  created_at: string;
  order_type: 'delivery' | 'takeaway';
  total_amount: number;
  status: string;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
};

type FavoriteDish = {
  nameEn: string;
  namePl: string;
  count: number;
};

type Filters = {
  query: string;
  status: string;
  type: string;
  payment_status: string;
  date: string;
  selected_email: string;
};

type Props = {
  initialOrders: Order[];
  filters: Filters;
  // CRM data — only present when selected_email is set
  selectedCustomer: {
    name: string;
    email: string;
    phone: string;
  } | null;
  crmStats: CrmStats | null;
  pastOrders: PastOrder[];
  favoriteDishes: FavoriteDish[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Warsaw',
  });

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  });

const getStatusPillType = (
  status: string
): 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
  switch (status) {
    case 'pending': return 'pending';
    case 'approved': case 'confirmed': return 'success';
    case 'preparing': return 'info';
    case 'ready_for_pickup': return 'success';
    case 'out_for_delivery': return 'info';
    case 'completed': return 'success';
    case 'rejected': return 'error';
    case 'cancelled': return 'warning';
    default: return 'neutral';
  }
};

const getLoyaltyTier = (orderCount: number) => {
  if (orderCount >= 50)
    return {
      emoji: '🥇',
      label: 'VIP / Gold',
      badgeClass:
        'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider',
    };
  if (orderCount >= 20)
    return {
      emoji: '🥈',
      label: 'Silver',
      badgeClass:
        'border-slate-300 bg-slate-300/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider',
    };
  if (orderCount >= 5)
    return {
      emoji: '🥉',
      label: 'Bronze',
      badgeClass:
        'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-600 font-bold uppercase tracking-wider',
    };
  return {
    emoji: '⭐',
    label: 'Regular',
    badgeClass:
      'border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider',
  };
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready_for_pickup', label: 'Ready / Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'takeaway', label: 'Takeaway' },
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Unpaid' },
];

const DATE_OPTIONS = [
  { value: '', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'custom', label: 'Custom Date…' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderSummaryDashboard({
  initialOrders,
  filters,
  selectedCustomer,
  crmStats,
  pastOrders,
  favoriteDishes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local search input state (debounced push to URL)
  const [localQuery, setLocalQuery] = useState(filters.query);
  const [localDate, setLocalDate] = useState(filters.date);

  // Past-order detail drawer
  const [activePastOrderId, setActivePastOrderId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState<any | null>(null);
  const [drawerItems, setDrawerItems] = useState<any[]>([]);

  // ── URL helpers ──────────────────────────────────────────────────────────

  const buildUrl = useCallback(
    (overrides: Partial<Filters>) => {
      const next: Filters = { ...filters, ...overrides };
      const params = new URLSearchParams();
      if (next.query) params.set('query', next.query);
      if (next.status && next.status !== 'all') params.set('status', next.status);
      if (next.type && next.type !== 'all') params.set('type', next.type);
      if (next.payment_status && next.payment_status !== 'all')
        params.set('payment_status', next.payment_status);
      if (next.date) params.set('date', next.date);
      if (next.selected_email) params.set('selected_email', next.selected_email);
      const qs = params.toString();
      return `${pathname}${qs ? `?${qs}` : ''}`;
    },
    [filters, pathname]
  );

  const push = (overrides: Partial<Filters>) => {
    startTransition(() => router.push(buildUrl(overrides)));
  };

  // ── Search ───────────────────────────────────────────────────────────────

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    push({ query: localQuery, selected_email: '' });
  };

  const clearSearch = () => {
    setLocalQuery('');
    push({ query: '', selected_email: '' });
  };

  // ── Select customer ──────────────────────────────────────────────────────

  const selectCustomer = (email: string) => {
    push({ selected_email: email });
  };

  const clearCustomer = () => {
    push({ selected_email: '' });
  };

  // ── Drawer ───────────────────────────────────────────────────────────────

  const openDrawer = async (orderId: string) => {
    setActivePastOrderId(orderId);
    setDrawerLoading(true);
    setDrawerOrder(null);
    setDrawerItems([]);
    try {
      const supabase = createClient();
      const [{ data: orderData }, { data: itemsData }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId),
      ]);
      setDrawerOrder(orderData ?? null);
      setDrawerItems(itemsData ?? []);
    } catch (err) {
      console.error('Failed to load past order detail:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setActivePastOrderId(null);
    setDrawerOrder(null);
    setDrawerItems([]);
  };

  // ── CSV Export ───────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!pastOrders || pastOrders.length === 0) return;
    const headers = [
      'Order ID',
      'Date & Time (Europe/Warsaw)',
      'Order Type',
      'Total Amount (PLN)',
      'Delivery Fee (PLN)',
      'Payment Method',
      'Payment Status',
      'Status',
    ];
    const rows = pastOrders.map((o) => [
      `#${o.id.substring(0, 8).toUpperCase()}`,
      formatDateTime(o.created_at),
      o.order_type === 'delivery' ? 'Delivery' : 'Takeaway',
      Number(o.total_amount).toFixed(2),
      Number(o.delivery_fee).toFixed(2),
      (o.payment_method || 'N/A').replace(/_/g, ' ').toUpperCase(),
      (o.payment_status || 'PENDING').toUpperCase(),
      (o.status || '').toUpperCase(),
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map((r) => r.map(escape).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_history_${(selectedCustomer?.name ?? 'customer')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.style.visibility = 'hidden';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const loyalty = crmStats ? getLoyaltyTier(crmStats.totalOrders) : null;
  const hasCrm = !!selectedCustomer && !!crmStats;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ── Page Header ── */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-black text-primary tracking-wide leading-tight">
              Order Summary
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Smart search, advanced filters &amp; customer CRM intelligence
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <span className="px-2 py-1 rounded bg-muted border border-border">
              {initialOrders.length} order{initialOrders.length !== 1 ? 's' : ''} found
            </span>
            {isPending && (
              <span className="flex items-center gap-1.5 text-primary animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Filtering…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
          {/* Smart Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Name, phone, email, address, postal code or order ID…"
              className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition"
            />
            {localQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => push({ status: e.target.value, selected_email: '' })}
            className="px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={filters.type}
            onChange={(e) => push({ type: e.target.value, selected_email: '' })}
            className="px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={filters.payment_status}
            onChange={(e) => push({ payment_status: e.target.value, selected_email: '' })}
            className="px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date Preset */}
          <select
            value={filters.date === '' ? '' : (DATE_OPTIONS.find(o => o.value === filters.date) ? filters.date : 'custom')}
            onChange={(e) => {
              const v = e.target.value;
              if (v !== 'custom') {
                setLocalDate('');
                push({ date: v, selected_email: '' });
              } else {
                setLocalDate('custom');
              }
            }}
            className="px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Custom date picker */}
          {(localDate === 'custom' || (filters.date && !['today', 'yesterday', 'this_week', ''].includes(filters.date))) && (
            <input
              type="date"
              defaultValue={!['today', 'yesterday', 'this_week', ''].includes(filters.date) ? filters.date : ''}
              onChange={(e) => push({ date: e.target.value, selected_email: '' })}
              className="px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="px-4 py-2 h-auto text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search className="w-3 h-3 mr-1.5" /> Search
          </Button>

          {/* Clear all */}
          {(filters.query || filters.status !== 'all' || filters.type !== 'all' || filters.payment_status !== 'all' || filters.date || filters.selected_email) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLocalQuery('');
                setLocalDate('');
                startTransition(() => router.push(pathname));
              }}
              className="px-3 py-2 h-auto text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              <X className="w-3 h-3 mr-1" /> Clear all
            </Button>
          )}
        </form>
      </div>

      {/* ── Main Content ── */}
      <div className={`flex h-[calc(100vh-160px)] overflow-hidden ${hasCrm ? 'flex-row' : ''}`}>

        {/* ── Left Panel: Orders Table ── */}
        <div className={`flex flex-col overflow-hidden border-r border-border ${hasCrm ? 'w-[52%] shrink-0' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto">
            {initialOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <Inbox className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No orders match your filters.</p>
                <p className="text-xs opacity-60">Try adjusting the search or date range.</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/70 border-b border-border backdrop-blur-sm">
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px]">Order ID</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px]">Customer</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px] hidden md:table-cell">Date</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px] hidden lg:table-cell">Type</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px]">Status</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px] hidden md:table-cell">Payment</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground/70 text-[10px]">Total</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {initialOrders.map((order) => {
                    const isSelected = filters.selected_email === order.customer_email;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => selectCustomer(order.customer_email)}
                        className={`group cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-primary/8 border-l-4 border-l-primary'
                            : 'hover:bg-muted/40 border-l-4 border-l-transparent'
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-mono font-bold text-foreground/90 text-[11px]">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block leading-tight">{order.customer_name}</span>
                            <span className="text-muted-foreground/60 text-[10px] block font-mono">{order.customer_email}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            order.order_type === 'delivery'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-green-500/10 text-green-600'
                          }`}>
                            {order.order_type}
                          </span>
                        </td>
                        <td className="p-3">
                          <StatusPill
                            status={getStatusPillType(order.status)}
                            label={order.status === 'approved' ? 'Confirmed' : order.status.replace(/_/g, ' ')}
                          />
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                          }`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono font-bold text-primary">
                            {Number(order.total_amount).toFixed(2)} PLN
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <ChevronRight className={`w-3.5 h-3.5 transition-all ${
                            isSelected ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground'
                          }`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right Panel: Customer CRM ── */}
        {hasCrm && selectedCustomer && crmStats && (
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            {/* CRM Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-serif font-bold text-primary leading-tight">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-[10px] text-muted-foreground/70 font-mono">{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {loyalty && (
                  <span className={`text-[10px] px-2.5 py-1 rounded border ${loyalty.badgeClass}`}>
                    {loyalty.emoji} {loyalty.label}
                  </span>
                )}
                <button
                  onClick={clearCustomer}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  title="Close CRM panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Contact info */}
              <div className="px-6 pt-5 pb-4 border-b border-border/50 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground/70 truncate font-mono">{selectedCustomer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground/70 font-mono">{selectedCustomer.phone || '—'}</span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-border/50">
                {/* Total orders */}
                <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Total Orders</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground font-mono block">{crmStats.totalOrders}</span>
                  <span className="text-[9px] text-muted-foreground/50">completed</span>
                </div>

                {/* LTV */}
                <div className="p-3.5 rounded-lg bg-background border border-primary/20 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Lifetime Value</span>
                  </div>
                  <span className="text-2xl font-bold text-primary font-mono block">{crmStats.ltv.toFixed(2)}</span>
                  <span className="text-[9px] text-muted-foreground/50">PLN total spent</span>
                </div>

                {/* AOV */}
                <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Avg. Order</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground font-mono block">{crmStats.aov.toFixed(2)}</span>
                  <span className="text-[9px] text-muted-foreground/50">PLN avg ticket</span>
                </div>
              </div>

              {/* Favorite dishes */}
              {favoriteDishes.length > 0 && (
                <div className="px-6 py-4 border-b border-border/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                      Favourite Dishes
                    </span>
                  </div>
                  <div className="space-y-2">
                    {favoriteDishes.map((dish, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center px-3 py-2.5 bg-background border border-border rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground/40">#{i + 1}</span>
                          <div>
                            <span className="font-semibold text-foreground/90">{dish.nameEn}</span>
                            {dish.namePl && dish.namePl !== dish.nameEn && (
                              <span className="text-muted-foreground/50 text-[10px] ml-1">({dish.namePl})</span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-primary font-bold text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/10 whitespace-nowrap">
                          {dish.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Orders table */}
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                      Order History ({pastOrders.length})
                    </span>
                  </div>
                  {pastOrders.length > 0 && (
                    <Button
                      type="button"
                      onClick={handleExportCSV}
                      variant="ghost"
                      className="text-[10px] h-auto px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {pastOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No completed orders found for this customer.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="p-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">ID</th>
                          <th className="p-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Date</th>
                          <th className="p-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Type</th>
                          <th className="p-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Status</th>
                          <th className="p-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Total</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {pastOrders.map((o) => (
                          <tr
                            key={o.id}
                            onClick={() => openDrawer(o.id)}
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <td className="p-2.5 font-mono font-bold text-foreground/80">
                              #{o.id.substring(0, 8).toUpperCase()}
                            </td>
                            <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                              {formatDate(o.created_at)}
                            </td>
                            <td className="p-2.5 capitalize text-muted-foreground">{o.order_type}</td>
                            <td className="p-2.5">
                              <StatusPill
                                status={getStatusPillType(o.status)}
                                label={o.status === 'approved' ? 'Confirmed' : o.status.replace(/_/g, ' ')}
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-primary whitespace-nowrap">
                              {Number(o.total_amount).toFixed(2)} PLN
                            </td>
                            <td className="p-2.5 text-right">
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 inline" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Placeholder when no customer is selected */}
        {!hasCrm && initialOrders.length > 0 && (
          <div className="hidden" />
        )}
      </div>

      {/* ── Side Drawer ── */}
      <AnimatePresence>
        {activePastOrderId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black backdrop-blur-sm z-40 cursor-pointer"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col font-sans"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/20 shrink-0">
                <div>
                  <h3 className="text-lg font-serif font-bold text-primary">Order Details</h3>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 select-all">
                    #{activePastOrderId.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 select-text">
                {drawerLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <GoldSpinner />
                  </div>
                ) : drawerOrder ? (
                  <>
                    {/* Status + Type row */}
                    <div className="flex justify-between items-center bg-background border border-border rounded-lg p-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Status</span>
                        <div className="mt-1">
                          <StatusPill
                            status={getStatusPillType(drawerOrder.status)}
                            label={drawerOrder.status === 'approved' ? 'Confirmed' : drawerOrder.status.replace(/_/g, ' ')}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Type</span>
                        <span className="text-sm font-semibold capitalize text-foreground mt-1 block">{drawerOrder.order_type}</span>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2 bg-background border border-border rounded-lg p-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Date</span>
                        <span className="font-medium text-foreground">{formatDateTime(drawerOrder.created_at)}</span>
                      </div>
                      {drawerOrder.approved_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confirmed</span>
                          <span className="font-medium text-foreground">{formatDateTime(drawerOrder.approved_at)}</span>
                        </div>
                      )}
                      {drawerOrder.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium text-foreground">{formatDateTime(drawerOrder.completed_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-bold">Items Ordered</span>
                      <div className="divide-y divide-border/50">
                        {drawerItems.map((item: any) => (
                          <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between text-xs">
                            <div className="space-y-0.5 pr-2">
                              <span className="font-semibold text-foreground">{item.item_name_en}</span>
                              {item.item_name_pl && item.item_name_pl !== item.item_name_en && (
                                <span className="text-[10px] text-muted-foreground/50 block">{item.item_name_pl}</span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground/60 block">
                                {item.quantity} × {Number(item.unit_price).toFixed(2)} PLN
                              </span>
                              {item.spice_level_snapshot != null && (
                                <span className="text-[10px] text-amber-500 font-semibold block">
                                  Spice level: {item.spice_level_snapshot}/5
                                </span>
                              )}
                              {item.customer_notes && (
                                <span className="text-[10px] text-primary/70 italic block">* {item.customer_notes}</span>
                              )}
                            </div>
                            <span className="font-mono text-foreground font-semibold whitespace-nowrap">
                              {Number(item.line_total).toFixed(2)} PLN
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery info */}
                    {drawerOrder.order_type === 'delivery' && drawerOrder.delivery_address && (
                      <div className="p-4 bg-background border border-border rounded-lg space-y-2 text-xs">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-bold">Delivery Location</span>
                        <div className="flex gap-2.5 items-start">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="font-medium text-foreground leading-relaxed">
                            {drawerOrder.delivery_address}
                            {drawerOrder.delivery_apartment && `, ${drawerOrder.delivery_apartment}`}
                            {drawerOrder.delivery_postal_code && `, ${drawerOrder.delivery_postal_code}`}
                            {drawerOrder.delivery_city && ` ${drawerOrder.delivery_city}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Customer notes */}
                    {drawerOrder.customer_notes && (
                      <div className="p-4 bg-background border border-border rounded-lg text-xs space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-bold">Customer Notes</span>
                        <p className="italic text-foreground/80 leading-relaxed">&ldquo;{drawerOrder.customer_notes}&rdquo;</p>
                      </div>
                    )}

                    {/* Payment */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Payment Method</span>
                        <span className="font-semibold capitalize text-foreground">
                          {(drawerOrder.payment_method || 'N/A').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="p-3.5 bg-background border border-border rounded-lg text-xs space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block">Payment Status</span>
                        <span className={`font-bold uppercase tracking-wider text-xs ${
                          drawerOrder.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                          {drawerOrder.payment_status || 'pending'}
                        </span>
                      </div>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="p-4 bg-background border border-border rounded-lg text-xs space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Items Subtotal</span>
                        <span className="font-mono">{Number(drawerOrder.items_subtotal).toFixed(2)} PLN</span>
                      </div>
                      {Number(drawerOrder.packaging_total) > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Packaging Fee</span>
                          <span className="font-mono">{Number(drawerOrder.packaging_total).toFixed(2)} PLN</span>
                        </div>
                      )}
                      {drawerOrder.order_type === 'delivery' && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery Fee</span>
                          <span className="font-mono">{Number(drawerOrder.delivery_fee).toFixed(2)} PLN</span>
                        </div>
                      )}
                      <div className="flex justify-between text-foreground font-bold text-sm pt-2.5 border-t border-border/60">
                        <span>Total Amount</span>
                        <span className="text-primary font-mono text-base">{Number(drawerOrder.total_amount).toFixed(2)} PLN</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8 text-xs">
                    Failed to load order details.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
