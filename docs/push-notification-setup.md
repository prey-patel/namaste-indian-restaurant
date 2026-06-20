# Web Push Notification Setup and Configuration

This guide provides steps for setting up VAPID credentials and subscribing to push notifications in the Namaste Indian Restaurant admin panel.

## VAPID Key Generation

To enable secure message exchange between the application server and the browser push service (such as Google Cloud Messaging or Mozilla Autopush), you must configure VAPID keys.

You can generate VAPID keys using `web-push` CLI:
```bash
npx web-push generate-vapid-keys
```

This outputs a Public Key and a Private Key.

---

## Configuration

Copy these values into your `.env.local` or environment variables:

```env
# PWA WEB PUSH CONFIGURATION
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_SUBJECT=mailto:namasteadmin.pl@gmail.com
APP_BASE_URL=http://localhost:3000
```

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Used by the browser client to subscribe to the push service.
- `VAPID_PRIVATE_KEY`: Keep this secret on the server; it signs the push payload.
- `VAPID_SUBJECT`: Contact email or URL to identify the sender to the push service providers.

---

## Subscription Workflow

1. **Service Worker Registration**: On page load, `components/admin/alerts/notification-permission-card.tsx` registers the service worker located at `/sw.js`.
2. **Permission Check**: The browser checks the notification permission state.
3. **Registration & Subscription**:
   - The user clicks **"Enable Background Alerts"**.
   - The browser prompts for permission if not already granted.
   - Once granted, the client retrieves a `PushSubscription` containing an endpoint URL and security keys (`p256dh`, `auth`).
4. **Server Sync**: The client sends this subscription payload to the server via the `savePushSubscription` server action. The user profile role is verified and stored in the database.

---

## Service Worker Details

The service worker (`public/sw.js`) runs in a separate background thread.
- It listens for the `push` event.
- It decrypts the payload and displays a native OS notification.
- It handles the `notificationclick` event, bringing the restaurant admin dashboard tab into focus and navigating to the specified order path (e.g. `/admin/orders` or `/admin/kds`).
