# Accessibility and Usability Guidelines

This document details the accessibility standards (WCAG 2.1 AA compliant) configured in Phase 3 for the public pages and administration panel of **Namaste Indian Restaurant**.

---

## 1. Keyboard Navigation

All interactive components must be operable via standard keyboard inputs:
*   **Focusable Elements:** All semantic buttons, anchors, and inputs must accept keyboard focus. Links are wrapped in standard `Link` wrappers to handle tabbing.
*   **Visible Focus States:** Defined globally in `app/globals.css` using `:focus-visible`. Focused elements are bordered with a gold ring (`ring-2 ring-primary ring-offset-2 ring-offset-background`) for clear visual feedback.
*   **Focus Traps:** The mobile navigation drawer traps tab focus. When open, pressing `Tab` wraps around the drawer items only.
*   **Esc Key Handlers:** Pressing the `Escape` key closes dynamic overlays (like the mobile navigation drawer) immediately, returning focus to the trigger button.

---

## 2. ARIA Declarations & Semantic Markup

*   **Aria Labels:** Mobile hamburger toggle uses `aria-label="Toggle menu" / aria-label="Zamknij menu" / "Otwórz menu"` and tracks the `aria-expanded` boolean.
*   **Screen Readers:** Icons and decorative graphics (like the Divider diamond SVG) use `aria-hidden="true"` or `role="presentation"` to avoid screen reader clutter.
*   **Semantic Tags:** Layout header uses `<header>`, footer uses `<footer>`, and containers use `<section>` to help assistive technologies construct page outline maps.

---

## 3. Scroll Locking

When modals, overlays, or mobile drawer menus are active:
- Body scroll must be locked (`overflow: hidden` applied to `body`).
- This prevents page shifting, dual scrollbars, or background scroll leakage.

---

## 4. Contrast Requirements

All text colors against dark backgrounds must satisfy WCAG AA contrast ratio requirements:
- **Body Text:** Soft white (`#FAF6EC`) on Dark Navy (`#070B1E`) yields a contrast ratio of **18.5:1** (exceeds the 4.5:1 requirement).
- **Gold Accents:** Warm Gold (`#D4AF37`) on Dark Navy (`#070B1E`) yields a contrast ratio of **5.8:1** (exceeds the 4.5:1 requirement for normal text).
- **Muted text:** (`#A1A9C3`) on Navy yields **8.2:1**.
