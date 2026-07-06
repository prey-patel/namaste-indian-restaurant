import { createClient } from '@/lib/supabase/server';

/**
 * Shared core helper to authenticate user session, verify profile activity,
 * and assert that the user role belongs to the allowed list.
 */
async function requireUserWithRoles(allowedRoles: ('owner' | 'manager' | 'kitchen' | 'staff')[]) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Unauthenticated user');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Unauthorized: Profile not found');
  }

  if (!profile.is_active) {
    throw new Error('Unauthorized: Account is inactive');
  }

  if (!allowedRoles.includes(profile.role as any)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return { userId: user.id, role: profile.role };
}

/**
 * Asserts the caller has administrative role (owner or manager).
 * Returns the authenticated user's ID.
 */
export async function validateAdminAccess(): Promise<string> {
  const { userId } = await requireUserWithRoles(['owner', 'manager']);
  return userId;
}

/**
 * Asserts the caller has delivery/fulfillment role (owner, manager, or staff).
 * Returns the authenticated user's ID.
 */
export async function validateDeliveryAccess(): Promise<string> {
  const { userId } = await requireUserWithRoles(['owner', 'manager', 'staff']);
  return userId;
}

/**
 * Asserts the caller has kitchen role (owner, manager, or kitchen).
 * Returns the authenticated user's ID.
 */
export async function validateKdsAccess(): Promise<string> {
  const { userId } = await requireUserWithRoles(['owner', 'manager', 'kitchen']);
  return userId;
}

/**
 * Asserts the caller has active team roles (owner, manager, kitchen, or staff).
 * Returns both the user's ID and role name.
 */
export async function validateUserAccess(): Promise<{ userId: string; role: string }> {
  return await requireUserWithRoles(['owner', 'manager', 'kitchen', 'staff']);
}
