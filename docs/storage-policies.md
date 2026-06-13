# Storage Policies and Media Management

This document details the configuration and access control rules for Supabase Storage buckets in Phase 2.

---

## 1. Storage Buckets (Private Option B)

We created three private buckets:
1.  `menu-images`
2.  `site-images`
3.  `gallery-images`

---

## 2. Row Level Security on `storage.objects`

### A. Public SELECT Access
Public users can only read objects that are explicitly approved and public:
-   The policy checks the `media_assets` table to verify if there exists a matching record where `bucket = bucket_id`, `file_path = name`, `is_public = true`, and `is_approved = true`.
-   Unapproved files are fully protected and cannot be downloaded via the public storage URL.

### B. Owner/Manager Access
Only authenticated users with `owner` or `manager` roles can upload (INSERT), update, or delete objects.

---

## 3. Upload Constraints

For production safety, the following rules apply:
-   **Max File Size:** 5 MB.
-   **Allowed MIME Types:** `image/webp`, `image/jpeg`, `image/jpg`, `image/png`.
-   **SVG Blocked:** SVG files are blocked by default to prevent cross-site scripting (XSS) via embedded javascript in SVGs.
-   **Executable Blocked:** All executable extensions and MIME types are blocked.
-   **Server-Side Validation:** These rules must be checked in the server-side upload API/action during implementation in later phases. Storage policies alone must not be the only validation.
