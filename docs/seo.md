# SEO & Structured Metadata Strategy

This document details the search engine optimization (SEO) configurations and structured business data embedded in public pages.

---

## 1. Dynamic Meta Configuration

Next.js `generateMetadata` exports are defined on all public page routes. They query translations from the `seo` namespace based on the active language locale (`pl` or `en`):
*   **Localized tags:** Translates page titles, descriptions, and Open Graph attributes dynamically.
*   **Alternate links:** Automatically handles language-aware indexing paths (e.g., `/pl` and `/en`).
*   **Robots rules:** Public pages allow indexing (`index, follow`). Admin paths and temporary status pages are blocked from indexing.

---

## 2. JSON-LD Structured Data

A verified `Restaurant` schema is injected on the Home page using a `<script type="application/ld+json">` tag. It includes only confirmed information to avoid indexing penalties:
*   **Cuisine:** Indian.
*   **Address:** Warszawska 1/3, 06-400 Ciechanów, Poland.
*   **Phone:** +48 511 984 331.
*   **Opening Hours:** Everyday: 12:00 - 22:00.
*   **Exclusions:** Guessed geographical coordinates (since coordinates are unverified in system settings), fake reviews, fake ratings, or links to online ordering platforms (slated for later phases) are excluded.
