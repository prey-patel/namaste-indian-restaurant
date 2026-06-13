# Design System Components Catalog

This document details the usage guidelines, API properties, and visual conventions for the reusable UI components created in **Phase 3** of the Namaste Indian Restaurant project.

---

## 1. Structural Containers

### `SectionContainer`
*   **Purpose:** Standardizes margins and horizontal paddings across all landing sections.
*   **Props:**
    *   `children: ReactNode` - Container items.
    *   `className?: string` - Additional custom margins or spacing.
    *   `id?: string` - Section hash target.
    *   `as?: 'section' | 'div' | 'header' | 'footer'` - Semantic tag.

### `PageShell`
*   **Purpose:** Wraps page routes to provide default layouts and wire them to page-transition triggers.
*   **Props:**
    *   `children: ReactNode`
    *   `className?: string`

---

## 2. Panels & Borders

### `PremiumCard`
*   **Purpose:** Displays content with gold double-borders and smooth translate hover offsets.
*   **Props:**
    *   `children: ReactNode`
    *   `className?: string`
    *   `hoverable?: boolean` (default: `true`)

### `GoldFrame`
*   **Purpose:** Frames key assets (specials, chef photos) with gold-corner bracket indicators representing Indian hospitality details.
*   **Props:**
    *   `children: ReactNode`
    *   `className?: string`

### `GlassPanel`
*   **Purpose:** Backdrop blur card overlay with deep navy transparency.
*   **Props:**
    *   `children: ReactNode`
    *   `className?: string`

---

## 3. Inline Utilities

### `PremiumButton`
*   **Purpose:** Standard buttons supporting gradients, outlines, and text variants.
*   **Props:**
    *   `variant?: 'primary' | 'outline' | 'text'` (default: `'primary'`)
    *   `size?: 'sm' | 'md' | 'lg'` (default: `'md'`)
    *   `fullWidth?: boolean` (default: `false`)

### `StatusPill`
*   **Purpose:** Small status badge with colored text, transparent background, and border indicator.
*   **Props:**
    *   `status: 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral'`
    *   `label: string`

### `Divider`
*   **Purpose:** Decorative divider with centered Diamond vector motif.
*   **Props:**
    *   `className?: string`

---

## 4. Spinners & Alerts

### `GoldSpinner`
*   **Purpose:** Thin gold circular rotation spinner for wczytywanie/loading status.
*   **Props:**
    *   `size?: 'sm' | 'md' | 'lg'` (default: `'md'`)

### `LuxuryAlert`
*   **Purpose:** Custom accessible notice panel styled in gold-tinted navy borders.
*   **Props:**
    *   `type?: 'info' | 'success' | 'warning' | 'error'` (default: `'info'`)
    *   `title?: string`
    *   `children: ReactNode`

---

## 5. Page States

### `EmptyState`
*   **Purpose:** Centered mockup for empty lists, databases, or calendars.
*   **Props:**
    *   `title: string`
    *   `description: string`
    *   `icon?: ReactNode`
    *   `action?: ReactNode`

### `LoadingState`
*   **Purpose:** Centered page-level loading layout block.
*   **Props:**
    *   `message?: string`

### `ErrorState`
*   **Purpose:** Centered page-level error message block with optional retry handlers.
*   **Props:**
    *   `title?: string`
    *   `message: string`
    *   `onRetry?: () => void`
    *   `retryText?: string`
