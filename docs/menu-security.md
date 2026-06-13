# Menu CMS Security Architecture

To guarantee strict backend security and prevent data tampering, the Admin Menu CMS enforces multiple layer authorization checks.

## 1. Authentication Check
All Server Actions and server component page loaders first initialize the server Supabase client using authentication cookies:
```typescript
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) throw new Error('Unauthorized');
```
This is much more secure than `getSession()`, as it forces a roundtrip check to Supabase to verify the integrity of the JWT.

## 2. Server-Side Role Validation
After validating the session, the system queries the authenticated user's profile from the `profiles` table to check their role:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_active')
  .eq('id', user.id)
  .single();
```
- **Role Enforcement:** Only profiles with a role of `'owner'` or `'manager'` are authorized.
- **Active Check:** The account must have `is_active` set to `true`.
- **Blocked Roles:** Staff, kitchen, public, and unauthenticated clients are strictly blocked from loading data or triggering mutations.

## 3. Standard Authenticated Writes
Every mutation (insert, update, soft-delete) uses the authenticated client (`createClient()`). The service role client is **never** used to bypass RLS policies during normal operations.

## 4. Soft-Deletions
To preserve audit integrity and prevent database orphaned records, deletions do not perform a hard SQL `DELETE`. Instead, they flag records as `is_deleted = true`, setting a timestamp (`deleted_at`) and logging the ID of the administrator who performed the delete (`deleted_by`).
