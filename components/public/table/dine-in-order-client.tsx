'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';
import StatusPill from '@/components/ui/status-pill';
import { Plus, Minus, Trash2, ShoppingBag, User, CreditCard, DollarSign, Clock, AlertTriangle, ChefHat, Check, ShoppingCart } from 'lucide-react';
import { createDineInOrderAction } from '@/app/[locale]/(public)/table/actions';
import TableOrderStatus from './table-order-status';

type Category = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
};

type MenuItem = {
  id: string;
  category_id: string;
  name_pl: string;
  name_en: string;
  description_pl: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  signed_image_url?: string | null;
  spiciness: number;
  allergens: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_chef_special: boolean;
  is_popular: boolean;
  is_new: boolean;
  is_available: boolean;
};

type BasketItem = {
  menuItem: MenuItem;
  quantity: number;
  customerNotes: string;
};

type Props = {
  table: {
    id: string;
    table_number: number;
    qr_token: string;
  };
  categories: Category[];
  items: MenuItem[];
  dineInOrderingEnabled: boolean;
  isClosedToday: boolean;
  isOutsideHours: boolean;
  serviceHoursDisplay: string | null;
  locale: 'pl' | 'en';
  initialSession: {
    id: string;
    customerName: string;
    existingOrders: any[];
  } | null;
};

export default function DineInOrderClient({
  table,
  categories,
  items,
  dineInOrderingEnabled,
  isClosedToday,
  isOutsideHours,
  serviceHoursDisplay,
  locale,
  initialSession
}: Props) {
  const t = useTranslations('order');
  const isPl = locale === 'pl';

  // 1. Session & Customer Identity State
  const [session, setSession] = useState<{ id: string; customerName: string } | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [isSettingName, setIsSettingName] = useState(true);

  // 2. Basket State
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [notesModalItem, setNotesModalItem] = useState<MenuItem | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash_at_table' | 'card_at_table'>('card_at_table');
  const [customerNotes, setCustomerNotes] = useState('');

  // 3. UI states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Existing session orders
  const [existingOrders, setExistingOrders] = useState<any[]>(initialSession?.existingOrders || []);

  // 4. Initialize Session from Props or LocalStorage
  useEffect(() => {
    if (initialSession) {
      setSession({
        id: initialSession.id,
        customerName: initialSession.customerName
      });
      setCustomerName(initialSession.customerName);
      setIsSettingName(false);
    } else {
      const storedSession = localStorage.getItem(`namaste_table_session_${table.id}`);
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          setSession(parsed);
          setCustomerName(parsed.customerName);
          setIsSettingName(false);
        } catch (e) {
          localStorage.removeItem(`namaste_table_session_${table.id}`);
        }
      }
    }
  }, [initialSession, table.id]);

  // Set default category
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // 5. Category filter helper
  const getItemsByCategory = (categoryId: string) => {
    return items.filter(item => item.category_id === categoryId);
  };

  // 6. Basket logic
  const handleAddToBasket = (menuItem: MenuItem) => {
    setBasket(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem, quantity: 1, customerNotes: '' }];
    });
  };

  const handleRemoveFromBasket = (menuItem: MenuItem) => {
    setBasket(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.menuItem.id !== menuItem.id);
    });
  };

  const openNotesModal = (item: MenuItem, currentNotes: string) => {
    setNotesModalItem(item);
    setTempNotes(currentNotes);
  };

  const saveItemNotes = () => {
    if (notesModalItem) {
      setBasket(prev => prev.map(i => i.menuItem.id === notesModalItem.id ? { ...i, customerNotes: tempNotes } : i));
      setNotesModalItem(null);
      setTempNotes('');
    }
  };

  // Calculated subtotal
  const itemsSubtotal = basket.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  // 7. Submit order logic
  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim().length < 2) return;
    setIsSettingName(false);
  };

  const handlePlaceOrder = async () => {
    if (basket.length === 0) return;
    if (customerName.trim().length < 2) {
      setIsSettingName(true);
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      customer_name: customerName,
      order_type: 'dine_in',
      payment_method: paymentMethod,
      customer_notes: customerNotes,
      table_qr_token: table.qr_token,
      table_session_id: session?.id || null,
      consent: true,
      source_language: locale,
      items: basket.map(i => ({
        menu_item_id: i.menuItem.id,
        quantity: i.quantity,
        customer_notes: i.customerNotes || null
      }))
    };

    try {
      const res = await createDineInOrderAction(payload);
      if (res.success && res.id) {
        // Save session locally
        const newSession = {
          id: res.tableSessionId || '',
          customerName
        };
        localStorage.setItem(`namaste_table_session_${table.id}`, JSON.stringify(newSession));
        setSession(newSession);

        // Fetch refreshed orders for this session
        const supabase = createClient();
        const { data: refreshedOrders } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            total_amount,
            payment_status,
            payment_method,
            order_items (
              id,
              item_name_pl,
              item_name_en,
              quantity,
              unit_price
            )
          `)
          .eq('table_session_id', newSession.id)
          .order('created_at', { ascending: false });

        if (refreshedOrders) {
          setExistingOrders(refreshedOrders);
        }

        // Reset basket and show success
        setBasket([]);
        setSuccess(true);
        setMobileCartOpen(false);
        setActiveTab('orders');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(res.error || 'Failed to submit order');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Operational state checks
  if (!dineInOrderingEnabled || isClosedToday || isOutsideHours) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4 animate-fade-in space-y-6">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-foreground">
          {isPl ? 'Zamawianie przy stoliku jest obecnie niedostępne' : 'Table Ordering Currently Offline'}
        </h2>
        <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
          {isClosedToday 
            ? (isPl ? 'Restauracja jest dzisiaj zamknięta.' : 'The restaurant is closed today.')
            : isOutsideHours 
              ? (isPl 
                  ? `Zamówienia przy stoliku są możliwe tylko w godzinach: ${serviceHoursDisplay}` 
                  : `Table ordering is only available during: ${serviceHoursDisplay}`)
              : (isPl ? 'Ta usługa została tymczasowo wyłączona.' : 'Dine-in ordering has been temporarily disabled.')
          }
        </p>
      </div>
    );
  }

  // Session onboarding/Name entry screen
  if (isSettingName) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <PremiumCard className="border-primary/20 bg-[#050B1E]/60 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <User className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-xl font-serif font-black tracking-wide text-foreground">
              {isPl ? 'Witaj w restauracji Namaste!' : 'Welcome to Namaste!'}
            </h2>
            <p className="text-xs text-muted-foreground/60">
              {isPl 
                ? 'Wpisz swoje imię, abyśmy wiedzieli kogo obsługujemy przy stoliku.' 
                : 'Enter your name so we know who is ordering at this table.'}
            </p>
          </div>

          <form onSubmit={handleStartSession} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="customerName" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {isPl ? 'Twoje Imię' : 'Your Name'}
              </label>
              <input
                id="customerName"
                type="text"
                required
                minLength={2}
                maxLength={50}
                placeholder={isPl ? 'np. Anna, Jan' : 'e.g. Anna, John'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-sm rounded px-3.5 py-2.5 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={customerName.trim().length < 2}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider py-3"
            >
              {isPl ? 'Zacznij Zamawiać' : 'Start Browsing'}
            </Button>
          </form>
        </PremiumCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col space-y-6">
      <TableOrderStatus tableSessionId={session?.id || ''} initialOrders={existingOrders} onOrdersUpdate={setExistingOrders} />

      {/* Mode Switch Tabs (Mobile Only) */}
      <div className="flex border-b border-primary/10 lg:hidden">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-colors ${
            activeTab === 'menu' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-colors relative ${
            activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          {isPl ? 'Moje Zamówienia' : 'My Orders'}
          {existingOrders.length > 0 && (
            <span className="absolute top-2.5 right-6 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Menu Browser (Dine-in mode) */}
        <div className={`lg:col-span-8 space-y-6 ${activeTab !== 'menu' ? 'hidden lg:block' : ''}`}>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin border-b border-primary/5">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex-shrink-0 ${
                  selectedCategoryId === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#070B1E] border border-primary/10 text-muted-foreground hover:text-foreground'
                }`}
              >
                {isPl ? category.name_pl : category.name_en}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          {selectedCategoryId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getItemsByCategory(selectedCategoryId).map((item) => {
                const basketQuantity = basket.find(b => b.menuItem.id === item.id)?.quantity || 0;
                return (
                  <PremiumCard key={item.id} hoverable={false} className="bg-[#050B1E]/40 border-primary/10 flex flex-col p-4 relative justify-between">
                    <div className="flex gap-4">
                      {item.signed_image_url && (
                        <img
                          src={item.signed_image_url}
                          alt={isPl ? item.name_pl : item.name_en}
                          className="w-20 h-20 object-cover rounded border border-primary/5"
                        />
                      )}
                      <div className="space-y-1 text-left flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-serif font-black tracking-wide text-foreground">
                            {isPl ? item.name_pl : item.name_en}
                          </h4>
                          {item.spiciness > 0 && (
                            <span className="text-[10px] text-red-500 font-mono tracking-widest font-black uppercase">
                              {'🌶️'.repeat(item.spiciness)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 leading-normal line-clamp-2">
                          {isPl ? item.description_pl : item.description_en}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-primary/5">
                      <span className="font-bold text-foreground font-mono">
                        {item.price.toFixed(2)} PLN
                      </span>

                      {basketQuantity > 0 ? (
                        <div className="flex items-center bg-[#070B1E] border border-primary/20 rounded-full px-1 py-0.5">
                          <button
                            onClick={() => handleRemoveFromBasket(item)}
                            className="p-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-foreground font-mono">
                            {basketQuantity}
                          </span>
                          <button
                            onClick={() => handleAddToBasket(item)}
                            className="p-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleAddToBasket(item)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-full h-auto"
                        >
                          {isPl ? 'Dodaj' : 'Add'}
                        </Button>
                      )}
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Cart Summary / Table Info (Desktop Only) */}
        <div className={`lg:col-span-4 space-y-6 ${activeTab !== 'orders' ? 'hidden lg:block' : ''}`}>
          
          {/* Active Session & Table Status */}
          <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/60 p-5 space-y-4 text-left">
            <h3 className="text-sm font-serif font-black tracking-widest text-primary uppercase border-b border-primary/10 pb-2">
              {isPl ? 'Twoja Sesja Stolika' : 'Your Table Session'}
            </h3>
            <div className="text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>{isPl ? 'Stolik:' : 'Table:'}</span>
                <span className="font-bold text-foreground font-mono">#{table.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span>{isPl ? 'Gość:' : 'Guest:'}</span>
                <span className="font-bold text-foreground">{customerName}</span>
              </div>
              {session && (
                <div className="flex justify-between">
                  <span>{isPl ? 'Kod sesji:' : 'Session ID:'}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/60 select-all">{session.id.substring(0, 8)}...</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsSettingName(true)}
              className="w-full bg-[#070B1E] border border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-2 font-bold"
            >
              {isPl ? 'Zmień imię / Zresetuj' : 'Change Name / Reset'}
            </Button>
          </PremiumCard>

          {/* Active Orders List (Dine-in Session orders) */}
          <div className="space-y-4">
            <h3 className="text-sm font-serif font-black tracking-widest text-primary uppercase text-left">
              {isPl ? 'Historia dzisiejszych zamówień' : 'Today\'s Order History'}
            </h3>
            {existingOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 text-left italic">
                {isPl ? 'Brak zamówień w obecnej sesji.' : 'No orders in the current session.'}
              </p>
            ) : (
              <div className="space-y-3">
                {existingOrders.map((order) => (
                  <PremiumCard key={order.id} hoverable={false} className="bg-[#050B1E]/30 border-primary/5 p-4 text-xs text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-primary/5 pb-2">
                      <span className="font-mono text-muted-foreground/60 select-all">
                        ID: {order.id.substring(0, 8)}...
                      </span>
                      <StatusPill 
                        status={
                          order.status === 'completed' || order.status === 'delivered' ? 'success' :
                          order.status === 'rejected' ? 'error' :
                          order.status === 'cancelled' ? 'warning' : 'info'
                        } 
                        label={order.status} 
                      />
                    </div>
                    <div className="space-y-1">
                      {order.order_items.map((oi: any) => (
                        <div key={oi.id} className="flex justify-between">
                          <span>{oi.quantity} x {isPl ? oi.item_name_pl : oi.item_name_en}</span>
                          <span className="font-mono text-muted-foreground/75">{(oi.quantity * oi.unit_price).toFixed(2)} PLN</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-primary/5 font-bold">
                      <span>{isPl ? 'Razem:' : 'Total:'}</span>
                      <span className="text-primary font-mono">{Number(order.total_amount).toFixed(2)} PLN</span>
                    </div>
                  </PremiumCard>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Mobile Cart / Checkout Bar */}
      {basket.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#070B1E] border-t border-primary/20 p-4 z-40 flex items-center justify-between shadow-[0_-8px_24px_rgba(0,0,0,0.4)] animate-slide-up">
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">
              {isPl ? 'Twój koszyk' : 'Your Basket'}
            </span>
            <span className="text-sm font-bold text-foreground font-mono">
              {itemsSubtotal.toFixed(2)} PLN ({basket.reduce((sum, i) => sum + i.quantity, 0)} {isPl ? 'szt.' : 'items'})
            </span>
          </div>
          <Button
            onClick={() => setMobileCartOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {isPl ? 'Złóż Zamówienie' : 'Place Order'}
          </Button>
        </div>
      )}

      {/* Basket Details & Checkout Modal */}
      {mobileCartOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-[#050B1E] border-l border-primary/10 h-full flex flex-col justify-between shadow-2xl p-6 text-left">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-primary/10 pb-4">
              <h3 className="text-lg font-serif font-black tracking-wide text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {isPl ? 'Twój Stolik - Koszyk' : 'Your Table Basket'}
              </h3>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-primary/5 text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
              {basket.map((item) => (
                <div key={item.menuItem.id} className="p-3 bg-[#070B1E] border border-primary/5 rounded space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-semibold text-foreground font-sans">
                      {isPl ? item.menuItem.name_pl : item.menuItem.name_en}
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {(item.menuItem.price * item.quantity).toFixed(2)} PLN
                    </span>
                  </div>

                  {item.customerNotes && (
                    <div className="text-[10px] text-primary/75 italic">
                      * {item.customerNotes}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-primary/5">
                    <button
                      onClick={() => openNotesModal(item.menuItem, item.customerNotes)}
                      className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      {item.customerNotes ? (isPl ? 'Edytuj uwagi' : 'Edit notes') : (isPl ? 'Dodaj uwagi' : 'Add notes')}
                    </button>

                    <div className="flex items-center bg-[#050B1E] border border-primary/10 rounded-full px-1">
                      <button
                        onClick={() => handleRemoveFromBasket(item.menuItem)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-bold text-foreground font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleAddToBasket(item.menuItem)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Checkout Form */}
              <div className="space-y-4 pt-4 border-t border-primary/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {isPl ? 'Sposób Płatności' : 'Payment Method'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('card_at_table')}
                    className={`p-3 rounded border text-xs font-bold text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'card_at_table'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-primary/10 bg-[#070B1E] text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    {isPl ? 'Karta przy stoliku' : 'Card at Table'}
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cash_at_table')}
                    className={`p-3 rounded border text-xs font-bold text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'cash_at_table'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-primary/10 bg-[#070B1E] text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {isPl ? 'Gotówka przy stoliku' : 'Cash at Table'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customerNotes" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    {isPl ? 'Uwagi do zamówienia (opcjonalnie)' : 'Order Notes (optional)'}
                  </label>
                  <textarea
                    id="customerNotes"
                    placeholder={isPl ? 'Alergie, preferencje...' : 'Allergies, preferences...'}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-xs rounded px-3 py-2 h-16 focus:outline-none focus:border-primary/50 resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 mb-4 rounded border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Footer / Place Order button */}
            <div className="border-t border-primary/10 pt-4 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>{isPl ? 'Suma częściowa:' : 'Subtotal:'}</span>
                <span className="text-primary font-mono text-lg">{itemsSubtotal.toFixed(2)} PLN</span>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={loading || basket.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider py-3.5"
              >
                {loading ? <GoldSpinner size="sm" /> : (isPl ? 'Wyślij zamówienie do kuchni' : 'Send Order to Kitchen')}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Item Notes Modal */}
      {notesModalItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#050B1E] border border-primary/20 rounded-lg p-6 space-y-4 text-left">
            <h4 className="text-sm font-serif font-black tracking-wide text-foreground">
              {isPl ? 'Dodaj uwagi do dania' : 'Add Item Notes'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isPl ? notesModalItem.name_pl : notesModalItem.name_en}
            </p>
            <textarea
              placeholder={isPl ? 'np. bez kolendry, bardzo pikantne...' : 'e.g. no coriander, extra spicy...'}
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              className="w-full bg-[#070B1E] border border-primary/20 text-foreground text-xs rounded px-3 py-2 h-20 focus:outline-none focus:border-primary/50 resize-none transition-colors"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => setNotesModalItem(null)}
                className="bg-[#070B1E] border border-primary/10 hover:bg-primary/5 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider py-1.5 px-4 h-auto"
              >
                {isPl ? 'Anuluj' : 'Cancel'}
              </Button>
              <Button
                onClick={saveItemNotes}
                className="bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider py-1.5 px-4 h-auto"
              >
                {isPl ? 'Zapisz' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
