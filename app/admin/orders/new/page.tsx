import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManualOrderForm from "./manual-order-form";

export const dynamic = "force-dynamic";

export default async function NewManualOrderPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth Check
  if (authError || !user) {
    redirect("/admin/login");
  }

  // 2. Role Check (Only owner and manager allowed)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    redirect("/admin/login");
  }

  if (profile.role !== "owner" && profile.role !== "manager") {
    // Strictly block kitchen and staff from accessing this page
    redirect("/admin/login");
  }

  // 3. Fetch menu items & categories in parallel
  const [menuItemsRes, categoriesRes] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name_pl, name_en, price, is_available, is_active, is_deleted, category_id")
      .eq("is_active", true)
      .eq("is_deleted", false),
    supabase
      .from("categories")
      .select("id, name_pl, name_en")
  ]);

  const menuItems = menuItemsRes.data || [];
  const categories = categoriesRes.data || [];

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-4 sm:p-6 lg:p-8 font-sans">
      <ManualOrderForm 
        menuItems={menuItems} 
        categories={categories} 
      />
    </div>
  );
}
