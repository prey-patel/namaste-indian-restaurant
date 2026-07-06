'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { lookupStatusAction } from './actions';

type Props = {
  locale: 'pl' | 'en';
};

export default function StatusLookupClient({ locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tokenInput, setTokenInput] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTokenChange = (val: string) => {
    setTokenInput(val);
    if (requiresVerification) {
      setRequiresVerification(false);
      setVerificationInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const code = tokenInput.trim();
    if (!code) {
      setErrorMsg(
        locale === 'pl'
          ? 'Wprowadź kod referencyjny przed wyszukiwaniem.'
          : 'Please enter your reference code before searching.'
      );
      return;
    }

    if (requiresVerification && !verificationInput.trim()) {
      setErrorMsg(
        locale === 'pl'
          ? 'Wprowadź adres e-mail lub numer telefonu użyty do rejestracji.'
          : 'Please enter the email address or phone number used for this booking.'
      );
      return;
    }

    startTransition(async () => {
      const res = await lookupStatusAction(code, locale, requiresVerification ? verificationInput : undefined);
      if (res.success && res.id && res.token) {
        if (res.type === 'order') {
          router.push(`/${locale}/order/status?id=${res.id}&token=${res.token}`);
        } else {
          router.push(`/${locale}/reservations/status?id=${res.id}&token=${res.token}`);
        }
      } else if (res.requiresVerification) {
        setRequiresVerification(true);
      } else {
        setErrorMsg(res.error || (locale === 'pl' ? 'Nie znaleziono.' : 'Not found.'));
      }
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 animate-fade-in">

      {/* What you can track */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 bg-[#0a0f26]/80 border border-primary/10 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400/80">
              {locale === 'pl' ? 'Zamówienia' : 'Orders'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-light leading-tight mt-0.5">
              {locale === 'pl' ? 'Na wynos & dostawa' : 'Takeaway & delivery'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[#0a0f26]/80 border border-primary/10 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400/80">
              {locale === 'pl' ? 'Rezerwacje' : 'Reservations'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-light leading-tight mt-0.5">
              {locale === 'pl' ? 'Rezerwacje stolika' : 'Table bookings'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden bg-gradient-to-b from-[#0e1329] via-[#070b1e] to-[#040614] border border-primary/20 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl"
      >
        {/* Gold top accent bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="space-y-1.5">
          <label htmlFor="reference-code" className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold block">
            {locale === 'pl' ? 'Twój Kod Referencyjny' : 'Your Reference Code'}
          </label>
          <p className="text-[10px] text-muted-foreground/50 font-light leading-relaxed">
            {locale === 'pl'
              ? 'Wklej kod ze swojego emaila potwierdzającego lub ekranu zamówienia.'
              : 'Paste the code from your confirmation email or order summary screen.'}
          </p>
        </div>

        {/* Input Field */}
        <div className="relative">
          <input
            id="reference-code"
            type="text"
            required
            value={tokenInput}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder={locale === 'pl' ? 'np. 4c216547-6345-4b76-8fe7-...' : 'e.g. 4c216547-6345-4b76-8fe7-...'}
            disabled={isPending}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-[#050b1e] border border-primary/20 focus:border-amber-500/50 rounded-xl py-3.5 pl-4 pr-12 text-xs font-mono text-foreground placeholder:text-muted-foreground/25 focus:outline-none transition-all duration-300 focus:ring-1 focus:ring-amber-500/20"
          />
          <Search className="w-4 h-4 text-muted-foreground/30 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Secondary Verification Input Field */}
        {requiresVerification && (
          <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl animate-fade-in">
            <div className="space-y-1">
              <label htmlFor="verification-info" className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block">
                {locale === 'pl' ? 'Dodatkowa Weryfikacja' : 'Secondary Verification'}
              </label>
              <p className="text-[9px] text-muted-foreground/60 leading-normal">
                {locale === 'pl'
                  ? 'Dla bezpieczeństwa wpisz adres e-mail lub numer telefonu podany w zamówieniu/rezerwacji.'
                  : 'For security, enter the email address or phone number from the order/reservation.'}
              </p>
            </div>
            <input
              id="verification-info"
              type="text"
              required
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder={locale === 'pl' ? 'E-mail lub tel. (np. 511984331)' : 'Email or phone (e.g. 511984331)'}
              disabled={isPending}
              autoComplete="off"
              className="w-full bg-[#050b1e] border border-primary/20 focus:border-amber-500/50 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-muted-foreground/20 focus:outline-none transition-all"
            />
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/8 border border-red-500/20 text-red-300/90 rounded-xl text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-[#070B1E] font-extrabold text-[11px] uppercase tracking-widest py-3.5 shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 rounded-xl disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#070B1E]/60 border-t-[#070B1E] rounded-full animate-spin" />
              {locale === 'pl' ? 'Weryfikacja...' : 'Verifying...'}
            </>
          ) : (
            <>
              {requiresVerification 
                ? (locale === 'pl' ? 'Potwierdź i Sprawdź' : 'Confirm & Check')
                : (locale === 'pl' ? 'Sprawdź Status' : 'Check Status')}
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Help hint */}
      <p className="text-[10px] text-muted-foreground/40 text-center font-light leading-relaxed px-4">
        {locale === 'pl'
          ? 'Kod referencyjny jest unikalnym identyfikatorem wysłanym na Twój email po złożeniu zamówienia lub rezerwacji.'
          : 'The reference code is a unique identifier sent to your email after placing an order or reservation.'}
      </p>
    </div>
  );
}
