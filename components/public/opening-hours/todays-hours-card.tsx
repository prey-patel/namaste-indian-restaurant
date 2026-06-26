import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import { Utensils, Truck, ArrowRight, Clock } from 'lucide-react';
import { type ServiceStatusInfo } from '@/lib/public/opening-hours';

type Props = {
  dineIn: ServiceStatusInfo;
  delivery: ServiceStatusInfo;
};

export default function TodaysHoursCard({ dineIn, delivery }: Props) {
  const t = useTranslations('openingHours');
  
  return (
    <div className="bg-[#FCFAF2] border border-primary/20 text-[#050B1E] rounded-2xl shadow-xl p-6 md:p-8 space-y-6 max-w-sm w-full font-sans">
      <div className="flex items-center gap-3 border-b border-primary/15 pb-4">
        <Clock className="w-4.5 h-4.5 text-primary" />
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#050B1E]/60">
          {t('todaysHours')}
        </h3>
      </div>
      
      <div className="space-y-6">
        {/* Dine-In */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block text-[#050B1E]">{t('dineIn')}</span>
              <span className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dineIn.isOpen ? 'bg-green-600' : 'bg-red-500'}`} />
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#050B1E]/50">
                  {dineIn.isOpen ? t('openNow') : t('closedNow')}
                </span>
              </span>
            </div>
          </div>
          <span className="text-xs font-bold font-mono tracking-wide text-right text-[#050B1E]/80">
            {dineIn.hoursText}
          </span>
        </div>

        {/* Delivery */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block text-[#050B1E]">{t('delivery')}</span>
              <span className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${delivery.isOpen ? 'bg-green-600' : 'bg-red-500'}`} />
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#050B1E]/50">
                  {delivery.isOpen ? t('openNow') : t('closedNow')}
                </span>
              </span>
            </div>
          </div>
          <span className="text-xs font-bold font-mono tracking-wide text-right text-[#050B1E]/80">
            {delivery.hoursText}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-primary/10 flex justify-center">
        <Link 
          href={ROUTES.contact}
          className="text-[10px] font-bold uppercase tracking-wider text-[#050B1E]/60 hover:text-primary transition-colors flex items-center gap-1.5 group"
        >
          {t('viewFullWeeklyHours')}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
