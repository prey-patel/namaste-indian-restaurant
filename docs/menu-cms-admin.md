# Menu CMS Admin Panel Features

The Admin Menu CMS is designed to offer restaurant owners/managers full control over categories and menu items with a premium, seamless interface.

## 1. CMS Dashboard Overview (`/admin/menu`)
- Summarizes the number of categories and items.
- Full text searching by item name or description (Polish/English).
- Filter controls for category, visibility status, and availability.
- Interactive tables displaying details like localized name, category name, price (PLN), status pills, and sort order.
- Action triggers for editing items and initiating a secure soft deletion.

## 2. Categories CMS (`/admin/menu/categories`)
- Built in a dual-column layout to streamline management:
  - **Left Column:** Lists all categories, their slug, visibility status, and display order.
  - **Right Column:** Reusable `CategoryForm` for adding new categories or editing the selected category inline.
- Dynamic slug generator: Generates slug path on the fly from the English name input when creating a new category.

## 3. Menu Item Creator & Editor (`/admin/menu/items/new` and `/admin/menu/items/[id]/edit`)
- Implements a modern split layout (8/12 form, 4/12 live preview).
- Renders `ItemForm` with fields:
  - Localized fields: Name and descriptions in Polish and English.
  - Pricing (PLN) and sort order.
  - Spiciness index (0 to 3 chilis).
  - Allergen listing (parsed from comma-separated string).
  - Dietary option checkboxes (Vegetarian, Vegan, Gluten Free).
  - Promotional flags (Chef's Special, Popular, New).
  - Availability status (Available in restaurant) and Visibility status (Publicly visible).
  - Integrated image uploader.
- **Live Preview Widget:** Generates real-time visual output of the `MenuItemCard` in Polish, simulating the customer view.
