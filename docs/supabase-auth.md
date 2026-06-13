# Supabase Auth and Bootstrap Guide

This guide details the authentication configurations, profile trigger synchronization, and the manual bootstrap process for the owner account.

---

## 1. Auth Setup Baseline

-   **Public Signups:** Disabled. Public registration must be turned off in the Supabase Dashboard under **Auth -> Providers -> Email -> Enable signup** (untick).
-   **Confirm Email:** Keep email confirmation enabled to ensure valid logins for staff members.
-   **Credentials Security:** Never hardcode passwords or place auth secrets in the codebase. All connection helpers utilize environment variables stored in `.env.local`.

---

## 2. Sync Trigger (`auth.users` to `public.profiles`)

We configured a PostgreSQL database trigger (`on_auth_user_created` running the `handle_new_user()` function) to automatically synchronize new users from Supabase Auth into our custom `profiles` table.

-   **Default Role:** All newly registered users are created with the `'staff'::user_role` role.
-   **Default Active Status:** Users are initialized with `is_active = false`.
-   **Metadata Ignored:** The trigger ignores any user metadata field claiming `owner` or `manager` roles to prevent malicious elevation of privilege during registration. Owner and manager promotions must be done manually by the owner in SQL or via secure admin-only settings pages in later phases.

---

## 3. Owner Bootstrap Steps

To bootstrap the first `owner` admin account:
1.  Navigate to your **Supabase Dashboard -> Auth -> Users**.
2.  Click **Add User -> Create User**. Input the owner's email address and a secure, unique password.
3.  Once the user is created, copy their generated `User UID` (a UUID string).
4.  Navigate to the **SQL Editor** in the Supabase Dashboard and run the following update statement:
    ```sql
    UPDATE public.profiles
    SET role = 'owner'::user_role,
        is_active = true,
        full_name = 'Namaste Owner Admin'
    WHERE id = 'UID_FROM_STEP_3';
    ```
    This manually activates the profile and assigns the `owner` role, bypassing registration constraints securely.
