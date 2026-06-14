import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsDataAction } from "./actions";
import AnalyticsDashboard from "@/components/admin/analytics/analytics-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Raporty i Analizy / Analytics — Namaste Admin",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. Auth check
  if (authError || !user) {
    redirect("/admin/login");
  }

  // 2. Profile and Role check
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
  let initialData;
  try {
    initialData = await getAnalyticsDataAction(startDateStr, endDateStr);
  } catch (err) {
    console.error("Failed to load initial analytics:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Raporty i Analizy / Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoruj sprzedaż, rezerwacje i popularność dań w czasie rzeczywistym. / Monitor sales, reservations, and dish popularity in real time.
        </p>
      </div>

      {initialData ? (
        <AnalyticsDashboard
          initialData={initialData}
          defaultStartDate={startDateStr}
          defaultEndDate={endDateStr}
        />
      ) : (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-600 [.admin-theme_&]:text-red-800">
          Nie udało się załadować danych analitycznych. Spróbuj odświeżyć stronę. / Failed to load analytics data. Please refresh the page.
        </div>
      )}
    </div>
  );
}
