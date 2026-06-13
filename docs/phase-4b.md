# Phase 4B — Public Website Content & Backend Integration

This document outlines the scope, deliverables, and architecture integrated in **Phase 4B** for the Namaste Indian Restaurant public website.

---

## 1. What Phase 4B Includes

*   **Public CMS Foundation:** Dynamic server-side loading of page copy from the `site_content` table, with seamless local file fallback.
*   **Secure Contact Submissions:** A server action processing contact forms, executing Zod validation, text sanitization, client IP hashing (with secret salt/pepper), rate-limiting, and Cloudflare Turnstile token check placeholders.
*   **Public System Settings:** Invoking `get_public_system_settings()` RPC on the server to show live opening hours and status message flags.
*   **Responsive Contact Map:** Styled map placeholder containing coordinate validation alert states, Google Maps & OpenStreetMap redirect indicators, and dynamic Leaflet rendering scripts.
*   **Dynamic SEO Metadata:** Localized page titles, descriptions, and Open Graph attributes for all public paths.
*   **Structured Business Data:** Confirmed JSON-LD `Restaurant` block for indexing.

---

## 2. What Phase 4B Intentionally Excludes

*   **Admin CMS Editor Panel:** No custom UI dashboard or forms for writing back to `site_content` (slated for later administrative tasks).
*   **Interactive Menu CMS & Filtering:** The menu page remains a mockup shell showing category preview cards. Real database menu fetching and category filtering will launch in **Phase 5**.
*   **Interactive Reservations Form:** Table selections, timeslot validation queries, and booking submissions will launch in **Phase 6**.
*   **Takeaway & Delivery Ordering:** Cart logic, packaging fees, checkout pipelines, and zone routing will launch in **Phase 8**.
*   **Kitchen Display System (KDS):** Slated for **Phase 7**.
*   **Database Schema Changes:** The schema remains unaltered. The only write operation permitted in Phase 4B is inserting rows into `contact_inquiries`.

---

## 3. What Phase 5 Should Build Next

*   Establish the full menu schema queries (fetching categories and items from `menu_categories` and `menu_items`).
*   Build the frontend CMS menu layout with responsive category filters.
*   Allow administrators to modify menu items, prices, and availabilities from the admin settings section.
