"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { consumeActionTokenForConfirmation } from "@/lib/email/action-tokens";
import {
  sendOrderApprovedCustomerEmail,
  sendOrderRejectedCustomerEmail
} from "@/lib/email/send-order-emails";
import { revalidatePath } from "next/cache";

export async function submitOrderEmailAction(
  token: string,
  action: "approve" | "reject",
  etaMinutes?: number,
  rejectionReason?: string
) {
  const adminClient = createAdminClient();

  try {
    // 1. Consume token first to check security
    const tokenRecord = await consumeActionTokenForConfirmation(token);

    if (tokenRecord.entity_type !== "order" || tokenRecord.action !== action) {
      throw new Error("Invalid token scope.");
    }

    // 2. Fetch order and check status
    const { data: order, error: fetchError } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", tokenRecord.entity_id)
      .single();

    if (fetchError || !order) {
      throw new Error("Order not found.");
    }

    if (order.status !== "pending") {
      throw new Error("This request has already been processed.");
    }

    const now = new Date();
    const updatePayload: Record<string, any> = {
      updated_at: now.toISOString()
    };

    let targetStatus: string;

    if (action === "approve") {
      targetStatus = "approved";
      if (!etaMinutes || etaMinutes <= 0 || etaMinutes > 360) {
        throw new Error("Please select a valid estimated duration (between 1 and 360 minutes).");
      }
      const estimatedTime = new Date(now.getTime() + etaMinutes * 60000);
      updatePayload.status = "approved";
      updatePayload.estimated_time = estimatedTime.toISOString();
      updatePayload.approved_at = now.toISOString();
    } else {
      targetStatus = "rejected";
      updatePayload.status = "rejected";
      if (rejectionReason) {
        // Sanitize reason
        updatePayload.rejection_reason = rejectionReason.replace(/<[^>]*>/g, '').trim();
      }
    }

    // 3. Update order in database
    const { error: updateError } = await adminClient
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order status:", updateError);
      throw new Error("Database update failed.");
    }

    // 4. Log status change event
    await adminClient.from("order_status_events").insert({
      order_id: order.id,
      old_status: "pending",
      new_status: targetStatus,
      reason: `Confirmed via secure email action token.`,
      metadata: { token_id: tokenRecord.id }
    });

    // 5. Trigger customer notifications
    if (action === "approve") {
      await sendOrderApprovedCustomerEmail(order.id);
    } else {
      await sendOrderRejectedCustomerEmail(order.id);
    }

    // 6. Revalidate cache
    revalidatePath("/[locale]/order/status", "layout");
    revalidatePath("/admin/orders", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Order email action failed:", err);
    return { success: false, error: err.message || "Action failed." };
  }
}
