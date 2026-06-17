# Maps Provider Setup Configuration

The distance calculation engine uses the Google Maps Platform Web Services APIs:
1. **Google Geocoding API**: Resolves coordinates and normalizes textual addresses.
2. **Google Routes API**: Calculates distance and duration by driving/walking.

## Environment Variables
Ensure these server-only variables are set in `.env.local` or Vercel Environment Variables:

```bash
MAPS_PROVIDER=google
GOOGLE_MAPS_API_KEY=AIzaSy...
RESTAURANT_LATITUDE=52.876
RESTAURANT_LONGITUDE=20.612
```

## Google Cloud Console Configuration
1. Enable **Geocoding API** and **Routes API** on your Google Cloud Console project.
2. Under APIs & Services -> Credentials, create an API key.
3. Restrict the API key:
   - **API restrictions**: Select **Geocoding API** and **Routes API** only.
   - **Application restrictions**: None (since it is accessed server-side).

## Restaurant Location
- The canonical restaurant location is loaded from `system_settings.coordinates`.
- If settings coordinates are unverified/missing, the system geocodes the address in `system_settings.restaurant_address` and updates the cache.
- The environment variables `RESTAURANT_LATITUDE` and `RESTAURANT_LONGITUDE` are only used as a fallback for local development if settings are offline.
