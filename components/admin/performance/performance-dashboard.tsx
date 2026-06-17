"use client";

import { useLocale } from 'next-intl';

import React, { useState } from "react";
import { 
  Clock, 
  CheckCircle, 
  Users, 
  AlertTriangle,
  Loader2,
  TrendingUp,
  Info,
  Layers,
  CalendarDays
} from "lucide-react";
import { getPerformanceDataAction } from "@/app/admin/performance/actions";
import { PerformanceData, DailyPerformancePoint } from "@/lib/admin/performance";
import PremiumCard from "@/components/ui/premium-card";
import StatusPill from "@/components/ui/status-pill";

interface PerformanceDashboardProps {
  initialData: PerformanceData;
  defaultStartDate: string;
  defaultEndDate: string;
}

export default function PerformanceDashboard({
  initialData,
  defaultStartDate,
  defaultEndDate,
}: PerformanceDashboardProps) {
  const locale = useLocale();
  const [data, setData] = useState<PerformanceData>(initialData);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [customStart, setCustomStart] = useState<string>(defaultStartDate);
  const [customEnd, setCustomEnd] = useState<string>(defaultEndDate);
  
  const [activePreset, setActivePreset] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // For interactive line chart tooltip
  const [hoveredPoint, setHoveredPoint] = useState<DailyPerformancePoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFetchData = async (start: string, end: string, preset: typeof activePreset) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPerformanceDataAction(start, end);
      setData(result);
      setStartDate(start);
      setEndDate(end);
      setActivePreset(preset);
    } catch (err: any) {
      setError(err.message || (locale === 'en' ? 'An error occurred while loading reports.' : 'Wystąpił błąd podczas ładowania raportów.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetClick = (preset: "today" | "7d" | "30d") => {
    const now = new Date();
    const endStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
    let startStr = endStr;

    if (preset === "7d") {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      startStr = past.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
    } else if (preset === "30d") {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      startStr = past.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
    }

    setCustomStart(startStr);
    setCustomEnd(endStr);
    handleFetchData(startStr, endStr, preset);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setError(locale === 'en' ? 'Please select both dates.' : 'Wybierz obie daty.');
      return;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start > end) {
      setError(locale === 'en' ? 'Start date cannot be after end date.' : 'Data początkowa nie może być późniejsza niż końcowa.');
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      setError(locale === 'en' ? 'Date range cannot exceed 12 months.' : 'Zakres dat nie może przekraczać 12 miesięcy.');
      return;
    }

    handleFetchData(customStart, customEnd, "custom");
  };

  // Format helper for numbers
  const formatMins = (val: number | null) => {
    if (val === null) return "Not enough data";
    return `${val.toFixed(1)} min`;
  };

  const formatPct = (val: number | null) => {
    if (val === null) return "Not enough data";
    return `${val.toFixed(1)}%`;
  };

  // SVGs Trend Setup
  const trend = data.dailyBreakdown || [];
  const validTrendPoints = trend.filter(t => t.avgPrepTime !== null);
  const maxPrepTime = Math.max(...validTrendPoints.map(t => t.avgPrepTime as number), 30);

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  let linePath = "";
  if (validTrendPoints.length > 1) {
    const points = trend.map((point, index) => {
      const x = paddingLeft + (index / (trend.length - 1)) * chartWidth;
      const y = point.avgPrepTime !== null 
        ? paddingTop + chartHeight - (point.avgPrepTime / maxPrepTime) * chartHeight
        : null;
      return { x, y, raw: point };
    });

    // Draw only valid connected segments (ignoring null points or fallback)
    let isDrawing = false;
    points.forEach((p) => {
      if (p.y !== null) {
        if (!isDrawing) {
          linePath += `M ${p.x} ${p.y}`;
          isDrawing = true;
        } else {
          linePath += ` L ${p.x} ${p.y}`;
        }
      } else {
        isDrawing = false;
      }
    });
  }

  const hasHistory = trend.some(t => t.totalOrders > 0 || t.reservationsConfirmed > 0);

  return (
    <div className="space-y-6">
      {/* Date Filter selector */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePresetClick("today")}
              disabled={isLoading}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activePreset === "today"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-primary/10 text-foreground"
              }`}
            >
              {locale === 'en' ? 'Today' : 'Dzisiaj'}
            </button>
            <button
              onClick={() => handlePresetClick("7d")}
              disabled={isLoading}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activePreset === "7d"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-primary/10 text-foreground"
              }`}
            >
              {locale === 'en' ? '7 Days' : '7 Dni'}
            </button>
            <button
              onClick={() => handlePresetClick("30d")}
              disabled={isLoading}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activePreset === "30d"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-primary/10 text-foreground"
              }`}
            >
              {locale === 'en' ? '30 Days' : '30 Dni'}
            </button>
          </div>

          <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <label htmlFor="startDateInput" className="font-bold text-muted-foreground uppercase">{locale === 'en' ? 'From' : 'Od'}</label>
              <input
                id="startDateInput"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                disabled={isLoading}
                max={customEnd || undefined}
                className="px-3 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <label htmlFor="endDateInput" className="font-bold text-muted-foreground uppercase">{locale === 'en' ? 'To' : 'Do'}</label>
              <input
                id="endDateInput"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                disabled={isLoading}
                min={customStart || undefined}
                className="px-3 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all duration-200"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {locale === 'en' ? 'Filter' : 'Filtruj'}
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-700 font-medium flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-serif italic">
            {locale === 'en' ? 'Evaluating Operational Performance...' : 'Analiza wskaźników wydajności...'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Average Prep Time */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {locale === 'en' ? 'Prep Time' : 'Czas przygotowania'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-foreground mt-1">
                    {formatMins(data.kpis.avgPrepTime.value)}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-4 pt-3 border-t border-border/50">
                {data.kpis.avgPrepTime.value !== null 
                  ? (locale === 'en' ? `Based on ${data.kpis.avgPrepTime.count} completed orders` : `Na podstawie ${data.kpis.avgPrepTime.count} dań`)
                  : (locale === 'en' ? `Requires min. 3 records (found ${data.kpis.avgPrepTime.count})` : `Wymaga min. 3 rekordów`)}
              </p>
            </PremiumCard>

            {/* KPI 2: On-Time Rate */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {locale === 'en' ? 'On-Time Rate' : 'Terminowość'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-foreground mt-1">
                    {formatPct(data.kpis.onTimeRate.value)}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-4 pt-3 border-t border-border/50">
                {data.kpis.onTimeRate.value !== null
                  ? `Completed on schedule (${data.kpis.onTimeRate.count} checked)`
                  : `Requires min. 3 records (found ${data.kpis.onTimeRate.count})`}
              </p>
            </PremiumCard>

            {/* KPI 3: Reservation Response Speed */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {locale === 'en' ? 'Booking Response' : 'Reakcja na Rezerwacje'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-foreground mt-1">
                    {formatMins(data.kpis.avgResResponseTime.value)}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-4 pt-3 border-t border-border/50">
                {data.kpis.avgResResponseTime.value !== null
                  ? `Avg time to confirm (${data.kpis.avgResResponseTime.count} processed)`
                  : `Requires min. 3 records (found ${data.kpis.avgResResponseTime.count})`}
              </p>
            </PremiumCard>

            {/* KPI 4: Live Kitchen Queue (Operational, not date-restricted) */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {locale === 'en' ? 'Live Kitchen Queue' : 'Stan Kuchni Live'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-foreground mt-1">
                    {data.kpis.liveActiveQueueSize} {locale === 'en' ? 'active' : 'w toku'}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[10px]">
                <span className="font-bold text-red-700">{locale === 'en' ? 'Overdue' : 'Opóźnione'}: {data.kpis.liveOverdueCount}</span>
                <span className="text-muted-foreground font-medium">Realtime monitoring</span>
              </div>
            </PremiumCard>
          </div>

          {/* Operational Insights Panel */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 relative">
            <div className="absolute inset-1.5 rounded-[8px] border border-primary/10 pointer-events-none" />
            <div className="flex items-start space-x-3 text-primary">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs uppercase font-bold tracking-widest text-primary">
                  {locale === 'en' ? 'Operational Insights' : 'Wnioski i Sugestie Operacyjne'}
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-foreground font-medium list-disc list-inside">
                  {/* Insight 1: Kitchen speeds */}
                  {data.kpis.avgPrepTime.value !== null ? (
                    data.kpis.avgPrepTime.value > 30 ? (
                      <li>
                        {locale === 'en' ? 'Prep times are running high. Consider adding staff during busy periods.' : `Kuchnia ma wydłużony średni czas przygotowania dań (${data.kpis.avgPrepTime.value.toFixed(1)} min). Rozważ dodanie personelu w godzinach szczytu.`}
                      </li>
                    ) : (
                      <li>
                        {locale === 'en' ? 'Kitchen prep times are healthy.' : `Średni czas przygotowania dań (${data.kpis.avgPrepTime.value.toFixed(1)} min) jest w normie (poniżej 30 minut).`}
                      </li>
                    )
                  ) : null}

                  {/* Insight 2: Deliveries */}
                  {data.kpis.onTimeRate.value !== null ? (
                    data.kpis.onTimeRate.value < 80 ? (
                      <li>
                        {locale === 'en' ? 'Delivery SLA is low. Consider adjusting delivery buffer times.' : `Wskaźnik dostaw na czas wynosi zaledwie ${data.kpis.onTimeRate.value.toFixed(1)}%. Sugerowane jest podniesienie szacowanego czasu przygotowania / dostawy o 10-15 minut.`}
                      </li>
                    ) : (
                      <li>
                        {locale === 'en' ? 'On-time fulfillment rate is strong.' : `Szybkość dostaw utrzymuje się na wysokim poziomie (${data.kpis.onTimeRate.value.toFixed(1)}% na czas).`}
                      </li>
                    )
                  ) : null}

                  {/* Insight 3: Reservations */}
                  {data.kpis.avgResResponseTime.value !== null ? (
                    data.kpis.avgResResponseTime.value > 15 ? (
                      <li>
                        {locale === 'en' ? 'Reservation response times are slow. Monitor incoming pending bookings closer.' : `Potwierdzanie rezerwacji trwa zbyt długo (średnio ${data.kpis.avgResResponseTime.value.toFixed(1)} min). Zwiększ monitoring powiadomień.`}
                      </li>
                    ) : (
                      <li>
                        {locale === 'en' ? 'Booking confirmation response speeds are excellent.' : `Wskaźnik potwierdzania rezerwacji działa bardzo sprawnie (${data.kpis.avgResResponseTime.value.toFixed(1)} min).`}
                      </li>
                    )
                  ) : null}

                  {/* Threshold safety warning */}
                  {(data.kpis.avgPrepTime.value === null || data.kpis.onTimeRate.value === null || data.kpis.avgResResponseTime.value === null) && (
                    <li className="text-muted-foreground font-normal italic">
                      {locale === 'en' ? 'Some operational metrics are hidden due to low cohort sample sizes.' : 'Niektóre wskaźniki operacyjne nie zostały wyznaczone ze względu na zbyt niską liczbę rekordów w wybranym przedziale czasowym (wymagane min. 3 valid rekordy).'}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* SVG Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Prep time daily trend */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm p-6 relative">
              <div className="absolute inset-1.5 rounded-[8px] border border-primary/5 pointer-events-none" />
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">
                    {locale === 'en' ? 'Kitchen Prep Trend' : 'Czas Kuchni w Czasie'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {locale === 'en' ? 'Daily Average Prep Times (Minutes)' : 'Dzienne średnie czasy przygotowania (minuty)'}
                  </p>
                </div>
              </div>

              {validTrendPoints.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-[180px] bg-muted/10 rounded-lg border border-dashed border-border/60 p-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs text-muted-foreground italic text-center">
                    Brak wystarczającej ilości danych do wygenerowania wykresu trendów (wymagane min. 2 dni ze średnim czasem).
                    <br />
                    <span>Insufficient daily data points to plot prep times trend.</span>
                  </p>
                </div>
              ) : (
                <div className="relative w-full h-[180px]">
                  <svg 
                    className="w-full h-full"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Y Axis grid lines */}
                    {[0, 0.5, 1].map((ratio, idx) => {
                      const yVal = paddingTop + chartHeight - ratio * chartHeight;
                      const val = Math.round(ratio * maxPrepTime);
                      return (
                        <g key={idx} className="stroke-border/30 text-[9px] font-sans fill-muted-foreground/80">
                          <line 
                            x1={paddingLeft} 
                            y1={yVal} 
                            x2={svgWidth - paddingRight} 
                            y2={yVal} 
                            strokeDasharray="4 4"
                          />
                          <text x={paddingLeft - 8} y={yVal + 3} textAnchor="end" stroke="none">
                            {val} m
                          </text>
                        </g>
                      );
                    })}

                    {/* Trend Line path */}
                    {linePath && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#9E690A" 
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Interactive nodes */}
                    {trend.map((point, index) => {
                      if (point.avgPrepTime === null) return null;

                      const x = paddingLeft + (index / (trend.length - 1)) * chartWidth;
                      const y = paddingTop + chartHeight - (point.avgPrepTime / maxPrepTime) * chartHeight;
                      const isHovered = hoveredPoint?.date === point.date;

                      return (
                        <g key={index}>
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 5 : 2}
                            fill={isHovered ? "#9E690A" : "#BF953F"}
                            stroke={isHovered ? "#fff" : "none"}
                            strokeWidth={isHovered ? 1.5 : 0}
                          />

                          {/* Trigger */}
                          <rect
                            x={x - (chartWidth / (trend.length - 1 || 1)) / 2}
                            y={paddingTop}
                            width={chartWidth / (trend.length - 1 || 1)}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(point)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip */}
                  {hoveredPoint && hoveredPoint.avgPrepTime !== null && (
                    <div className="absolute bg-[#FAF9F5] border border-primary/30 p-2 rounded shadow-md pointer-events-none text-[10px] text-foreground z-20"
                      style={{
                        left: "50%",
                        top: "10px",
                        transform: "translateX(-50%)"
                      }}
                    >
                      <strong>{hoveredPoint.date}</strong>: {locale === 'en' ? 'Prep time' : 'Czas kuchni'}: <span className="font-bold text-primary">{hoveredPoint.avgPrepTime.toFixed(1)} min</span> ({hoveredPoint.totalOrders} {locale === 'en' ? 'orders' : 'zamówień'})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reservations Outcome distribution */}
            <PremiumCard hoverable={false} className="flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground">
                  {locale === 'en' ? 'Booking Outcomes' : 'Statusy Rezerwacji'}
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {locale === 'en' ? 'Reservations Outcome Summary' : 'Podsumowanie rezerwacji'}
                </p>
              </div>

              {data.reservationsSummary.total === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  {locale === 'en' ? 'No reservations in this period.' : 'Brak rezerwacji w tym okresie.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Confirmed */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="font-bold text-green-700">{locale === 'en' ? 'Confirmed' : 'Potwierdzone'}</span>
                      <span className="text-muted-foreground">
                        {data.reservationsSummary.confirmed} ({Math.round((data.reservationsSummary.confirmed / data.reservationsSummary.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-600 h-full rounded-full"
                        style={{ width: `${(data.reservationsSummary.confirmed / data.reservationsSummary.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Cancelled */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="font-bold text-red-700">{locale === 'en' ? 'Cancelled' : 'Anulowane'}</span>
                      <span className="text-muted-foreground">
                        {data.reservationsSummary.cancelled} ({Math.round((data.reservationsSummary.cancelled / data.reservationsSummary.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full"
                        style={{ width: `${(data.reservationsSummary.cancelled / data.reservationsSummary.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* No-Shows */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-sans">
                      <span className="font-bold text-yellow-700">No-Show</span>
                      <span className="text-muted-foreground">
                        {data.reservationsSummary.noShow} ({Math.round((data.reservationsSummary.noShow / data.reservationsSummary.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-yellow-500 h-full rounded-full"
                        style={{ width: `${(data.reservationsSummary.noShow / data.reservationsSummary.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground font-semibold">
                {locale === 'en' ? 'Total bookings' : 'Łącznie rezerwacji'}: {data.reservationsSummary.total}
              </div>
            </PremiumCard>
          </div>

          {/* Daily Performance Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 relative">
            <div className="absolute inset-1.5 rounded-[8px] border border-primary/5 pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-serif font-bold text-foreground">
                {locale === 'en' ? 'Operational Log' : 'Dziennik Operacyjny'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'en' ? 'Daily performance records' : 'Szczegółowy dzienny dziennik wydajności'}
              </p>
            </div>

            {!hasHistory ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                {locale === 'en' ? 'No operations logged for the selected period.' : 'Brak zarejestrowanych operacji dla wybranego okresu.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <th className="py-2.5">{locale === 'en' ? 'Date' : 'Data'}</th>
                      <th className="py-2.5 text-center">{locale === 'en' ? 'Orders' : 'Zamówienia'}</th>
                      <th className="py-2.5 text-center">{locale === 'en' ? 'Avg Prep' : 'Czas Kuchni'}</th>
                      <th className="py-2.5 text-center">{locale === 'en' ? 'On-Time %' : 'Na czas'}</th>
                      <th className="py-2.5 text-center">{locale === 'en' ? 'Reservations' : 'Rezerwacje'}</th>
                      <th className="py-2.5">{locale === 'en' ? 'Flags' : 'Notatki'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {data.dailyBreakdown.map((row) => {
                      if (row.totalOrders === 0 && row.reservationsConfirmed === 0 && row.reservationsCancelled === 0 && row.reservationsNoShow === 0) {
                        return null; // hide empty operational days to save space
                      }

                      return (
                        <tr key={row.date} className="hover:bg-primary/5 transition-all duration-150">
                          <td className="py-3 font-semibold text-foreground">{row.date}</td>
                          <td className="py-3 text-center">{row.totalOrders}</td>
                          <td className="py-3 text-center">
                            {row.avgPrepTime !== null ? `${row.avgPrepTime.toFixed(1)} min` : "—"}
                          </td>
                          <td className="py-3 text-center">
                            {row.onTimeRate !== null ? `${row.onTimeRate.toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-3 text-center font-bold">
                            <span className="text-green-700">C: {row.reservationsConfirmed}</span>
                            <span className="text-muted-foreground/60 mx-1">/</span>
                            <span className="text-red-700">X: {row.reservationsCancelled}</span>
                            <span className="text-muted-foreground/60 mx-1">/</span>
                            <span className="text-yellow-700">NS: {row.reservationsNoShow}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {row.flags.map((fl, idx) => {
                                let status: "neutral" | "success" | "warning" = "neutral";
                                if (fl.includes("100%")) status = "success";
                                else if (fl.includes("delays") || fl.includes("Slow") || fl.includes("Wolna") || fl.includes("Opóźnienia")) status = "warning";
                                
                                const textToShow = locale === 'en' 
                                  ? (fl.split(" / ")[1] || fl.split(" / ")[0]) 
                                  : fl.split(" / ")[0];

                                return (
                                  <StatusPill 
                                    key={idx} 
                                    status={status} 
                                    label={textToShow} 
                                    className="text-[8px] px-1.5 py-0.5" 
                                  />
                                );
                              })}
                              {row.flags.length === 0 && <span className="text-muted-foreground/50 text-[10px]">{locale === 'en' ? 'Normal' : 'Norma'}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
