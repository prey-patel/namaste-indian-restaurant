# Public Menu QA Checklist & Verification

This document details the checklist and results for quality assurance verification of the Phase 5A Public Menu implementation.

---

## 1. Functional QA

- [ ] **Empty State:** If the database contains no menu categories/items, verifies that a clean placeholder is shown to the customer.
- [ ] **Filters:** Verifies that searching matches names/descriptions, and checking dietary checkboxes filters results correctly.
- [ ] **Reset Action:** Verifies that clicking "Reset Filters" clears the search query and checkboxes.
- [ ] **Language Support:** Verifies that toggling languages between Polish (`pl`) and English (`en`) correctly translates titles, descriptions, badges, and filters.

---

## 2. Security QA

- [ ] **Anonymity Audit:** Verifies that database reads are executed with public/anonymous credentials and that the `SUPABASE_SERVICE_ROLE_KEY` is not exposed in the browser bundle.
- [ ] **Image Signing Protection:** Verifies that the server only generates signed storage URLs for files that exist in `media_assets` with `is_approved = true` and `is_public = true`.

---

## 3. Accessibility (a11y) QA

- [ ] **Screen Reader Labels:** Verifies that the search input has a linked `<label htmlFor="menu-search-input">`.
- [ ] **Keyboard Semantics:** Verifies that the category chips are keyboard-navigable `<button>` elements.
- [ ] **Color Contrast:** Verifies that tags and text have sufficient contrast against the dark background.
- [ ] **Reduced Motion:** Verifies that the spinning Mandala background respects `prefers-reduced-motion` and disables rotation if requested.

---

## 4. Responsive Viewport QA

- [ ] **360px Mobile:** Verifies chips scroll horizontally without layout breakages, cards wrap, and title texts fit.
- [ ] **768px Tablet:** Verifies cards flow in a clean grid and spacing is correct.
- [ ] **1024px Laptop:** Verifies grid layout adjusts correctly to 3 columns.
- [ ] **1440px Desktop:** Verifies standard wide desktop layouts look premium.
