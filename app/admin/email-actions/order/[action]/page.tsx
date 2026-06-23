import React from "react";
import { verifyActionTokenForPreview } from "@/lib/email/action-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import OrderConfirmForm from "./confirm-form";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    action: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function OrderEmailActionPage({ params, searchParams }: PageProps) {
  const { action } = await params;
  const { token } = await searchParams;

  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "pl";
  const isPl = locale === "pl";

  if (action !== "approve" && action !== "reject") {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm text-center">
          <p className="text-red-700 font-bold">
            {isPl ? "Błędna akcja." : "Invalid action."}
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm text-center">
          <p className="text-red-700 font-bold">
            {isPl ? "Brak tokenu zabezpieczającego." : "Missing security token."}
          </p>
        </div>
      </div>
    );
  }

  let tokenRecord;
  try {
    tokenRecord = await verifyActionTokenForPreview(token);
  } catch (err: any) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm text-center">
          <p className="text-red-700 font-bold">
            {isPl
              ? "Ta akcja została już wykonana lub link wygasł."
              : "This action link was already used or expired."}
          </p>
        </div>
      </div>
    );
  }

  const adminClient = createAdminClient();
  const { data: order, error: fetchError } = await adminClient
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", tokenRecord.entity_id)
    .single();

  if (fetchError || !order) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm text-center">
          <p className="text-red-700 font-bold">
            {isPl ? "Zamówienie nie zostało znalezione." : "Order not found."}
          </p>
        </div>
      </div>
    );
  }

  // Double check if already approved/rejected
  if (order.status !== "pending") {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-foreground font-sans">
        <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm text-center">
          <p className="text-amber-800 font-bold">
            {isPl
              ? "To żądanie zostało już przetworzone."
              : "This request has already been processed."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {isPl ? "Aktualny status zamówienia" : "Current status"}:{" "}
            <span className="font-bold uppercase">{order.status}</span>
          </p>
        </div>
      </div>
    );
  }

  // Privacy protection: split name to show only first name, hide phone/email/notes/address
  const nameParts = order.customer_name ? order.customer_name.trim().split(/\s+/) : ["Klient/Client"];
  const safeName = nameParts[0];

  const items = order.order_items || [];

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-[#121826] font-sans">
      <div className="max-w-md w-full bg-white border border-[#EAE3D2] rounded-xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9E690A]">
            Namaste Admin Control
          </h2>
          <h1 className="text-xl font-serif font-black">
            {action === "approve"
              ? isPl
                ? "Potwierdź Akceptację"
                : "Confirm Order Approval"
              : isPl
              ? "Potwierdź Odrzucenie"
              : "Confirm Order Rejection"}
          </h1>
        </div>

        <div className="bg-[#FAF9F5] border border-[#EAE3D2] rounded-lg p-5 space-y-3 text-sm">
          <p className="border-b border-[#EAE3D2] pb-2 font-medium">
            <span className="text-muted-foreground uppercase text-[10px] block font-bold">
              {isPl ? "Klient" : "Customer"}
            </span>
            <span className="text-base font-bold">{safeName}</span>
          </p>
          <p className="border-b border-[#EAE3D2] pb-2 font-medium">
            <span className="text-muted-foreground uppercase text-[10px] block font-bold">
              {isPl ? "Typ zamówienia" : "Order Type"}
            </span>
            <span className="text-base font-bold capitalize">
              {order.order_type === "delivery"
                ? isPl
                  ? "Dostawa"
                  : "Delivery"
                : isPl
                ? "Na wynos"
                : "Takeaway"}
            </span>
          </p>
          <div className="border-b border-[#EAE3D2] pb-2 font-medium">
            <span className="text-muted-foreground uppercase text-[10px] block font-bold">
              {isPl ? "Pozycje" : "Items"}
            </span>
            <ul className="mt-1 space-y-1 text-xs text-[#121826]/80 list-disc list-inside">
              {items.map((item: any, index: number) => (
                <li key={index}>
                  {item.quantity}x {item.item_name_pl || item.item_name_en}
                </li>
              ))}
            </ul>
          </div>
          <p className="pb-1 font-medium">
            <span className="text-muted-foreground uppercase text-[10px] block font-bold">
              {isPl ? "Razem" : "Total Amount"}
            </span>
            <span className="text-base font-bold text-[#9E690A]">{Number(order.total_amount).toFixed(2)} PLN</span>
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          {isPl
            ? "Kliknięcie przycisku poniżej spowoduje natychmiastową zmianę statusu zamówienia i powiadomi klienta e-mailem."
            : "Confirming this action will update the order status and notify the customer."}
        </p>

        <OrderConfirmForm token={token} action={action as "approve" | "reject"} />
      </div>
    </div>
  );
}
