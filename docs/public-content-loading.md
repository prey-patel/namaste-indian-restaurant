# Public Content Loading & Fallback Strategy

This document describes how page content is loaded dynamically from the `site_content` table and how fallback states are handled.

---

## 1. CMS Loading Protocol (`lib/supabase/content.ts`)

Public page components retrieve dynamic translations using a server-side helper function `getSiteContent(key)`. This module enforces the `import "server-only";` boundary to block any exposure of database client configurations to browser code.

*   **Query Scope:** Selects the `value_pl` and `value_en` JSONB payloads matching the identifier key.
*   **Performance:** Uses server-side caching and pre-rendering inside Next.js layout routes.
*   **Security:** Runs under normal public/anonymous database select permissions (restricted only to SELECT operations on `site_content` without exposing raw database passwords).

---

## 2. Fallback Architecture

If the database is unreachable, or a specific page key does not exist in `site_content` (the table is currently empty), the page components automatically fall back to local translation dictionaries:

*   **Fallbacks:**
    *   Home Hero copy: `messages/{locale}.json -> home.heroTitle / home.heroTitleAccent / home.heroSubhead`
    *   About/Story: `messages/{locale}.json -> story.philTitle / story.philDesc`
*   **Execution Pattern:**
    ```ts
    const cmsHero = await getSiteContent('home_hero');
    const heroTitle = (cmsHero as any)?.[`value_${locale}`]?.title || t('heroTitle');
    ```

This approach guarantees that the website remains fully functional and visually complete even if the database fails or is offline.
