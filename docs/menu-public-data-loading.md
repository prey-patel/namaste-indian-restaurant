# Public Menu Data Loading & Security

This document outlines the data access patterns, RLS compliance, and private image signing strategy implemented for the public menu display.

---

## 1. Local Database Reads & RLS Compliance

All queries to categories and menu items are run through the public Supabase client creator:
-   **Helper:** `lib/supabase/menu.ts`
-   **Security Boundary:** The file is protected with the `import "server-only";` directive to prevent it from ever being imported by the browser.
-   **Client:** Uses `createClient()` from `lib/supabase/server.ts`, which initializes the anonymous public client (`anon` token).
-   **RLS Policies Applied:**
    -   `categories` select: `is_active = true AND is_deleted = false`.
    -   `menu_items` select: `is_active = true AND is_deleted = false`.
-   **Public Columns Selected:**
    -   Only necessary columns are queried: e.g., name, description, price, allergens, spiciness, tags, and category references.
    -   Internal audit columns (`deleted_at`, `deleted_by`, etc.) are omitted to avoid leakage.

---

## 2. Public Menu Filtering Strategy (Option A)

For Phase 5A, the system implements **Option A: Show only active, non-deleted, and available menu items**.
-   **SQL Constraint:** We append `.eq('is_available', true)` to the query.
-   **UX Implication:** Unavailable dishes are excluded from the initial public read. Consequently, the "Available Only" filter is omitted as all displayed items are guaranteed to be available.

---

## 3. Secure Private Image Retrieval

The bucket `menu-images` is private (`public = false`) to prevent unapproved media exposure. The image retrieval follows a strict verification pipeline:

```
[menu_items record loaded]
        │
        ▼
Is image_url present?
        │
  ├─── No ───► Render Premium Navy/Gold SVG/CSS Placeholder
  │
  └─── Yes ──► Query media_assets via public anon client (RLS check)
                     │
                     ├─── Missing / Unapproved / Not Public ──► Render Placeholder
                     │
                     └─── Approved & Public ──────────────────► Use createAdminClient() to
                                                                 generate Signed URL (1 hr)
```

### Expiry Protection:
To prevent signed image URLs from expiring while the user is browsing or if the page is cached statically:
1.  The menu route specifies `export const dynamic = 'force-dynamic';` to force server-side rendering on every page request.
2.  The signed URL is refreshed on every page view, guaranteeing that no customer ever encounters a broken image URL.
