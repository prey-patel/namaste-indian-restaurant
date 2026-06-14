"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchAnalyticsRawData, AnalyticsData } from "@/lib/admin/analytics";

const DateRangeSchema = z.object({
  startDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format daty musi być YYYY-MM-DD / Date format must be YYYY-MM-DD"),
  endDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format daty musi być YYYY-MM-DD / Date format must be YYYY-MM-DD"),
});

function getWarsawOffsetMinutes(dateStr: string): number {
  const temp = new Date(`${dateStr}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(temp);
  const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)!.value);

  const yr = getVal("year");
  const mo = getVal("month") - 1;
  const dy = getVal("day");
  let hr = getVal("hour");
  if (hr === 24) hr = 0;
  const mn = getVal("minute");
  const sc = getVal("second");

  const warsawTimeUtc = Date.UTC(yr, mo, dy, hr, mn, sc);
  return (warsawTimeUtc - temp.getTime()) / 60000;
}

export async function getAnalyticsDataAction(
  startDateStr: string,
  endDateStr: string
): Promise<AnalyticsData> {
  // 1. Role-based server-side check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Brak autoryzacji. Zaloguj się ponownie. / Unauthorized. Please log in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    throw new Error("Profil nieaktywny lub nie istnieje. / Profile is inactive or does not exist.");
  }

  if (profile.role !== "owner" && profile.role !== "manager") {
    throw new Error("Brak uprawnień do wyświetlania tej strony. / Insufficient permissions to view this page.");
  }

  // 2. Validate input using Zod
  const result = DateRangeSchema.safeParse({ startDateStr, endDateStr });
  if (!result.success) {
    throw new Error(`Błędne parametry daty / Invalid date parameters: ${result.error.errors.map(e => e.message).join(", ")}`);
  }

  // 3. Limit range to maximum 12 months (366 days)
  const startLocal = new Date(`${startDateStr}T00:00:00`);
  const endLocal = new Date(`${endDateStr}T23:59:59`);

  const diffTime = Math.abs(endLocal.getTime() - startLocal.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 366) {
    throw new Error("Wybrany zakres dat nie może przekraczać 12 miesięcy. / The selected date range cannot exceed 12 months.");
  }

  if (startLocal > endLocal) {
    throw new Error("Data początkowa musi być wcześniejsza niż końcowa. / Start date must be before or equal to end date.");
  }

  // 4. Compute UTC bounds for Warsaw days
  const offsetStart = getWarsawOffsetMinutes(startDateStr);
  const offsetEnd = getWarsawOffsetMinutes(endDateStr);

  const startDateUtc = new Date(new Date(`${startDateStr}T00:00:00.000Z`).getTime() - offsetStart * 60000).toISOString();
  const endDateUtc = new Date(new Date(`${endDateStr}T23:59:59.999Z`).getTime() - offsetEnd * 60000).toISOString();

  // 5. Call server-only helper to fetch and aggregate data
  return await fetchAnalyticsRawData(
    startDateUtc,
    endDateUtc,
    new Date(`${startDateStr}T00:00:00`),
    new Date(`${endDateStr}T00:00:00`)
  );
}
