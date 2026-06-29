'use server';

import { headers } from 'next/headers';
import crypto from 'crypto';
import { contactInquirySchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';
import { sendEmailViaBrevo } from '@/lib/email/brevo';
import { getPublicSystemSettings } from '@/lib/supabase/settings';

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

    // 7. Try sending notification email to admin
    try {
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${host}`;

      const settings = await getPublicSystemSettings();
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || settings.restaurant_email || 'namasteadmin.pl@gmail.com';

      const emailSubject = `🔔 New Contact Message: ${sanitizedSubject}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #fafafa;">
          <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-top: 0;">New Contact Form Submission</h2>
          <p style="margin: 15px 0;"><strong>Name:</strong> ${sanitizedName}</p>
          <p style="margin: 15px 0;"><strong>Email:</strong> <a href="mailto:${validatedData.email}" style="color: #3b82f6; text-decoration: none;">${validatedData.email}</a></p>
          <p style="margin: 15px 0;"><strong>Phone:</strong> ${validatedData.phone ? `<a href="tel:${validatedData.phone}" style="color: #3b82f6; text-decoration: none;">${validatedData.phone}</a>` : 'N/A'}</p>
          <p style="margin: 15px 0;"><strong>Subject:</strong> ${sanitizedSubject}</p>
          <p style="margin: 15px 0; font-weight: bold; color: #555;">Message:</p>
          <blockquote style="background: #ffffff; padding: 15px; border-left: 4px solid #d4af37; margin: 10px 0; border-radius: 4px; line-height: 1.6; color: #333; font-style: italic;">
            ${sanitizedMessage.replace(/\n/g, '<br />')}
          </blockquote>
          <div style="margin-top: 25px; text-align: center;">
            <a href="${baseUrl}/admin/inquiries" style="display: inline-block; padding: 12px 24px; background-color: #d4af37; color: #040815; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
              View and Reply in Dashboard
            </a>
          </div>
        </div>
      `;

      await sendEmailViaBrevo({
        toEmail: adminEmail,
        subject: emailSubject,
        htmlContent: emailHtml,
        toName: 'Restaurant Admin'
      });
    } catch (emailErr) {
      console.error('Failed to send admin contact notification email:', emailErr);
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error in submitContactInquiry server action:', err);
    return { success: false, error: 'server-error' };
  }
}
