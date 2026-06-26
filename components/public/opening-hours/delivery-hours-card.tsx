import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Truck, AlertCircle } from 'lucide-react';
import { type ServiceStatusInfo } from '@/lib/public/opening-hours';

type Props = {
  delivery: ServiceStatusInfo;
};

export default function DeliveryHoursCard({ delivery }: Props) {
  const t = useTranslations('openingHours');
  const locale = useLocale();
  const isPl = locale === 'pl';
  
  return (
    <div className={`border p-5 rounded-lg text-left space-y-4 font-sans ${
      delivery.isOpen 
        ? 'border-primary/20 bg-[#050B1E]/60 text-foreground' 
        : 'border-red-500/30 bg-red-500/5 text-foreground'
    }`}>
      <div className="flex items-center justify-between border-b border-primary/10 pb-2">
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#050B1E]/50 dark:text-muted-foreground/50">
          {isPl ? 'Informacje o dostawie' : 'Delivery Information'}
        </h4>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
            delivery.isOpen ? 'border-primary/30 text-primary bg-primary/5' : 'border-red-500/30 text-red-400 bg-red-500/10'
          }`}>
            <Truck className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block">{t('deliveryToday')}</span>
            <span className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${delivery.isOpen ? 'bg-green-600' : 'bg-red-500'}`} />
              <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/75">
                {delivery.isOpen ? t('openNow') : t('closedNow')}
              </span>
            </span>
          </div>
        </div>
        <span className="text-xs font-bold font-mono tracking-wide text-right text-foreground">
          {delivery.hoursText}
        </span>
      </div>

      {!delivery.isOpen && (
        <div className="pt-2 text-[10px] sm:text-xs text-red-400 italic font-sans flex items-start gap-2 border-t border-red-500/10">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="leading-normal">
            {t('deliveryClosedMsg')}
          </p>
        </div>
      )}
      
      {delivery.isOpen && (
        <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 italic leading-normal border-t border-primary/5 pt-2 font-light">
          {isPl 
            ? 'Zamówienia poza godzinami dostaw są obecnie niedostępne. Dziękujemy za wyrozumiałość.'
            : 'Orders outside delivery hours are currently unavailable. Thank you for your understanding.'}
        </p>
      )}
    </div>
  );
}
