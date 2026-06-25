'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createOrderRequestAction } from '@/app/[locale]/(public)/order/actions';
import { orderRequestSchema } from '@/lib/validation/orders';
import { Button } from '@/components/ui/button';
import PremiumCard from '@/components/ui/premium-card';
import GoldSpinner from '@/components/ui/gold-spinner';
import StatusPill from '@/components/ui/status-pill';
import { Plus, Minus, Trash2, ShoppingBag, MapPin, Phone, User, Mail, CreditCard, DollarSign, Clock } from 'lucide-react';
import { type ServiceStatusInfo } from '@/lib/public/opening-hours';
import DeliveryHoursCard from '@/components/public/opening-hours/delivery-hours-card';

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

type PackagingRule = {
  id: string;
  name_pl: string;
  name_en: string;
  fee_type: 'food_container' | 'beverage_cup' | 'bag' | 'custom';
  amount: number | string;
  applies_to_delivery: boolean;
  applies_to_takeaway: boolean;
  is_active: boolean;
};

type MenuItemPackagingRule = {
  menu_item_id: string;
  packaging_fee_rule_id: string;
  default_quantity: number;
  is_required: boolean;
};

type Props = {
  categories: Category[];
  items: MenuItem[];
  operationalStatus: {
    delivery_enabled: boolean;
    takeaway_enabled: boolean;
  };
  locale: 'pl' | 'en';
  restaurantInfo: {
    address: string;
    phone: string;
  };
  deliveryHours: ServiceStatusInfo;
  deliveryMinimumOrderValue?: number;
  packagingRules: PackagingRule[];
  menuItemPackagingRules: MenuItemPackagingRule[];
};

export default function OrderingWorkflowClient({
  categories,
  items,
  operationalStatus,
  locale,
  restaurantInfo,
  deliveryHours,
  deliveryMinimumOrderValue = 0,
  packagingRules,
  menuItemPackagingRules,
}: Props) {
  const t = useTranslations('order');

  // Order Type State (defaults to takeaway or whichever is enabled)
  const defaultOrderType = operationalStatus.takeaway_enabled ? 'takeaway' : 'delivery';
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>(defaultOrderType);

  // Form Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Delivery Fields State
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');

  // Basket State
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Submission & Message States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    id: string;
    token: string;
    itemsSubtotal?: number;
    packagingTotal?: number;
    deliveryFee?: number;
    totalAmount?: number;
    orderType?: 'delivery' | 'takeaway';
    deliveryZoneAction?: 'allow' | 'contact' | 'block' | null;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string | null;
    deliveryPostalCode?: string | null;
    deliveryCity?: string | null;
    items?: { name_pl: string; name_en: string; quantity: number; price: number }[];
  } | null>(null);

  // Real-time delivery fee state
  const [deliveryFeeInfo, setDeliveryFeeInfo] = useState<{
    fee: number;
    distanceKm: number;
    durationMinutes: number;
    zoneName: string;
    action: 'allow' | 'contact' | 'block';
    geocodedAddress: string;
    loading: boolean;
    error: string | null;
    errorCode: string | null;
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set default payment method when order type changes
  useEffect(() => {
    if (orderType === 'takeaway') {
      setPaymentMethod('cash_on_pickup');
      setDeliveryFeeInfo(null); // Clear delivery fee when switching to takeaway
    } else {
      setPaymentMethod('cash_on_delivery');
    }
  }, [orderType]);

  // Real-time delivery fee lookup — debounced, fires when address fields are filled
  const lookupDeliveryFee = useCallback(async (street: string, postal: string, city: string) => {
    if (!street || street.length < 3 || !city || city.length < 2) {
      setDeliveryFeeInfo(null);
      return;
    }

    setDeliveryFeeInfo(prev => ({
      fee: prev?.fee ?? 0,
      distanceKm: prev?.distanceKm ?? 0,
      durationMinutes: prev?.durationMinutes ?? 0,
      zoneName: prev?.zoneName ?? '',
      action: prev?.action ?? 'allow',
      geocodedAddress: prev?.geocodedAddress ?? '',
      loading: true,
      error: null,
      errorCode: null,
    }));


    try {
      const res = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ street, postalCode: postal, city }),
      });

      const data = await res.json();

      if (data.success) {
        setDeliveryFeeInfo({
          fee: data.fee,
          distanceKm: data.distanceKm,
          durationMinutes: data.durationMinutes,
          zoneName: data.zoneName,
          action: data.action,
          geocodedAddress: data.geocodedAddress,
          loading: false,
          error: null,
          errorCode: null,
        });
      } else {
        setDeliveryFeeInfo(prev => ({
          ...(prev ?? { fee: 0, distanceKm: 0, durationMinutes: 0, zoneName: '', action: 'allow' as const, geocodedAddress: '', errorCode: null }),
          loading: false,
          error: data.error ?? (locale === 'pl' ? 'Nie można obliczyć kosztu dostawy.' : 'Could not calculate delivery fee.'),
          errorCode: data.code ?? null,
        }));
      }
    } catch {
      setDeliveryFeeInfo(prev => ({
        ...(prev ?? { fee: 0, distanceKm: 0, durationMinutes: 0, zoneName: '', action: 'allow' as const, geocodedAddress: '', errorCode: null }),
        loading: false,
        error: locale === 'pl' ? 'Błąd połączenia. Spróbuj ponownie.' : 'Connection error. Please try again.',
        errorCode: 'CONNECTION_ERROR',
      }));
    }
  }, [locale]);

  useEffect(() => {
    if (orderType !== 'delivery') return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      lookupDeliveryFee(streetAddress, postalCode, city);
    }, 600);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [streetAddress, postalCode, city, orderType, lookupDeliveryFee]);


  // Group items by category
  const getItemsByCategory = (categoryId: string) => {
    return items.filter(item => item.category_id === categoryId);
  };

  // Add to basket helper
  const handleAddToBasket = (menuItem: MenuItem) => {
    setBasket(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: Math.min(i.quantity + 1, 50) } : i);
      }
      return [...prev, { menuItem, quantity: 1, customerNotes: '' }];
    });
  };

  // Decrease quantity helper
  const handleDecreaseQuantity = (itemId: string) => {
    setBasket(prev => {
      const existing = prev.find(i => i.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuItem.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.menuItem.id !== itemId);
    });
  };

  // Update item notes helper
  const handleUpdateItemNotes = (itemId: string, noteText: string) => {
    setBasket(prev => prev.map(i => i.menuItem.id === itemId ? { ...i, customerNotes: noteText } : i));
  };

  // Calculate Subtotal
  const itemsSubtotal = basket.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const isBelowMinimumOrder = orderType === 'delivery' && itemsSubtotal < deliveryMinimumOrderValue && basket.length > 0;
  const liveDeliveryFee = orderType === 'delivery' && deliveryFeeInfo && !deliveryFeeInfo.loading && !deliveryFeeInfo.error && deliveryFeeInfo.action !== 'block'
    ? deliveryFeeInfo.fee
    : 0;

  // Calculate Packaging Total client-side
  const packagingTotal = (() => {
    let total = 0;
    const appliedBagRules = new Set<string>();

    basket.forEach((item) => {
      const maps = menuItemPackagingRules.filter(m => m.menu_item_id === item.menuItem.id && m.is_required);
      maps.forEach((map) => {
        const rule = packagingRules.find(r => r.id === map.packaging_fee_rule_id && r.is_active);
        if (rule) {
          const applies = orderType === 'delivery' ? rule.applies_to_delivery : rule.applies_to_takeaway;
          if (applies) {
            const ruleAmount = Number(rule.amount);
            if (rule.fee_type === 'bag') {
              if (!appliedBagRules.has(rule.id)) {
                total += ruleAmount * (map.default_quantity || 1);
                appliedBagRules.add(rule.id);
              }
            } else {
              total += ruleAmount * (map.default_quantity || 1) * item.quantity;
            }
          }
        }
      });
    });

    return total;
  })();

  const estimatedTotal = itemsSubtotal + packagingTotal + liveDeliveryFee;
  const isDeliveryBlocked = orderType === 'delivery' && deliveryFeeInfo && !deliveryFeeInfo.loading && (deliveryFeeInfo.action === 'block' || deliveryFeeInfo.errorCode === 'NO_ZONE');

  // Submit Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (basket.length === 0) {
      setError(locale === 'pl' ? 'Twój koszyk jest pusty!' : 'Your basket is empty!');
      setLoading(false);
      return;
    }

    const payload = {
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      order_type: orderType,
      customer_notes: notes || null,
      payment_method: paymentMethod as any,
      delivery_address: orderType === 'delivery' ? `${streetAddress}${apartment ? `, apt. ${apartment}` : ''}` : null,
      delivery_postal_code: orderType === 'delivery' ? postalCode : null,
      delivery_city: orderType === 'delivery' ? city : null,
      items: basket.map(i => ({
        menu_item_id: i.menuItem.id,
        quantity: i.quantity,
        customer_notes: i.customerNotes || null
      })),
      consent: true,
      source_language: locale
    };

    // Client-side schema check
    const validationResult = orderRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      setError(validationResult.error.errors[0]?.message || t('errors.validation'));
      setLoading(false);
      return;
    }

    try {
      const res = await createOrderRequestAction(payload);
      if (res.success && res.id && res.token) {
        setSuccessData({
          id: res.id,
          token: res.token,
          itemsSubtotal: res.itemsSubtotal,
          packagingTotal: res.packagingTotal,
          deliveryFee: res.deliveryFee,
          totalAmount: res.totalAmount,
          orderType: res.orderType,
          deliveryZoneAction: res.deliveryZoneAction as any,
          customerName: payload.customer_name,
          customerPhone: payload.customer_phone,
          deliveryAddress: payload.delivery_address,
          deliveryPostalCode: payload.delivery_postal_code,
          deliveryCity: payload.delivery_city,
          items: basket.map(b => ({
            name_pl: b.menuItem.name_pl,
            name_en: b.menuItem.name_en,
            quantity: b.quantity,
            price: b.menuItem.price
          }))
        });
        setBasket([]);
      } else {
        setError(res.error || (locale === 'pl' ? 'Nie udało się zapisać zamówienia.' : 'Failed to submit order request.'));
      }
    } catch (err: any) {
      setError(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  // Check if ordering is closed completely
  const isOrderingClosed = !operationalStatus.takeaway_enabled && !operationalStatus.delivery_enabled;

  if (isOrderingClosed) {
    return (
      <PremiumCard hoverable={false} className="border-red-500/20 bg-red-500/5 p-8 text-center max-w-xl mx-auto space-y-4">
        <h3 className="text-xl font-serif font-bold text-red-400">{t('errors.disabled')}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {locale === 'pl' 
            ? 'Zamówienia online w naszej restauracji są obecnie wstrzymane. Zapraszamy do kontaktu telefonicznego w celu uzyskania informacji.' 
            : 'Online ordering is currently suspended at our restaurant. Please contact us by phone for inquiries.'}
        </p>
        <p className="text-sm text-primary font-bold">{restaurantInfo.phone}</p>
      </PremiumCard>
    );
  }

  // Success view
  if (successData) {
    const trackingUrl = `/${locale}/order/status?id=${successData.id}&token=${successData.token}`;
    return (
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0e1329] via-[#070b1e] to-[#040614] border border-amber-500/25 rounded-2xl shadow-2xl p-8 max-w-xl mx-auto text-center space-y-6 font-sans gold-border-glow">
        
        {/* Decorative elements representing traditional Indian patterns */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        {/* Success Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/15 border border-green-500/30 text-green-400 mx-auto animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-2xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-100 uppercase">
            {t('successTitle')}
          </h3>
          <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-md mx-auto">
            {t('successDesc')}
          </p>
        </div>

        {/* Customer & Address Details */}
        <div className="p-4 bg-[#0a0f26] border border-primary/10 rounded-xl space-y-3 text-xs text-left max-w-md mx-auto">
          <span className="text-[10px] font-bold text-amber-500/70 tracking-widest uppercase block border-b border-primary/5 pb-1.5 mb-1.5">
            {locale === 'pl' ? 'Szczegóły Odbiorcy' : 'Customer Details'}
          </span>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 block">{t('nameLabel')}</span>
              <span className="text-foreground font-medium text-[11px]">{successData.customerName}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 block">{t('phoneLabel')}</span>
              <span className="text-foreground font-medium text-[11px]">{successData.customerPhone}</span>
            </div>
          </div>
          {successData.orderType === 'delivery' && successData.deliveryAddress && (
            <div className="pt-2 border-t border-primary/5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 block">{t('addressHeader')}</span>
              <span className="text-foreground font-medium text-[11px] flex items-center gap-1.5">
                <span className="text-amber-500">📍</span>
                {successData.deliveryAddress}, {successData.deliveryPostalCode} {successData.deliveryCity}
              </span>
            </div>
          )}
        </div>

        {/* Dishes Ordered Section */}
        {successData.items && successData.items.length > 0 && (
          <div className="p-4 bg-[#0a0f26] border border-primary/10 rounded-xl space-y-2.5 text-xs text-left max-w-md mx-auto">
            <span className="text-[10px] font-bold text-amber-500/70 tracking-widest uppercase block border-b border-primary/5 pb-1.5 mb-1.5">
              {locale === 'pl' ? 'Zamówione Pozycje' : 'Dishes Ordered'}
            </span>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {successData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <div className="flex flex-col text-left">
                    <span className="text-foreground font-medium">
                      {locale === 'pl' ? item.name_pl : item.name_en}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {item.quantity} × {item.price.toFixed(2)} PLN
                    </span>
                  </div>
                  <span className="font-mono text-foreground font-semibold">
                    {(item.quantity * item.price).toFixed(2)} PLN
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Totals Summary */}
        {successData.itemsSubtotal !== undefined && (
          <div className="p-4 bg-[#070b1e] border border-amber-500/15 rounded-xl space-y-2.5 text-xs text-left max-w-md mx-auto shadow-inner">
            <span className="text-[10px] font-bold text-amber-500/70 tracking-widest uppercase block border-b border-primary/10 pb-1.5 mb-1.5">
              {locale === 'pl' ? 'Podsumowanie Kosztów' : 'Payment Summary'}
            </span>
            <div className="flex justify-between text-muted-foreground">
              <span>{t('subtotal')}</span>
              <span className="font-mono">{successData.itemsSubtotal.toFixed(2)} PLN</span>
            </div>
            {successData.packagingTotal !== undefined && successData.packagingTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t('packagingFee')}</span>
                <span className="font-mono">{successData.packagingTotal.toFixed(2)} PLN</span>
              </div>
            )}
            {successData.orderType === 'delivery' && (
              <div className="flex flex-col space-y-1 pt-1.5 border-t border-primary/5">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('deliveryFee')}</span>
                  {successData.deliveryZoneAction === 'contact' ? (
                    <span className="text-amber-400 font-medium italic">{t('deliveryFeeTbd')}</span>
                  ) : (
                    <span className="font-mono text-foreground font-medium">
                      {successData.deliveryFee === 0 
                        ? (locale === 'pl' ? 'Bezpłatna' : 'Free') 
                        : `${successData.deliveryFee?.toFixed(2)} PLN`}
                    </span>
                  )}
                </div>
                {successData.deliveryZoneAction === 'contact' && (
                  <p className="text-[10px] text-amber-400/80 italic leading-tight font-light">
                    {t('deliveryFeeNotice')}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-between text-foreground font-bold text-sm pt-2.5 border-t border-primary/15 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent -mx-4 px-4 py-1.5 rounded-b-lg">
              <span>
                {successData.orderType === 'delivery' ? t('estimatedTotal') : t('finalTotal')}
              </span>
              <span className="text-amber-400 font-mono text-base font-black">
                {Number(successData.totalAmount || 0).toFixed(2)} PLN
              </span>
            </div>
          </div>
        )}

        {/* Tracking Information Box */}
        <div className="p-4 bg-[#0a0f26] border border-primary/20 rounded-xl space-y-3 max-w-md mx-auto">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 block font-semibold">
            {t('trackingRef')}
          </span>
          <code className="text-xs text-amber-400 font-mono select-all block break-all py-1.5 px-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            {successData.token}
          </code>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-light">
            {t('trackingText')}
          </p>
          <div className="pt-2">
            <Link href={trackingUrl} className="block">
              <Button className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-[#070B1E] font-bold text-xs uppercase tracking-wider py-3 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all duration-300 rounded-lg">
                {t('trackLinkText')}
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/50 pt-2 border-t border-primary/5 max-w-md mx-auto">
          {t('contactNote')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative max-w-6xl mx-auto font-sans">
      
      {/* Left Column: Catalog & Details form (8 cols) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-8">
        
        {/* Menu Catalog Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-primary tracking-wide">
            {locale === 'pl' ? 'Karta Dań' : 'Menu Selection'}
          </h2>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar select-none scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-5 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                selectedCategoryId === null
                  ? 'bg-primary text-[#050B1E] border border-primary shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'border border-primary/20 hover:border-primary/50 text-slate-300 bg-[#070B1E]/40 hover:bg-primary/5'
              }`}
            >
              {locale === 'pl' ? 'Wszystkie kategorie' : 'All Categories'}
            </button>

            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              const categoryItems = getItemsByCategory(category.id);
              if (categoryItems.length === 0) return null;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-5 py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-[#050B1E] border border-primary shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                      : 'border border-primary/20 hover:border-primary/50 text-slate-300 bg-[#070B1E]/40 hover:bg-primary/5'
                  }`}
                >
                  {locale === 'pl' ? category.name_pl : category.name_en}
                </button>
              );
            })}
          </div>

          <div className="space-y-10">
            {categories
              .filter((category) => selectedCategoryId === null || category.id === selectedCategoryId)
              .map((category) => {
                const categoryItems = getItemsByCategory(category.id);
                if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="space-y-4">
                  <h3 className="text-lg font-serif font-bold text-foreground border-b border-primary/15 pb-1">
                    {locale === 'pl' ? category.name_pl : category.name_en}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((item) => {
                      const basketQty = basket.find(b => b.menuItem.id === item.id)?.quantity || 0;
                      return (
                        <div 
                          key={item.id} 
                          className="bg-[#050B1E] border border-primary/10 rounded-lg p-4 flex gap-4 hover:border-primary/25 transition-colors relative"
                        >
                          {/* Image preview (placeholder if missing) */}
                          <div className="w-20 h-20 bg-[#070B1E] border border-primary/15 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {item.signed_image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={item.signed_image_url} 
                                alt={locale === 'pl' ? item.name_pl : item.name_en} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="w-6 h-6 text-primary/30" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between text-left space-y-1">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <h4 className="font-semibold text-foreground text-sm">
                                  {locale === 'pl' ? item.name_pl : item.name_en}
                                </h4>
                                <span className="text-xs text-primary font-bold whitespace-nowrap">
                                  {item.price.toFixed(2)} PLN
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground/85 line-clamp-2 leading-relaxed font-light pt-0.5">
                                {locale === 'pl' ? item.description_pl : item.description_en}
                              </p>
                            </div>

                            {/* Spiciness Level & Add Button */}
                            <div className="flex justify-between items-center pt-2">
                              {/* Spiciness dots */}
                              <div className="flex gap-0.5">
                                {Array.from({ length: item.spiciness }).map((_, i) => (
                                  <span key={i} className="text-red-500 text-[10px]" title="Spiciness">🌶️</span>
                                ))}
                              </div>

                              {/* Quantity indicator or Add button */}
                              {basketQty > 0 ? (
                                <div className="flex items-center gap-2.5 bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full text-xs">
                                  <button 
                                    onClick={() => handleDecreaseQuantity(item.id)}
                                    className="text-primary hover:text-white font-bold p-0.5 focus:outline-none"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-bold text-foreground min-w-[12px] text-center">{basketQty}</span>
                                  <button 
                                    onClick={() => handleAddToBasket(item)}
                                    className="text-primary hover:text-white font-bold p-0.5 focus:outline-none"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToBasket(item)}
                                  className="border border-primary/20 bg-primary/5 hover:bg-primary/15 hover:border-primary/40 text-primary font-bold text-[10px] uppercase tracking-wider py-1 px-3 rounded transition-colors"
                                >
                                  + {locale === 'pl' ? 'Dodaj' : 'Add'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Checkout Details Form */}
        <section className="space-y-6 pt-6 border-t border-primary/15">
          <h2 className="text-2xl font-serif font-bold text-primary tracking-wide">
            {t('detailsHeader')}
          </h2>

          <form onSubmit={handleSubmitOrder} className="space-y-5 bg-[#050B1E] p-6 sm:p-8 border border-primary/20 rounded-lg text-left">
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 text-center leading-relaxed">
                {error}
              </div>
            )}

            {/* Order Type Tabs */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('typeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#070B1E] border border-primary/10 rounded-md">
                <button
                  type="button"
                  disabled={!operationalStatus.takeaway_enabled}
                  onClick={() => setOrderType('takeaway')}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    orderType === 'takeaway' 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                  } ${!operationalStatus.takeaway_enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {t('takeaway')} {!operationalStatus.takeaway_enabled && `(${locale === 'pl' ? 'Wyłączone' : 'Disabled'})`}
                </button>
                <button
                  type="button"
                  disabled={!operationalStatus.delivery_enabled}
                  onClick={() => setOrderType('delivery')}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    orderType === 'delivery' 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                  } ${!operationalStatus.delivery_enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {t('delivery')} {!operationalStatus.delivery_enabled && `(${locale === 'pl' ? 'Wyłączone' : 'Disabled'})`}
                </button>
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="customer_name" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {t('nameLabel')} *
                </label>
                <input
                  id="customer_name"
                  type="text"
                  required
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="customer_phone" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    {t('phoneLabel')} *
                  </label>
                  <input
                    id="customer_phone"
                    type="tel"
                    required
                    placeholder="+48 123 456 789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="customer_email" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    {t('emailLabel')} *
                  </label>
                  <input
                    id="customer_email"
                    type="email"
                    required
                    placeholder="jan.kowalski@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                  />
                </div>
              </div>
            </div>

            {/* Delivery address (rendered only if Delivery is selected) */}
            {orderType === 'delivery' && (
              <div className="space-y-4 pt-4 border-t border-primary/10">
                <div className="lg:hidden">
                  <DeliveryHoursCard delivery={deliveryHours} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  {t('addressHeader')}
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="street_address" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {t('streetLabel')} *
                    </label>
                    <input
                      id="street_address"
                      type="text"
                      required={orderType === 'delivery'}
                      placeholder="ul. Warszawska 1/3"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="apartment" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('apartmentLabel')}
                    </label>
                    <input
                      id="apartment"
                      type="text"
                      placeholder="12"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="postal_code" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('postalCodeLabel')} *
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      required={orderType === 'delivery'}
                      placeholder="06-400"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('cityLabel')} *
                    </label>
                    <input
                      id="city"
                      type="text"
                      required={orderType === 'delivery'}
                      placeholder="Ciechanów"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/35"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-3 pt-4 border-t border-primary/10">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                {t('paymentHeader')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orderType === 'takeaway' ? (
                  <>
                    <label className="flex items-center gap-3 p-3 bg-[#070B1E] border border-primary/10 rounded cursor-pointer hover:border-primary/30 select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash_on_pickup"
                        checked={paymentMethod === 'cash_on_pickup'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 border-primary/20 bg-primary/10 text-primary focus:ring-primary/45"
                      />
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        {t('cash_on_pickup')}
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-[#070B1E] border border-primary/10 rounded cursor-pointer hover:border-primary/30 select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        value="card_on_pickup"
                        checked={paymentMethod === 'card_on_pickup'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 border-primary/20 bg-primary/10 text-primary focus:ring-primary/45"
                      />
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        {t('card_on_pickup')}
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-3 p-3 bg-[#070B1E] border border-primary/10 rounded cursor-pointer hover:border-primary/30 select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash_on_delivery"
                        checked={paymentMethod === 'cash_on_delivery'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 border-primary/20 bg-primary/10 text-primary focus:ring-primary/45"
                      />
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        {t('cash_on_delivery')}
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-[#070B1E] border border-primary/10 rounded cursor-pointer hover:border-primary/30 select-none">
                      <input
                        type="radio"
                        name="payment_method"
                        value="card_on_delivery"
                        checked={paymentMethod === 'card_on_delivery'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 border-primary/20 bg-primary/10 text-primary focus:ring-primary/45"
                      />
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        {t('card_on_delivery')}
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Special notes */}
            <div className="space-y-1.5 pt-2">
              <label htmlFor="order_notes" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('notesLabel')}
              </label>
              <textarea
                id="order_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={locale === 'pl' ? 'np. alergia na orzechy, sos na boku' : 'e.g. nut allergy, sauce on the side'}
                className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/35 resize-none"
              />
            </div>

            {/* Minimum order value warning */}
            {isBelowMinimumOrder && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded text-xs space-y-1 font-sans">
                <p className="font-bold flex items-center gap-1.5 text-red-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {locale === 'pl' ? 'Wymagana minimalna wartość zamówienia' : 'Minimum order value required'}
                </p>
                <p className="text-[10px] text-red-300 font-light leading-normal">
                  {locale === 'pl'
                    ? `Minimalna wartość zamówienia dla dostawy to ${deliveryMinimumOrderValue.toFixed(2)} PLN (bez kosztów dostawy). Do pełnej kwoty brakuje ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN.`
                    : `The minimum order value for delivery is ${deliveryMinimumOrderValue.toFixed(2)} PLN (excluding delivery charge). You need ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN more.`}
                </p>
              </div>
            )}

            {/* Offline notice & Submission notice */}
            <div className="p-3 bg-primary/5 border border-primary/15 rounded text-xs space-y-1.5 text-primary/80">
              <p className="font-semibold">{t('noOnlinePayment')}</p>
              <p className="text-[10px] italic leading-normal font-sans font-light">
                {t('pendingNotice')}
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || basket.length === 0 || (orderType === 'delivery' && !deliveryHours.isOpen) || isBelowMinimumOrder || !!isDeliveryBlocked}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold tracking-wide uppercase text-xs py-3"
            >
              {loading ? <GoldSpinner size="sm" /> : t('submitButton')}
            </Button>
          </form>
        </section>

      </div>

      {/* Right Column: Sticky Basket (4 cols on desktop) */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 hidden lg:block space-y-4 text-left">
        {orderType === 'delivery' && (
          <DeliveryHoursCard delivery={deliveryHours} />
        )}
        <PremiumCard hoverable={false} className="border-primary/20 bg-[#050B1E]/60 p-6 space-y-6">
          <h3 className="text-lg font-serif font-bold text-primary border-b border-primary/20 pb-2 flex items-center justify-between">
            <span>{t('basketHeader')}</span>
            <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono">
              {basket.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          </h3>

          {basket.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic py-6 text-center">
              {t('emptyBasket')}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Basket list */}
              <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                {basket.map((item) => (
                  <div key={item.menuItem.id} className="space-y-1.5 pb-3 border-b border-primary/5 text-xs">
                    <div className="flex justify-between items-start gap-1">
                      <div className="font-medium text-foreground">
                        {locale === 'pl' ? item.menuItem.name_pl : item.menuItem.name_en}
                      </div>
                      <div className="font-bold text-primary">
                        {(item.menuItem.price * item.quantity).toFixed(2)} PLN
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Quantity adjuster */}
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 px-2 py-0.5 rounded-full">
                        <button 
                          onClick={() => handleDecreaseQuantity(item.menuItem.id)}
                          className="text-primary hover:text-white p-0.5"
                          title="Reduce"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold font-mono text-[10px] text-foreground w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => handleAddToBasket(item.menuItem)}
                          className="text-primary hover:text-white p-0.5"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button 
                        onClick={() => setBasket(prev => prev.filter(i => i.menuItem.id !== item.menuItem.id))}
                        className="text-muted-foreground/45 hover:text-red-400 p-1 rounded transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item Notes */}
                    <input
                      type="text"
                      placeholder={t('itemNotePlaceholder')}
                      value={item.customerNotes}
                      onChange={(e) => handleUpdateItemNotes(item.menuItem.id, e.target.value)}
                      className="w-full bg-[#070B1E] border border-primary/5 rounded px-2 py-1 text-[10px] text-muted-foreground/80 focus:outline-none focus:border-primary/25 placeholder:text-muted-foreground/35"
                    />
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-2 space-y-2 text-xs border-t border-primary/10">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('subtotal')}</span>
                  <span>{itemsSubtotal.toFixed(2)} PLN</span>
                </div>

                {packagingTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('packagingFee')}</span>
                    <span>{packagingTotal.toFixed(2)} PLN</span>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="flex justify-between items-start gap-1">
                    <span className="flex flex-col text-muted-foreground">
                      <span>{t('deliveryFee')}</span>
                      {deliveryFeeInfo && !deliveryFeeInfo.loading && !deliveryFeeInfo.error && (
                        <span className="text-[9px] text-primary/75 leading-tight">
                          {deliveryFeeInfo.distanceKm.toFixed(1)} km &bull; ~{deliveryFeeInfo.durationMinutes} min
                        </span>
                      )}
                    </span>

                    {!deliveryFeeInfo || (!deliveryFeeInfo.loading && !deliveryFeeInfo.error && !deliveryFeeInfo.action) ? (
                      <span className="text-primary font-medium italic">{t('deliveryFeeTbd')}</span>
                    ) : deliveryFeeInfo.loading ? (
                      <span className="text-primary/60 italic text-[10px] animate-pulse">
                        {locale === 'pl' ? 'Obliczam...' : 'Calculating...'}
                      </span>
                    ) : deliveryFeeInfo.error ? (
                      <span className="text-primary font-medium italic">{t('deliveryFeeTbd')}</span>
                    ) : deliveryFeeInfo.action === 'block' ? (
                      <span className="text-red-400 font-medium text-[10px]">
                        {locale === 'pl' ? 'Poza zasięgiem' : 'Out of range'}
                      </span>
                    ) : deliveryFeeInfo.action === 'contact' ? (
                      <span className="text-amber-400 font-medium italic text-[10px]">
                        {locale === 'pl' ? 'Do ustalenia' : 'To confirm'}
                      </span>
                    ) : (
                      <span className="text-primary font-bold">
                        {deliveryFeeInfo.fee === 0 ? (locale === 'pl' ? 'Bezpłatna' : 'Free') : `${deliveryFeeInfo.fee.toFixed(2)} PLN`}
                      </span>
                    )}
                  </div>
                )}

                {/* Delivery zone info messages */}
                {orderType === 'delivery' && deliveryFeeInfo && !deliveryFeeInfo.loading && (
                  <>
                    {/* Generic geocoding / routing errors */}
                    {deliveryFeeInfo.error && deliveryFeeInfo.errorCode !== 'NO_ZONE' && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded text-[10px] leading-normal">
                        {deliveryFeeInfo.error}
                      </div>
                    )}

                    {/* Address outside all delivery zones */}
                    {(deliveryFeeInfo.errorCode === 'NO_ZONE' || (!deliveryFeeInfo.error && deliveryFeeInfo.action === 'block')) && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-200 rounded text-[10px] leading-relaxed space-y-1.5">
                        <p className="font-bold text-red-300">
                          {locale === 'pl'
                            ? 'Nie dostarczamy pod ten adres.'
                            : 'We cannot deliver to this address.'}
                        </p>
                        <p>
                          {locale === 'pl' ? 'Zadzwoń do nas: ' : 'Call us: '}
                          <a href={`tel:${restaurantInfo.phone}`} className="font-bold text-primary underline">
                            {restaurantInfo.phone}
                          </a>
                        </p>
                        <p>
                          <Link href={`/${locale}/contact`} className="text-primary/80 underline">
                            {locale === 'pl' ? 'Odwiedź stronę kontaktową →' : 'Visit our contact page →'}
                          </Link>
                        </p>
                      </div>
                    )}

                    {/* Contact restaurant zone */}
                    {!deliveryFeeInfo.error && deliveryFeeInfo.action === 'contact' && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-200 rounded text-[10px] leading-relaxed space-y-1">
                        <p className="font-bold text-amber-300">
                          {locale === 'pl' ? 'Dostawa do potwierdzenia' : 'Delivery needs confirmation'}
                        </p>
                        <p>
                          {locale === 'pl'
                            ? 'Skontaktuj się z restauracją w sprawie dostawy.'
                            : 'Please contact the restaurant regarding delivery.'}
                        </p>
                        <p>
                          <a href={`tel:${restaurantInfo.phone}`} className="font-bold text-primary underline">
                            {restaurantInfo.phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-primary/15">
                  <span>
                    {orderType === 'delivery' ? t('estimatedTotal') : t('finalTotal')}
                  </span>
                  <span className="text-primary">
                    {estimatedTotal.toFixed(2)} PLN
                  </span>
                </div>

                {isBelowMinimumOrder && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-red-400">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      {locale === 'pl' ? 'Dostawa od ' : 'Delivery from '}{deliveryMinimumOrderValue.toFixed(2)} PLN
                    </p>
                    <p className="text-[10px] text-red-300 font-light leading-normal font-sans">
                      {locale === 'pl'
                        ? `Do dostawy brakuje ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN.`
                        : `Add ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN more to order.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </PremiumCard>
      </div>

      {/* Floating Bottom Drawer for Mobile View */}
      {basket.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050B1E] border-t border-primary/20 shadow-2xl p-4 flex justify-between items-center gap-4">
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              {t('basketHeader')} ({basket.reduce((sum, i) => sum + i.quantity, 0)})
            </span>
            <span className="text-sm font-bold text-primary font-mono">
              {(itemsSubtotal + packagingTotal).toFixed(2)} PLN
            </span>
          </div>

          <Button 
            onClick={() => setMobileCartOpen(true)}
            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-1.5 shadow"
          >
            <ShoppingBag className="w-4 h-4" />
            {locale === 'pl' ? 'Zobacz koszyk' : 'View basket'}
          </Button>
        </div>
      )}

      {/* Mobile Drawer Modal */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center lg:hidden">
          <div className="w-full bg-[#050B1E] border-t border-primary/20 rounded-t-xl overflow-hidden max-h-[85vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="p-4 border-b border-primary/10 flex justify-between items-center bg-primary/5">
              <h3 className="text-sm font-serif font-bold text-primary uppercase tracking-wider">
                {t('basketHeader')} ({basket.reduce((sum, i) => sum + i.quantity, 0)})
              </h3>
              <button 
                onClick={() => setMobileCartOpen(false)}
                className="text-muted-foreground hover:text-foreground font-bold text-sm focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4 text-left">
              {basket.map((item) => (
                <div key={item.menuItem.id} className="space-y-1.5 pb-3 border-b border-primary/5 text-xs">
                  <div className="flex justify-between items-start gap-1">
                    <div className="font-semibold text-foreground text-sm">
                      {locale === 'pl' ? item.menuItem.name_pl : item.menuItem.name_en}
                    </div>
                    <div className="font-bold text-primary text-sm whitespace-nowrap">
                      {(item.menuItem.price * item.quantity).toFixed(2)} PLN
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                      <button 
                        onClick={() => handleDecreaseQuantity(item.menuItem.id)}
                        className="text-primary hover:text-white p-0.5"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold font-mono text-xs text-foreground w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => handleAddToBasket(item.menuItem)}
                        className="text-primary hover:text-white p-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button 
                      onClick={() => setBasket(prev => prev.filter(i => i.menuItem.id !== item.menuItem.id))}
                      className="text-muted-foreground/50 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder={t('itemNotePlaceholder')}
                    value={item.customerNotes}
                    onChange={(e) => handleUpdateItemNotes(item.menuItem.id, e.target.value)}
                    className="w-full bg-[#070B1E] border border-primary/10 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/25"
                  />
                </div>
              ))}

              {/* Totals */}
              <div className="pt-2 space-y-2.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('subtotal')}</span>
                  <span>{itemsSubtotal.toFixed(2)} PLN</span>
                </div>

                {packagingTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('packagingFee')}</span>
                    <span>{packagingTotal.toFixed(2)} PLN</span>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="flex justify-between items-start gap-1">
                    <span className="flex flex-col text-muted-foreground">
                      <span>{t('deliveryFee')}</span>
                      {deliveryFeeInfo && !deliveryFeeInfo.loading && !deliveryFeeInfo.error && (
                        <span className="text-[9px] text-primary/75 leading-tight">
                          {deliveryFeeInfo.distanceKm.toFixed(1)} km &bull; ~{deliveryFeeInfo.durationMinutes} min
                        </span>
                      )}
                    </span>

                    {!deliveryFeeInfo || (!deliveryFeeInfo.loading && !deliveryFeeInfo.error && !deliveryFeeInfo.action) ? (
                      <span className="text-primary font-bold italic">{t('deliveryFeeTbd')}</span>
                    ) : deliveryFeeInfo.loading ? (
                      <span className="text-primary/60 italic text-[10px] animate-pulse">
                        {locale === 'pl' ? 'Obliczam...' : 'Calculating...'}
                      </span>
                    ) : deliveryFeeInfo.error ? (
                      <span className="text-primary font-bold italic">{t('deliveryFeeTbd')}</span>
                    ) : deliveryFeeInfo.action === 'block' ? (
                      <span className="text-red-400 font-medium text-[10px]">
                        {locale === 'pl' ? 'Poza zasięgiem' : 'Out of range'}
                      </span>
                    ) : deliveryFeeInfo.action === 'contact' ? (
                      <span className="text-amber-400 font-medium italic text-[10px]">
                        {locale === 'pl' ? 'Do ustalenia' : 'To confirm'}
                      </span>
                    ) : (
                      <span className="text-primary font-bold">
                        {deliveryFeeInfo.fee === 0 ? (locale === 'pl' ? 'Bezpłatna' : 'Free') : `${deliveryFeeInfo.fee.toFixed(2)} PLN`}
                      </span>
                    )}
                  </div>
                )}

                {/* Delivery zone info messages */}
                {orderType === 'delivery' && deliveryFeeInfo && !deliveryFeeInfo.loading && (
                  <>
                    {/* Generic errors */}
                    {deliveryFeeInfo.error && deliveryFeeInfo.errorCode !== 'NO_ZONE' && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded text-[10px]">
                        {deliveryFeeInfo.error}
                      </div>
                    )}

                    {/* Address outside all zones */}
                    {(deliveryFeeInfo.errorCode === 'NO_ZONE' || (!deliveryFeeInfo.error && deliveryFeeInfo.action === 'block')) && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-200 rounded text-[10px] leading-relaxed space-y-1.5">
                        <p className="font-bold text-red-300">
                          {locale === 'pl'
                            ? 'Nie dostarczamy pod ten adres.'
                            : 'We cannot deliver to this address.'}
                        </p>
                        <p>
                          {locale === 'pl' ? 'Zadzwoń: ' : 'Call us: '}
                          <a href={`tel:${restaurantInfo.phone}`} className="font-bold text-primary underline">
                            {restaurantInfo.phone}
                          </a>
                        </p>
                        <p>
                          <Link href={`/${locale}/contact`} className="text-primary/80 underline">
                            {locale === 'pl' ? 'Strona kontaktowa →' : 'Contact page →'}
                          </Link>
                        </p>
                      </div>
                    )}

                    {/* Contact zone */}
                    {!deliveryFeeInfo.error && deliveryFeeInfo.action === 'contact' && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-200 rounded text-[10px] leading-relaxed space-y-1">
                        <p className="font-bold text-amber-300">
                          {locale === 'pl' ? 'Dostawa do potwierdzenia' : 'Delivery needs confirmation'}
                        </p>
                        <p>
                          {locale === 'pl'
                            ? 'Zadzwoń, żebyśmy mogli potwierdzić dostawę.'
                            : 'Call us to confirm delivery to your area.'}
                        </p>
                        <p>
                          <a href={`tel:${restaurantInfo.phone}`} className="font-bold text-primary underline">
                            {restaurantInfo.phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-primary/15">
                  <span>
                    {orderType === 'delivery' ? t('estimatedTotal') : t('finalTotal')}
                  </span>
                  <span className="text-primary">
                    {estimatedTotal.toFixed(2)} PLN
                  </span>
                </div>

                {isBelowMinimumOrder && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-200 rounded text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-red-400">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      {locale === 'pl' ? 'Dostawa od ' : 'Delivery from '}{deliveryMinimumOrderValue.toFixed(2)} PLN
                    </p>
                    <p className="text-[10px] text-red-300 font-light leading-normal font-sans">
                      {locale === 'pl'
                        ? `Do dostawy brakuje ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN.`
                        : `Add ${(deliveryMinimumOrderValue - itemsSubtotal).toFixed(2)} PLN more to order.`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-primary/10 bg-[#070B1E] flex gap-3">
              <Button 
                onClick={() => setMobileCartOpen(false)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider py-2.5"
              >
                {locale === 'pl' ? 'Wróć do zamawiania' : 'Continue checkout'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
