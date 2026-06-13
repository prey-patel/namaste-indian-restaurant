# Menu Admin CMS QA Verification Checklist

Use this checklist to verify the stability, security, and correctness of the Menu CMS implementation.

## 1. Security & Authentication Checks
- [ ] Attempt to access `/admin` or `/admin/menu` without logging in. The panel must redirect you to `/admin/login`.
- [ ] Attempt to login with an invalid password. The form must show an error alert and block access.
- [ ] Attempt to access the CMS using a profile that has the `staff` or `kitchen` role. Access must be blocked, and you should be redirected to login.
- [ ] Attempt to trigger the Server Actions (`createCategoryAction`, `createMenuItemAction`, etc.) using an unauthenticated or low-permission client. The actions must reject with an `Unauthorized` error.
- [ ] Check if the `owner@namaste.com` password is committed anywhere in code or documentation. (It must not be).

## 2. Forms & Inputs Validation
- [ ] Create a category with a name shorter than 2 characters. The form must display a validation warning and prevent submission.
- [ ] Create an item with a price <= 0. The form must display a validation warning.
- [ ] Verify that allergens are entered as comma-separated strings and parsed into PostgreSQL string arrays successfully.
- [ ] Attempt to upload an image file larger than 5MB. The uploader must reject the file.
- [ ] Attempt to upload an image of type `.txt` or other non-image extension. The uploader must reject the file.

## 3. Storage & URLs Check
- [ ] Check the `menu_items` table. The `image_url` column must contain a relative path (e.g. `items/...`) and NOT a full HTTP signed URL.
- [ ] Verify that signed URLs are generated with a 1-hour expiration and rendered correctly on the public menu page.

## 4. UI/UX & Responsiveness
- [ ] Check the layout on screens ranging from 360px (mobile) to 1440px (desktop). The dashboard, tables, forms, and preview cards must adjust without breaking boundaries or causing horizontal scrollbars.
- [ ] Verify that the live preview card updates immediately when fields are modified in the `ItemForm`.
