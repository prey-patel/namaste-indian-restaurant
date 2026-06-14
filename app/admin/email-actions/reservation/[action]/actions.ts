"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { consumeActionTokenForConfirmation } from "@/lib/email/action-tokens";
import {
  sendReservationConfirmedCustomerEmail,
  sendReservationRejectedCustomerEmail
} from "@/lib/email/send-reservation-emails";
import { revalidatePath } from "next/cache";

export async function submitReservationEmailAction(token: string, action: "approve" | "reject") {
  const adminClient = createAdminClient();

  try {
    // 1. Verify and consume the token in a transaction-safe manner
    const tokenRecord = await consumeActionTokenForConfirmation(token);

    if (tokenRecord.entity_type !== "reservation" || tokenRecord.action !== action) {
      throw new Error("Invalid token scope.");
    }

    // 2. Fetch reservation and check status
    const { data: res, error: fetchError } = await adminClient
      .from("reservations")
      .select("*")
      .eq("id", tokenRecord.entity_id)
      .single();

    if (fetchError || !res) {
      throw new Error("Reservation not found.");
    }

    if (res.status !== "pending") {
      throw new Error("This request has already been processed.");
    }

    const targetStatus = action === "approve" ? "confirmed" : "rejected";

    // 3. Update reservation status
    const { error: updateError } = await adminClient
      .from("reservations")
      .update({ status: targetStatus })
      .eq("id", res.id);

    if (updateError) {
      throw new Error("Database update failed.");
    }

    // 4. Insert status audit event
    await adminClient.from("reservation_status_events").insert({
      reservation_id: res.id,
      old_status: "pending",
      new_status: targetStatus,
      reason: `Confirmed via secure email action token.`,
      metadata: { token_id: tokenRecord.id }
    });

    // 5. Trigger customer notification e-mail
    if (action === "approve") {
      await sendReservationConfirmedCustomerEmail(res.id);
    } else {
      await sendReservationRejectedCustomerEmail(res.id);
    }

    // 6. Revalidate caches
    revalidatePath("/[locale]/reservations", "layout");
    revalidatePath("/admin/reservations", "layout");

    return { success: true };
  } catch (err: any) {
    console.error("Reservation email action failed:", err);
    return { success: false, error: err.message || "Action failed." };
  }
}
