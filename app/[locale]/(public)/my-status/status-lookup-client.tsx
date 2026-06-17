'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lookupStatusAction } from './actions';

type Props = {
  locale: 'pl' | 'en';
};

export default function StatusLookupClient({ locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchType, setSearchType] = useState<'order' | 'reservation'>('order');
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const code = tokenInput.trim();
    if (!code) {
      setErrorMsg(
        locale === 'pl'
          ? 'Wprowadź kod referencyjny przed wyszukiwaniem.'
          : 'Please enter a reference code before searching.'
      );
      return;
    }

    startTransition(async () => {
      const res = await lookupStatusAction(code, locale);
      if (res.success && res.id && res.token) {
        if (res.type === 'order') {
          router.push(`/${locale}/order/status?id=${res.id}&token=${res.token}`);
        } else {
          router.push(`/${locale}/reservations/status?id=${res.id}&token=${res.token}`);
        }
      } else {
        setErrorMsg(res.error || 'Lookup failed.');
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Search Type Selector Tabs */}
      <div className="flex bg-[#050b1e] border border-primary/15 rounded-lg p-1">
        <button
          type="button"
          onClick={() => {
            setSearchType('order');
            setErrorMsg(null);
          }}
          className={`flex-1 py-2 px-3 text-xs uppercase tracking-wider font-bold rounded-md flex items-center justify-center gap-2 transition-all duration-300 ${
            searchType === 'order'
              ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/15 border border-amber-500/20 text-amber-400'
              : 'text-muted-foreground/60 hover:text-muted-foreground'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {locale === 'pl' ? 'Zamówienie' : 'Order'}
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchType('reservation');
            setErrorMsg(null);
          }}
          className={`flex-1 py-2 px-3 text-xs uppercase tracking-wider font-bold rounded-md flex items-center justify-center gap-2 transition-all duration-300 ${
            searchType === 'reservation'
              ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/15 border border-amber-500/20 text-amber-400'
              : 'text-muted-foreground/60 hover:text-muted-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {locale === 'pl' ? 'Rezerwacja' : 'Reservation'}
        </button>
      </div>

      {/* Lookup Card Container */}
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden bg-gradient-to-b from-[#0e1329] via-[#070b1e] to-[#040614] border border-primary/20 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl gold-border-glow"
      >
        {/* Subtle decorative gold top bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-amber-500/70 font-semibold block">
            {locale === 'pl' ? 'Kod Referencyjny / Token' : 'Reference Code / Token'}
          </label>
          <span className="text-[10px] text-muted-foreground/50 block font-light leading-relaxed">
            {locale === 'pl'
              ? 'Skopiuj i wklej 36-znakowy kod ze swojej wiadomości e-mail lub ekranu podsumowania.'
              : 'Copy and paste the 36-character reference code from your email or checkout receipt.'}
          </span>
        </div>

        {/* Input Field */}
        <div className="relative">
          <input
            type="text"
            required
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="e.g. 4c216547-6345-4b76-8fe7-18fa6886c3cc"
            disabled={isPending}
            className="w-full bg-[#050b1e] border border-primary/20 focus:border-amber-500/40 rounded-lg py-3 pl-3 pr-10 text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none transition-all duration-300"
          />
          <Search className="w-4 h-4 text-muted-foreground/40 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 text-red-200 rounded-lg text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-[#070B1E] font-bold text-xs uppercase tracking-wider py-3.5 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all duration-300 rounded-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#070B1E] border-t-transparent rounded-full animate-spin" />
              {locale === 'pl' ? 'Wyszukiwanie...' : 'Searching...'}
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              {locale === 'pl' ? 'Sprawdź Status' : 'Check Status'}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
