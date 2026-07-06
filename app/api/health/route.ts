import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0; // Dynamic route

export async function GET() {
  const startTime = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('system_settings').select('key').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error) {
      console.error('❌ Health check database query failed:', error);
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: 'Database connection check failed',
          latencyMs,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        latencyMs,
        version: '1.0.0',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('❌ Health check caught unexpected error:', err);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: 'Health check caught unexpected error',
      },
      { status: 500 }
    );
  }
}
