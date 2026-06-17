import { Link } from '@/i18n/routing';
import { getTranslations, getLocale } from 'next-intl/server';
import { ROUTES } from '@/lib/routes/path';
import { getPublicSystemSettings } from '@/lib/supabase/settings';
import { getPublicOpeningHours } from '@/lib/public/opening-hours';
import FooterHours from '@/components/public/opening-hours/footer-hours';

export default async function Footer() {
  const t = await getTranslations('nav');
  const locale = await getLocale();
  
  const settings = await getPublicSystemSettings();
  const openingHours = await getPublicOpeningHours(locale);

  const name = settings.restaurant_name || 'Namaste Indian Restaurant';
  const displayName = settings.public_display_name || 'Namaste Indian Restaurant';
  const address = settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';
  const email = settings.restaurant_email || 'contact@namaste-ciechanow.pl';

  const formatPhone = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+48 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phoneStr.startsWith('+') ? phoneStr : `+48 ${phoneStr}`;
  };

  return (
    <footer className="w-full border-t border-primary/20 bg-[#050B1E] py-12 text-muted-foreground mt-auto font-sans" aria-label="Footer">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Restaurant Contact Section */}
        <div className="flex flex-col space-y-3 text-left">
          <h3 className="font-serif text-lg font-bold text-primary tracking-wide">{displayName}</h3>
          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground/80">{address}</p>
          <p className="text-xs sm:text-sm text-muted-foreground/80">Tel: <span className="font-semibold text-primary font-mono">{formatPhone(phone)}</span></p>
          <p className="text-xs sm:text-sm text-muted-foreground/80">Email: {email}</p>
        </div>

        {/* Column 2: Today's Hours (Dynamic Status) */}
        <div>
          <FooterHours 
            dineIn={openingHours.dineIn} 
            delivery={openingHours.delivery} 
          />
        </div>

        {/* Column 3: Quick Links */}
        <div className="flex flex-col space-y-3 text-left">
          <h4 className="font-bold text-foreground text-xs uppercase tracking-widest border-b border-primary/10 pb-2">
            {locale === 'pl' ? 'Szybkie Linki' : 'Quick Links'}
          </h4>
          <nav className="grid grid-cols-2 gap-2 text-xs sm:text-sm" aria-label="Menu stópki / Footer navigation">
            <Link href={ROUTES.home} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('home')}</Link>
            <Link href={ROUTES.menu} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('menu')}</Link>
            <Link href={ROUTES.order} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('orderOnline')}</Link>
            <Link href={ROUTES.reservations} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('reservations')}</Link>
            <Link href={ROUTES.story} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('story')}</Link>
            <Link href={ROUTES.contact} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('contact')}</Link>
          </nav>
        </div>
      </div>

      {/* Footer Bottom: Copyright & Policies */}
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] sm:text-xs">
        <p>&copy; {new Date().getFullYear()} Namaste Indian Restaurant. Wszelkie prawa zastrzeżone / All rights reserved.</p>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 justify-center" aria-label="Polityki / Policies">
          <Link href={ROUTES.privacy} className="hover:text-primary transition-colors">Polityka Prywatności / Privacy Policy</Link>
          <span className="text-primary/25">|</span>
          <Link href={ROUTES.cookie} className="hover:text-primary transition-colors">Pliki Cookies / Cookie Policy</Link>
          <span className="text-primary/25">|</span>
          <Link href={ROUTES.terms} className="hover:text-primary transition-colors">Regulamin / Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
