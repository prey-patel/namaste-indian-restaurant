import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailViaBrevo } from "./brevo";
import { createAdminActionToken } from "./action-tokens";
import {
  getOrderRequestReceivedCustomerTemplate,
  getOrderApprovedCustomerTemplate,
  getOrderRejectedCustomerTemplate,
  getOrderReadyForPickupCustomerTemplate,
  getOrderDeliveredCustomerTemplate,
  getOrderNewAdminTemplate
} from "./templates/orders";

const BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

/**
 * Enforces email sending idempotency.
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
    .eq("entity_type", "order")
    .eq("entity_id", entityId)
    .eq("template_key", templateKey)
    .eq("recipient_email", recipientEmail)
    .in("status", ["sent", "skipped", "queued"])
    .maybeSingle();

  if (error) {
    console.error("Error checking order email idempotency:", error);
    return false;
  }
  return !!data;
}

/**
 * Creates an initial log entry in email_logs.
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
      entity_type: "order",
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
    console.error("Failed to create order email log:", error);
    return null;
  }
  return data.id;
}

/**
 * Updates the email log status after Brevo dispatch attempt.
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
 * Orchestrator: Send order request received email to customer.
 */
export async function sendOrderRequestReceivedCustomerEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_request_received_customer";

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_email) return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, order.customer_email)) {
      return;
    }

    const { subject, html } = getOrderRequestReceivedCustomerTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      deliveryAddressSummary: order.delivery_address,
      items: (order.order_items || []).map((i: any) => ({
        name: order.customer_language === "en" ? i.item_name_en : i.item_name_pl,
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      customerNotes: order.customer_notes,
      lang: order.customer_language === "en" ? "en" : "pl"
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, order.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: order.customer_email,
      toName: order.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending order customer pending email:", err);
  }
}

/**
 * Orchestrator: Send new order alert email to admin.
 */
export async function sendOrderNewAdminEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_new_admin";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!adminEmail) {
    console.warn("ADMIN_NOTIFICATION_EMAIL is not configured. Skipping admin alert email.");
    return;
  }

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order) return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, adminEmail)) {
      return;
    }

    // Generate secure email action links
    const approveToken = await createAdminActionToken("order", orderId, "approve", adminEmail);
    const rejectToken = await createAdminActionToken("order", orderId, "reject", adminEmail);

    const approveUrl = `${BASE_URL}/admin/email-actions/order/approve?token=${approveToken}`;
    const rejectUrl = `${BASE_URL}/admin/email-actions/order/reject?token=${rejectToken}`;
    const viewUrl = `${BASE_URL}/admin/orders/${orderId}`;

    const { subject, html } = getOrderNewAdminTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      deliveryAddressSummary: order.delivery_address,
      items: (order.order_items || []).map((i: any) => ({
        name: i.item_name_en, // Admin notification in English
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      customerNotes: order.customer_notes,
      approveUrl,
      rejectUrl,
      viewUrl
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, adminEmail, "admin", templateKey, subject, initialStatus);

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
    console.error("Error sending order admin alert email:", err);
  }
}

/**
 * Orchestrator: Send order approved email to customer.
 */
export async function sendOrderApprovedCustomerEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_approved_customer";

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_email) return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, order.customer_email)) {
      return;
    }

    // Calculate ETA minutes
    let etaMinutes: number | null = null;
    if (order.estimated_time && order.approved_at) {
      const diffMs = new Date(order.estimated_time).getTime() - new Date(order.approved_at).getTime();
      etaMinutes = Math.max(0, Math.round(diffMs / 60000));
    } else if (order.estimated_time) {
      const diffMs = new Date(order.estimated_time).getTime() - Date.now();
      etaMinutes = Math.max(0, Math.round(diffMs / 60000));
    }

    const { subject, html } = getOrderApprovedCustomerTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      deliveryAddressSummary: order.delivery_address,
      items: (order.order_items || []).map((i: any) => ({
        name: order.customer_language === "en" ? i.item_name_en : i.item_name_pl,
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      customerNotes: order.customer_notes,
      etaMinutes,
      lang: order.customer_language === "en" ? "en" : "pl"
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, order.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: order.customer_email,
      toName: order.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending order approved customer email:", err);
  }
}

/**
 * Orchestrator: Send order rejected email to customer.
 */
export async function sendOrderRejectedCustomerEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_rejected_customer";

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_email) return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, order.customer_email)) {
      return;
    }

    const { subject, html } = getOrderRejectedCustomerTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      deliveryAddressSummary: order.delivery_address,
      items: (order.order_items || []).map((i: any) => ({
        name: order.customer_language === "en" ? i.item_name_en : i.item_name_pl,
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      rejectionReason: order.rejection_reason,
      lang: order.customer_language === "en" ? "en" : "pl"
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, order.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: order.customer_email,
      toName: order.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending order rejected customer email:", err);
  }
}

/**
 * Orchestrator: Send ready-for-pickup email to takeaway customer.
 */
export async function sendOrderReadyForPickupCustomerEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_ready_for_pickup_customer";

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_email) return;

    // Strict constraint: only takeaway orders should receive ready for pickup
    if (order.order_type !== "takeaway") return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, order.customer_email)) {
      return;
    }

    const { subject, html } = getOrderReadyForPickupCustomerTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      items: (order.order_items || []).map((i: any) => ({
        name: order.customer_language === "en" ? i.item_name_en : i.item_name_pl,
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      lang: order.customer_language === "en" ? "en" : "pl"
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, order.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: order.customer_email,
      toName: order.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending order ready for pickup email:", err);
  }
}

/**
 * Orchestrator: Send order delivered/completed email to customer.
 */
export async function sendOrderDeliveredCustomerEmail(orderId: string) {
  const adminClient = createAdminClient();
  const templateKey = "order_delivered_customer";

  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order || !order.customer_email) return;

    // Strict constraint: only delivery orders should receive delivered notification
    if (order.order_type !== "delivery") return;

    if (await isEmailAlreadySent(adminClient, orderId, templateKey, order.customer_email)) {
      return;
    }

    const { subject, html } = getOrderDeliveredCustomerTemplate({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      orderType: order.order_type,
      paymentMethod: order.payment_method,
      items: (order.order_items || []).map((i: any) => ({
        name: order.customer_language === "en" ? i.item_name_en : i.item_name_pl,
        quantity: i.quantity,
        totalPrice: Number(i.line_total)
      })),
      subtotal: Number(order.items_subtotal),
      packagingTotal: Number(order.packaging_total),
      deliveryFee: Number(order.delivery_fee),
      totalAmount: Number(order.total_amount),
      lang: order.customer_language === "en" ? "en" : "pl"
    });

    const initialStatus = EMAIL_ENABLED ? "queued" : "skipped";
    const logId = await createEmailLog(adminClient, orderId, order.customer_email, "customer", templateKey, subject, initialStatus);

    if (!logId || !EMAIL_ENABLED) return;

    const result = await sendEmailViaBrevo({
      toEmail: order.customer_email,
      toName: order.customer_name,
      subject,
      htmlContent: html
    });

    if (result.success) {
      await updateEmailLog(adminClient, logId, "sent", result.messageId);
    } else {
      await updateEmailLog(adminClient, logId, "failed", undefined, result.errorMessage);
    }
  } catch (err: any) {
    console.error("Error sending order delivered email:", err);
  }
}
