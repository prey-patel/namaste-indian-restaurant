# Architecture Guide

This guide describes the core abstractions built in Phase 1.

## 1. Directory Segregation
*   **Locales vs. Admin:** Customer routes are localized (`app/[locale]/(public)/*`). Admin pages reside outside the locale subfolder (`app/admin/*`) to prevent middleware redirection conflicts.
*   **Translation Mapping:** Dictionary parameters are stored in `messages/*.json`, compiled via `i18n/request.ts` and `i18n/routing.ts`.

## 2. Server-Only Protection
Sensitive logic is protected via `import "server-only";` blocks:
*   `lib/supabase/admin.ts`: Service-role client wrapper.
*   `lib/notifications/dispatcher.ts`: Telegram/Brevo alerts and retry engine.
*   `lib/geocoding/provider.ts`: Routing client with Haversine fallbacks.
*   `lib/pricing/calculator.ts`: Server-side price recalculator.

These files must never be imported into browser components.
