# Delivery Distance Calculation Security & Privacy

## API Key Protection
- **Server-Only Exposure**: The Google Maps API key is never exposed to the client-side code. The file `lib/delivery/google-maps.ts` is explicitly marked `import "server-only";` to block it from being bundled into client builds.
- **No Client API Calls**: Geocoding and routing endpoints are accessed strictly through server actions (`recalculateOrderDistanceAction`) and post-submission handlers.

## Privacy & Data Logging
- **Address Data Handling**: Full customer addresses are only visible to authorized admin accounts (Owner and Manager roles).
- **Log Sanitation**: We do not log full raw API responses from Google Maps to prevent caching sensitive customer details in the application logs.
- **Provider Metadata**: Only essential routing metrics (distance, duration, status, and formatted address) are stored in the database. Raw response payloads are discarded.
- **Customer Tracking Isolation**: Public order tracking pages do not expose internal geocoding metrics, suggested fees, or exact restaurant-to-customer coordinate pairs.
