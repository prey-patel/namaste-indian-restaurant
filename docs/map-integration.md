# Map Integration & Coordinates Policy

This document details the Map integration and coordinate verification protocols on the Contact page.

---

## 1. Map Coordinates Verification Policy

We do not hardcode guessed or approximate coordinates. Instead, the Map component `components/public/contact-map.tsx` reads coordinates from the `system_settings` table via the `get_public_system_settings()` RPC.

*   **Unverified Status:** If coordinates are `null` or the status is `'unverified'` (current state), the component renders a styled fallback card. It provides direct, secure external map redirects to OpenStreetMap and Google Maps using search queries for `Warszawska 1/3, 06-400 Ciechanów, Poland`.
*   **Verified Status:** Once coordinates are marked as `'verified'` in `system_settings` (with valid latitude and longitude), the Leaflet map will render automatically.

---

## 2. SSR Compatibility

Leaflet interacts with the browser's Document Object Model (DOM) to initialize maps, which can throw compilation errors during Next.js Server-Side Rendering (SSR).
*   **Dynamic Loading:** We dynamically inject Leaflet's CSS and JS files from a public CDN inside a client-side `useEffect` block.
*   **Cleanup:** The script and CSS links are cleanly attached when the map mounts and detached when it unmounts. The Leaflet map instance is explicitly removed via `map.remove()` to prevent memory leaks and duplicate map containers.
