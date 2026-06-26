import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import { ArrowRight, Utensils, Truck } from 'lucide-react';
import { type ServiceStatusInfo } from '@/lib/public/opening-hours';

type Props = {
  dineIn: ServiceStatusInfo;
  delivery: ServiceStatusInfo;
};

export default function FooterHours({ dineIn, delivery }: Props) {
  const t = useTranslations('openingHours');
  const locale = useLocale();
  const isPl = locale === 'pl';
  
  return (
    <div className="flex flex-col space-y-4 font-sans text-left">
      <h4 className="font-bold text-foreground text-xs uppercase tracking-widest border-b border-primary/10 pb-2">
        {t('todaysHours')}
      </h4>
      
      <div className="space-y-3 text-xs sm:text-sm">
        {/* Dine-in Compact */}
        <div className="flex items-center justify-between text-muted-foreground/80">
          <div className="flex items-center gap-2">
            <Utensils className="w-3.5 h-3.5 text-primary" />
            <span>{t('dineIn')}</span>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">
            {dineIn.isClosedToday 
              ? (isPl ? 'Dzisiaj zamknięte' : 'Closed today') 
              : dineIn.hoursText}
          </span>
        </div>

        {/* Delivery Compact */}
        <div className="flex items-center justify-between text-muted-foreground/80">
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>{t('delivery')}</span>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">
            {delivery.isClosedToday 
              ? (isPl ? 'Dzisiaj zamknięte' : 'Closed today') 
              : delivery.hoursText}
          </span>
        </div>
      </div>

      <div className="pt-2">
        <Link 
          href={ROUTES.contact}
          className="text-xs font-bold text-primary hover:text-white transition-colors inline-flex items-center gap-1.5 group"
        >
          <span>{isPl ? 'Zobacz godziny otwarcia' : 'View full opening hours'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
