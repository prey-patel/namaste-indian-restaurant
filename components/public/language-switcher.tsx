'use client';

import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: 'pl' | 'en') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center space-x-1 border border-primary/20 rounded-full p-1 bg-[#0A1128]/50 backdrop-blur-md">
      <button
        onClick={() => handleLocaleChange('pl')}
        className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-300 ${
          locale === 'pl'
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PL
      </button>
      <button
        onClick={() => handleLocaleChange('en')}
        className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-300 ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
    </div>
  );
}
