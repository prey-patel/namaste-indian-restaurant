# Menu Image Management & Storage Policy

The image uploader is designed to protect asset assets and maintain performance.

## 1. Storage Bucket & RLS
- All images are uploaded to the private `menu-images` storage bucket.
- Uploads respect the RLS storage policies on `storage.objects` and only allow authenticated owners and managers to perform INSERT/UPDATE/DELETE.
- Public read access is strictly forbidden directly through the bucket without signed credentials.

## 2. Media Asset Logging
- When an image is uploaded, a record is added to the `media_assets` table:
  - `bucket`: `'menu-images'`
  - `file_path`: Relative internal path (e.g. `items/[id]/[filename].[ext]`)
  - `file_type`: MIME type check (e.g. `image/png`, `image/webp`)
  - `file_size`: Size check (<5MB)
  - `is_public`: `true`
  - `is_approved`: `true` (automatically approved since uploaded by authorized owner/manager)
  - `uploaded_by`: User ID of the admin.
- The relative internal `file_path` is the only reference stored in the `menu_items` database table.

## 3. Dynamic Signed URLs
- Temporary signed URLs are generated strictly at display time and have a 1-hour expiration.
- This prevents storing stale, expired URLs in the database, and ensures that only authenticated or public users looking at the active menus can fetch assets.
- For the live preview card in the admin form, a secured server action `getSingleSignedUrlAction` generates a signed preview URL for the client dynamically.
- Statically generated pages must revalidate shorter than the signed URL lifetime (1 hour) or use client-side fetch.
