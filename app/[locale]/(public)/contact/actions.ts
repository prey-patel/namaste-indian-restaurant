'use server';

import { headers } from 'next/headers';
import crypto from 'crypto';
import { contactInquirySchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';

/**
 * Strips HTML tags and trims whitespace from a string to sanitize it.
 */
function sanitizeString(str: string): string {
  return str.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

/**
 * Server Action to handle secure contact form submissions.
 * Implements Zod validation, input sanitization, IP hashing with salt, rate-limiting, and Turnstile placeholder.
 */
export async function submitContactInquiry(
  prevState: any,
  formData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    consent: boolean;
    sourceLanguage: string;
    turnstileToken?: string;
  }
) {
  try {
    // 1. Zod Validation
    const validationResult = contactInquirySchema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      subject: formData.subject,
      message: formData.message,
      consent: formData.consent,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      return { success: false, errors: fieldErrors };
    }

    const validatedData = validationResult.data;

    // 2. Input Sanitization
    const sanitizedName = sanitizeString(validatedData.name);
    const sanitizedSubject = sanitizeString(validatedData.subject);
    const sanitizedMessage = sanitizeString(validatedData.message);

    // 3. Extract Metadata & Anonymize IP
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'unknown-ua';
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown-ip';

    let salt = process.env.CONTACT_IP_HASH_SECRET;
    if (!salt) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('WARNING: CONTACT_IP_HASH_SECRET is missing in environment. Using development fallback.');
        salt = 'dev-fallback-salt';
      } else {
        console.error('ERROR: CONTACT_IP_HASH_SECRET is missing in production environment!');
        return { success: false, error: 'server-error' };
      }
    }

    const ipHash = crypto.createHmac('sha256', salt).update(ip).digest('hex');
    const sourceLanguage = ['pl', 'en'].includes(formData.sourceLanguage) ? formData.sourceLanguage : 'pl';

    // 4. Server-Side Rate Limiting
    try {
      const rateCheck = await isRateLimited(ipHash, 'contact', 5, 3600); // 5 inquiries per hour (3600s)
      if (rateCheck.limited) {
        return { success: false, error: 'rate-limit' };
      }
    } catch (err) {
      // Fail-closed fallback: return rate-limit error
      return { success: false, error: 'rate-limit' };
    }

    const adminClient = createAdminClient();

    // 5. Cloudflare Turnstile Verification Placeholder
    // Note: In future production integrations, Turnstile validation should be performed here by calling
    // the Cloudflare verification endpoint: https://challenges.cloudflare.com/turnstile/v0/siteverify
    // using fetch with Turnstile secret keys.
    if (formData.turnstileToken) {
      console.log('Turnstile token received (placeholder check):', formData.turnstileToken);
    }

    // 6. DB Insertion using secure Server-Only Client
    const { error: insertError } = await adminClient
      .from('contact_inquiries')
      .insert({
        name: sanitizedName,
        email: validatedData.email,
        phone: validatedData.phone || null,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        source_language: sourceLanguage,
        consent_accepted_at: new Date().toISOString(),
        privacy_policy_version: 'v1.0-draft',
        user_agent: userAgent,
        ip_hash: ipHash,
        status: 'new',
      });

    if (insertError) {
      console.error('DB Insert failed for contact inquiry:', insertError);
      return { success: false, error: 'server-error' };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error in submitContactInquiry server action:', err);
    return { success: false, error: 'server-error' };
  }
}
