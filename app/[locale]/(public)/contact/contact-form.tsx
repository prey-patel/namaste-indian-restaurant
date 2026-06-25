'use client';

import React, { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import { submitContactInquiry } from './actions';
import PremiumButton from '@/components/ui/premium-button';
import LuxuryAlert from '@/components/ui/luxury-alert';
import GoldFrame from '@/components/ui/gold-frame';

type ContactFormProps = {
  locale: string;
};

export default function ContactForm({ locale }: ContactFormProps) {
  const t = useTranslations('contact');
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);

  // Status states
  const [success, setSuccess] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setErrorState(null);

    startTransition(async () => {
      const response = await submitContactInquiry(null, {
        name,
        email,
        phone,
        subject,
        message,
        consent,
        sourceLanguage: locale,
        turnstileToken: 'mock-turnstile-token', // Turnstile placeholder
      });

      if (response.success) {
        setSuccess(true);
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
        setConsent(false);
      } else if (response.errors) {
        setValidationErrors(response.errors);
        setErrorState('validation');
      } else if (response.error === 'rate-limit') {
        setErrorState('rate-limit');
      } else {
        setErrorState('server-error');
      }
    });
  };

  if (success) {
    return (
      <GoldFrame className="w-full">
        <div className="text-center p-8 sm:p-12 space-y-6 bg-[#040815]/80 backdrop-blur-md rounded-xl">
          <div className="w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5 mx-auto animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-serif font-medium text-primary">{t('successTitle')}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            {t('successMessage')}
          </p>
          <div className="pt-4">
            <PremiumButton
              variant="outline"
              size="md"
              onClick={() => setSuccess(false)}
            >
              {locale === 'pl' ? 'Wyślij nową wiadomość' : 'Send another message'}
            </PremiumButton>
          </div>
        </div>
      </GoldFrame>
    );
  }

  return (
    <GoldFrame className="w-full">
      <div className="p-6 md:p-8 space-y-6 bg-[#040815]/90 backdrop-blur-md rounded-xl">
        <h3 className="font-serif font-medium text-center text-primary text-xl uppercase tracking-widest border-b border-primary/10 pb-4">
          {locale === 'pl' ? 'Napisz do nas' : 'Send a Message'}
        </h3>

        {/* Global Error Banner */}
        {errorState && errorState !== 'validation' && (
          <LuxuryAlert
            type="error"
            title={t('errorTitle')}
          >
            <p className="text-xs">
              {errorState === 'rate-limit' ? t('rateLimitError') : t('errorMessage')}
            </p>
          </LuxuryAlert>
        )}

        {errorState === 'validation' && (
          <LuxuryAlert
            type="warning"
            title={t('validationError')}
          >
            <p className="text-xs">
              {locale === 'pl' ? 'Proszę poprawić błędy w wyróżnionych polach.' : 'Please correct the highlighted fields.'}
            </p>
          </LuxuryAlert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">
              {t('nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              disabled={isPending}
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 bg-[#050b1e]/80 border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all duration-300 ${
                validationErrors.name ? 'border-red-500/50 focus:border-red-500' : 'border-primary/25'
              }`}
            />
            {validationErrors.name && (
              <span className="text-[10px] text-red-400 mt-1 block font-sans">{validationErrors.name}</span>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">
              {t('emailLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={isPending}
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 bg-[#050b1e]/80 border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all duration-300 ${
                validationErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-primary/25'
              }`}
            />
            {validationErrors.email && (
              <span className="text-[10px] text-red-400 mt-1 block font-sans">{validationErrors.email}</span>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">
              {t('phoneLabel')}
            </label>
            <input
              id="phone"
              type="tel"
              disabled={isPending}
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-4 py-3 bg-[#050b1e]/80 border border-primary/25 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all duration-300`}
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">
              {t('subjectLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              required
              disabled={isPending}
              placeholder={t('subjectPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full px-4 py-3 bg-[#050b1e]/80 border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all duration-300 ${
                validationErrors.subject ? 'border-red-500/50 focus:border-red-500' : 'border-primary/25'
              }`}
            />
            {validationErrors.subject && (
              <span className="text-[10px] text-red-400 mt-1 block font-sans">{validationErrors.subject}</span>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">
              {t('messageLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              required
              rows={4}
              disabled={isPending}
              placeholder={t('messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full px-4 py-3 bg-[#050b1e]/80 border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] transition-all duration-300 resize-none ${
                validationErrors.message ? 'border-red-500/50 focus:border-red-500' : 'border-primary/25'
              }`}
            />
            {validationErrors.message && (
              <span className="text-[10px] text-red-400 mt-1 block font-sans">{validationErrors.message}</span>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <input
                id="consent"
                type="checkbox"
                disabled={isPending}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className={`mt-1 focus:ring-primary h-4 w-4 text-[#070b1e] accent-primary border-primary/30 bg-[#040815] rounded cursor-pointer ${
                  validationErrors.consent ? 'border-red-400 focus:border-red-400' : ''
                }`}
              />
              <label htmlFor="consent" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer font-sans select-none">
                {t('consentLabel')}{' '}
                <Link
                  href={ROUTES.privacy}
                  target="_blank"
                  className="text-primary hover:underline font-bold"
                >
                  {locale === 'pl' ? 'Polityka Prywatności' : 'Privacy Policy'}
                </Link>
              </label>
            </div>
            {validationErrors.consent && (
              <span className="text-[10px] text-red-400 block font-sans">{validationErrors.consent}</span>
            )}
          </div>

          {/* Turnstile Verification Placeholder */}
          <div className="border border-primary/10 bg-[#040815]/60 p-3 rounded-xl text-center">
            <div className="inline-flex items-center space-x-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono">
              <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4, 4" />
              </svg>
              <span>Cloudflare Turnstile Protected (Placeholder)</span>
            </div>
            <span className="block text-[8px] text-muted-foreground/45 mt-1">
              Token validation will be integrated here upon production deployment.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              className="w-full bg-gradient-to-r from-primary to-amber-600 border-none text-[#040815] font-extrabold uppercase tracking-widest text-[11px] py-4"
              disabled={isPending}
            >
              {isPending ? t('submittingButton') : t('submitButton')}
            </PremiumButton>
          </div>
        </form>
      </div>
    </GoldFrame>
  );
}
