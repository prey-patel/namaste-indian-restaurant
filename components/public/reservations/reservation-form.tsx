'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createReservationRequestAction } from '@/app/[locale]/(public)/reservations/actions';
import { reservationRequestSchema } from '@/lib/validation/reservations';
import { Button } from '@/components/ui/button';
import GoldSpinner from '@/components/ui/gold-spinner';
import PremiumCard from '@/components/ui/premium-card';

type ReservationFormProps = {
  locale: 'pl' | 'en';
  maxGuests?: number;
};

export default function ReservationForm({ locale, maxGuests = 8 }: ReservationFormProps) {
  const t = useTranslations('reservations');

  // Form Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [guests, setGuests] = useState('2');
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ id: string; token: string } | null>(null);

  // Generate date bounds: min date is today
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      reservation_date: date,
      reservation_time: time,
      guests_count: parseInt(guests, 10),
      occasion: occasion || null,
      customer_notes: notes || null,
      consent,
      privacy_policy_version: '1.0.0', // baseline privacy policy
      source_language: locale
    };

    // Client-side schema check
    const validationResult = reservationRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      setError(validationResult.error.errors[0]?.message || 'Validation failed');
      setLoading(false);
      return;
    }

    try {
      const res = await createReservationRequestAction(payload);
      if (res.success && res.id && res.token) {
        setSuccessData({ id: res.id, token: res.token });
      } else {
        setError(res.error || 'Failed to submit reservation request.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Time Slot Selection Options
  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00'
  ];

  // Occasions Options
  const occasions = locale === 'pl' 
    ? ['Urodziny', 'Rocznica', 'Spotkanie Biznesowe', 'Inne'] 
    : ['Birthday', 'Anniversary', 'Business Meeting', 'Other'];

  if (successData) {
    const trackingUrl = `/${locale}/reservations/status?id=${successData.id}&token=${successData.token}`;
    return (
      <PremiumCard hoverable={false} className="border-green-500/20 bg-green-500/5 p-8 text-center space-y-6 max-w-xl mx-auto">
        <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          ✓
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-serif font-bold text-green-400">{t('successTitle')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('successDesc')}
          </p>
        </div>

        <div className="p-4 bg-[#070B1E] border border-primary/20 rounded-lg space-y-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block">
            {t('trackingRef')}
          </span>
          <code className="text-sm text-primary font-mono select-all block break-all p-1 bg-primary/5 rounded">
            {successData.token}
          </code>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed font-light">
            {t('trackingText')}
          </p>
          <div className="pt-2">
            <Link href={trackingUrl}>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider py-2">
                {t('trackLinkText')}
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/50 pt-2 border-t border-primary/5">
          {t('contactNote')}
        </p>
      </PremiumCard>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-[#050B1E] p-6 sm:p-8 border border-primary/20 rounded-lg max-w-xl mx-auto font-sans text-left relative">
      {error && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 rounded text-red-400 text-center leading-relaxed">
          {error}
        </div>
      )}

      {/* Guest Name */}
      <div className="space-y-1.5">
        <label htmlFor="customer_name" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t('nameLabel')} *
        </label>
        <input
          id="customer_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Jan Kowalski"
          className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="customer_email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('emailLabel')} *
          </label>
          <input
            id="customer_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jan.kowalski@email.com"
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label htmlFor="customer_phone" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('phoneLabel')} *
          </label>
          <input
            id="customer_phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+48 123 456 789"
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Date */}
        <div className="col-span-2 space-y-1.5">
          <label htmlFor="reservation_date" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('dateLabel')} *
          </label>
          <input
            id="reservation_date"
            type="date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        {/* Time */}
        <div className="space-y-1.5">
          <label htmlFor="reservation_time" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('timeLabel')} *
          </label>
          <select
            id="reservation_time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Number of Guests */}
        <div className="space-y-1.5">
          <label htmlFor="guests_count" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('guestsLabel')} *
          </label>
          <select
            id="guests_count"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            required
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {Array.from({ length: maxGuests }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1} {idx + 1 === 1 ? (locale === 'pl' ? 'osoba' : 'guest') : (locale === 'pl' ? 'osoby' : 'guests')}
              </option>
            ))}
          </select>
        </div>

        {/* Occasion */}
        <div className="space-y-1.5">
          <label htmlFor="occasion" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {t('occasionLabel')}
          </label>
          <select
            id="occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            <option value="">--</option>
            {occasions.map((occ) => (
              <option key={occ} value={occ}>
                {occ}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special Requests / Notes */}
      <div className="space-y-1.5">
        <label htmlFor="customer_notes" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t('notesLabel')}
        </label>
        <textarea
          id="customer_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={locale === 'pl' ? 'np. stolik przy oknie, krzesełko dla dziecka' : 'e.g. table near window, high chair for baby'}
          className="w-full bg-[#070B1E] border border-primary/10 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
        />
      </div>

      {/* Consent Checkbox */}
      <div className="space-y-1 pt-2">
        <label className="flex items-start space-x-3 text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-1 h-4 w-4 rounded border-primary/20 bg-[#070B1E] text-primary focus:ring-primary/40"
          />
          <span>
            {t('consentLabel')} *
          </span>
        </label>
      </div>

      {/* Pending status warning message */}
      <p className="text-[10px] text-primary/75 italic leading-relaxed text-center py-2 border-y border-primary/5">
        {t('pendingNotice')}
      </p>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold tracking-wide uppercase text-xs py-3"
      >
        {loading ? <GoldSpinner size="sm" /> : t('submitButton')}
      </Button>
    </form>
  );
}
