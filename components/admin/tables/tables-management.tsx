'use client';

import React, { useState, useEffect, useTransition } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';
import StatusPill from '@/components/ui/status-pill';
import { Plus, Trash2, Printer, RefreshCw, Layers, Users, ShieldAlert, X, Edit, Power, Check } from 'lucide-react';
import {
  createTableAction,
  updateTableAction,
  deleteTableAction,
  regenerateQrTokenAction,
  closeTableSessionAction
} from '@/app/admin/tables/actions';

type TableRecord = {
  id: string;
  table_number: number;
  capacity: number;
  section: string;
  is_active: boolean;
  notes: string | null;
  qr_token: string | null;
};

type SessionRecord = {
  id: string;
  table_id: string;
  customer_name: string | null;
  status: string;
  started_at: string;
};

type OrderSummaryRecord = {
  id: string;
  table_id: string;
  total_amount: number;
  status: string;
};

type Props = {
  initialTables: TableRecord[];
  initialSessions: SessionRecord[];
  initialOrders: OrderSummaryRecord[];
  siteUrl: string;
};

export default function TablesManagement({
  initialTables,
  initialSessions,
  initialOrders,
  siteUrl
}: Props) {
  const [tables, setTables] = useState<TableRecord[]>(initialTables);
  const [sessions, setSessions] = useState<SessionRecord[]>(initialSessions);
  const [orders, setOrders] = useState<OrderSummaryRecord[]>(initialOrders);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Dialog / Modal states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(null);

  // Form states
  const [tableNumber, setTableNumber] = useState(0);
  const [capacity, setCapacity] = useState(2);
  const [section, setSection] = useState('Main Room');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Print Mode State
  const [printTable, setPrintTable] = useState<TableRecord | null>(null);
  const [printAllMode, setPrintAllMode] = useState(false);

  // Generate QR codes on mount/updates
  useEffect(() => {
    const generateQRs = async () => {
      const codes: Record<string, string> = {};
      for (const t of tables) {
        if (t.qr_token) {
          const plUrl = `${siteUrl}/pl/table/${t.qr_token}`;
          try {
            const dataUrl = await QRCode.toDataURL(plUrl, {
              width: 300,
              margin: 2,
              color: {
                dark: '#070B1E',
                light: '#FFFFFF'
              }
            });
            codes[t.id] = dataUrl;
          } catch (err) {
            console.error('[QR] Failed to generate for table:', t.table_number, err);
          }
        }
      }
      setQrCodes(codes);
    };
    generateQRs();
  }, [tables, siteUrl]);

  // Sync state with props
  useEffect(() => {
    setTables(initialTables);
    setSessions(initialSessions);
    setOrders(initialOrders);
  }, [initialTables, initialSessions, initialOrders]);

  // Action wrappers
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tables.some(t => t.table_number === tableNumber)) {
      setError(`Table #${tableNumber} already exists.`);
      return;
    }

    startTransition(async () => {
      const res = await createTableAction(tableNumber, capacity, section, notes);
      if (res.success) {
        setAddDialogOpen(false);
        // Reset form
        setTableNumber(0);
        setCapacity(2);
        setSection('Main Room');
        setNotes('');
      } else {
        setError(res.error || 'Failed to create table');
      }
    });
  };

  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    setError(null);

    startTransition(async () => {
      const res = await updateTableAction(selectedTable.id, {
        table_number: tableNumber,
        capacity,
        section,
        notes: notes || null
      });
      if (res.success) {
        setEditDialogOpen(false);
        setSelectedTable(null);
      } else {
        setError(res.error || 'Failed to update table');
      }
    });
  };

  const handleToggleActive = async (table: TableRecord) => {
    startTransition(async () => {
      await updateTableAction(table.id, { is_active: !table.is_active });
    });
  };

  const handleRegenerateQR = async (table: TableRecord) => {
    if (!confirm(`Are you sure you want to regenerate QR token for Table #${table.table_number}? This will invalidate any existing printed QR cards.`)) {
      return;
    }
    startTransition(async () => {
      await regenerateQrTokenAction(table.id);
    });
  };

  const handleCloseSession = async (sessionId: string, tableNumber: number) => {
    if (!confirm(`Close active session for Table #${tableNumber}? This will mark all active orders for this session as completed and vacate the table.`)) {
      return;
    }
    startTransition(async () => {
      await closeTableSessionAction(sessionId);
    });
  };

  const handleDeleteTable = async (table: TableRecord) => {
    if (!confirm(`Are you sure you want to delete Table #${table.table_number}?`)) {
      return;
    }
    startTransition(async () => {
      await deleteTableAction(table.id);
    });
  };

  const openEditDialog = (table: TableRecord) => {
    setSelectedTable(table);
    setTableNumber(table.table_number);
    setCapacity(table.capacity);
    setSection(table.section);
    setNotes(table.notes || '');
    setEditDialogOpen(true);
  };

  // Printable layout view
  if (printTable) {
    return (
      <div className="bg-white text-[#070B1E] min-h-screen p-8 flex flex-col items-center justify-center space-y-8 animate-fade-in print:p-0">
        <div className="border-4 border-[#070B1E] p-8 max-w-sm w-full text-center space-y-6 rounded-xl flex flex-col items-center">
          <span className="text-3xl font-serif font-black tracking-widest text-[#070B1E] uppercase">
            NAMASTE
          </span>
          <span className="text-[10px] tracking-[0.2em] text-[#070B1E] font-bold uppercase -mt-4">
            Indian Restaurant
          </span>
          
          <div className="w-64 h-64 border-2 border-[#070B1E] p-2 flex items-center justify-center rounded-lg bg-white">
            {qrCodes[printTable.id] ? (
              <img src={qrCodes[printTable.id]} alt={`Table ${printTable.table_number} QR`} className="w-full h-full" />
            ) : (
              <div className="text-xs">Generating QR...</div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-sans">DINE-IN ORDERING</h3>
            <p className="text-xs text-gray-600 font-serif">Scan to browse menu & order directly from table</p>
          </div>
          
          <div className="border-t border-b border-[#070B1E] py-2.5 w-full">
            <span className="text-2xl font-serif font-black tracking-wider block">
              TABLE / STOLIK {printTable.table_number}
            </span>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest block mt-0.5">
              Section: {printTable.section}
            </span>
          </div>
        </div>

        <div className="flex gap-4 print:hidden">
          <Button
            onClick={() => window.print()}
            className="bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider py-2 px-6"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Card
          </Button>
          <Button
            onClick={() => setPrintTable(null)}
            className="bg-transparent border border-[#070B1E] text-[#070B1E] font-bold text-xs uppercase tracking-wider py-2 px-6 hover:bg-gray-100"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (printAllMode) {
    return (
      <div className="bg-white text-[#070B1E] min-h-screen p-8 animate-fade-in print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto print:grid-cols-2 print:gap-8">
          {tables.filter(t => t.is_active && t.qr_token).map((t) => (
            <div key={t.id} className="border-4 border-[#070B1E] p-6 text-center space-y-4 rounded-xl flex flex-col items-center justify-between page-break-inside-avoid">
              <div className="space-y-1 text-center">
                <span className="text-2xl font-serif font-black tracking-widest text-[#070B1E] uppercase block">
                  NAMASTE
                </span>
                <span className="text-[9px] tracking-[0.2em] text-[#070B1E] font-bold uppercase -mt-2 block">
                  Indian Restaurant
                </span>
              </div>
              
              <div className="w-56 h-56 border border-[#070B1E] p-1 flex items-center justify-center rounded bg-white my-2">
                {qrCodes[t.id] ? (
                  <img src={qrCodes[t.id]} alt={`Table ${t.table_number} QR`} className="w-full h-full" />
                ) : (
                  <div className="text-xs">Generating QR...</div>
                )}
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-bold font-sans">SCAN TO ORDER</h4>
                <p className="text-[9px] text-gray-500 font-serif">Zeskanuj, aby zamówić</p>
              </div>
              
              <div className="border-t border-[#070B1E] pt-2 w-full">
                <span className="text-xl font-serif font-black tracking-wider block">
                  TABLE / STOLIK {t.table_number}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center mt-12 print:hidden">
          <Button
            onClick={() => window.print()}
            className="bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider py-2 px-6"
          >
            <Printer className="w-4 h-4 mr-2" /> Print All
          </Button>
          <Button
            onClick={() => setPrintAllMode(false)}
            className="bg-transparent border border-[#070B1E] text-[#070B1E] font-bold text-xs uppercase tracking-wider py-2 px-6 hover:bg-gray-100"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard hoverable={false} className="border-primary/10 bg-[#050B1E]/60 p-5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Tables</span>
          <span className="text-2xl font-bold text-foreground font-mono">{tables.length}</span>
        </PremiumCard>
        <PremiumCard hoverable={false} className="border-primary/10 bg-[#050B1E]/60 p-5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Active Tables</span>
          <span className="text-2xl font-bold text-foreground font-mono">{tables.filter(t => t.is_active).length}</span>
        </PremiumCard>
        <PremiumCard hoverable={false} className="border-primary/10 bg-[#050B1E]/60 p-5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Occupied Sessions</span>
          <span className="text-2xl font-bold text-primary font-mono">{sessions.length}</span>
        </PremiumCard>
        <PremiumCard hoverable={false} className="border-primary/10 bg-[#050B1E]/60 p-5 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Active Dine-in Orders</span>
          <span className="text-2xl font-bold text-green-400 font-mono">{orders.length}</span>
        </PremiumCard>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => {
            setError(null);
            setTableNumber(tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) + 1 : 1);
            setCapacity(2);
            setSection('Main Room');
            setNotes('');
            setAddDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-wider py-2 px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Table
        </Button>
        {tables.filter(t => t.is_active).length > 0 && (
          <Button
            onClick={() => setPrintAllMode(true)}
            className="bg-[#070B1E] border border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider py-2 px-6"
          >
            <Printer className="w-4 h-4 mr-2" /> Print All QR Codes
          </Button>
        )}
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tables.map((t) => {
          const activeSession = sessions.find(s => s.table_id === t.id);
          const tableOrders = orders.filter(o => o.table_id === t.id);
          const ordersSubtotal = tableOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

          return (
            <PremiumCard key={t.id} hoverable={false} className={`bg-[#050B1E]/40 border-primary/10 flex flex-col p-5 justify-between space-y-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-serif font-black tracking-wider text-foreground">
                      Table #{t.table_number}
                    </h3>
                    <StatusPill status={t.is_active ? 'success' : 'neutral'} label={t.is_active ? 'Active' : 'Inactive'} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                    Section: {t.section}
                  </p>
                </div>
                {qrCodes[t.id] && (
                  <div className="w-20 h-20 border border-primary/10 p-0.5 rounded bg-white flex-shrink-0 cursor-pointer" onClick={() => setPrintTable(t)} title="Click to view printable QR Card">
                    <img src={qrCodes[t.id]} alt={`Table ${t.table_number} QR`} className="w-full h-full" />
                  </div>
                )}
              </div>

              {/* Table Details */}
              <div className="space-y-2 text-xs border-t border-b border-primary/5 py-3 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Capacity:</span>
                  <span className="font-bold text-foreground">{t.capacity} guests</span>
                </div>
                {t.notes && (
                  <div className="flex flex-col gap-0.5">
                    <span>Notes:</span>
                    <span className="text-foreground italic">{t.notes}</span>
                  </div>
                )}
              </div>

              {/* Session / Booking Details */}
              {activeSession ? (
                <div className="bg-[#050B1E] border border-primary/5 rounded p-3 text-xs space-y-2">
                  <div className="flex justify-between text-muted-foreground font-semibold">
                    <span className="text-primary font-bold">Occupied Session</span>
                    <span>{new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-foreground font-medium flex justify-between">
                    <span>Guest: {activeSession.customer_name}</span>
                    <span className="font-mono text-green-400 font-bold">{ordersSubtotal.toFixed(2)} PLN</span>
                  </div>
                  {tableOrders.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {tableOrders.map(o => (
                        <span key={o.id} className="px-1.5 py-0.5 rounded bg-primary/10 text-[9px] font-mono font-semibold uppercase text-primary">
                          {o.status}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={() => handleCloseSession(activeSession.id, t.table_number)}
                    disabled={isPending}
                    className="w-full mt-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 font-bold text-[10px] uppercase tracking-wider py-1.5"
                  >
                    Clear & Vacate Table
                  </Button>
                </div>
              ) : (
                <div className="py-2.5 text-center text-xs text-muted-foreground/45 italic">
                  No active session (Table Vacant)
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-primary/5">
                <Button
                  onClick={() => openEditDialog(t)}
                  className="flex-1 bg-[#070B1E] border border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-1.5"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  onClick={() => handleToggleActive(t)}
                  className={`flex-1 text-[10px] uppercase tracking-wider py-1.5 ${
                    t.is_active
                      ? 'bg-amber-500/5 border border-amber-500/15 text-amber-500 hover:bg-amber-500/10'
                      : 'bg-green-500/5 border border-green-500/15 text-green-500 hover:bg-green-500/10'
                  }`}
                >
                  <Power className="w-3.5 h-3.5 mr-1" /> {t.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  onClick={() => handleRegenerateQR(t)}
                  className="p-2 bg-[#070B1E] border border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                  title="Regenerate QR Code"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => handleDeleteTable(t)}
                  className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                  title="Delete Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </PremiumCard>
          );
        })}
      </div>

      {/* Add Table Dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddTable} className="w-full max-w-md bg-[#050B1E] border border-primary/20 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-3">
              <h3 className="text-lg font-serif font-black tracking-wide text-foreground">
                ADD NEW DINING TABLE
              </h3>
              <button type="button" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Table Number</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(parseInt(e.target.value))}
                  className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Capacity (Seats)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Section / Area</label>
              <input
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-xs rounded px-3 py-2 h-16 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded border border-red-500/20 bg-red-500/5 text-xs text-red-400 text-left">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-primary/10 pt-4">
              <Button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                className="bg-[#070B1E] border border-primary/10 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-1.5 px-4 h-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider py-1.5 px-6 h-auto"
              >
                {isPending ? <GoldSpinner size="sm" /> : 'Save Table'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Table Dialog */}
      {editDialogOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditTable} className="w-full max-w-md bg-[#050B1E] border border-primary/20 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-3">
              <h3 className="text-lg font-serif font-black tracking-wide text-foreground">
                EDIT TABLE #{selectedTable.table_number}
              </h3>
              <button type="button" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Table Number</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(parseInt(e.target.value))}
                  className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Capacity (Seats)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Section / Area</label>
              <input
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3 py-2 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-xs rounded px-3 py-2 h-16 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded border border-red-500/20 bg-red-500/5 text-xs text-red-400 text-left">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-primary/10 pt-4">
              <Button
                type="button"
                onClick={() => setEditDialogOpen(false)}
                className="bg-[#070B1E] border border-primary/10 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-1.5 px-4 h-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider py-1.5 px-6 h-auto"
              >
                {isPending ? <GoldSpinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
