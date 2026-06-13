import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import PremiumCard from '@/components/ui/premium-card';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import GoldFrame from '@/components/ui/gold-frame';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('storyTitle'),
    description: t('storyDesc'),
    openGraph: {
      title: t('storyTitle'),
      description: t('storyDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function OurStoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('story');
  const tNav = await getTranslations('nav');

  return (
    <PageTransition>
      {/* Story Hero */}
      <section className="relative overflow-hidden bg-[#070B1E] py-20 md:py-28 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">{tNav('story')}</span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto">
            {t('heroSub')}
          </p>
        </div>
      </section>

      {/* Philosophy & Craft Section */}
      <SectionContainer className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-wide">
            {t('philTitle')}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-light font-sans">
            {t('philDesc')}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-light font-sans">
            Każda przyprawa używana w naszej kuchni jest starannie selekcjonowana i sprowadzana bezpośrednio z Indii, by zagwarantować autentyczność smaku. Pieczemy w tradycyjnym piecu tandoor rozgrzanym do temperatury powyżej 400°C.
          </p>
        </div>

        <GoldFrame className="w-full max-w-md mx-auto">
          <div className="aspect-[4/3] bg-[#070B1E]/40 flex items-center justify-center border border-primary/10 relative text-primary/30">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/50">Tandoor Craft</span>
          </div>
        </GoldFrame>
      </SectionContainer>

      {/* Values Grid */}
      <section className="w-full bg-[#050918] py-16 md:py-24 border-y border-primary/10 relative overflow-hidden">
        <MandalaWatermark className="w-[300px] h-[300px] right-10 bottom-10 opacity-[0.02]" />

        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              {t('valuesTitle')}
            </h2>
            <div className="h-[1px] w-20 bg-primary/40 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PremiumCard hoverable className="text-center space-y-4">
              <span className="text-primary font-serif font-bold text-3xl">01</span>
              <h3 className="text-lg font-serif font-bold text-foreground">Tradycja</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Szacunek do wiekowych receptur i naturalnych metod przygotowywania potraw.
              </p>
            </PremiumCard>

            <PremiumCard hoverable className="text-center space-y-4">
              <span className="text-primary font-serif font-bold text-3xl">02</span>
              <h3 className="text-lg font-serif font-bold text-foreground">Jakość</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Tylko świeże, nieprzetworzone składniki najwyższej klasy od sprawdzonych dostawców.
              </p>
            </PremiumCard>

            <PremiumCard hoverable className="text-center space-y-4">
              <span className="text-primary font-serif font-bold text-3xl">03</span>
              <h3 className="text-lg font-serif font-bold text-foreground">Gościnność</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Pragniemy, by każda chwila spędzona w naszych progach była wyjątkowym przeżyciem.
              </p>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* Guest Reviews Section */}
      <SectionContainer className="text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-wide">
            {t('reviewsTitle')}
          </h2>
          <div className="h-[1px] w-24 bg-primary/40 mx-auto" />
          <p className="text-muted-foreground text-sm italic font-light">
            &ldquo;{t('reviewsPlaceholder')}&rdquo;
          </p>
        </div>
      </SectionContainer>
    </PageTransition>
  );
}
