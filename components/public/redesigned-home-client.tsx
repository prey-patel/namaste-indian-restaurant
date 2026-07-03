'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes/path';
import { useTranslations } from 'next-intl';
import PremiumButton from '@/components/ui/premium-button';
import GoldFrame from '@/components/ui/gold-frame';
import ContactMap from '@/components/public/contact-map';
import MandalaWatermark from '@/components/ui/mandala-watermark';
import ThreeDTiltCard from '@/components/ui/three-d-tilt';

import { PublicMenuItem } from '@/lib/supabase/menu';

type RedesignedHomeClientProps = {
  locale: string;
  address: string;
  phone: string;
  email: string;
  coordinates?: any;
  googleMapsLink?: string;
  signatureDishes?: PublicMenuItem[];
};

export default function RedesignedHomeClient({
  locale,
  address,
  phone,
  email,
  coordinates,
  googleMapsLink,
  signatureDishes,
}: RedesignedHomeClientProps) {
  const t = useTranslations('home');

  // Animation variants
  const scrollFadeIn = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 18,
      },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardHoverEffect = {
    hover: {
      y: -8,
      borderColor: 'rgba(212,175,55,0.5)',
      boxShadow: '0 20px 40px rgba(212,175,55,0.08)',
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="w-full bg-[#040815] overflow-hidden">
      
      {/* 1. SIGNATURE DISHES */}
      <section className="w-full py-20 md:py-28 border-y border-primary/10 relative">
        <MandalaWatermark className="w-[500px] h-[500px] -right-40 -top-40 opacity-[0.015] animate-spin-slow" />
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollFadeIn}
            className="text-center max-w-3xl mx-auto mb-20 space-y-4"
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-[10px] tracking-[0.3em] font-extrabold uppercase text-primary/80 font-sans">
                Chef Recommends
              </span>
              <div className="flex items-center space-x-2 w-40 py-1">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/60" />
                <div className="text-primary text-[10px]">✦</div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground">
              {t('dishesTitle')}
            </h2>
            <p className="text-muted-foreground/80 text-xs sm:text-sm font-light font-sans max-w-lg mx-auto">
              {t('dishesSub')}
            </p>
          </motion.div>

          {/* Dynamic Dishes Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {signatureDishes && signatureDishes.length > 0 ? (
              signatureDishes.map((dish, idx) => {
                const title = locale === 'pl' ? dish.name_pl : dish.name_en;
                const desc = (locale === 'pl' ? dish.description_pl : dish.description_en) || '';
                const fallbackImg = idx === 0 ? '/images/butter_chicken.png' 
                  : idx === 1 ? '/images/dal_makhani.png' 
                  : idx === 2 ? '/images/chicken_biryani.png' 
                  : '/images/garlic_naan.png';
                const imgSrc = dish.signed_image_url || dish.image_url || fallbackImg;

                return (
                  <motion.div key={dish.id} variants={scrollFadeIn} className="flex flex-col h-full">
                    <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col h-full justify-between transition-colors duration-300 w-full">
                      <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                      <div className="space-y-4" style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}>
                        <div className="aspect-[4/3] w-full rounded-lg relative overflow-hidden border border-primary/10 shadow-lg" style={{ transform: "translateZ(10px)" }}>
                          <Image
                            src={imgSrc}
                            alt={title}
                            fill
                            unoptimized={imgSrc.startsWith('http')}
                            className="object-cover scale-105 hover:scale-100 transition-transform duration-700 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-foreground line-clamp-1">{title}</h3>
                        <p className="text-muted-foreground/80 text-xs leading-relaxed font-sans font-light line-clamp-3">{desc}</p>
                      </div>
                      <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs font-sans" style={{ transform: "translateZ(10px)" }}>
                        <span className="text-primary tracking-wider font-extrabold uppercase">{Number(dish.price).toFixed(2)} PLN</span>
                        <span className="text-[10px] text-muted-foreground/50 italic">
                          {dish.is_chef_special ? "Chef's Special" : "Popular"}
                        </span>
                      </div>
                    </ThreeDTiltCard>
                  </motion.div>
                );
              })
            ) : (
              <>
                {/* Fallback Dish 1: Butter Chicken */}
                <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
                  <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col h-full justify-between transition-colors duration-300 w-full">
                    <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                    <div className="space-y-4" style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}>
                      <div className="aspect-[4/3] w-full rounded-lg relative overflow-hidden border border-primary/10 shadow-lg" style={{ transform: "translateZ(10px)" }}>
                        <Image
                          src="/images/butter_chicken.png"
                          alt={t('dishButter')}
                          fill
                          className="object-cover scale-105 hover:scale-100 transition-transform duration-700 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{t('dishButter')}</h3>
                      <p className="text-muted-foreground/80 text-xs leading-relaxed font-sans font-light">{t('dishButterDesc')}</p>
                    </div>
                    <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs font-sans" style={{ transform: "translateZ(10px)" }}>
                      <span className="text-primary tracking-wider font-extrabold uppercase">39.00 PLN</span>
                      <span className="text-[10px] text-muted-foreground/50 italic">Signature Curry</span>
                    </div>
                  </ThreeDTiltCard>
                </motion.div>

                {/* Fallback Dish 2: Dal Makhani */}
                <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
                  <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col h-full justify-between transition-colors duration-300 w-full">
                    <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                    <div className="space-y-4" style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}>
                      <div className="aspect-[4/3] w-full rounded-lg relative overflow-hidden border border-primary/10 shadow-lg" style={{ transform: "translateZ(10px)" }}>
                        <Image
                          src="/images/dal_makhani.png"
                          alt={t('dishDal')}
                          fill
                          className="object-cover scale-105 hover:scale-100 transition-transform duration-700 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{t('dishDal')}</h3>
                      <p className="text-muted-foreground/80 text-xs leading-relaxed font-sans font-light">{t('dishDalDesc')}</p>
                    </div>
                    <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs font-sans" style={{ transform: "translateZ(10px)" }}>
                      <span className="text-primary tracking-wider font-extrabold uppercase">28.00 PLN</span>
                      <span className="text-[10px] text-muted-foreground/50 italic">Slow Cooked</span>
                    </div>
                  </ThreeDTiltCard>
                </motion.div>

                {/* Fallback Dish 3: Chicken Biryani */}
                <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
                  <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col h-full justify-between transition-colors duration-300 w-full">
                    <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                    <div className="space-y-4" style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}>
                      <div className="aspect-[4/3] w-full rounded-lg relative overflow-hidden border border-primary/10 shadow-lg" style={{ transform: "translateZ(10px)" }}>
                        <Image
                          src="/images/chicken_biryani.png"
                          alt={t('dishBiryani')}
                          fill
                          className="object-cover scale-105 hover:scale-100 transition-transform duration-700 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{t('dishBiryani')}</h3>
                      <p className="text-muted-foreground/80 text-xs leading-relaxed font-sans font-light">{t('dishBiryaniDesc')}</p>
                    </div>
                    <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs font-sans" style={{ transform: "translateZ(10px)" }}>
                      <span className="text-primary tracking-wider font-extrabold uppercase">36.00 PLN</span>
                      <span className="text-[10px] text-muted-foreground/50 italic">Basmati Masterpiece</span>
                    </div>
                  </ThreeDTiltCard>
                </motion.div>

                {/* Fallback Dish 4: Garlic Naan */}
                <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
                  <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col h-full justify-between transition-colors duration-300 w-full">
                    <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                    <div className="space-y-4" style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}>
                      <div className="aspect-[4/3] w-full rounded-lg relative overflow-hidden border border-primary/10 shadow-lg" style={{ transform: "translateZ(10px)" }}>
                        <Image
                          src="/images/garlic_naan.png"
                          alt={t('dishNaan')}
                          fill
                          className="object-cover scale-105 hover:scale-100 transition-transform duration-700 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{t('dishNaan')}</h3>
                      <p className="text-muted-foreground/80 text-xs leading-relaxed font-sans font-light">{t('dishNaanDesc')}</p>
                    </div>
                    <div className="pt-6 border-t border-primary/10 mt-6 flex justify-between items-center text-xs font-sans" style={{ transform: "translateZ(10px)" }}>
                      <span className="text-primary tracking-wider font-extrabold uppercase">12.00 PLN</span>
                      <span className="text-[10px] text-muted-foreground/50 italic">Tandoor Clay Baked</span>
                    </div>
                  </ThreeDTiltCard>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* 2. DINING EXPERIENCE */}
      <section className="w-full py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollFadeIn}
            className="space-y-6 text-left"
          >
            <div className="flex items-center space-x-2 text-primary font-sans">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Premium Experience</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground leading-tight">
              {t('ambienceTitle')}
            </h2>
            <p className="text-muted-foreground/90 text-sm leading-relaxed font-light font-sans max-w-xl">
              {t('ambienceDesc')}
            </p>
            <div className="pt-4">
              <Link href={ROUTES.reservations}>
                <PremiumButton variant="primary" size="md">
                  {t('reserveTable')}
                </PremiumButton>
              </Link>
            </div>
          </motion.div>

          {/* Right Side: Ambience Photo with Luxury Border */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 25 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            className="w-full max-w-lg mx-auto"
          >
            <ThreeDTiltCard maxTilt={10} glareOpacity={0.18} translateZ="30px" className="w-full">
              <GoldFrame className="w-full overflow-hidden rounded-xl">
                <div className="aspect-[4/3] relative group overflow-hidden bg-[#070B1E]">
                  <Image
                    src="/images/dining_ambience.png"
                    alt="Restaurant Dining Interior"
                    fill
                    className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/70 font-semibold font-sans">Namaste Ciechanów</span>
                </div>
              </GoldFrame>
            </ThreeDTiltCard>
          </motion.div>

        </div>
      </section>

      {/* 3. CHEF CRAFT */}
      <section className="w-full bg-[#050918] py-20 md:py-28 border-y border-primary/10 relative overflow-hidden">
        <MandalaWatermark className="w-[450px] h-[450px] -left-20 -top-20 opacity-[0.02] animate-spin-slow-reverse" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Chef Craft Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -25 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            className="w-full max-w-lg mx-auto order-2 lg:order-1"
          >
            <ThreeDTiltCard maxTilt={10} glareOpacity={0.18} translateZ="30px" className="w-full">
              <GoldFrame className="w-full overflow-hidden rounded-xl">
                <div className="aspect-[4/3] relative group overflow-hidden bg-[#070B1E]">
                  <Image
                    src="/images/chef_craft.png"
                    alt="Tandoor Oven Baking"
                    fill
                    className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-bl from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-widest text-primary/70 font-semibold font-sans">Art of Culinary</span>
                </div>
              </GoldFrame>
            </ThreeDTiltCard>
          </motion.div>

          {/* Right Side: Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollFadeIn}
            className="space-y-6 text-left order-1 lg:order-2"
          >
            <div className="flex items-center space-x-2 text-primary font-sans">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Traditional Kitchen</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground leading-tight">
              {t('chefTitle')}
            </h2>
            <p className="text-muted-foreground/90 text-sm leading-relaxed font-light font-sans max-w-xl">
              {t('chefDesc')}
            </p>
          </motion.div>

        </div>
      </section>

      {/* 4. SERVICES PREVIEW */}
      <section className="w-full py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollFadeIn}
            className="text-center max-w-3xl mx-auto mb-20 space-y-4"
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-[10px] tracking-[0.3em] font-extrabold uppercase text-primary/80 font-sans">
                Premium Offerings
              </span>
              <div className="flex items-center space-x-2 w-40 py-1">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/60" />
                <div className="text-primary text-[10px]">✦</div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground">
              {t('servicesTitle')}
            </h2>
          </motion.div>

          {/* Services Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Service 1: Dine-In */}
            <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
              <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-6 flex flex-col h-full justify-between transition-colors duration-300 w-full h-full">
                <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                <div style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }} className="space-y-4 text-left font-sans">
                  <h3 className="text-xl font-serif font-bold text-primary">{t('servicesDine')}</h3>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed font-light">{t('servicesDineDesc')}</p>
                </div>
                <div className="pt-6 border-t border-primary/10 mt-6 text-left font-sans" style={{ transform: "translateZ(10px)" }}>
                  <Link href={ROUTES.reservations} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline flex items-center gap-1">
                    Book a Table &rarr;
                  </Link>
                </div>
              </ThreeDTiltCard>
            </motion.div>

            {/* Service 2: Takeaway */}
            <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
              <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-6 flex flex-col h-full justify-between transition-colors duration-300 w-full h-full">
                <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                <div style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }} className="space-y-4 text-left font-sans">
                  <h3 className="text-xl font-serif font-bold text-primary">{t('servicesTakeaway')}</h3>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed font-light">{t('servicesTakeawayDesc')}</p>
                </div>
                <div className="pt-6 border-t border-primary/10 mt-6 text-left font-sans" style={{ transform: "translateZ(10px)" }}>
                  <Link href={ROUTES.menu} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline flex items-center gap-1">
                    View Menu &rarr;
                  </Link>
                </div>
              </ThreeDTiltCard>
            </motion.div>

            {/* Service 3: Delivery */}
            <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
              <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-6 flex flex-col h-full justify-between transition-colors duration-300 w-full h-full">
                <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                <div style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }} className="space-y-4 text-left font-sans">
                  <h3 className="text-xl font-serif font-bold text-primary">{t('servicesDelivery')}</h3>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed font-light">{t('servicesDeliveryDesc')}</p>
                </div>
                <div className="pt-6 border-t border-primary/10 mt-6 text-left font-sans" style={{ transform: "translateZ(10px)" }}>
                  <Link href={ROUTES.order} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline flex items-center gap-1">
                    Order Delivery &rarr;
                  </Link>
                </div>
              </ThreeDTiltCard>
            </motion.div>

            {/* Service 4: Reservations */}
            <motion.div variants={scrollFadeIn} className="flex flex-col h-full">
              <ThreeDTiltCard maxTilt={15} glareOpacity={0.15} className="relative rounded-xl border border-primary/15 bg-slate-950/40 backdrop-blur-md p-6 flex flex-col h-full justify-between transition-colors duration-300 w-full h-full">
                <div className="absolute inset-1 rounded-[10px] border border-primary/5 pointer-events-none" />
                <div style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }} className="space-y-4 text-left font-sans">
                  <h3 className="text-xl font-serif font-bold text-primary">{t('servicesReservations')}</h3>
                  <p className="text-muted-foreground/80 text-xs leading-relaxed font-light">{t('servicesReservationsDesc')}</p>
                </div>
                <div className="pt-6 border-t border-primary/10 mt-6 text-left font-sans" style={{ transform: "translateZ(10px)" }}>
                  <Link href={ROUTES.reservations} className="text-primary text-[10px] uppercase font-bold tracking-wider hover:underline flex items-center gap-1">
                    Reserve Online &rarr;
                  </Link>
                </div>
              </ThreeDTiltCard>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* 5. LOCATION & MAP */}
      <section className="w-full bg-[#050918] py-20 md:py-28 border-y border-primary/10 relative">
        <MandalaWatermark className="w-[500px] h-[500px] -right-40 -bottom-40 opacity-[0.015] animate-spin-slow" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Location Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollFadeIn}
            className="space-y-6 text-left"
          >
            <div className="flex items-center space-x-2 text-primary font-sans">
              <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase">Visit Us</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-wide text-foreground">
              {t('locationTitle')}
            </h2>
            <div className="space-y-4 font-sans text-sm text-muted-foreground/90 font-light leading-relaxed">
              <p className="font-bold text-foreground text-base">Namaste Indian Restaurant</p>
              <a 
                href={googleMapsLink && googleMapsLink.trim().startsWith('http') ? googleMapsLink.trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 hover:text-primary transition-colors group cursor-pointer hover:underline"
              >
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{address}</span>
              </a>
              <p className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {phone}
              </p>
              <p className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {email}
              </p>
            </div>
            <div className="pt-4">
              <Link href={ROUTES.contact}>
                <PremiumButton variant="outline" size="md">
                  {t('locationContact')}
                </PremiumButton>
              </Link>
            </div>
          </motion.div>

          {/* Interactive Map View */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            className="w-full"
          >
            <ContactMap
              address={address}
              phone={phone}
              coordinates={coordinates}
              locale={locale}
            />
          </motion.div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="w-full py-20 md:py-32 relative text-center">
        {/* Soft background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[550px] h-[280px] sm:h-[550px] bg-primary/5 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 60, damping: 15 }}
            className="text-4xl sm:text-6xl font-serif font-bold tracking-wide text-foreground leading-[1.15]"
          >
            {t('finalCtaTitle')}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground/80 text-sm sm:text-base font-light font-sans max-w-xl mx-auto leading-relaxed"
          >
            {t('finalCtaSub')}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto pt-4"
          >
            <Link href={ROUTES.reservations} className="w-full sm:w-auto">
              <PremiumButton variant="primary" size="lg" fullWidth>
                {t('reserveTable')}
              </PremiumButton>
            </Link>
            <Link href={ROUTES.menu} className="w-full sm:w-auto">
              <PremiumButton variant="outline" size="lg" fullWidth>
                {t('viewMenu')}
              </PremiumButton>
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
