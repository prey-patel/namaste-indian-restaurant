"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateOrderTotalServerSide } from "@/lib/orders/pricing";
import { sendOrderApprovedCustomerEmail } from "@/lib/email/send-order-emails";
import { revalidatePath } from "next/cache";
import { calculateDeliveryDistance } from "@/lib/delivery/distance";

// 1. Zod validation schemas
const manualOrderItemSchema = z.object({
  menu_item_id: z.string().uuid("Invalid menu item identifier"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50 per item"),
  customer_notes: z.string().max(200, "Notes must not exceed 200 characters").optional().nullable()
});

const manualOrderRequestSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  customer_email: z.string().email("Please enter a valid email address").optional().nullable().or(z.literal("")),
  customer_phone: z.string()
    .min(9, "Phone number must be at least 9 characters")
    .max(20, "Phone number must not exceed 20 characters")
    .regex(/^[\d\s+\-()]+$/, "Invalid phone number format"),
  order_type: z.enum(["delivery", "takeaway"]),
  source: z.enum(["phone", "walk_in", "admin"]),
  customer_notes: z.string().max(500, "Notes must not exceed 500 characters").optional().nullable(),
  admin_notes: z.string().max(500, "Notes must not exceed 500 characters").optional().nullable(),
  payment_method: z.enum([
    "cash_on_delivery",
    "cash_on_pickup",
    "card_on_delivery",
    "card_on_pickup"
  ]),
  delivery_address: z.string().max(200, "Address must not exceed 200 characters").optional().nullable(),
  delivery_postal_code: z.string()
    .regex(/^\d{2}-\d{3}$/, "Postal code must be in Polish format (XX-XXX)")
    .optional().nullable()
    .or(z.literal("")),
  delivery_city: z.string().max(100, "City must not exceed 100 characters").optional().nullable(),
  delivery_fee: z.number().nonnegative("Delivery fee must be non-negative").default(0),
  estimated_time_minutes: z.number().int().min(1, "ETA must be at least 1 minute").max(360, "ETA cannot exceed 360 minutes").optional().nullable(),
  status: z.enum(["approved", "pending"]).default("approved"),
  send_customer_email: z.boolean().default(true),
  items: z.array(manualOrderItemSchema).min(1, "At least 1 item must be added to the basket")
})
.refine((data) => {
  if (data.order_type === "takeaway") {
    return data.payment_method === "cash_on_pickup" || data.payment_method === "card_on_pickup";
  }
  if (data.order_type === "delivery") {
    return data.payment_method === "cash_on_delivery" || data.payment_method === "card_on_delivery";
  }
  return false;
}, {
  message: "Payment method must match the selected order type",
  path: ["payment_method"]
})
.refine((data) => {
  if (data.order_type === "delivery") {
    return !!data.delivery_address && data.delivery_address.trim().length >= 5;
  }
  return true;
}, {
  message: "Full street address is required for delivery",
  path: ["delivery_address"]
})
.refine((data) => {
  if (data.order_type === "delivery") {
    return !!data.delivery_postal_code && /^\d{2}-\d{3}$/.test(data.delivery_postal_code);
  }
  return true;
}, {
  message: "Valid postal code is required for delivery (XX-XXX)",
  path: ["delivery_postal_code"]
})
.refine((data) => {
  if (data.order_type === "delivery") {
    return !!data.delivery_city && data.delivery_city.trim().length >= 2;
  }
  return true;
}, {
  message: "City name is required for delivery",
  path: ["delivery_city"]
});

// Helper for security role check
async function validateAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Unauthenticated user");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Unauthorized: Admin profile not found");
  }

  if (!profile.is_active) {
    throw new Error("Unauthorized: Admin account is inactive");
  }

  if (profile.role !== "owner" && profile.role !== "manager") {
    throw new Error("Unauthorized: Insufficient permissions");
  }

  return user.id;
}

/**
 * Validates a postal code and returns delivery fee if found.
 */
export async function lookupPostalCodeAction(postalCode: string) {
  try {
    await validateAdminAccess();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("delivery_postal_codes")
      .select("*, delivery_zones(*)")
      .eq("postal_code", postalCode)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "Postal code is not covered by active delivery zones." };
    }

    const fee = data.delivery_fee_override !== null
      ? Number(data.delivery_fee_override)
      : (data.delivery_zones ? Number(data.delivery_zones.delivery_fee) : 0);

    return { success: true, fee };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to look up postal code." };
  }
}

/**
 * Calculates manual order totals dynamically from DB values.
 */
export async function calculateManualOrderTotalsAction(
  items: { menu_item_id: string; quantity: number }[],
  orderType: "delivery" | "takeaway",
  deliveryFee: number
) {
  try {
    await validateAdminAccess();

    if (items.length === 0) {
      return { success: true, subtotal: 0, packagingTotal: 0, totalAmount: 0 };
    }

    const pricingResult = await calculateOrderTotalServerSide(items, orderType);
    const subtotal = pricingResult.itemsSubtotal;
    const packagingTotal = pricingResult.packagingTotal;
    const finalDeliveryFee = orderType === "delivery" ? deliveryFee : 0;
    const totalAmount = subtotal + packagingTotal + finalDeliveryFee;

    return {
      success: true,
      subtotal,
      packagingTotal,
      totalAmount
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to calculate totals." };
  }
}

/**
 * Transactionally inserts a new manual order.
 */
export async function createManualOrderAction(rawData: any) {
  try {
    const adminUserId = await validateAdminAccess();
    const adminClient = createAdminClient();

    // 1. Zod parsing
    const result = manualOrderRequestSchema.safeParse(rawData);
    if (!result.success) {
      const errorMsg = result.error.errors[0]?.message || "Invalid form data.";
      return { success: false, error: errorMsg };
    }
    const data = result.data;

    // 2. Trustworthy Server-side Pricing Recalculation
    const pricingResult = await calculateOrderTotalServerSide(
      data.items.map(item => ({ menu_item_id: item.menu_item_id, quantity: item.quantity })),
      data.order_type
    );

    const subtotal = pricingResult.itemsSubtotal;
    const packagingTotal = pricingResult.packagingTotal;
    const finalDeliveryFee = data.order_type === "delivery" ? data.delivery_fee : 0;
    const totalAmount = subtotal + packagingTotal + finalDeliveryFee;

    // 3. Determine if manual_delivery_fee is true
    let isManualDeliveryFee = false;
    if (data.order_type === "delivery") {
      // Look up system postal code fee to compare
      const pcLookup = await lookupPostalCodeAction(data.delivery_postal_code || "");
      if (!pcLookup.success || pcLookup.fee !== data.delivery_fee) {
        isManualDeliveryFee = true;
      }
    }

    // 4. Calculate ETA times
    let estimatedTime: string | null = null;
    const now = new Date();
    if (data.status === "approved" && data.estimated_time_minutes) {
      estimatedTime = new Date(now.getTime() + data.estimated_time_minutes * 60000).toISOString();
    }

    // 5. Insert order
    const orderPayload: Record<string, any> = {
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone,
      order_type: data.order_type,
      status: data.status,
      payment_status: "pending",
      payment_method: data.payment_method,
      customer_notes: data.customer_notes || null,
      admin_notes: data.admin_notes || null,
      items_subtotal: subtotal,
      packaging_total: packagingTotal,
      delivery_fee: finalDeliveryFee,
      total_amount: totalAmount,
      manual_delivery_fee: isManualDeliveryFee,
      source: data.source,
      send_customer_email: data.send_customer_email,
      created_by_admin_id: adminUserId,
      estimated_time: estimatedTime
    };

    if (data.status === "approved") {
      orderPayload.approved_at = now.toISOString();
    }

    if (data.order_type === "delivery") {
      orderPayload.delivery_address = data.delivery_address;
      orderPayload.delivery_postal_code = data.delivery_postal_code;
      orderPayload.delivery_city = data.delivery_city;
    }

    const { data: newOrder, error: orderError } = await adminClient
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (orderError || !newOrder) {
      console.error("Manual order creation failed:", orderError);
      return { success: false, error: "Failed to create order in database." };
    }

    // 6. Insert order items
    const itemsPayload = data.items.map(item => {
      const snap = pricingResult.dbItemsSnapshots[item.menu_item_id];
      const unitPrice = snap.priceGrosz / 100;
      const lineTotal = unitPrice * item.quantity;
      return {
        order_id: newOrder.id,
        menu_item_id: item.menu_item_id,
        item_name_pl: snap.name_pl,
        item_name_en: snap.name_en,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
        customer_notes: item.customer_notes || null,
        allergens_snapshot: snap.allergens,
        spice_level_snapshot: snap.spiciness
      };
    });

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Manual order items creation failed:", itemsError);
      // Clean up order to act transactionally (since we can't do client-side multi-table transactions easily without RPC)
      await adminClient.from("orders").delete().eq("id", newOrder.id);
      return { success: false, error: "Failed to create order items in database." };
    }

    // 7. Insert status event log
    await adminClient.from("order_status_events").insert({
      order_id: newOrder.id,
      old_status: null,
      new_status: data.status,
      changed_by: adminUserId,
      reason: data.status === "approved"
        ? "Manually created and approved by admin."
        : "Manually created as pending by admin."
    });

    // 7.5 Calculate delivery distance and route metrics (non-blocking)
    if (data.order_type === "delivery") {
      try {
        await calculateDeliveryDistance(newOrder.id);
      } catch (distErr) {
        console.error("Failed to calculate delivery distance for manual order:", distErr);
      }
    }

    // 8. Trigger customer email if applicable
    if (data.status === "approved" && data.send_customer_email && data.customer_email) {
      // sendOrderApprovedCustomerEmail fetches details and honors the send_customer_email flag
      await sendOrderApprovedCustomerEmail(newOrder.id);
    }

    // Trigger PWA push notifications (non-blocking, isolated)
    try {
      const { dispatchOrderPush } = await import('@/lib/push/dispatch-order-push');
      if (data.status === 'approved') {
        await dispatchOrderPush(newOrder.id, 'approved-kds');
      } else if (data.status === 'pending') {
        await dispatchOrderPush(newOrder.id, 'pending-admin');
      }
    } catch (pushErr) {
      console.error("Failed to dispatch manual order push alert:", pushErr);
    }

    // 9. Revalidate paths
    revalidatePath("/admin/orders", "layout");
    revalidatePath("/admin/kds", "layout");

    return { success: true, orderId: newOrder.id };
  } catch (err: any) {
    console.error("createManualOrderAction error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}
