# SEO & Indexing Audit (Phase 9 Hardening)

This document verifies sitemap exclusions, robots configurations, and search engine optimizations for the production deploy.

---

## 1. Public Page Meta Configurations

All public-facing marketing pages have unique, translated HTML meta structures managed by Next.js layouts:
- **Title hierarchy**: Autocomplete title tags match local language (e.g. "Autentyczne Smaki Indii" vs "Authentic Taste of India").
- **Canonical URLs**: Fixed canonical target URLs point to the production domain to prevent duplicate indexing under multiple subdomains.
- **Language alternates**: HTML language links (`hreflang`) point between `/pl/...` and `/en/...` routes.

---

## 2. Private Page Indexing Protections (Noindex/Nofollow)

Private and transactional routes must be kept out of search engine result pages (SERPs) to protect customer data privacy.

| Path Pattern | Indexed? | Configuration Method |
|---|---|---|
| `/admin` | ❌ No | Routed inside middleware blocks / `robots: { index: false, follow: false }` |
| `/admin/*` | ❌ No | Global layout blocking / Robots exclusion header |
| `/admin/kds` | ❌ No | Route metadata: `robots: { index: false, follow: false }` |
| `/[locale]/order/status` | ❌ No | Metadata header: `robots: { index: false, follow: false }` |
| `/[locale]/reservations/status` | ❌ No | Metadata header: `robots: { index: false, follow: false }` |

### Tracking Page Protection
Customer status tracking pages require a secure token parameter (`token`) to query database records. To prevent search crawlers from scraping this page or indexing tracking links:
1. The page uses Next.js Metadata objects to output `noindex, nofollow` headers.
2. The page URL is omitted from the dynamic XML sitemap generation.
3. No customer details are rendered if the token parameter is missing or syntactically invalid (checks against UUID regex).
