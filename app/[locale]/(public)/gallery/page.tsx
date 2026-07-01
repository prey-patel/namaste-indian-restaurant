import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageTransition from '@/components/ui/page-transition';
import SectionContainer from '@/components/ui/section-container';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import GalleryClient from '@/components/public/gallery/gallery-client';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('galleryTitle'),
    description: t('galleryDesc'),
    openGraph: {
      title: t('galleryTitle'),
      description: t('galleryDesc'),
      locale: locale === 'pl' ? 'pl_PL' : 'en_US',
      type: 'website',
    },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tNav = await getTranslations('nav');
  const tGallery = await getTranslations('gallery');

  const dbImages: {
    id: string;
    url: string;
    bucket: string;
    alt_text_pl: string | null;
    alt_text_en: string | null;
  }[] = [];

  // Query database-managed approved media gallery assets
  try {
    const supabase = await createClient();
    const { data: assets, error } = await supabase
      .from('media_assets')
      .select('id, bucket, file_path, alt_text_pl, alt_text_en')
      .eq('is_approved', true)
      .eq('is_public', true)
      .eq('bucket', 'gallery-images');

    if (assets && assets.length > 0) {
      const adminClient = createAdminClient();
      for (const asset of assets) {
        const { data: signData, error: signError } = await adminClient.storage
          .from(asset.bucket)
          .createSignedUrl(asset.file_path, 3600); // 1 hour expiration

        if (signData?.signedUrl && !signError) {
          dbImages.push({
            id: asset.id,
            url: signData.signedUrl,
            bucket: asset.bucket,
            alt_text_pl: asset.alt_text_pl,
            alt_text_en: asset.alt_text_en,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching gallery media assets from DB:', err);
  }

  return (
    <PageTransition>
      {/* Gallery Hero Section */}
      <section className="relative overflow-hidden bg-[#070B1E] py-20 md:py-28 text-center border-b border-primary/15">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <MandalaWatermark className="w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]" />

        <div className="max-w-3xl mx-auto px-4 relative z-10 space-y-4">
          <div className="flex justify-center items-center space-x-2 text-primary">
            <div className="h-[1px] w-6 bg-primary/30" />
            <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">{tNav('gallery')}</span>
            <div className="h-[1px] w-6 bg-primary/30" />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-foreground">
            {tGallery('title')}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto">
            {tGallery('subtitle')}
          </p>
        </div>
      </section>

      {/* Main Gallery grid client component */}
      <SectionContainer className="relative">
        <MandalaWatermark className="w-[300px] h-[300px] left-10 bottom-10 opacity-[0.015] pointer-events-none" />
        <GalleryClient locale={locale} dbImages={dbImages} />
      </SectionContainer>
    </PageTransition>
  );
}
