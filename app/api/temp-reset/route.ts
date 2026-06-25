import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    // Fetch profiles
    const { data: profiles, error: profileErr } = await adminClient
      .from('profiles')
      .select('email, role, is_active');
      
    if (profileErr) throw profileErr;
    
    // Fetch auth users
    const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
    if (authErr) throw authErr;
    
    return NextResponse.json({ 
      success: true, 
      profiles: profiles || [],
      authUsers: authData.users.map(u => ({ id: u.id, email: u.email }))
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
