import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Utensils, Truck } from 'lucide-react';

type Props = {
  weeklyHours: {
    dayOfWeek: number;
    dineInHoursText: string;
    deliveryHoursText: string;
  }[];
  todayDayOfWeek: number;
};

export default function WeeklyHoursTable({ weeklyHours, todayDayOfWeek }: Props) {
  const t = useTranslations('openingHours');
  const locale = useLocale();
  const isPl = locale === 'pl';

  return (
    <div className="w-full bg-[#050b1e]/40 backdrop-blur-md border border-primary/15 rounded-2xl shadow-2xl overflow-hidden font-sans select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-primary/15 text-primary bg-primary/5">
              <th className="py-4.5 px-6 text-[10px] font-extrabold uppercase tracking-widest text-primary/80">
                {isPl ? 'Dzień' : 'Day'}
              </th>
              <th className="py-4.5 px-6 text-[10px] font-extrabold uppercase tracking-widest text-primary/80">
                <div className="flex items-center gap-2">
                  <Utensils className="w-3.5 h-3.5 text-primary" />
                  <span>{t('dineIn')}</span>
                </div>
              </th>
              <th className="py-4.5 px-6 text-[10px] font-extrabold uppercase tracking-widest text-primary/80">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  <span>{t('delivery')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10 text-xs sm:text-sm text-slate-200">
            {weeklyHours.map(({ dayOfWeek, dineInHoursText, deliveryHoursText }) => {
              const isToday = dayOfWeek === todayDayOfWeek;
              const dayName = t(`days.${dayOfWeek}`);

              return (
                <tr 
                  key={dayOfWeek} 
                  className={`transition-colors ${
                    isToday 
                      ? 'bg-primary/10 font-bold border-l-4 border-l-primary' 
                      : 'hover:bg-primary/[0.03]'
                  }`}
                >
                  <td className="py-4 px-6 font-semibold flex items-center gap-2">
                    {isToday && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <span>{dayName}</span>
                    {isToday && (
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        {isPl ? 'Dzisiaj' : 'Today'}
                      </span>
                    )}
                  </td>
                  <td className={`py-4 px-6 font-mono text-xs ${isToday ? 'text-primary font-bold' : 'text-slate-300'}`}>
                    {dineInHoursText}
                  </td>
                  <td className={`py-4 px-6 font-mono text-xs ${isToday ? 'text-primary font-bold' : 'text-slate-300'}`}>
                    {deliveryHoursText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
