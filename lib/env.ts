import { z } from 'zod';

const envSchemaBase = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  BREVO_API_KEY: z.string().optional(),
  ORDER_IP_HASH_SECRET: z.string().optional(),
  EMAIL_ACTION_TOKEN_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const envSchema = envSchemaBase.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.ORDER_IP_HASH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ORDER_IP_HASH_SECRET is required in production',
        path: ['ORDER_IP_HASH_SECRET']
      });
    }
    if (!data.EMAIL_ACTION_TOKEN_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_ACTION_TOKEN_SECRET is required in production',
        path: ['EMAIL_ACTION_TOKEN_SECRET']
      });
    }
  }
});

/**
 * Validates environment variables against the schema.
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration: ' + JSON.stringify(result.error.format()));
    }
  }
  return result.data;
}

// Run validation immediately on module load to guarantee early fail-closed
validateEnv();

export const env = envSchemaBase.partial().parse(process.env);
