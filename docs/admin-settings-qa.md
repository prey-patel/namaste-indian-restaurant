# Admin Settings QA and Verification Plan

A complete suite of tests and build steps has been performed to ensure the settings modifications compile, lint, and execute correctly.

## Verification Steps

### 1. Automated Validations
- **TypeScript Type Verification**: Checked using `npm run typecheck`. All files, types, and props (such as the new `maxGuests` prop on `ReservationForm`) compile cleanly.
- **ESLint Compliance**: Checked using `npm run lint`. Complies with Next.js and React rules.
- **Production Compilation**: Checked using `npm run build`. Optimized production build completes successfully, and `/admin/settings` compiles as an on-demand dynamic route.

### 2. Manual Verification Checklist
When deploying to staging or production, use this checklist to verify settings integration:

- [ ] **Role Authorization Check**: Log in with a `kitchen` or `delivery` staff role, and confirm that access to `/admin/settings` redirects to the login/dashboard and server actions reject modifications.
- [ ] **Profile Sync Test**: Update the public display name or telephone in the Profile tab, save, and verify that the footer, page header, and structured JSON-LD update immediately.
- [ ] **Guest Limit Dropdown Check**: Change `reservation_max_guests` to `6`, save, and access `/reservations`. Verify that the text says "above 6 guests" and the dropdown only contains options up to 6.
- [ ] **Holiday Closures Test**: Add a holiday closure for today's date with reservations and deliveries blocked. Go to `/reservations` and `/order` and confirm that submits are rejected with the configured holiday closure reason.
- [ ] **Operational Status Toggle**: Toggle "Delivery" to disabled. Visit the `/order` page and confirm that the delivery checkout pathway is locked/hidden.
