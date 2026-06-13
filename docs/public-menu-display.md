# Public Menu Display Interface

This document describes the design, components, and interactive filtering features of the customer-facing menu display page.

---

## 1. Visual Design

The menu display aligns with the premium Navy/Gold luxury visual identity:
-   **Backgrounds:** Deep dark navy (`#070B1E`) with radial gradients and a slowly rotating gold Mandala icon in the hero banner.
-   **Dividers:** Elegant gold gradient dividers featuring a center diamond hospitality motif.
-   **Frames:** `GoldFrame` component wraps each dish card with detailed, glowing gold corner brackets and a fine border outline.
-   **Badges:** Styled dietary and tag indicators (e.g. green for Vegetarian, gold for Chef's Special, red for Popular) ensuring proper color contrast.

---

## 2. Component Structure

The page relies on a series of modular components located in `components/public/menu/`:

1.  **`MenuHero`:** Renders the premium top banner, page title, subtitle, and pricing disclaimer.
2.  **`CategoryTabs`:** Category chip selector. Renders as horizontal buttons on desktop and horizontal scrollable buttons on mobile, offering simple click handlers to filter or jump sections.
3.  **`MenuFilterBar`:** An interactive control panel housing:
    -   A text search input targeting dish name and description.
    -   Dietary toggle checkboxes for *Vegetarian*, *Vegan*, *Gluten Free*, and *Spicy*.
    -   A "Reset Filters" action button when active.
4.  **`MenuItemCard`:** Renders details for an individual dish:
    -   Name, localized description, price (PLN), spiciness chilis, allergens, dietary badges, and image (or a premium geometric placeholder if the image is missing or unapproved).
5.  **`MenuSection`:** Segments the menu by category, showing a category header and rendering a responsive grid of dishes.
6.  **`MenuEmptyState`:** Clean empty state utilizing the custom `EmptyState` UI layout when filters yield no results or when the database menu table is empty.

---

## 3. Keyboard & Screen Reader Accessibility

*   **Semantic Markup:** The layout uses `<section>`, `<h1..h6>`, and `<button>` semantic controls.
*   **Search Field:** Explicitly linked using `<label htmlFor="menu-search-input">`.
*   **Category Chips:** Standard `<button>` elements with keyboard focus states. Can be tabbed through and clicked with standard Space/Enter triggers.
*   **Badges:** Dietary badges and spiciness levels contain clear text translations (e.g., `aria-label="Very Spicy"`) to ensure screen readers can announce them instead of conveying information solely through visual shapes or colors.
*   **Motion Reduction:** The spinning Mandala animation in the header respects `prefers-reduced-motion` and automatically disables continuous rotation if requested by the user's OS settings.
