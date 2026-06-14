import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { ROUTES } from '@/lib/routes/path';
import { getPublicSystemSettings } from '@/lib/supabase/settings';

export default async function Footer() {
  const t = await getTranslations('nav');
  const settings = await getPublicSystemSettings();

  const name = settings.restaurant_name || 'Namaste Indian Restaurant';
  const address = settings.restaurant_address || 'Warszawska 1/3, 06-400 Ciechanów, Poland';
  const phone = settings.restaurant_phone || '511984331';

  // Format phone: e.g. 511984331 -> +48 511 984 331
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
        <div className="flex flex-col space-y-3">
          <h3 className="font-serif text-lg font-bold text-primary tracking-wide">{name}</h3>
          <p className="text-sm">{address}</p>
          <p className="text-sm">Tel: {formatPhone(phone)}</p>
        </div>

        {/* Links Navigation */}
        <div className="flex flex-col space-y-3">
          <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Nawigacja / Links</h4>
          <nav className="grid grid-cols-2 gap-2 text-sm" aria-label="Menu stópki / Footer navigation">
            <Link href={ROUTES.home} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('home')}</Link>
            <Link href={ROUTES.menu} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('menu')}</Link>
            <Link href={ROUTES.reservations} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('reservations')}</Link>
            <Link href={ROUTES.story} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('story')}</Link>
            <Link href={ROUTES.contact} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('contact')}</Link>
            <Link href={ROUTES.status} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">{t('status')}</Link>
          </nav>
        </div>

        {/* GDPR & Policies Links */}
        <div className="flex flex-col space-y-3">
          <h4 className="font-bold text-foreground text-xs uppercase tracking-widest">Polityki / Policies</h4>
          <nav className="flex flex-col space-y-2 text-sm" aria-label="Regulaminy i polityki / Policies navigation">
            <Link href={ROUTES.privacy} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">Polityka Prywatności / Privacy Policy</Link>
            <Link href={ROUTES.cookie} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">Pliki Cookies / Cookie Policy</Link>
            <Link href={ROUTES.terms} className="hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5">Regulamin / Terms of Service</Link>
          </nav>
        </div>
      </div>

      {/* Decorative Gold Frame line separator */}
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-primary/10 text-center text-xs">
        <p>&copy; {new Date().getFullYear()} Namaste Indian Restaurant. Wszelkie prawa zastrzeżone / All rights reserved.</p>
      </div>
    </footer>
  );
}
