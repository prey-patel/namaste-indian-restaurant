import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailViaBrevo } from "./brevo";
import { createAdminActionToken } from "./action-tokens";
import {
  getReservationRequestReceivedCustomerTemplate,
  getReservationConfirmedCustomerTemplate,
  getReservationRejectedCustomerTemplate,
  getReservationCancelledCustomerTemplate,
  getReservationNewAdminTemplate
} from "./templates/reservations";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "http";
    if (host) {
      return `${proto}://${host}`;
    }
  } catch (e) {
    // headers() throws if called outside request context (e.g. static rendering, background tasks)
  }
  return (
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

interface RestaurantContactDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
}

async function getRestaurantContactDetails(adminClient: any): Promise<RestaurantContactDetails> {
  const defaultDetails = {
    name: "Namaste Indian Restaurant",
    address: "Warszawska 1/3, 06-400 Ciechanów, Poland",
    phone: "+48 511 984 331",
    email: "info@namaste.pl"
  };

  try {
    const { data, error } = await adminClient
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "restaurant_name",
        "restaurant_address",
        "restaurant_postal_code",
        "restaurant_city",
        "restaurant_country",
        "restaurant_phone",
        "restaurant_email"
      ]);

    if (error || !data) return defaultDetails;

    const settings: Record<string, string> = {};
    data.forEach((item: any) => {
      settings[item.key] = String(item.value);
    });

    const name = settings.restaurant_name || defaultDetails.name;
    
    // Format address
    let address = defaultDetails.address;
    if (settings.restaurant_address) {
      const parts = [
        settings.restaurant_address,
        [settings.restaurant_postal_code, settings.restaurant_city].filter(Boolean).join(" "),
        settings.restaurant_country
      ].filter(Boolean);
      if (parts.length > 0) {
        address = parts.join(", ");
      }
    }

    // Format phone
    let phone = defaultDetails.phone;
    if (settings.restaurant_phone) {
      phone = settings.restaurant_phone.startsWith("+") 
        ? settings.restaurant_phone 
        : `+48 ${settings.restaurant_phone.replace(/\s+/g, '')}`;
    }

    const email = settings.restaurant_email || defaultDetails.email;

    return { name, address, phone, email };
  } catch (err) {
    console.error("Error fetching restaurant contact details for email templates:", err);
    return defaultDetails;
  }
}


function getLanguageFromNotes(notes: string | null): "pl" | "en" {
  if (!notes) return "pl";
  if (notes.includes("Language: en")) return "en";
  return "pl";
}

/**
 * Checks if a matching email log already exists to enforce idempotency.
 */
async function isEmailAlreadySent(
  adminClient: any,
  entityId: string,
  templateKey: string,
  recipientEmail: string
): Promise<boolean> {
  const { data, error } = await adminClient
    .from("email_logs")
    .select("id")
    .eq("entity_type", "reservation")
    .eq("entity_id", entityId)
    .eq("template_key", templateKey)
    .eq("recipient_email", recipientEmail)
    .in("status", ["sent", "skipped", "queued"])
    .maybeSingle();

  if (error) {
    console.error("Error checking email idempotency:", error);
    return false;
  }
  return !!data;
}

/**
 * Creates an initial email log record in the database.
 */
async function createEmailLog(
  adminClient: any,
  entityId: string,
  recipientEmail: string,
  recipientType: "customer" | "admin",
  templateKey: string,
  subject: string,
  status: "queued" | "skipped" | "failed"
) {
  const { data, error } = await adminClient
    .from("email_logs")
    .insert({
      entity_type: "reservation",
      entity_id: entityId,
      recipient_email: recipientEmail,
      recipient_type: recipientType,
      template_key: templateKey,
      subject,
      status,
      metadata: {}
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create email log:", error);
    return null;
  }
  return data.id;
}

/**
 * Updates an email log record with the final dispatch status.
 */
async function updateEmailLog(
  adminClient: any,
  logId: string,
  status: "sent" | "failed",
  messageId?: string,
  errorMessage?: string
) {
  await adminClient
    .from("email_logs")
    .update({
      status,
      brevo_message_id: messageId || null,
      error_message: errorMessage || null,
      sent_at: status === "sent" ? new Date().toISOString() : null
    })
    .eq("id", logId);
}

/**
 * Orchestrator: Send reservation request received email to customer.
 */
export async function sendReservationRequestReceivedCustomerEmail(reservationId: string) {
  const adminClient = createAdminClient();
  const templateKey = "reservation_request_received_customer";

  try {
    const { data: res, error } = await adminClient
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (error || !res || !res.customer_email) return;

    if (await isEmailAlreadySent(adminClient, reservationId, templateKey, res.customer_email)) {
      return;
    }

    const lang = getLanguageFromNotes(res.admin_notes);
    const restaurantContact = await getRestaurantContactDetails(adminClient);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { subject, html } = getReservationRequestReceivedCustomerTemplate({
      customerName: res.customer_name,
      customerPhone: res.customer_phone,
      customerEmail: res.customer_email,
      reservationDate: res.reservation_start_at.substring(0, 10),
      reservationTime: new Date(res.reservation_start_at).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit"
      }),
      guestsCount: res.guests_count,
      specialRequests: res.customer_notes,
      referenceCode: res.token,
      viewUrl: `${siteUrl}/${lang}/reservations/status?id=${res.id}&token=${res.token}`,
      lang,
      restaurantContact
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, reservationId, res.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: res.customer_email,
      toName: res.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending reservation customer pending email:", err);
  }
}

/**
 * Orchestrator: Send new reservation request alert email to admin.
 */
export async function sendReservationNewAdminEmail(reservationId: string) {
  const adminClient = createAdminClient();
  const templateKey = "reservation_new_admin";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!adminEmail) {
    console.warn("ADMIN_NOTIFICATION_EMAIL is not configured. Skipping admin alert email.");
    return;
  }

  try {
    const { data: res, error } = await adminClient
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (error || !res) return;

    if (await isEmailAlreadySent(adminClient, reservationId, templateKey, adminEmail)) {
      return;
    }

    // Generate secure email actions
    const approveToken = await createAdminActionToken("reservation", reservationId, "approve", adminEmail);
    const rejectToken = await createAdminActionToken("reservation", reservationId, "reject", adminEmail);

    const baseUrl = await getBaseUrl();
    const approveUrl = `${baseUrl}/admin/email-actions/reservation/approve?token=${approveToken}`;
    const rejectUrl = `${baseUrl}/admin/email-actions/reservation/reject?token=${rejectToken}`;
    const viewUrl = `${baseUrl}/admin/reservations`;

    const restaurantContact = await getRestaurantContactDetails(adminClient);
    const { subject, html } = getReservationNewAdminTemplate({
      customerName: res.customer_name,
      customerPhone: res.customer_phone,
      customerEmail: res.customer_email || "N/A",
      reservationDate: res.reservation_start_at.substring(0, 10),
      reservationTime: new Date(res.reservation_start_at).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit"
      }),
      guestsCount: res.guests_count,
      specialRequests: res.customer_notes,
      approveUrl,
      rejectUrl,
      viewUrl,
      restaurantContact
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, reservationId, adminEmail, "admin", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: adminEmail,
      toName: "Namaste Admin",
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending reservation admin new email:", err);
  }
}

/**
 * Orchestrator: Send reservation confirmed email to customer.
 */
export async function sendReservationConfirmedCustomerEmail(reservationId: string) {
  const adminClient = createAdminClient();
  const templateKey = "reservation_confirmed_customer";

  try {
    const { data: res, error } = await adminClient
      .from("reservations")
      .select("*, dining_tables(table_number)")
      .eq("id", reservationId)
      .single();

    if (error || !res || !res.customer_email) return;

    if (await isEmailAlreadySent(adminClient, reservationId, templateKey, res.customer_email)) {
      return;
    }

    const tableNum = res.dining_tables ? String(res.dining_tables.table_number) : null;
    const lang = getLanguageFromNotes(res.admin_notes);
    const restaurantContact = await getRestaurantContactDetails(adminClient);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { subject, html } = getReservationConfirmedCustomerTemplate({
      customerName: res.customer_name,
      customerPhone: res.customer_phone,
      customerEmail: res.customer_email,
      reservationDate: res.reservation_start_at.substring(0, 10),
      reservationTime: new Date(res.reservation_start_at).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit"
      }),
      guestsCount: res.guests_count,
      tableNumber: tableNum,
      referenceCode: res.token,
      viewUrl: `${siteUrl}/${lang}/reservations/status?id=${res.id}&token=${res.token}`,
      lang,
      restaurantContact
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, reservationId, res.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: res.customer_email,
      toName: res.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending reservation customer confirmed email:", err);
  }
}

/**
 * Orchestrator: Send reservation rejected email to customer.
 */
export async function sendReservationRejectedCustomerEmail(reservationId: string) {
  const adminClient = createAdminClient();
  const templateKey = "reservation_rejected_customer";

  try {
    const { data: res, error } = await adminClient
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (error || !res || !res.customer_email) return;

    if (await isEmailAlreadySent(adminClient, reservationId, templateKey, res.customer_email)) {
      return;
    }

    const lang = getLanguageFromNotes(res.admin_notes);
    const restaurantContact = await getRestaurantContactDetails(adminClient);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { subject, html } = getReservationRejectedCustomerTemplate({
      customerName: res.customer_name,
      customerPhone: res.customer_phone,
      customerEmail: res.customer_email,
      reservationDate: res.reservation_start_at.substring(0, 10),
      reservationTime: new Date(res.reservation_start_at).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit"
      }),
      guestsCount: res.guests_count,
      rejectionReason: res.rejection_reason,
      referenceCode: res.token,
      viewUrl: `${siteUrl}/${lang}/reservations/status?id=${res.id}&token=${res.token}`,
      lang,
      restaurantContact
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, reservationId, res.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: res.customer_email,
      toName: res.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending reservation customer rejected email:", err);
  }
}

/**
 * Orchestrator: Send reservation cancelled email to customer.
 */
export async function sendReservationCancelledCustomerEmail(reservationId: string) {
  const adminClient = createAdminClient();
  const templateKey = "reservation_cancelled_customer";

  try {
    const { data: res, error } = await adminClient
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single();

    if (error || !res || !res.customer_email) return;

    if (await isEmailAlreadySent(adminClient, reservationId, templateKey, res.customer_email)) {
      return;
    }

    const lang = getLanguageFromNotes(res.admin_notes);
    const restaurantContact = await getRestaurantContactDetails(adminClient);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { subject, html } = getReservationCancelledCustomerTemplate({
      customerName: res.customer_name,
      customerPhone: res.customer_phone,
      customerEmail: res.customer_email,
      reservationDate: res.reservation_start_at.substring(0, 10),
      reservationTime: new Date(res.reservation_start_at).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit"
      }),
      guestsCount: res.guests_count,
      cancellationReason: res.cancellation_reason,
      referenceCode: res.token,
      viewUrl: `${siteUrl}/${lang}/reservations/status?id=${res.id}&token=${res.token}`,
      lang,
      restaurantContact
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, reservationId, res.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: res.customer_email,
      toName: res.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending reservation customer cancelled email:", err);
  }
}
