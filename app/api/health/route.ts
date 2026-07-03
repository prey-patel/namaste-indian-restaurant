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
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: error.message,
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
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: err.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
