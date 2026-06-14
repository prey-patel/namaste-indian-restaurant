import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerformanceDataAction } from "./actions";
import PerformanceDashboard from "@/components/admin/performance/performance-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wydajność Operacyjna / Performance — Namaste Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPerformancePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect("/admin/login");
  }

  // 2. Profile role check
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    redirect("/admin/login");
  }

  // Owner and Manager are allowed, Kitchen and Staff are blocked
  if (profile.role !== "owner" && profile.role !== "manager") {
    redirect("/admin");
  }

  // 3. Define default date range (last 30 days) in Europe/Warsaw timezone
  const now = new Date();
  const endDateStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 29); // 30 days including today
  const startDateStr = pastDate.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });

  // 4. Fetch initial dataset server-side
  let initialData = null;
  try {
    initialData = await getPerformanceDataAction(startDateStr, endDateStr);
  } catch (err) {
    console.error("Failed to load initial performance data:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Wydajność Operacyjna / Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoruj czas przygotowania dań, terminowość dostaw oraz wskaźniki rezerwacji. / Monitor kitchen preparation speeds, delivery fulfillment rates, and booking response times.
        </p>
      </div>

      {initialData ? (
        <PerformanceDashboard
          initialData={initialData}
          defaultStartDate={startDateStr}
          defaultEndDate={endDateStr}
        />
      ) : (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-600 [.admin-theme_&]:text-red-800">
          Nie udało się załadować raportów wydajności. Spróbuj odświeżyć stronę. / Failed to load performance reports. Please refresh the page.
        </div>
      )}
    </div>
  );
}
