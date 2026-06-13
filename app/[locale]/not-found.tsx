import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import PremiumButton from '@/components/ui/premium-button';
import GoldSpinner from '@/components/ui/gold-spinner';

export default async function NotFoundPage() {
  const t = await getTranslations('error404');

  return (
    <div className="min-h-screen bg-[#070B1E] flex flex-col justify-center items-center px-4 text-center relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md w-full border border-primary/20 bg-card/25 backdrop-blur-md p-8 sm:p-12 rounded-3xl relative shadow-2xl space-y-8">
        {/* Gold corner ornaments */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/60" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/60" />

        <div className="flex justify-center">
          <GoldSpinner size="md" />
        </div>

        <div className="space-y-3 font-sans">
          <h1 className="text-3xl font-serif font-black tracking-wide text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-light">
            {t('message')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href={ROUTES.home}>
            <PremiumButton variant="primary" size="md" className="w-full">
              {t('backHome')}
            </PremiumButton>
          </Link>
          <Link href={ROUTES.menu}>
            <PremiumButton variant="outline" size="md" className="w-full">
              {t('viewMenu')}
            </PremiumButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
