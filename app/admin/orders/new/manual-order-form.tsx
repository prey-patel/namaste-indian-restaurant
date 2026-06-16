"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Search, Trash2, Plus, Minus, ShoppingBag, 
  MapPin, CreditCard, Check, AlertCircle, Info, Calendar, 
  User, Phone, Mail, Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PremiumCard from "@/components/ui/premium-card";
import GoldSpinner from "@/components/ui/gold-spinner";

import { 
  createManualOrderAction, 
  calculateManualOrderTotalsAction, 
  lookupPostalCodeAction 
} from "./actions";

interface MenuItem {
  id: string;
  name_pl: string;
  name_en: string;
  price: string;
  is_available: boolean;
  is_active: boolean;
  is_deleted: boolean;
  category_id: string;
}

interface Category {
  id: string;
  name_pl: string;
  name_en: string;
}

interface BasketItem {
  menu_item_id: string;
  name_pl: string;
  name_en: string;
  price: number;
  quantity: number;
  customer_notes: string;
}

interface Props {
  menuItems: MenuItem[];
  categories: Category[];
}

export default function ManualOrderForm({ menuItems, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 1. Customer Details State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerLanguage, setCustomerLanguage] = useState<"pl" | "en">("pl");

  // 2. Order Settings State
  const [orderType, setOrderType] = useState<"takeaway" | "delivery">("takeaway");
  const handleSetOrderType = (type: "takeaway" | "delivery") => {
    setOrderType(type);
    if (type === "delivery") {
      const unavailableInBasket = basket.filter(basketItem => {
        const menuItem = menuItems.find(m => m.id === basketItem.menu_item_id);
        return menuItem && !menuItem.is_available;
      });

      if (unavailableInBasket.length > 0) {
        setBasket(prev => prev.filter(basketItem => {
          const menuItem = menuItems.find(m => m.id === basketItem.menu_item_id);
          return menuItem ? menuItem.is_available : true;
        }));
        
        const names = unavailableInBasket.map(b => customerLanguage === "en" ? b.name_en : b.name_pl).join(", ");
        setErrorMsg(`Removed items not available for delivery: ${names}`);
      }
    }
  };
  const [orderSource, setOrderSource] = useState<"phone" | "walk_in" | "admin">("phone");
  const [customerNotes, setCustomerNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_pickup" | "card_on_pickup" | "cash_on_delivery" | "card_on_delivery">("cash_on_pickup");
  const [orderStatus, setOrderStatus] = useState<"approved" | "pending">("approved");
  const [sendCustomerEmail, setSendCustomerEmail] = useState(true);

  // 3. Basket State
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // 4. Fulfillment Details State
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(30); // Default 30 min ETA
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Ciechanów");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isFeeManuallySet, setIsFeeManuallySet] = useState(false);

  // 5. Menu Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // 6. Live Totals (Server Calculated)
  const [totals, setTotals] = useState({ subtotal: 0, packagingTotal: 0, totalAmount: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [feeStatus, setFeeStatus] = useState<{ calculated: boolean; error: string | null }>({ calculated: false, error: null });

  // Update default payment method when order type changes
  useEffect(() => {
    if (orderType === "takeaway") {
      setPaymentMethod("cash_on_pickup");
    } else {
      setPaymentMethod("cash_on_delivery");
    }
  }, [orderType]);

  // Format postal code dynamically as XX-XXX
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 5) val = val.substring(0, 5);
    if (val.length > 2) {
      val = val.substring(0, 2) + "-" + val.substring(2);
    }
    setDeliveryPostalCode(val);
  };

  // Real-time Postal Code DB lookup
  useEffect(() => {
    if (orderType === "delivery" && deliveryPostalCode.length === 6) {
      setErrorMsg(null);
      startTransition(async () => {
        const res = await lookupPostalCodeAction(deliveryPostalCode);
        if (res.success && res.fee !== undefined) {
          setDeliveryFee(res.fee);
          setIsFeeManuallySet(false);
          setFeeStatus({ calculated: true, error: null });
        } else {
          setFeeStatus({ calculated: false, error: res.error || "No postal code zone matched." });
        }
      });
    } else {
      setFeeStatus({ calculated: false, error: null });
    }
  }, [deliveryPostalCode, orderType]);

  // Recalculate totals server-side when basket changes or delivery fee changes
  useEffect(() => {
    if (basket.length === 0) {
      setTotals({ subtotal: 0, packagingTotal: 0, totalAmount: 0 });
      return;
    }

    setIsCalculating(true);
    const delayDebounce = setTimeout(() => {
      startTransition(async () => {
        const items = basket.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity
        }));
        const res = await calculateManualOrderTotalsAction(items, orderType, deliveryFee);
        setIsCalculating(false);
        if (res.success && res.subtotal !== undefined) {
          setTotals({
            subtotal: res.subtotal,
            packagingTotal: res.packagingTotal || 0,
            totalAmount: res.totalAmount || 0
          });
        } else {
          setErrorMsg(res.error || "Totals calculation failed.");
        }
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [basket, orderType, deliveryFee]);

  // Disable customer email if email is empty
  useEffect(() => {
    if (!customerEmail.trim()) {
      setSendCustomerEmail(false);
    } else {
      setSendCustomerEmail(true);
    }
  }, [customerEmail]);

  // Basket Handlers
  const handleAddToBasket = (item: MenuItem) => {
    const existing = basket.find(b => b.menu_item_id === item.id);
    if (existing) {
      setBasket(basket.map(b => b.menu_item_id === item.id 
        ? { ...b, quantity: Math.min(50, b.quantity + 1) } 
        : b
      ));
    } else {
      setBasket([...basket, {
        menu_item_id: item.id,
        name_pl: item.name_pl,
        name_en: item.name_en,
        price: Number(item.price),
        quantity: 1,
        customer_notes: ""
      }]);
    }
  };

  const handleRemoveFromBasket = (itemId: string) => {
    setBasket(basket.filter(b => b.menu_item_id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, increment: boolean) => {
    setBasket(basket.map(b => {
      if (b.menu_item_id === itemId) {
        const nextQty = increment ? b.quantity + 1 : b.quantity - 1;
        return { ...b, quantity: Math.max(1, Math.min(50, nextQty)) };
      }
      return b;
    }));
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setBasket(basket.map(b => b.menu_item_id === itemId 
      ? { ...b, customer_notes: notes } 
      : b
    ));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (basket.length === 0) {
      setErrorMsg("Select at least 1 menu item.");
      return;
    }

    const payload = {
      customer_name: customerName,
      customer_email: customerEmail.trim() || null,
      customer_phone: customerPhone,
      order_type: orderType,
      source: orderSource,
      customer_notes: customerNotes || null,
      admin_notes: adminNotes || null,
      payment_method: paymentMethod,
      delivery_address: orderType === "delivery" ? deliveryAddress : null,
      delivery_postal_code: orderType === "delivery" ? deliveryPostalCode : null,
      delivery_city: orderType === "delivery" ? deliveryCity : null,
      delivery_fee: orderType === "delivery" ? deliveryFee : 0,
      estimated_time_minutes: prepTimeMinutes,
      status: orderStatus,
      send_customer_email: sendCustomerEmail,
      items: basket.map(b => ({
        menu_item_id: b.menu_item_id,
        quantity: b.quantity,
        customer_notes: b.customer_notes || null
      }))
    };

    startTransition(async () => {
      const res = await createManualOrderAction(payload);
      if (res.success) {
        setSuccessMsg("Order created successfully! Redirecting...");
        setBasket([]);
        setTimeout(() => {
          router.push("/admin/orders");
        }, 1500);
      } else {
        setErrorMsg(res.error || "Order creation failed.");
      }
    });
  };

  // Filter Menu Items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = 
      item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name_pl.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategoryId === "all" || 
      item.category_id === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[#EAE3D2] pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button type="button" variant="outline" className="h-9 w-9 p-0 border-[#EAE3D2] bg-white text-[#5C4D3C] hover:bg-[#FAF9F5]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#3D2C1E]">
              New Manual Order
            </h1>
            <p className="text-xs text-muted-foreground">Phone / Walk-in order management panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            type="submit" 
            disabled={isPending || basket.length === 0}
            className="bg-[#9E690A] hover:bg-[#855807] active:bg-[#6C4705] text-white font-semibold text-sm px-6 h-10 shadow-sm disabled:opacity-50"
          >
            {isPending ? <GoldSpinner className="w-4 h-4 mr-2" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
            Save & Create Order
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-start gap-2.5 shadow-xs">
          <Check className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column (Form sections & Menu) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Customer Details */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#FAF9F5] pb-2">
              <User className="w-4 h-4 text-[#9E690A]" />
              <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Customer Info</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Customer Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] focus:ring-1 focus:ring-[#9E690A] bg-white text-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Phone Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. +48 511 984 331"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] focus:ring-1 focus:ring-[#9E690A] bg-white text-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Email Address (Optional)</label>
                <input 
                  type="email" 
                  placeholder="e.g. customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] focus:ring-1 focus:ring-[#9E690A] bg-white text-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Customer Language</label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    onClick={() => setCustomerLanguage("pl")}
                    className={`flex-1 h-10 text-xs border ${customerLanguage === "pl" ? "bg-[#9E690A] text-white border-[#9E690A]" : "bg-white text-[#3D2C1E] border-[#EAE3D2] hover:bg-[#FAF9F5]"} font-semibold flex items-center justify-center gap-1.5`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Polish (PL)
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setCustomerLanguage("en")}
                    className={`flex-1 h-10 text-xs border ${customerLanguage === "en" ? "bg-[#9E690A] text-white border-[#9E690A]" : "bg-white text-[#3D2C1E] border-[#EAE3D2] hover:bg-[#FAF9F5]"} font-semibold flex items-center justify-center gap-1.5`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    English (EN)
                  </Button>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Card 2: Order Type & Source */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#FAF9F5] pb-2">
              <Info className="w-4 h-4 text-[#9E690A]" />
              <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Order Settings</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Order Type *</label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    onClick={() => handleSetOrderType("takeaway")}
                    className={`flex-1 h-10 text-xs border ${orderType === "takeaway" ? "bg-[#9E690A] text-white border-[#9E690A]" : "bg-white text-[#3D2C1E] border-[#EAE3D2] hover:bg-[#FAF9F5]"} font-semibold`}
                  >
                    Takeaway / Wynos
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => handleSetOrderType("delivery")}
                    className={`flex-1 h-10 text-xs border ${orderType === "delivery" ? "bg-[#9E690A] text-white border-[#9E690A]" : "bg-white text-[#3D2C1E] border-[#EAE3D2] hover:bg-[#FAF9F5]"} font-semibold`}
                  >
                    Delivery / Dostawa
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Order Source</label>
                <select 
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value as any)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                >
                  <option value="phone">Phone Call</option>
                  <option value="walk_in">Walk-in Customer</option>
                  <option value="admin">Admin Panel</option>
                </select>
              </div>
            </div>
          </PremiumCard>

          {/* Card 3: Menu Item Selection */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#9E690A]" />
                <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Select Dishes</h2>
              </div>
              
              {/* Category selector */}
              <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
                <Button 
                  type="button"
                  onClick={() => setSelectedCategoryId("all")}
                  className={`h-7 px-2.5 text-[10px] uppercase font-bold rounded-full ${selectedCategoryId === "all" ? "bg-[#9E690A] text-white" : "bg-[#FAF9F5] text-[#5C4D3C] hover:bg-[#EAE3D2]"}`}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button 
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`h-7 px-2.5 text-[10px] uppercase font-bold rounded-full ${selectedCategoryId === cat.id ? "bg-[#9E690A] text-white" : "bg-[#FAF9F5] text-[#5C4D3C] hover:bg-[#EAE3D2]"}`}
                  >
                    {customerLanguage === "en" ? cat.name_en : cat.name_pl}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search dishes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
              />
            </div>

            {/* Menu Items List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredMenuItems.map(item => {
                const isAvailable = item.is_active && !item.is_deleted && (orderType === "takeaway" || item.is_available);
                return (
                  <div 
                    key={item.id}
                    className={`p-3 border rounded-lg flex items-center justify-between gap-3 bg-[#FAF9F5]/40 transition-all ${
                      isAvailable ? "border-[#EAE3D2] hover:border-[#9E690A]" : "border-[#EAE3D2]/40 opacity-50"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#3D2C1E]">
                        {customerLanguage === "en" ? item.name_en : item.name_pl}
                      </p>
                      <p className="text-[11px] font-semibold text-[#9E690A]">
                        {Number(item.price).toFixed(2)} PLN
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleAddToBasket(item)}
                      className="h-8 px-3 border border-[#9E690A] text-[#9E690A] bg-white hover:bg-[#9E690A] hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
              {filteredMenuItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center col-span-2 py-6">No matching dishes found.</p>
              )}
            </div>
          </PremiumCard>

        </div>

        {/* Right column (Basket, Fulfillment, Totals) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 4: Basket */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#FAF9F5] pb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#9E690A]" />
                <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Basket</h2>
              </div>
              <span className="text-[11px] font-bold bg-[#FAF9F5] text-[#9E690A] px-2 py-0.5 rounded-full border border-[#EAE3D2]">
                {basket.reduce((sum, b) => sum + b.quantity, 0)} items
              </span>
            </div>

            {/* Basket items list */}
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {basket.map(item => (
                <div key={item.menu_item_id} className="border-b border-[#FAF9F5] pb-3 space-y-2 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#3D2C1E]">
                        {customerLanguage === "en" ? item.name_en : item.name_pl}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(item.price * item.quantity).toFixed(2)} PLN (Subtotal)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-[#EAE3D2] rounded bg-white">
                        <button 
                          type="button" 
                          onClick={() => handleUpdateQuantity(item.menu_item_id, false)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-[#FAF9F5] text-muted-foreground hover:text-black transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button 
                          type="button" 
                          onClick={() => handleUpdateQuantity(item.menu_item_id, true)}
                          className="h-7 w-7 flex items-center justify-center hover:bg-[#FAF9F5] text-muted-foreground hover:text-black transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFromBasket(item.menu_item_id)}
                        className="h-7 w-7 flex items-center justify-center text-rose-600 hover:bg-rose-50 border border-transparent rounded hover:border-rose-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Item notes input */}
                  <input 
                    type="text" 
                    placeholder="Item-level notes (e.g. no onion, extra spicy)"
                    value={item.customer_notes}
                    onChange={(e) => handleUpdateItemNotes(item.menu_item_id, e.target.value)}
                    className="w-full h-8 px-2 border border-[#EAE3D2] rounded text-[11px] focus:outline-none focus:border-[#9E690A] bg-[#FAF9F5]/20 text-black"
                  />
                </div>
              ))}
              {basket.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <p>Basket is empty.</p>
                  <p className="text-[10px]">Add dishes from the menu selector.</p>
                </div>
              )}
            </div>
          </PremiumCard>

          {/* Card 5: Fulfillment Details */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#FAF9F5] pb-2">
              <Calendar className="w-4 h-4 text-[#9E690A]" />
              <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Fulfillment & Address</h2>
            </div>

            {/* ETA Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                {orderType === "delivery" ? "Delivery ETA" : "Pickup ETA"} (Minutes)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[15, 30, 45, 60, 90].map(mins => (
                  <Button 
                    key={mins}
                    type="button"
                    onClick={() => setPrepTimeMinutes(mins)}
                    className={`h-8 text-xs border ${prepTimeMinutes === mins ? "bg-[#9E690A] text-white border-[#9E690A]" : "bg-white text-[#3D2C1E] border-[#EAE3D2] hover:bg-[#FAF9F5]"} font-semibold p-0`}
                  >
                    {mins}m
                  </Button>
                ))}
              </div>
            </div>

            {/* Address fields (Conditional on Delivery) */}
            <div className={orderType === "delivery" ? "space-y-3 pt-2 border-t border-[#FAF9F5]" : "hidden"}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Street Address *</label>
                <input 
                  type="text" 
                  required={orderType === "delivery"}
                  placeholder="e.g. Warszawska 10/2"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">Postal Code *</label>
                  <input 
                    type="text" 
                    required={orderType === "delivery"}
                    placeholder="XX-XXX (e.g. 06-400)"
                    value={deliveryPostalCode}
                    onChange={handlePostalCodeChange}
                    autoComplete="new-password"
                    className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">City *</label>
                  <input 
                    type="text" 
                    required={orderType === "delivery"}
                    placeholder="e.g. Ciechanów"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    autoComplete="new-password"
                    className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                  />
                </div>
              </div>

              {/* Delivery Fee Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground block">Delivery Fee (PLN)</label>
                  {feeStatus.calculated && (
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Zone Match
                    </span>
                  )}
                  {isFeeManuallySet && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                      Manually Set
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={deliveryFee || ""}
                    onChange={(e) => {
                      setDeliveryFee(Number(e.target.value));
                      setIsFeeManuallySet(true);
                    }}
                    autoComplete="new-password"
                    className="w-full h-10 pl-3 pr-10 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                  />
                  <span className="absolute right-3 top-3 text-xs text-muted-foreground">PLN</span>
                </div>
                {feeStatus.error && (
                  <p className="text-[10px] text-amber-700 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {feeStatus.error} Entering manually.
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1 pt-2 border-t border-[#FAF9F5]">
              <label className="text-xs font-semibold text-muted-foreground block">Payment Method *</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-10 pl-9 pr-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                >
                  {orderType === "takeaway" ? (
                    <>
                      <option value="cash_on_pickup">Cash on Pickup</option>
                      <option value="card_on_pickup">Card on Pickup</option>
                    </>
                  ) : (
                    <>
                      <option value="cash_on_delivery">Cash on Delivery</option>
                      <option value="card_on_delivery">Card on Delivery</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </PremiumCard>

          {/* Card 6: Totals & Submit */}
          <PremiumCard hoverable={false} className="border-[#EAE3D2] bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#FAF9F5] pb-2">
              <Info className="w-4 h-4 text-[#9E690A]" />
              <h2 className="text-sm font-serif font-black uppercase tracking-wider text-[#3D2C1E]">Totals & Confirmation</h2>
            </div>

            {/* Totals Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-bold text-[#3D2C1E]">{totals.subtotal.toFixed(2)} PLN</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Packaging:</span>
                <span className="font-bold text-[#3D2C1E]">{totals.packagingTotal.toFixed(2)} PLN</span>
              </div>
              {orderType === "delivery" ? (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Delivery Fee:</span>
                  <span className="font-bold text-[#3D2C1E]">{deliveryFee.toFixed(2)} PLN</span>
                </div>
              ) : null}
              
              <div className="flex items-center justify-between border-t border-[#EAE3D2] pt-2 text-base font-serif font-black text-[#3D2C1E]">
                <span>Total Amount:</span>
                <div className="flex items-center gap-2">
                  {isCalculating && <GoldSpinner className="w-4 h-4" />}
                  <span>{totals.totalAmount.toFixed(2)} PLN</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-3 pt-2 border-t border-[#FAF9F5]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Customer Notes (Printed on bill)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Allergy warning, gate code"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Admin Notes (Internal only)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Frequent customer, promo exception"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full h-10 px-3 border border-[#EAE3D2] rounded-md text-sm focus:outline-none focus:border-[#9E690A] bg-white text-black"
                />
              </div>
            </div>

            {/* Actions checkboxes */}
            <div className="space-y-2 pt-2 border-t border-[#FAF9F5]">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#5C4D3C] cursor-pointer">
                <input 
                  type="checkbox"
                  disabled={!customerEmail.trim()}
                  checked={sendCustomerEmail}
                  onChange={(e) => setSendCustomerEmail(e.target.checked)}
                  className="rounded border-[#EAE3D2] text-[#9E690A] focus:ring-[#9E690A] h-4 w-4"
                />
                Send confirmation email to customer
              </label>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-semibold text-muted-foreground">Immediate KDS Approval:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-emerald-800">
                    <input 
                      type="radio"
                      name="order_status_toggle"
                      checked={orderStatus === "approved"}
                      onChange={() => setOrderStatus("approved")}
                      className="text-[#9E690A] focus:ring-[#9E690A]"
                    />
                    Approved (Default)
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-amber-800">
                    <input 
                      type="radio"
                      name="order_status_toggle"
                      checked={orderStatus === "pending"}
                      onChange={() => setOrderStatus("pending")}
                      className="text-[#9E690A] focus:ring-[#9E690A]"
                    />
                    Pending
                  </label>
                </div>
              </div>
            </div>

            {/* Error messaging inside Card */}
            {basket.length === 0 && (
              <p className="text-[10px] text-rose-700 leading-normal text-center mt-2 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                You must add at least one dish before creating this order.
              </p>
            )}

          </PremiumCard>

        </div>

      </div>

    </form>
  );
}
