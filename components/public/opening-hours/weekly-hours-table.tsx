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
    <div className="w-full bg-[#FCFAF2] border border-primary/20 rounded-2xl shadow-xl overflow-hidden font-sans select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-primary/15 text-[#050B1E] bg-[#f5f1e3]/40">
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-wider text-[#050B1E]/60">
                {isPl ? 'Dzień' : 'Day'}
              </th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-wider text-[#050B1E]/60">
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-primary" />
                  <span>{t('dineIn')}</span>
                </div>
              </th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-wider text-[#050B1E]/60">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  <span>{t('delivery')}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10 text-xs sm:text-sm text-[#050B1E]">
            {weeklyHours.map(({ dayOfWeek, dineInHoursText, deliveryHoursText }) => {
              const isToday = dayOfWeek === todayDayOfWeek;
              const dayName = t(`days.${dayOfWeek}`);

              return (
                <tr 
                  key={dayOfWeek} 
                  className={`transition-colors ${
                    isToday 
                      ? 'bg-primary/5 font-bold border-l-4 border-l-primary' 
                      : 'hover:bg-primary/[0.02]'
                  }`}
                >
                  <td className="py-4 px-6 font-semibold flex items-center gap-2">
                    <span>{dayName}</span>
                    {isToday && (
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-primary/20 text-[#050B1E] border border-primary/30">
                        {isPl ? 'Dzisiaj' : 'Today'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-[#050B1E]/80">
                    {dineInHoursText}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-[#050B1E]/80">
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
