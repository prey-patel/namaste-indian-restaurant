import React from 'react';
import { useTranslations } from 'next-intl';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import Divider from '@/components/ui/divider';

export default function MenuHero() {
  const t = useTranslations('menu');

  return (
    <section className="relative overflow-hidden bg-[#070B1E] py-16 md:py-24 text-center border-b border-primary/15">
      {/* Background radial glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[90px] pointer-events-none" 
        aria-hidden="true"
      />
      
      {/* Subtle mandala watermark background */}
      <MandalaWatermark className="w-[320px] h-[320px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.035]" />

      <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
        {/* Navy/Gold badge */}
        <div className="flex justify-center items-center space-x-2 text-primary">
          <div className="h-[1px] w-6 bg-primary/30" />
          <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase font-sans">
            Namaste Indian
          </span>
          <div className="h-[1px] w-6 bg-primary/30" />
        </div>

        {/* Dynamic page title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-foreground animate-reveal">
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          {t('subtitle')}
        </p>

        {/* Gold divider decoration */}
        <Divider className="my-6" />

        {/* Pricing disclaimer */}
        <p className="text-[11px] text-primary/70 max-w-lg mx-auto font-sans font-medium tracking-wide uppercase leading-relaxed">
          * {t('disclaimer')}
        </p>
      </div>
    </section>
  );
}
