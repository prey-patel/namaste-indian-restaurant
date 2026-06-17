'use client';

import React, { useState } from 'react';
import { 
  Store, 
  Clock, 
  Settings2, 
  Calendar, 
  Truck, 
  Coins, 
  CalendarOff, 
  Globe, 
  Lock, 
  Save, 
  Info,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { 
  updateRestaurantProfileAction, 
  updateOperationalStatusAction, 
  updateServiceHoursAction, 
  updateReservationSettingsAction, 
  updateDeliveryTakeawaySettingsAction, 
  updateFeeSettingsAction,
  createHolidayClosureAction,
  updateHolidayClosureAction,
  deleteHolidayClosureAction
} from './actions';

type TabType = 'profile' | 'hours' | 'status' | 'reservations' | 'delivery' | 'fees' | 'holidays' | 'region' | 'security';

type SettingsClientProps = {
  profile: { role: string; is_active: boolean };
  systemSettings: Record<string, any>;
  operationalStatus: any;
  serviceHours: any[];
  deliveryZones: any[];
  deliveryRules: any[];
  packagingFees: any[];
  holidayClosures: any[];
};

export default function SettingsClient({
  profile,
  systemSettings,
  operationalStatus,
  serviceHours,
  deliveryZones: initialZones,
  deliveryRules: initialRules,
  packagingFees: initialFees,
  holidayClosures: initialClosures
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    restaurant_name: systemSettings.restaurant_name || 'Namaste Indian Restaurant',
    public_display_name: systemSettings.public_display_name || 'Namaste Indian Restaurant',
    restaurant_address: systemSettings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland',
    restaurant_city: systemSettings.restaurant_city || 'Ciechanów',
    restaurant_postal_code: systemSettings.restaurant_postal_code || '06-400',
    restaurant_country: systemSettings.restaurant_country || 'Poland',
    restaurant_phone: systemSettings.restaurant_phone || '511984331',
    restaurant_email: systemSettings.restaurant_email || 'contact@namasteciechanow.pl',
    site_url: systemSettings.site_url || 'https://namasteciechanow.pl',
    google_maps_link: systemSettings.google_maps_link || '',
    short_description: systemSettings.short_description || ''
  });

  // Operational Status Form State
  const [opStatusForm, setOpStatusForm] = useState({
    id: operationalStatus?.id || '',
    delivery_enabled: operationalStatus?.delivery_enabled ?? true,
    takeaway_enabled: operationalStatus?.takeaway_enabled ?? true,
    reservations_enabled: operationalStatus?.reservations_enabled ?? true,
    dine_in_status: operationalStatus?.dine_in_status || 'open',
    kitchen_busy_mode: operationalStatus?.kitchen_busy_mode ?? false,
    temporary_message_pl: operationalStatus?.temporary_message_pl || '',
    temporary_message_en: operationalStatus?.temporary_message_en || '',
    estimated_delay_minutes: operationalStatus?.estimated_delay_minutes ?? 0
  });

  // Weekly Service Hours State
  const [hoursState, setHoursState] = useState(serviceHours);

  // Reservation Settings State
  const [reservationForm, setReservationForm] = useState({
    reservation_max_guests: Number(systemSettings.reservation_max_guests ?? 8),
    reservation_min_lead_time_hours: Number(systemSettings.reservation_min_lead_time_hours ?? 2),
    reservation_max_days_ahead: Number(systemSettings.reservation_max_days_ahead ?? 30),
    reservation_contact_instructions: systemSettings.reservation_contact_instructions || ''
  });

  // Delivery & Takeaway States
  const [zonesState, setZonesState] = useState(initialZones);
  const [rulesState, setRulesState] = useState(initialRules);
  const [deliveryMinOrderValue, setDeliveryMinOrderValue] = useState<number>(
    Number(systemSettings.delivery_minimum_order_value ?? 0)
  );

  // Charges & Fees State
  const [feesState, setFeesState] = useState(initialFees);

  // Holiday Closures State & Form
  const [closuresState, setClosuresState] = useState(initialClosures);
  const [newClosure, setNewClosure] = useState({
    date: '',
    title_pl: '',
    title_en: '',
    affected_service: 'all' as any,
    is_closed: true,
    message_pl: '',
    message_en: ''
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 1. Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateRestaurantProfileAction(profileForm);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Restaurant profile details saved successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to save profile details.');
    }
  };

  // 2. Save Operational Status
  const handleSaveOpStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateOperationalStatusAction(opStatusForm);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Operational status updated successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to update operational status.');
    }
  };

  // 3. Save Service Hours
  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = hoursState.map(h => ({
      id: h.id,
      open_time: h.open_time,
      close_time: h.close_time,
      is_closed: h.is_closed,
      min_lead_time_minutes: Number(h.min_lead_time_minutes),
      max_preorder_days: Number(h.max_preorder_days)
    }));
    const res = await updateServiceHoursAction(payload);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Opening hours matrix updated successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to update opening hours.');
    }
  };

  // 4. Save Reservation Rules
  const handleSaveReservations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateReservationSettingsAction(reservationForm);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Table reservation settings updated successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to update reservation rules.');
    }
  };

  // 5. Save Delivery & Takeaway
  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateDeliveryTakeawaySettingsAction({
      zones: zonesState.map(z => ({
        id: z.id,
        radius_km: z.radius_km ? Number(z.radius_km) : null,
        min_order_amount: Number(z.min_order_amount),
        delivery_fee: Number(z.delivery_fee),
        estimated_delivery_minutes: Number(z.estimated_delivery_minutes),
        is_active: z.is_active
      })),
      rules: rulesState.map((r, i) => ({
        id: r.id,
        isNew: r.isNew ?? false,
        name: r.name || `Zone ${i + 1}`,
        min_distance_km: Number(r.min_distance_km),
        max_distance_km: r.max_distance_km ? Number(r.max_distance_km) : null,
        fee_amount: Number(r.fee_amount),
        rule_action: r.rule_action,
        message_pl: r.message_pl || null,
        message_en: r.message_en || null,
        is_active: r.is_active
      })),
      delivery_minimum_order_value: Number(deliveryMinOrderValue)
    });
    setIsSaving(false);
    if (res.success) {
      // Mark all zones as no longer new after successful save
      setRulesState(prev => prev.map(r => ({ ...r, isNew: false })));
      showFeedback('success', 'Delivery settings updated successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to update delivery rules.');
    }
  };

  // 6. Save Packaging Fees
  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateFeeSettingsAction({
      packaging_fees: feesState.map(f => ({
        id: f.id,
        amount: Number(f.amount),
        is_active: f.is_active
      }))
    });
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Packaging fee structures updated successfully.');
    } else {
      showFeedback('error', res.error || 'Failed to update packaging fees.');
    }
  };

  // 7. Holiday Closures Actions
  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClosure.date || !newClosure.title_pl || !newClosure.title_en) {
      showFeedback('error', 'Please fill in date and title fields.');
      return;
    }
    setIsSaving(true);
    const res = await createHolidayClosureAction(newClosure);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'New temporary closure created successfully.');
      // Refresh closures (in a real app, the server component updates, here we update client state temporarily for responsiveness)
      setClosuresState([...closuresState, { ...newClosure, id: Math.random().toString() }]);
      setNewClosure({
        date: '',
        title_pl: '',
        title_en: '',
        affected_service: 'all',
        is_closed: true,
        message_pl: '',
        message_en: ''
      });
    } else {
      showFeedback('error', res.error || 'Failed to create temporary closure.');
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this closure date?')) return;
    setIsSaving(true);
    const res = await deleteHolidayClosureAction(id);
    setIsSaving(false);
    if (res.success) {
      showFeedback('success', 'Closure deleted successfully.');
      setClosuresState(closuresState.filter(c => c.id !== id));
    } else {
      showFeedback('error', res.error || 'Failed to delete closure.');
    }
  };

  const getDayName = (dayIdx: number) => {
    const days = [
      { pl: 'Niedziela', en: 'Sunday' },
      { pl: 'Poniedziałek', en: 'Monday' },
      { pl: 'Wtorek', en: 'Tuesday' },
      { pl: 'Środa', en: 'Wednesday' },
      { pl: 'Czwartek', en: 'Thursday' },
      { pl: 'Piątek', en: 'Friday' },
      { pl: 'Sobota', en: 'Saturday' }
    ];
    return days[dayIdx] || { pl: '', en: '' };
  };

  // Tab Details helper
  const sidebarTabs = [
    { type: 'profile' as TabType, label: 'Restaurant Profile', icon: Store },
    { type: 'hours' as TabType, label: 'Opening Hours', icon: Clock },
    { type: 'status' as TabType, label: 'Operational Status', icon: Settings2 },
    { type: 'reservations' as TabType, label: 'Reservations', icon: Calendar },
    { type: 'delivery' as TabType, label: 'Delivery & Takeaway', icon: Truck },
    { type: 'fees' as TabType, label: 'Charges & Fees', icon: Coins },
    { type: 'holidays' as TabType, label: 'Holiday Closures', icon: CalendarOff },
    { type: 'region' as TabType, label: 'Language & Region', icon: Globe },
    { type: 'security' as TabType, label: 'Security & Access', icon: Lock }
  ];

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto pb-12">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-primary/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your restaurant configuration. Changes update live across the website immediately.
          </p>
        </div>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-primary/30 hover:border-primary/80 hover:bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg transition-all duration-300"
        >
          View Public Site <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Floating feedback message */}
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border text-sm max-w-md animate-slide-up ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Navigation Sidebar Tabs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-2 space-y-1">
            {sidebarTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.type;
              return (
                <button
                  key={tab.type}
                  onClick={() => {
                    setActiveTab(tab.type);
                    setMessage(null);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 text-left ${
                    isActive 
                      ? 'bg-[#0A192F] text-white' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground/80'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 flex items-start space-x-3 text-xs text-green-800 dark:text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0 animate-pulse" />
            <p className="font-medium leading-relaxed">
              All changes are saved instantly and reflected on the website.
            </p>
          </div>
        </div>

        {/* Right Column: Settings Cards forms */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
          
          {/* TAB 1: RESTAURANT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-primary">Restaurant Profile</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage your restaurant&apos;s basic information that is displayed on the website.</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border bg-green-500/10 text-green-700 border-green-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" /> Live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Restaurant Name *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.restaurant_name}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_name: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Public Display Name *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.public_display_name}
                    onChange={e => setProfileForm({ ...profileForm, public_display_name: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Address *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.restaurant_address}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_address: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">City *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.restaurant_city}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_city: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Postal Code *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.restaurant_postal_code}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_postal_code: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Country *</label>
                  <select 
                    value={profileForm.restaurant_country}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_country: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  >
                    <option value="Poland">Poland</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number *</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.restaurant_phone}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_phone: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={profileForm.restaurant_email}
                    onChange={e => setProfileForm({ ...profileForm, restaurant_email: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Website URL</label>
                  <input 
                    type="text" 
                    required
                    value={profileForm.site_url}
                    onChange={e => setProfileForm({ ...profileForm, site_url: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Google Maps Link</label>
                  <input 
                    type="text" 
                    value={profileForm.google_maps_link}
                    onChange={e => setProfileForm({ ...profileForm, google_maps_link: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Short Description</label>
                  <textarea 
                    value={profileForm.short_description}
                    onChange={e => setProfileForm({ ...profileForm, short_description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-lg text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>These details are shown on the website footer, contact page, reservation and order pages.</span>
              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: OPENING HOURS */}
          {activeTab === 'hours' && (
            <form onSubmit={handleSaveHours} className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Opening & Service Hours</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage weekly hours for Dine-In, Table Reservations, Delivery, and Takeaway services.</p>
              </div>

              <div className="space-y-6">
                {Array.from({ length: 7 }).map((_, dayOfWeek) => {
                  const dayName = getDayName(dayOfWeek);
                  const slotsForDay = hoursState.filter(h => h.day_of_week === dayOfWeek);

                  return (
                    <div key={dayOfWeek} className="border border-border rounded-lg overflow-hidden bg-muted/5 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-primary/5 pb-2">
                        <span className="text-sm font-bold text-[#0A192F]">{dayName.en} / {dayName.pl}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {slotsForDay.map(slot => (
                          <div key={slot.id} className="space-y-2 border border-border/40 p-2.5 rounded bg-white">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-extrabold uppercase text-primary tracking-widest">{slot.service_type.replace('_', ' ')}</span>
                              <label className="inline-flex items-center cursor-pointer scale-75">
                                <input 
                                  type="checkbox" 
                                  checked={!slot.is_closed}
                                  onChange={e => {
                                    const updated = hoursState.map(h => h.id === slot.id ? { ...h, is_closed: !e.target.checked } : h);
                                    setHoursState(updated);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600" />
                              </label>
                            </div>
                            
                            {!slot.is_closed ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[8px] font-bold text-muted-foreground uppercase block">Open</label>
                                  <input 
                                    type="time" 
                                    value={slot.open_time.slice(0, 5)}
                                    onChange={e => {
                                      const updated = hoursState.map(h => h.id === slot.id ? { ...h, open_time: `${e.target.value}:00` } : h);
                                      setHoursState(updated);
                                    }}
                                    className="w-full bg-[#FAF9F5] border border-border rounded px-1.5 py-1 text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-bold text-muted-foreground uppercase block">Close</label>
                                  <input 
                                    type="time" 
                                    value={slot.close_time.slice(0, 5)}
                                    onChange={e => {
                                      const updated = hoursState.map(h => h.id === slot.id ? { ...h, close_time: `${e.target.value}:00` } : h);
                                      setHoursState(updated);
                                    }}
                                    className="w-full bg-[#FAF9F5] border border-border rounded px-1.5 py-1 text-xs outline-none"
                                  />
                                </div>
                                {slot.service_type === 'reservations' && (
                                  <div>
                                    <label className="text-[8px] font-bold text-muted-foreground uppercase block">Max Days Ahead</label>
                                    <input 
                                      type="number" 
                                      value={slot.max_preorder_days}
                                      onChange={e => {
                                        const updated = hoursState.map(h => h.id === slot.id ? { ...h, max_preorder_days: e.target.value } : h);
                                        setHoursState(updated);
                                      }}
                                      className="w-full bg-[#FAF9F5] border border-border rounded px-1.5 py-1 text-xs outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-24 flex items-center justify-center text-xs text-red-500 font-bold bg-red-500/5 border border-red-500/10 rounded">
                                Closed / Zamknięte
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: OPERATIONAL STATUS */}
          {activeTab === 'status' && (
            <form onSubmit={handleSaveOpStatus} className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Operational Status Control</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Control live operational systems, enabling or pausing orders and bookings in real-time.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Delivery Toggle */}
                <div className="border border-border p-4 rounded-lg flex items-center justify-between bg-muted/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Online Delivery</span>
                    <span className="text-[10px] text-muted-foreground">Toggle delivery ordering capabilities on the public site.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={opStatusForm.delivery_enabled}
                      onChange={e => setOpStatusForm({ ...opStatusForm, delivery_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                  </label>
                </div>

                {/* Takeaway Toggle */}
                <div className="border border-border p-4 rounded-lg flex items-center justify-between bg-muted/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Online Takeaway</span>
                    <span className="text-[10px] text-muted-foreground">Toggle takeaway pickup ordering capabilities on the public site.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={opStatusForm.takeaway_enabled}
                      onChange={e => setOpStatusForm({ ...opStatusForm, takeaway_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                  </label>
                </div>

                {/* Reservations Toggle */}
                <div className="border border-border p-4 rounded-lg flex items-center justify-between bg-muted/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Online Table Booking</span>
                    <span className="text-[10px] text-muted-foreground">Toggle reservation submissions on the public site.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={opStatusForm.reservations_enabled}
                      onChange={e => setOpStatusForm({ ...opStatusForm, reservations_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                  </label>
                </div>

                {/* Kitchen Busy Toggle */}
                <div className="border border-border p-4 rounded-lg flex items-center justify-between bg-muted/5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Kitchen Busy Mode</span>
                    <span className="text-[10px] text-muted-foreground">Toggle delayed order timers when kitchen is backlogged.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={opStatusForm.kitchen_busy_mode}
                      onChange={e => setOpStatusForm({ ...opStatusForm, kitchen_busy_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
                  </label>
                </div>

                {/* Dine In Status Select */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Dine-In Status *</label>
                  <select 
                    value={opStatusForm.dine_in_status}
                    onChange={e => setOpStatusForm({ ...opStatusForm, dine_in_status: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  >
                    <option value="open">Open / Otwarte</option>
                    <option value="paused">Paused / Wstrzymane</option>
                    <option value="closed">Closed / Zamknięte</option>
                  </select>
                </div>

                {/* Estimated Delay */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Estimated Delay (Minutes)</label>
                  <input 
                    type="number" 
                    value={opStatusForm.estimated_delay_minutes}
                    onChange={e => setOpStatusForm({ ...opStatusForm, estimated_delay_minutes: Number(e.target.value) })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>

                {/* Temp Message PL */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Temporary Banner Message (Polish)</label>
                  <input 
                    type="text" 
                    value={opStatusForm.temporary_message_pl || ''}
                    placeholder="Wpisz opcjonalny komunikat dla klientów..."
                    onChange={e => setOpStatusForm({ ...opStatusForm, temporary_message_pl: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>

                {/* Temp Message EN */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Temporary Banner Message (English)</label>
                  <input 
                    type="text" 
                    value={opStatusForm.temporary_message_en || ''}
                    placeholder="Enter optional customer alert message..."
                    onChange={e => setOpStatusForm({ ...opStatusForm, temporary_message_en: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>

              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: RESERVATIONS */}
          {activeTab === 'reservations' && (
            <form onSubmit={handleSaveReservations} className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Table Reservation Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configure booking rules and guest capacity validation parameters.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Max Guests per Reservation *</label>
                  <input 
                    type="number" 
                    required
                    value={reservationForm.reservation_max_guests}
                    onChange={e => setReservationForm({ ...reservationForm, reservation_max_guests: Number(e.target.value) })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Min Advance Booking Time (Hours) *</label>
                  <input 
                    type="number" 
                    required
                    value={reservationForm.reservation_min_lead_time_hours}
                    onChange={e => setReservationForm({ ...reservationForm, reservation_min_lead_time_hours: Number(e.target.value) })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Max Days Ahead Booking *</label>
                  <input 
                    type="number" 
                    required
                    value={reservationForm.reservation_max_days_ahead}
                    onChange={e => setReservationForm({ ...reservationForm, reservation_max_days_ahead: Number(e.target.value) })}
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reservation Contact Instructions</label>
                  <textarea 
                    value={reservationForm.reservation_contact_instructions}
                    onChange={e => setReservationForm({ ...reservationForm, reservation_contact_instructions: e.target.value })}
                    rows={3}
                    placeholder="Enter instructions displayed to customers when online booking exceeds the guest limit..."
                    className="w-full bg-[#FAF9F5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-3 py-2.5 text-sm font-light outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: DELIVERY & TAKEAWAY */}
          {activeTab === 'delivery' && (
            <form onSubmit={handleSaveDelivery} className="space-y-8">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Delivery Zones & Distance Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage geographical radius fees and distance-based pricing policies.</p>
              </div>

              {/* Minimum Order Value for Delivery */}
              <div className="bg-[#FAF9F5] border border-border p-4 rounded-lg space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#0A192F]">Minimum Order Value (Delivery)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Set the minimum cart subtotal required for delivery orders. The delivery charge is not included in this subtotal.</p>
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryMinOrderValue}
                    onChange={e => setDeliveryMinOrderValue(Number(e.target.value))}
                    className="w-32 bg-white border border-border rounded px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">PLN</span>
                </div>
              </div>

              {/* Distance Fee Rules */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#0A192F]">Distance Pricing &amp; Block Rules</h3>
                  <button
                    type="button"
                    onClick={() => setRulesState(prev => [...prev, {
                      id: `new-${Date.now()}`,
                      isNew: true,
                      name: `Zone ${prev.length + 1}`,
                      min_distance_km: prev.length > 0 ? (Number(prev[prev.length - 1].max_distance_km) || 0) : 0,
                      max_distance_km: null,
                      fee_amount: 0,
                      rule_action: 'allow',
                      message_pl: '',
                      message_en: '',
                      is_active: true,
                      display_order: prev.length
                    }])}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/40 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Zone
                  </button>
                </div>
                <div className="border border-border rounded-lg overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border">
                        <th className="p-3 font-bold">Zone Name</th>
                        <th className="p-3 font-bold">Min (km)</th>
                        <th className="p-3 font-bold">Max (km)</th>
                        <th className="p-3 font-bold">Fee (PLN)</th>
                        <th className="p-3 font-bold">Action</th>
                        <th className="p-3 font-bold">Message (PL)</th>
                        <th className="p-3 font-bold">Active</th>
                        <th className="p-3 font-bold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rulesState.map((rule, idx) => (
                        <tr key={rule.id} className={`hover:bg-muted/5 ${rule.isNew ? 'bg-green-50/60' : ''}`}>
                          <td className="p-3">
                            <input
                              type="text"
                              value={rule.name || ''}
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].name = e.target.value;
                                setRulesState(updated);
                              }}
                              className="w-28 bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none focus:border-primary"
                              placeholder="Zone name"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              value={rule.min_distance_km}
                              min="0"
                              step="0.5"
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].min_distance_km = Number(e.target.value);
                                setRulesState(updated);
                              }}
                              className="w-16 bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              value={rule.max_distance_km || ''}
                              placeholder="∞"
                              min="0"
                              step="0.5"
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].max_distance_km = e.target.value === '' ? null : Number(e.target.value);
                                setRulesState(updated);
                              }}
                              className="w-20 bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              value={rule.fee_amount}
                              min="0"
                              step="0.5"
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].fee_amount = Number(e.target.value);
                                setRulesState(updated);
                              }}
                              className="w-16 bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                            />
                          </td>
                          <td className="p-3">
                            <select 
                              value={rule.rule_action}
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].rule_action = e.target.value as any;
                                setRulesState(updated);
                              }}
                              className="bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                            >
                              <option value="allow">Allow</option>
                              <option value="contact_restaurant">Contact</option>
                              <option value="block">Block</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input 
                              type="text" 
                              value={rule.message_pl || ''}
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].message_pl = e.target.value;
                                setRulesState(updated);
                              }}
                              className="w-full min-w-[120px] bg-[#FAF9F5] border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox"
                              checked={rule.is_active}
                              onChange={e => {
                                const updated = [...rulesState];
                                updated[idx].is_active = e.target.checked;
                                setRulesState(updated);
                              }}
                              className="rounded text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setRulesState(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete zone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rulesState.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-muted-foreground text-xs italic">
                            No delivery zones configured. Click &quot;Add Zone&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Zones use half-open intervals [Min, Max). Addresses <strong>outside all zones</strong> are automatically blocked. 
                  Use <strong>Contact</strong> action for zones where you need to confirm delivery manually.
                </p>
              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: CHARGES & FEES */}
          {activeTab === 'fees' && (
            <form onSubmit={handleSaveFees} className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Packaging & Order Fees</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configure container and carrier bag fee rates applied to deliveries and takeaways.</p>
              </div>

              <div className="space-y-4">
                {feesState.map((fee, idx) => (
                  <div key={fee.id} className="border border-border p-4 rounded-lg flex items-center justify-between bg-muted/5">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-foreground">{fee.name_en} / {fee.name_pl}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Type: {fee.fee_type}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Amount (PLN)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={fee.amount}
                          onChange={e => {
                            const updated = [...feesState];
                            updated[idx].amount = Number(e.target.value);
                            setFeesState(updated);
                          }}
                          className="w-24 bg-[#FAF9F5] border border-border focus:border-primary rounded px-2.5 py-1 text-xs outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-muted-foreground uppercase block mb-1">Active</label>
                        <input 
                          type="checkbox"
                          checked={fee.is_active}
                          onChange={e => {
                            const updated = [...feesState];
                            updated[idx].is_active = e.target.checked;
                            setFeesState(updated);
                          }}
                          className="rounded text-primary focus:ring-primary scale-110"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-primary/10 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#122A4E] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: HOLIDAY CLOSURES */}
          {activeTab === 'holidays' && (
            <div className="space-y-8">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Holiday & Temporary Closures</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Schedule specific calendar dates where operations or table bookings are suspended.</p>
              </div>

              {/* Existing Closures List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#0A192F]">Scheduled Closures</h3>
                <div className="border border-border rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border">
                        <th className="p-3 font-bold">Date</th>
                        <th className="p-3 font-bold">Name (PL / EN)</th>
                        <th className="p-3 font-bold">Affected Service</th>
                        <th className="p-3 font-bold">Message (PL)</th>
                        <th className="p-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {closuresState.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">No custom closures scheduled.</td>
                        </tr>
                      ) : (
                        closuresState.map(closure => (
                          <tr key={closure.id} className="hover:bg-muted/5">
                            <td className="p-3 font-mono text-[#0A192F]">{closure.date}</td>
                            <td className="p-3">
                              <p className="font-bold">{closure.title_pl}</p>
                              <p className="text-muted-foreground text-[10px]">{closure.title_en}</p>
                            </td>
                            <td className="p-3 font-medium uppercase text-primary tracking-wider">{closure.affected_service}</td>
                            <td className="p-3 text-muted-foreground max-w-[150px] truncate">{closure.message_pl || '-'}</td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => handleDeleteClosure(closure.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"
                                aria-label="Delete closure"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Closure Form */}
              <form onSubmit={handleCreateClosure} className="border border-border p-5 rounded-lg bg-muted/5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#0A192F] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add Temporary Closure Date
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Date *</label>
                    <input 
                      type="date" 
                      required
                      value={newClosure.date}
                      onChange={e => setNewClosure({ ...newClosure, date: e.target.value })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Affected Service *</label>
                    <select 
                      value={newClosure.affected_service}
                      onChange={e => setNewClosure({ ...newClosure, affected_service: e.target.value as any })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    >
                      <option value="all">All Services (Restaurant Closed)</option>
                      <option value="dine_in">Dine-In Only</option>
                      <option value="reservations">Table Reservations Only</option>
                      <option value="delivery">Delivery Only</option>
                      <option value="takeaway">Takeaway Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Holiday Title (Polish) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="np. Boże Narodzenie"
                      value={newClosure.title_pl}
                      onChange={e => setNewClosure({ ...newClosure, title_pl: e.target.value })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Holiday Title (English) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Christmas Day"
                      value={newClosure.title_en}
                      onChange={e => setNewClosure({ ...newClosure, title_en: e.target.value })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Banner Alert Message (Polish)</label>
                    <input 
                      type="text" 
                      placeholder="np. Wesołych Świąt! Dzisiaj jesteśmy zamknięci."
                      value={newClosure.message_pl}
                      onChange={e => setNewClosure({ ...newClosure, message_pl: e.target.value })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Banner Alert Message (English)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Merry Christmas! We are closed today."
                      value={newClosure.message_en}
                      onChange={e => setNewClosure({ ...newClosure, message_en: e.target.value })}
                      className="w-full bg-white border border-border rounded px-2.5 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 bg-[#0A192F] hover:bg-[#122A4E] text-white text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Closure Date
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: LANGUAGE & REGION */}
          {activeTab === 'region' && (
            <div className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Language & Region Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Verify default localization properties and system values.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="border border-border p-4 rounded-lg bg-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Default Locale</span>
                  <span className="text-sm font-bold text-foreground">Polish (PL)</span>
                </div>
                <div className="border border-border p-4 rounded-lg bg-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Secondary Locale</span>
                  <span className="text-sm font-bold text-foreground">English (EN)</span>
                </div>
                <div className="border border-border p-4 rounded-lg bg-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Currency Unit</span>
                  <span className="text-sm font-bold text-foreground">Polish Złoty (PLN / zł)</span>
                </div>
                <div className="border border-border p-4 rounded-lg bg-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">System Timezone</span>
                  <span className="text-sm font-bold text-foreground">Europe/Warsaw (CET/CEST)</span>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 bg-[#FAF9F5] border border-primary/20 p-4 rounded-lg text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  These properties are configured as the baseline for the restaurant launch in Ciechanów, Poland. Standard formatting for dates, times, and phone numbers automatically adopts this region config.
                </p>
              </div>
            </div>
          )}

          {/* TAB 9: SECURITY & ACCESS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-primary/10 pb-4">
                <h2 className="text-xl font-serif font-bold text-primary">Security & Access Control</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Understand administrator privilege levels and safety guidelines.</p>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border border-border p-4 rounded-lg bg-muted/5 space-y-2">
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] text-primary">System Access Policy</h3>
                  <p>
                    Only accounts explicitly assigned the role of <strong>Owner</strong> or <strong>Manager</strong> (authorized manager) can modify operational settings, profiles, opening hours, or holiday closures.
                  </p>
                  <p>
                    Your current role is: <strong className="text-foreground uppercase tracking-wider font-mono">{profile.role}</strong>
                  </p>
                </div>
                
                <div className="border border-border p-4 rounded-lg bg-muted/5 space-y-2">
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] text-primary">Row-Level Security (RLS)</h3>
                  <p>
                    All write operations execute through PostgreSQL RLS validation policies using your authenticated token context. Direct schema changes or arbitrary data tampering are blocked at the database layer.
                  </p>
                </div>

                <div className="border border-border p-4 rounded-lg bg-muted/5 space-y-2">
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] text-primary">Audit Integrity</h3>
                  <p>
                    Modifications to configuration settings write to database triggers logging the administrator account ID, modification timestamp, and target table context.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
