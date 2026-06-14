'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

type WhyChooseNamasteProps = {
  whyTitle: string;
  whySubtitle: string;
  whyRecipes: string;
  whyRecipesDesc: string;
  whyVegetarian: string;
  whyVegetarianDesc: string;
  whyIngredients: string;
  whyIngredientsDesc: string;
  whyHospitality: string;
  whyHospitalityDesc: string;
  whySpices: string;
  whySpicesDesc: string;
  madeWith: string;
  tradition: string;
  madeFor: string;
  you: string;
};

export default function WhyChooseNamaste({
  whyTitle,
  whySubtitle,
  whyRecipes,
  whyRecipesDesc,
  whyVegetarian,
  whyVegetarianDesc,
  whyIngredients,
  whyIngredientsDesc,
  whyHospitality,
  whyHospitalityDesc,
  whySpices,
  whySpicesDesc,
  madeWith,
  tradition,
  madeFor,
  you,
}: WhyChooseNamasteProps) {
  
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 15,
      },
    },
  };

  const bannerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 50,
        damping: 20,
        delay: 0.1,
      },
    },
  };

  return (
    <section className="relative py-20 md:py-28 bg-[#030714] overflow-hidden text-center select-none">
      
      {/* Background mandala decoration */}
      <div className="absolute -left-12 -top-12 w-[350px]. h-[350px] opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-primary fill-none stroke-current" strokeWidth="0.5">
          <circle cx="50" cy="50" r="45" />
          <circle cx="50" cy="50" r="35" />
          <circle cx="50" cy="50" r="25" />
          {Array.from({ length: 24 }).map((_, i) => (
            <path
              key={i}
              d={`M 50 50 L ${50 + 45 * Math.cos((i * Math.PI) / 12)} ${50 + 45 * Math.sin((i * Math.PI) / 12)}`}
            />
          ))}
        </svg>
      </div>

      <div className="absolute -right-12 -bottom-12 w-[350px] h-[350px] opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-primary fill-none stroke-current" strokeWidth="0.5">
          <circle cx="50" cy="50" r="45" />
          <circle cx="50" cy="50" r="35" />
          <circle cx="50" cy="50" r="25" />
          {Array.from({ length: 24 }).map((_, i) => (
            <path
              key={i}
              d={`M 50 50 L ${50 + 45 * Math.cos((i * Math.PI) / 12)} ${50 + 45 * Math.sin((i * Math.PI) / 12)}`}
            />
          ))}
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-16 space-y-4"
        >
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-[10px] tracking-[0.3em] font-extrabold uppercase text-primary/80">
              Namaste Philosophy
            </span>
            {/* Ornamental Gold Divider Line */}
            <div className="flex items-center space-x-2 w-48 py-1.5">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/60" />
              <div className="text-primary text-xs">✦</div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/60" />
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-wide text-foreground">
            {whyTitle}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-light max-w-2xl mx-auto">
            {whySubtitle}
          </p>
        </motion.div>

        {/* Content Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
        >
          
          {/* LEFT COLUMN: Recipes & Vegetarian */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-6">
            
            {/* Card 1: Traditional Recipes */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 10px 30px rgba(212,175,55,0.04)' }}
              className="flex-1 flex gap-4 text-left p-6 bg-slate-950/40 backdrop-blur-md border border-primary/15 rounded-xl transition-all duration-300"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-primary/25 bg-primary/5 text-primary">
                {/* Steaming Bowl custom SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11h18" />
                  <path d="M5 11v2a7 7 0 0 0 7 7h0a7 7 0 0 0 7-7v-2" />
                  <path d="M9 7c0-1.5 1-2.5 1-2.5" />
                  <path d="M13 7c0-1.5 1-2.5 1-2.5" />
                  <path d="M11 9c0-1 0.5-2 0.5-2" />
                </svg>
              </div>
              <div className="space-y-1 pt-1.5">
                <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                  {whyRecipes}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {whyRecipesDesc}
                </p>
              </div>
            </motion.div>

            {/* Card 2: Vegetarian Friendly */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 10px 30px rgba(212,175,55,0.04)' }}
              className="flex-1 flex gap-4 text-left p-6 bg-slate-950/40 backdrop-blur-md border border-primary/15 rounded-xl transition-all duration-300"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-primary/25 bg-primary/5 text-primary">
                {/* Leaf custom SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 3c-1.5 2-2 3.5-3.1 9.2A7 7 0 0 1 11 20z" />
                  <path d="M19 3L11 11" />
                </svg>
              </div>
              <div className="space-y-1 pt-1.5">
                <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                  {whyVegetarian}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {whyVegetarianDesc}
                </p>
              </div>
            </motion.div>

          </div>

          {/* MIDDLE COLUMN: Large Curry Image Card */}
          <motion.div
            variants={bannerVariants}
            whileHover={{ scale: 1.01, boxShadow: '0 15px 40px rgba(212,175,55,0.08)' }}
            className="lg:col-span-6 min-h-[350px] lg:min-h-[450px] relative rounded-xl overflow-hidden border-2 border-primary/30 group transition-all duration-300"
          >
            {/* Background image with scaling zoom effect */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/philosophy_curry.png"
                alt="Made for You Curry"
                fill
                priority
                className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-700 pointer-events-none"
              />
              {/* Luxury dark vignetted overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />
            </div>

            {/* Typography Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-8 md:p-12 text-center">
              
              {/* Lotus Icon */}
              <div className="text-primary opacity-95 animate-pulse mt-4">
                <svg className="w-10 h-10 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L9 9h6L12 2z" />
                  <path d="M12 22L9 15h6L12 22z" />
                  <path d="M22 12L15 9v6l7-12z" />
                  <path d="M2 12L9 9v6l-7-12z" />
                  <circle cx="12" cy="12" r="1" className="fill-primary" />
                </svg>
              </div>

              {/* Slogan */}
              <div className="space-y-1.5 my-auto">
                <span className="text-[10px] md:text-xs tracking-[0.4em] font-extrabold uppercase text-primary/90 block">
                  {madeWith}
                </span>
                <h3 className="text-3xl md:text-5xl font-serif font-black tracking-wide text-foreground">
                  {tradition}
                </h3>
                <h3 className="text-3xl md:text-5xl font-serif font-black tracking-wide text-foreground">
                  {madeFor}
                </h3>
                <h4 className="text-4xl md:text-6xl font-serif font-bold italic text-primary mt-2">
                  {you}
                </h4>
              </div>

              {/* Ornament Bottom */}
              <div className="flex items-center space-x-2 w-36 pb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/60" />
                <div className="text-primary text-[8px]">✦</div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/60" />
              </div>

            </div>
          </motion.div>

          {/* RIGHT COLUMN: Ingredients & Hospitality */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-6">
            
            {/* Card 3: Fresh Ingredients */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 10px 30px rgba(212,175,55,0.04)' }}
              className="flex-1 flex gap-4 text-left p-6 bg-slate-950/40 backdrop-blur-md border border-primary/15 rounded-xl transition-all duration-300"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-primary/25 bg-primary/5 text-primary">
                {/* Sprout / Double Leaf SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22V12M12 12c2.5 0 6-2 6-5.5s-2-2.5-3-2.5-3 2-3 5.5M12 12c-2.5 0-6-2-6-5.5S8 4 9 4s3 2 3 5.5" />
                </svg>
              </div>
              <div className="space-y-1 pt-1.5">
                <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                  {whyIngredients}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {whyIngredientsDesc}
                </p>
              </div>
            </motion.div>

            {/* Card 4: Indian Hospitality */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -5, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 10px 30px rgba(212,175,55,0.04)' }}
              className="flex-1 flex gap-4 text-left p-6 bg-slate-950/40 backdrop-blur-md border border-primary/15 rounded-xl transition-all duration-300"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-primary/25 bg-primary/5 text-primary">
                {/* Heart custom SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div className="space-y-1 pt-1.5">
                <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                  {whyHospitality}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {whyHospitalityDesc}
                </p>
              </div>
            </motion.div>

          </div>

        </motion.div>

        {/* BOTTOM FULL-WIDTH CARD: Handcrafted Spice Blends */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 50, damping: 15 }}
          className="mt-8 max-w-4xl mx-auto"
        >
          <motion.div
            whileHover={{ y: -5, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 10px 30px rgba(212,175,55,0.04)' }}
            className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left p-6 bg-slate-950/40 backdrop-blur-md border border-primary/15 rounded-xl transition-all duration-300"
          >
            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full border border-primary/25 bg-primary/5 text-primary">
              {/* Mortar & Pestle custom SVG */}
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11h16" />
                <path d="M6 11c0 4 3 6 6 6s6-2 6-6" />
                <path d="M15 5l2 6" />
                <path d="M9 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
              </svg>
            </div>
            <div className="space-y-1 pt-1">
              <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                {whySpices}
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {whySpicesDesc}
              </p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
