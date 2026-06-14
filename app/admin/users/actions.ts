'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';

// Helper to strip HTML tags for sanitization
function sanitizeString(val: string): string {
  return val.replace(/<[^>]*>/g, '').trim();
}

const CreateUserSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).transform(sanitizeString),
  email: z.string().email('Invalid email address').transform(sanitizeString),
  phone: z.string().nullable().optional().transform(val => val ? sanitizeString(val) : null),
  role: z.enum(['owner', 'manager', 'kitchen', 'staff']),
  is_active: z.boolean(),
});

const UpdateUserSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).transform(sanitizeString),
  phone: z.string().nullable().optional().transform(val => val ? sanitizeString(val) : null),
  role: z.enum(['owner', 'manager', 'kitchen', 'staff']),
  is_active: z.boolean(),
  password: z.string().optional().transform(val => val ? val.trim() : ''),
});

// Helper to verify caller authentication and role (Owner or Manager only)
async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // Fetch caller's profile role and active status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    throw new Error('Unauthorized: Active session required');
  }

  if (profile.role !== 'owner' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return { caller: { id: user.id, role: profile.role } };
}

// Helper to count active owners in the system
async function countActiveOwners(adminClient: any): Promise<number> {
  const { count, error } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'owner')
    .eq('is_active', true);

  if (error) {
    throw new Error('Failed to verify Owner counts');
  }

  return count || 0;
}

/**
 * Action: Create User Account
 * Protected: Owner & Manager (Managers cannot create Owner/Manager accounts)
 */
export async function createUserAction(rawData: any) {
  try {
    const { caller } = await verifyAuth();
    const validatedData = CreateUserSchema.parse(rawData);

    // Manager RBAC restriction: cannot create owners or managers
    if (caller.role === 'manager' && (validatedData.role === 'owner' || validatedData.role === 'manager')) {
      return {
        success: false,
        error: 'Unauthorized: Managers can only create staff and kitchen accounts.',
      };
    }

    const adminClient = createAdminClient();

    // 1. Generate secure random password
    // Shown once to the creator, never logged or stored in database
    const tempPassword = crypto.randomBytes(12).toString('hex') + 'A1!';

    // 2. Create user in Supabase auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validatedData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: validatedData.full_name,
        phone: validatedData.phone || '',
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create authentication account',
      };
    }

    const newUserId = authData.user.id;

    // 3. Update profile details (the trigger handles_new_user automatically creates a row, so we UPDATE it)
    try {
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          full_name: validatedData.full_name,
          phone: validatedData.phone || null,
          role: validatedData.role,
          is_active: validatedData.is_active,
        })
        .eq('id', newUserId);

      if (profileError) {
        throw profileError;
      }
    } catch (err: any) {
      // Rollback Auth user if profile updates fail to prevent orphaned accounts
      await adminClient.auth.admin.deleteUser(newUserId);
      return {
        success: false,
        error: `Database synchronization failed: ${err.message || 'Profile rollback executed.'}`,
      };
    }

    revalidatePath('/admin/users');
    return {
      success: true,
      tempPassword, // Return so UI can display it once to the creator
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during user creation',
    };
  }
}

/**
 * Action: Update User Account details and/or role
 * Protected: Owner & Manager (Managers cannot edit/change owner/manager accounts)
 */
export async function updateUserAction(targetUserId: string, rawData: any) {
  try {
    const { caller } = await verifyAuth();
    const validatedData = UpdateUserSchema.parse(rawData);

    const adminClient = createAdminClient();

    // Fetch target user's current profile
    const { data: targetProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'Target user profile not found.' };
    }

    // Manager RBAC restrictions:
    // 1. Cannot edit existing owners or managers
    // 2. Cannot change role to owner or manager
    if (caller.role === 'manager') {
      if (targetProfile.role === 'owner' || targetProfile.role === 'manager') {
        return { success: false, error: 'Unauthorized: Managers cannot modify owner or manager accounts.' };
      }
      if (validatedData.role === 'owner' || validatedData.role === 'manager') {
        return { success: false, error: 'Unauthorized: Managers cannot promote accounts to owner or manager.' };
      }
    }

    // Owner protection checks:
    // Verify we are not demoting or deactivating the last active owner
    if (targetProfile.role === 'owner') {
      const activeOwnersCount = await countActiveOwners(adminClient);
      
      // If they are the last active owner, prevent role demotion or deactivation
      if (activeOwnersCount <= 1 && targetProfile.is_active) {
        if (validatedData.role !== 'owner') {
          return { success: false, error: 'Operation Blocked: Cannot demote the last active owner account.' };
        }
        if (!validatedData.is_active) {
          return { success: false, error: 'Operation Blocked: Cannot deactivate the last active owner account.' };
        }
      }
    }

    // 1. Update Auth record if password is provided
    if (validatedData.password && validatedData.password.length > 0) {
      if (validatedData.password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: validatedData.password,
      });

      if (authUpdateError) {
        return { success: false, error: `Auth update failed: ${authUpdateError.message}` };
      }
    }

    // 2. Update profiles table
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: validatedData.full_name,
        phone: validatedData.phone || null,
        role: validatedData.role,
        is_active: validatedData.is_active,
      })
      .eq('id', targetUserId);

    if (profileError) {
      return { success: false, error: `Profile update failed: ${profileError.message}` };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during user update',
    };
  }
}

/**
 * Action: Toggle Active Status
 * Protected: Owner & Manager (Managers cannot toggle owners/managers)
 */
export async function toggleUserStatusAction(targetUserId: string, isActive: boolean) {
  try {
    const { caller } = await verifyAuth();
    const adminClient = createAdminClient();

    // Fetch target profile
    const { data: targetProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'Target user profile not found.' };
    }

    // Manager RBAC restrictions: cannot toggle owner or manager status
    if (caller.role === 'manager' && (targetProfile.role === 'owner' || targetProfile.role === 'manager')) {
      return { success: false, error: 'Unauthorized: Managers cannot change status of owner or manager accounts.' };
    }

    // Owner protection checks: cannot deactivate the last active owner
    if (targetProfile.role === 'owner' && !isActive) {
      const activeOwnersCount = await countActiveOwners(adminClient);
      if (activeOwnersCount <= 1 && targetProfile.is_active) {
        return { success: false, error: 'Operation Blocked: Cannot deactivate the last active owner account.' };
      }
    }

    // Update is_active in profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', targetUserId);

    if (profileError) {
      return { success: false, error: `Failed to update status: ${profileError.message}` };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during status toggle',
    };
  }
}
