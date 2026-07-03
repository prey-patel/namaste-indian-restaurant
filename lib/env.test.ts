import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function runEnvTests() {
  // Test 1: Valid environment configuration
  const validConfig = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://xyzcompany.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    NODE_ENV: 'test',
  };
  const res1 = envSchema.safeParse(validConfig);
  if (!res1.success) throw new Error('Test failed: valid env rejected');

  // Test 2: Invalid URL configuration
  const invalidConfig = {
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
  };
  const res2 = envSchema.safeParse(invalidConfig);
  if (res2.success) throw new Error('Test failed: invalid URL accepted');

  return { passed: true, testsRun: 2 };
}
