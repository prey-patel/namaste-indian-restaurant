'use client';

import React from 'react';
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="min-h-screen bg-[#070B1E] flex flex-col justify-center items-center px-4 text-center relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md w-full border border-primary/20 bg-card/25 backdrop-blur-md p-8 sm:p-12 rounded-3xl relative shadow-2xl space-y-6">
        {/* Gold corner ornaments */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/60" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/60" />

        <h1 className="text-3xl font-serif font-black tracking-wide text-primary">
          404 - Strona nie znaleziona
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-light">
          Przepraszamy, ale strona której szukasz nie istnieje. / We are sorry, but the page you are looking for does not exist.
        </p>
        <Link
          href="/pl"
          className="inline-flex items-center justify-center font-bold uppercase tracking-widest text-xs px-6 py-3 bg-primary text-[#070B1E] rounded hover:brightness-105 transition-all duration-300 w-full"
        >
          Powrót do strony głównej / Back to Home
        </Link>
      </div>
    </div>
  );
}
