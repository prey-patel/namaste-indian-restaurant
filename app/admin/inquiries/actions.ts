'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmailViaBrevo } from '@/lib/email/brevo';
import { validateAdminAccess } from '@/lib/auth/guards';
import { z } from 'zod';

/**
 * Escapes HTML special characters to prevent HTML injection in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Updates the status of a contact inquiry (e.g. read, archived).
 */
export async function updateInquiryStatusAction(id: string, status: 'read' | 'archived') {
  try {
    await validateAdminAccess();
    const supabase = await createClient();

    const { error } = await supabase
      .from('contact_inquiries')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Failed to update inquiry status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/inquiries', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update inquiry status:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}

/**
 * Sends a reply email to the customer and updates the inquiry details in the database.
 */
export async function replyToInquiryAction(id: string, replyText: string) {
  try {
    const adminId = await validateAdminAccess();
    const validatedReplyText = z.string().min(1, 'Reply content cannot be empty').max(5000, 'Reply exceeds maximum length').parse(replyText);
    const supabase = await createClient();

    // 1. Fetch original inquiry
    const { data: inquiry, error: fetchError } = await supabase
      .from('contact_inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inquiry) {
      throw new Error('Inquiry not found');
    }

    // 2. Send email via Brevo
    const emailSubject = `Re: ${inquiry.subject}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-top: 0;">Reply from Namaste Indian Restaurant</h2>
        <p>Dear ${escapeHtml(inquiry.name)},</p>
        
        <div style="background-color: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eaeaea; color: #333; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(validatedReplyText)}</div>

        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 25px 0;" />
        
        <p style="font-size: 12px; color: #777;"><strong>Original Message:</strong></p>
        <blockquote style="font-size: 12px; color: #555; background-color: #f9f9f9; padding: 12px; border-left: 3px solid #ccc; margin: 10px 0; font-style: italic;">
          ${escapeHtml(inquiry.message).replace(/\n/g, '<br />')}
        </blockquote>
        
        <p style="font-size: 12px; color: #777; margin-top: 25px;">
          Best regards,<br />
          <strong>Namaste Indian Restaurant Team</strong><br />
          ul. Warszawska 1/3, Ciechanów<br />
          Phone: 511984331
        </p>
      </div>
    `;

    const brevoResult = await sendEmailViaBrevo({
      toEmail: inquiry.email,
      toName: inquiry.name,
      subject: emailSubject,
      htmlContent: emailHtml
    });

    if (!brevoResult.success) {
      throw new Error(`Email delivery failed: ${brevoResult.errorMessage}`);
    }

    // 3. Update DB inquiry record
    const { error: updateError } = await supabase
      .from('contact_inquiries')
      .update({
        status: 'replied',
        admin_reply: validatedReplyText,
        replied_at: new Date().toISOString(),
        replied_by: adminId
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update DB after successful email send:', updateError);
      // We don't throw here since email was already sent
    }

    // 4. Log in email_logs
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from('email_logs')
        .insert({
          entity_type: 'system',
          entity_id: id,
          recipient_email: inquiry.email,
          recipient_type: 'customer',
          template_key: 'contact_reply',
          subject: emailSubject,
          brevo_message_id: brevoResult.messageId || null,
          status: 'sent',
          metadata: { admin_id: adminId },
          sent_at: new Date().toISOString()
        });
    } catch (logErr) {
      console.error('Failed to write to email_logs:', logErr);
    }

    revalidatePath('/admin/inquiries', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to reply to inquiry:', err);
    return { success: false, error: err.message || 'Server error' };
  }
}
