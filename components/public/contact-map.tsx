'use client';

import React, { useEffect, useRef } from 'react';
import PremiumButton from '../ui/premium-button';
import GoldFrame from '../ui/gold-frame';

type ContactMapProps = {
  address: string;
  phone: string;
  coordinates?: {
    status: string;
    latitude: number | null;
    longitude: number | null;
  };
  locale: string;
};

export default function ContactMap({ address, phone, coordinates, locale }: ContactMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const status = coordinates?.status || 'unverified';
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  const isVerified = status === 'verified' && latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  // External Map Links
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const openStreetMapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;

  useEffect(() => {
    if (!isVerified || !mapContainerRef.current) return;

    // Prevent duplicate map initialization
    if (mapInstanceRef.current) return;

    // 1. Inject Leaflet CSS
    const linkId = 'leaflet-css-cdn';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet Script
    const scriptId = 'leaflet-js-cdn';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (L && mapContainerRef.current) {
        try {
          const map = L.map(mapContainerRef.current, {
            scrollWheelZoom: false,
          }).setView([latitude, longitude], 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);

          // Custom marker icon using Leaflet defaults
          const marker = L.marker([latitude, longitude]).addTo(map);
          marker.bindPopup(`<b>Namaste Indian Restaurant</b><br>${address}`).openPopup();

          mapInstanceRef.current = map;
        } catch (err) {
          console.error('Leaflet Map Initialization error:', err);
        }
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      script.addEventListener('load', initMap);
    }

    return () => {
      // Clean up Leaflet Map instance on unmount
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (err) {
          console.error('Error removing map instance:', err);
        }
      }
    };
  }, [isVerified, address, latitude, longitude]);

  if (!isVerified) {
    // Fallback View when coordinates are unverified/null
    return (
      <GoldFrame className="w-full">
        <div className="p-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary bg-primary/5 mx-auto animate-pulse">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h4 className="font-serif font-bold text-foreground text-sm uppercase tracking-wider">
              {locale === 'pl' ? 'Podgląd Mapy (Lokalizacja)' : 'Map Preview (Location)'}
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto">
              {locale === 'pl'
                ? 'Współrzędne geograficzne restauracji oczekują na zatwierdzenie. Możesz otworzyć lokalizację bezpośrednio w zewnętrznych serwisach mapowych:'
                : 'Restaurant geographic coordinates are pending validation. You can open our location directly in external map services:'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <PremiumButton variant="primary" size="sm" className="w-full">
                Google Maps
              </PremiumButton>
            </a>
            <a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <PremiumButton variant="outline" size="sm" className="w-full">
                OpenStreetMap
              </PremiumButton>
            </a>
          </div>

          <div className="text-[10px] text-muted-foreground/60 italic font-mono pt-2">
            {locale === 'pl'
              ? 'Współrzędne zostaną zweryfikowane w bazie danych. / Coordinates validation pending in settings.'
              : 'Coordinates validation pending in database system settings.'}
          </div>
        </div>
      </GoldFrame>
    );
  }

  // Interactive Map View if verified
  return (
    <div className="space-y-4">
      <div 
        ref={mapContainerRef} 
        className="w-full h-80 rounded-2xl border border-primary/20 overflow-hidden shadow-lg relative bg-[#070B1E]"
        aria-label="Map location of Namaste Indian Restaurant"
        role="application"
      />
      <div className="flex justify-between items-center text-[10px] text-muted-foreground px-2">
        <span>&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> contributors</span>
        <div className="space-x-3">
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">
            {locale === 'pl' ? 'Otwórz w Google Maps' : 'Open in Google Maps'}
          </a>
          <span>|</span>
          <a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">
            {locale === 'pl' ? 'Otwórz w OpenStreetMap' : 'Open in OpenStreetMap'}
          </a>
        </div>
      </div>
    </div>
  );
}
