import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    // Find the user ID for owner@namaste.com
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;
    
    const ownerUser = usersData.users.find(u => u.email === 'owner@namaste.com');
    if (!ownerUser) {
      return NextResponse.json({ success: false, error: 'User owner@namaste.com not found' });
    }
    
    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      ownerUser.id,
      { password: 'NamastePassword123!' }
    );
    if (updateError) throw updateError;
    
    return NextResponse.json({ success: true, message: 'Password reset successfully to NamastePassword123!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
