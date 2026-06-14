"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users as UsersIcon, 
  Info, 
  ChevronRight,
  Loader2,
  CalendarDays,
  FileSpreadsheet
} from "lucide-react";
import { getAnalyticsDataAction } from "@/app/admin/analytics/actions";
import { AnalyticsData, DailyTrendPoint } from "@/lib/admin/analytics";
import PremiumCard from "@/components/ui/premium-card";
import StatusPill from "@/components/ui/status-pill";

interface AnalyticsDashboardProps {
  initialData: AnalyticsData;
  defaultStartDate: string;
  defaultEndDate: string;
}

export default function AnalyticsDashboard({
  initialData,
  defaultStartDate,
  defaultEndDate,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [customStart, setCustomStart] = useState<string>(defaultStartDate);
  const [customEnd, setCustomEnd] = useState<string>(defaultEndDate);
  
  const [activePreset, setActivePreset] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // For interactive line chart tooltip
  const [hoveredPoint, setHoveredPoint] = useState<DailyTrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update data using Server Action
  const handleFetchData = async (start: string, end: string, preset: typeof activePreset) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsDataAction(start, end);
      setData(result);
      setStartDate(start);
      setEndDate(end);
      setActivePreset(preset);
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas ładowania danych. / An error occurred while loading data.");
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
      setError("Wybierz obie daty. / Please select both dates.");
      return;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (start > end) {
      setError("Data początkowa nie może być późniejsza niż końcowa. / Start date cannot be after end date.");
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      setError("Zakres dat nie może przekraczać 12 miesięcy. / Date range cannot exceed 12 months.");
      return;
    }

    handleFetchData(customStart, customEnd, "custom");
  };

  // Calculations for custom SVG trend charts
  const trend = data.dailyTrend || [];
  const maxRevenue = Math.max(...trend.map(t => t.revenue), 100);
  const maxReservations = Math.max(...trend.map(t => t.reservationsCount), 5);

  // Line Chart Sizing
  const svgWidth = 800;
  const svgHeight = 250;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Generate SVG path for line and area
  let linePath = "";
  let areaPath = "";

  if (trend.length > 1) {
    const points = trend.map((point, index) => {
      const x = paddingLeft + (index / (trend.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (point.revenue / maxRevenue) * chartHeight;
      return { x, y };
    });

    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  } else if (trend.length === 1) {
    const x = paddingLeft + chartWidth / 2;
    const y = paddingTop + chartHeight - (trend[0].revenue / maxRevenue) * chartHeight;
    linePath = `M ${paddingLeft} ${y} L ${paddingLeft + chartWidth} ${y}`;
    areaPath = `M ${paddingLeft} ${y} L ${paddingLeft + chartWidth} ${y} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;
  }

  // Generate SVG path for reservations trend
  let resLinePath = "";
  if (trend.length > 1) {
    resLinePath = "M " + trend.map((point, index) => {
      const x = paddingLeft + (index / (trend.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (point.reservationsCount / maxReservations) * chartHeight;
      return `${x} ${y}`;
    }).join(" L ");
  }

  // Format currency
  const formatPLN = (val: number) => {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(val);
  };

  const isEmptyState = data.kpis.ordersCount === 0 && data.kpis.reservationsCount === 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selector Panel */}
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
              Dzisiaj / Today
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
              7 Dni / 7 Days
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
              30 Dni / 30 Days
            </button>
          </div>

          <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <label htmlFor="startDateInput" className="font-bold text-muted-foreground uppercase">Od / From</label>
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
              <label htmlFor="endDateInput" className="font-bold text-muted-foreground uppercase">Do / To</label>
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
              Filtruj / Filter
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
            Ładowanie analiz... / Loading analytics...
          </p>
        </div>
      ) : isEmptyState ? (
        /* Empty State */
        <div className="rounded-2xl border border-primary/20 bg-card p-12 text-center max-w-xl mx-auto shadow-md relative">
          <div className="absolute inset-1.5 rounded-xl border border-primary/5 pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="w-8 h-8 text-primary/70" />
          </div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Brak danych dla wybranego okresu
          </h2>
          <h3 className="text-sm font-sans text-muted-foreground mt-1">
            No data found for the selected period
          </h3>
          <p className="text-xs text-muted-foreground/80 max-w-md mx-auto mt-4 leading-relaxed">
            Nie znaleziono sfinalizowanych, opłaconych zamówień ani rezerwacji w dniach od <strong>{startDate}</strong> do <strong>{endDate}</strong>. Spróbuj poszerzyć zakres dat.
            <br />
            <span className="italic">
              No completed & paid orders or reservations found between {startDate} and {endDate}. Try widening the date range.
            </span>
          </p>
        </div>
      ) : (
        /* Main Dashboard Content */
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Net Revenue */}
            <PremiumCard hoverable={false} className="relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Przychód Netto / Net Revenue
                  </p>
                  <h3 className="text-2xl font-serif font-bold text-foreground mt-1">
                    {formatPLN(data.kpis.revenue)}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground font-medium grid grid-cols-2 gap-y-1">
                <div>Subtotal: {formatPLN(data.kpis.subtotal)}</div>
                <div>Dostawa / Delivery: {formatPLN(data.kpis.deliveryFees)}</div>
                <div>Opakowania / Pack: {formatPLN(data.kpis.packagingFees)}</div>
                <div className="text-red-600 [.admin-theme_&]:text-red-800">
                  Rabaty / Dis: -{formatPLN(data.kpis.discounts)}
                </div>
              </div>
            </PremiumCard>

            {/* KPI 2: Average Order Value */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Średnie Zamówienie / AOV
                  </p>
                  <h3 className="text-2xl font-serif font-bold text-foreground mt-1">
                    {formatPLN(data.kpis.aov)}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-4 pt-3 border-t border-border/50">
                Wartość opłaconego koszyka / Finalized basket size
              </p>
            </PremiumCard>

            {/* KPI 3: Orders Count */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Zamówienia / Orders
                  </p>
                  <h3 className="text-2xl font-serif font-bold text-foreground mt-1">
                    {data.kpis.ordersCount}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[10px]">
                <span className="font-bold text-green-700">Opłacone: {data.kpis.ordersCount}</span>
                <span className="font-bold text-yellow-600">W toku / Active: {data.kpis.activeOrdersCount}</span>
              </div>
            </PremiumCard>

            {/* KPI 4: Reservations */}
            <PremiumCard hoverable={false}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Rezerwacje / Reservations
                  </p>
                  <h3 className="text-2xl font-serif font-bold text-foreground mt-1">
                    {data.kpis.reservationsCount}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <UsersIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-4 pt-3 border-t border-border/50">
                Liczba gości / Guests: <span className="font-bold text-foreground">{data.kpis.guestsCount}</span> (opłacone/aktywne)
              </p>
            </PremiumCard>
          </div>

          {/* Interactive Line Chart - Revenue Trend */}
          <div className="grid grid-cols-1 gap-6">
            <PremiumCard hoverable={false} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-foreground">
                    Trend Przychodów / Sales Revenue Trend
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Analiza dziennych obrotów (PLN) / Daily net sales values
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest border bg-primary/5 text-primary border-primary/20 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1" />
                  Warsaw local time
                </div>
              </div>

              {/* Chart SVG */}
              <div className="relative w-full h-[250px]">
                <svg 
                  className="w-full h-full"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#BF953F" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#BF953F" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const yVal = paddingTop + chartHeight - ratio * chartHeight;
                    const labelVal = Math.round(ratio * maxRevenue);
                    return (
                      <g key={index} className="stroke-border/30 text-[9px] font-sans fill-muted-foreground/80">
                        <line 
                          x1={paddingLeft} 
                          y1={yVal} 
                          x2={svgWidth - paddingRight} 
                          y2={yVal} 
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text 
                          x={paddingLeft - 8} 
                          y={yVal + 3} 
                          textAnchor="end"
                          stroke="none"
                        >
                          {labelVal} zł
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  {areaPath && (
                    <path 
                      d={areaPath} 
                      fill="url(#revenue-grad)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Line stroke */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="#9E690A" 
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Interactive dots and hover capture */}
                  {trend.map((point, index) => {
                    const x = paddingLeft + (index / (trend.length - 1)) * chartWidth;
                    const y = paddingTop + chartHeight - (point.revenue / maxRevenue) * chartHeight;
                    
                    const isHovered = hoveredPoint?.date === point.date;

                    return (
                      <g key={index}>
                        {/* Dot on line */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 5 : 2}
                          fill={isHovered ? "#9E690A" : "#BF953F"}
                          stroke={isHovered ? "#fff" : "none"}
                          strokeWidth={isHovered ? 1.5 : 0}
                          className="transition-all duration-200"
                        />

                        {/* Date axis label (limit showing label to avoid crowding) */}
                        {(index === 0 || index === trend.length - 1 || (trend.length > 5 && index === Math.round(trend.length / 2))) && (
                          <text
                            x={x}
                            y={svgHeight - 12}
                            textAnchor="middle"
                            className="fill-muted-foreground/80 text-[8px] font-sans"
                          >
                            {point.date.substring(5)}
                          </text>
                        )}

                        {/* Interactive trigger rectangle */}
                        <rect
                          x={x - (chartWidth / (trend.length - 1 || 1)) / 2}
                          y={paddingTop}
                          width={chartWidth / (trend.length - 1 || 1)}
                          height={chartHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={(e) => {
                            setHoveredPoint(point);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                              x: x,
                              y: y - 10,
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-[#FAF9F5] border border-primary/30 p-2.5 rounded-lg shadow-md pointer-events-none text-xs text-foreground z-20 transition-all duration-75"
                    style={{
                      left: `${(tooltipPos.x / svgWidth) * 100}%`,
                      top: `${(tooltipPos.y / svgHeight) * 100 - 15}%`,
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    <div className="font-bold border-b border-border pb-1 mb-1 text-[10px] text-muted-foreground">
                      {hoveredPoint.date}
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Przychód / Rev:</span>
                      <span className="font-bold text-primary">{formatPLN(hoveredPoint.revenue)}</span>
                    </div>
                    <div className="flex justify-between gap-4 mt-0.5">
                      <span>Zamówienia / Orders:</span>
                      <span className="font-bold">{hoveredPoint.ordersCount}</span>
                    </div>
                    <div className="flex justify-between gap-4 mt-0.5">
                      <span>Rezerwacje / Res:</span>
                      <span className="font-bold text-blue-600">{hoveredPoint.reservationsCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </PremiumCard>
          </div>

          {/* Grid of breakdowns: Categories, Dishes, Splits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Category Performance */}
            <PremiumCard hoverable={false}>
              <h2 className="text-lg font-serif font-bold text-foreground mb-4">
                Wyniki według kategorii / Category Performance
              </h2>
              {data.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Brak danych kategorii. / No category data.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.categoryBreakdown.map((cat, idx) => {
                    const maxCatRev = Math.max(...data.categoryBreakdown.map(c => c.revenue), 100);
                    const pct = (cat.revenue / maxCatRev) * 100;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-sans">
                          <span className="font-bold">
                            {cat.namePl} / {cat.nameEn}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPLN(cat.revenue)} ({cat.quantity} szt. / pcs)
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2.5 rounded overflow-hidden">
                          <div 
                            className="bg-gold-gradient h-full rounded transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PremiumCard>

            {/* Order Type Split */}
            <PremiumCard hoverable={false} className="flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground mb-1">
                  Kanały Sprzedaży / Order Channels
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Porównanie dostaw i odbiorów osobistych / Delivery vs Takeaway
                </p>
              </div>

              <div className="space-y-6">
                {/* Horizontal Segmented Bar */}
                {(() => {
                  const del = data.orderTypes.find(t => t.type === "delivery") || { count: 0, revenue: 0 };
                  const tak = data.orderTypes.find(t => t.type === "takeaway") || { count: 0, revenue: 0 };
                  const totalCount = del.count + tak.count;
                  const totalRev = del.revenue + tak.revenue;

                  const delPct = totalRev > 0 ? (del.revenue / totalRev) * 100 : 50;
                  const takPct = totalRev > 0 ? (tak.revenue / totalRev) * 100 : 50;

                  return (
                    <div className="space-y-6">
                      <div className="w-full bg-secondary h-6 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-gold-gradient h-full flex items-center justify-center text-[9px] font-bold text-primary-foreground transition-all duration-500"
                          style={{ width: `${takPct}%` }}
                          title={`Dostawa / Delivery: ${formatPLN(del.revenue)}`}
                        >
                          {takPct > 15 && `Takeaway ${Math.round(takPct)}%`}
                        </div>
                        <div 
                          className="bg-foreground/10 h-full flex items-center justify-center text-[9px] font-bold text-foreground transition-all duration-500"
                          style={{ width: `${delPct}%` }}
                          title={`Takeaway / Odbiór: ${formatPLN(tak.revenue)}`}
                        >
                          {delPct > 15 && `Delivery ${Math.round(delPct)}%`}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-border/60 bg-muted/20 p-3.5 rounded-lg text-center">
                          <span className="inline-block w-2.5 h-2.5 bg-primary rounded-full mr-1.5" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                            Odbiór / Takeaway
                          </span>
                          <span className="text-lg font-serif font-bold text-foreground block mt-1">
                            {formatPLN(tak.revenue)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {tak.count} zamówień / orders
                          </span>
                        </div>

                        <div className="border border-border/60 bg-muted/20 p-3.5 rounded-lg text-center">
                          <span className="inline-block w-2.5 h-2.5 bg-foreground/20 rounded-full mr-1.5" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                            Dostawa / Delivery
                          </span>
                          <span className="text-lg font-serif font-bold text-foreground block mt-1">
                            {formatPLN(del.revenue)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {del.count} zamówień / orders
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </PremiumCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 10 Dishes Table */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm p-6 relative">
              <div className="absolute inset-1.5 rounded-[8px] border border-primary/5 pointer-events-none" />
              <h2 className="text-lg font-serif font-bold text-foreground mb-4">
                Najpopularniejsze dania / Top 10 Dishes
              </h2>
              {data.popularItems.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Brak danych o popularności dań. / No dish popularity data.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        <th className="py-2.5">Pozycja / Item</th>
                        <th className="py-2.5">Kategoria / Category</th>
                        <th className="py-2.5 text-right">Sprzedano / Qty</th>
                        <th className="py-2.5 text-right">Obrót / Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.popularItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-primary/5 transition-all duration-150">
                          <td className="py-3 font-semibold text-foreground">
                            <span className="inline-block w-5 text-muted-foreground text-[10px]">
                              {index + 1}.
                            </span>
                            {item.namePl} <span className="text-muted-foreground font-normal">/ {item.nameEn}</span>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {item.categoryNamePl}
                          </td>
                          <td className="py-3 text-right font-bold">
                            {item.quantity}
                          </td>
                          <td className="py-3 text-right font-bold text-primary">
                            {formatPLN(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Reservations Source split */}
            <PremiumCard hoverable={false} className="flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-foreground mb-1">
                  Źródła rezerwacji / Booking Channels
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Kanały, z których spływają rezerwacje / Reservation sources
                </p>
              </div>

              {data.reservationSources.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Brak danych rezerwacji. / No booking data.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.reservationSources.map((source) => {
                    const totalRes = data.kpis.reservationsCount || 1;
                    const pct = Math.round((source.count / totalRes) * 100);
                    
                    const labelMap: Record<string, string> = {
                      website: "Strona WWW / Website",
                      phone: "Telefon / Phone",
                      walk_in: "Z ulicy / Walk-in",
                      admin: "Panel Admina / Admin Panel"
                    };

                    return (
                      <div key={source.source} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">{labelMap[source.source] || source.source}</span>
                          <span className="text-muted-foreground font-bold">{source.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border/50 text-[10px] text-muted-foreground">
                <h3 className="font-bold uppercase tracking-wider mb-2 text-foreground">Statusy rezerwacji / Status summary</h3>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  {data.reservationStatuses.map((stat) => (
                    <div key={stat.status} className="flex justify-between border-b border-border/30 pb-0.5">
                      <span className="uppercase">{stat.status}</span>
                      <span className="font-bold text-foreground">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PremiumCard>

          </div>

        </div>
      )}
    </div>
  );
}
