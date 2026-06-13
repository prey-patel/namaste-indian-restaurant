# Design System Specifications

This document outlines the visual system token definitions, HSL color coordinates, typography rules, custom tailwind classes, and responsive breakpoints established for **Namaste Indian Restaurant**.

---

## 1. Color System (HSL Palette)

We utilize HSL color definitions in `app/globals.css` to allow seamless integration with components and utility classes:

| Token | HSL Value | Hex Equivalent | Description |
| :--- | :--- | :--- | :--- |
| `--background` | `220 54% 8%` | `#070B1E` | Primary deep navy page background |
| `--foreground` | `43 74% 95%` | `#FAF6EC` | Soft creamy white for body text and headers |
| `--card` | `220 54% 6%` | `#050817` | Card backdrop color |
| `--primary` | `43 74% 53%` | `#D4AF37` | Luxury warm gold accent and buttons |
| `--primary-foreground` | `220 54% 8%` | `#070B1E` | Deep navy for text on gold backgrounds |
| `--border` | `43 30% 25%` | `#53462D` | Subtle warm gold-brown border color |
| `--ring` | `43 74% 53%` | `#D4AF37` | Gold focus outlines |

---

## 2. Typography Pairings

We load fonts once in the root layout to avoid duplicate network calls:

*   **Heading Font (Serif):** `Playfair Display` (`font-serif`)
    *   *Usage:* Main titles (`h1`, `h2`, `h3`), hero sections, and menu group labels. Represents Indian hospitality heritage.
    *   *Weight:* `Bold` / `Black` (700 / 900).
*   **Body Font (Sans-Serif):** `Outfit` (`font-sans`)
    *   *Usage:* Paragraphs, lists, details, inputs, buttons, and system logs. Clean, legible, and modern.
    *   *Weight:* `Regular` (400), `Medium` (500), `Bold` (700).

---

## 3. Custom Utility Classes

```css
/* Gold text gradient */
.text-gold-gradient {
  background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Gold background gradient */
.bg-gold-gradient {
  background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728);
}

/* Glassmorphic Panel styled subtly */
.glass-panel {
  background-color: rgba(10, 17, 40, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.2);
}
```

---

## 4. Responsive Breakpoints

We test layouts at four viewport widths to prevent horizontal scroll bars or text overlaps:

1.  **Mobile (360px):** Single-column flows, navbar collapsed into hamburger, padding locked to `px-4`.
2.  **Tablet (768px):** Two-column card displays, responsive side-drawers close, navigation collapses.
3.  **Laptop (1024px):** Desktop horizontal header with full navigation links, grid columns expand to 3 or 4 columns.
4.  **Desktop (1440px):** Containers restricted to max-width `max-w-7xl` (`1280px` centered grid).
