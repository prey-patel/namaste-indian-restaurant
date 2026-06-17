import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLocalizedText(text: string, locale: string) {
  if (!text) return '';
  if (text.includes(' / ')) {
    const parts = text.split(' / ');
    return locale === 'en' ? parts[1] : parts[0];
  }
  return text;
}
