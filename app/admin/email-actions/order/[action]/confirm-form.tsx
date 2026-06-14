"use client";

import React, { useState, useTransition } from "react";
import { submitOrderEmailAction } from "./actions";

interface OrderConfirmFormProps {
  token: string;
  action: "approve" | "reject";
}

const COMMON_REASONS = [
  { value: "busy", labelPl: "Restauracja jest zbyt zajęta / Kuchnia przeciążona", labelEn: "Restaurant is too busy / Kitchen overloaded" },
  { value: "ingredients", labelPl: "Brak niektórych składników w kuchni", labelEn: "Out of stock / Missing ingredients" },
  { value: "closing", labelPl: "Restauracja zbliża się do zamknięcia", labelEn: "Restaurant is near closing time" },
  { value: "delivery", labelPl: "Adres dostawy leży poza naszym zasięgiem", labelEn: "Delivery address is out of range" },
  { value: "other", labelPl: "Inny powód (wpisz poniżej)", labelEn: "Other reason (specify below)" }
];

export default function OrderConfirmForm({ token, action }: OrderConfirmFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  
  // States for Approve
  const [etaMinutes, setEtaMinutes] = useState<number>(35);

  // States for Reject
  const [selectedReason, setSelectedReason] = useState<string>("busy");
  const [customReason, setCustomReason] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      let finalReason = "";
      if (action === "reject") {
        if (selectedReason === "other") {
          finalReason = customReason.trim() || "Rejected by administrator";
        } else {
          const reasonObj = COMMON_REASONS.find(r => r.value === selectedReason);
          finalReason = reasonObj ? reasonObj.labelPl : "Rejected by administrator";
        }
      }

      const res = await submitOrderEmailAction(
        token, 
        action, 
        action === "approve" ? etaMinutes : undefined, 
        action === "reject" ? finalReason : undefined
      );
      setResult(res);
    });
  };

  if (result) {
    if (result.success) {
      return (
        <div className="text-center p-6 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
          <p className="text-emerald-800 font-bold font-sans">
            Akcja wykonana pomyślnie! / Action completed successfully!
          </p>
          <p className="text-xs text-emerald-700 font-sans">
            {action === "approve"
              ? `Zamówienie zostało zaakceptowane z czasem przygotowania ${etaMinutes} min. Klient został powiadomiony. / Order approved with ${etaMinutes} min prep time. Customer notified.`
              : "Zamówienie zostało odrzucone. Klient został powiadomiony. / Order rejected. Customer notified."}
          </p>
        </div>
      );
    } else {
      return (
        <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
          <p className="text-rose-800 font-bold font-sans">
            Wystąpił błąd / An error occurred
          </p>
          <p className="text-xs text-rose-700 font-sans">{result.error}</p>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs text-rose-800 underline hover:text-rose-900 font-medium font-sans"
          >
            Spróbuj ponownie / Try again
          </button>
        </div>
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {action === "approve" ? (
        <div className="space-y-2.5">
          <label className="block text-xs uppercase tracking-wider text-muted-foreground font-bold font-sans">
            Czas przygotowania (ETA) / Prep Duration (Minutes)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[15, 25, 35, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setEtaMinutes(mins)}
                className={`py-2 px-3 border rounded-lg text-xs font-bold font-sans transition-all ${
                  etaMinutes === mins
                    ? "bg-[#9E690A] border-[#9E690A] text-white shadow-sm"
                    : "bg-white border-[#EAE3D2] text-[#121826] hover:bg-[#FAF9F5]"
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
          <div className="pt-2">
            <span className="text-[11px] text-muted-foreground font-sans">
              Wybrany czas: <strong className="text-foreground">{etaMinutes} minut</strong> od teraz. / Estimated completion time: {etaMinutes} minutes from now.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-bold font-sans">
              Powód odrzucenia / Rejection Reason
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-white border border-[#EAE3D2] rounded-lg px-3 py-2 text-sm text-[#121826] focus:outline-none focus:ring-1 focus:ring-[#9E690A] font-sans"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.labelPl}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-[11px] font-medium text-muted-foreground font-sans">
                Wpisz własny powód / Specify custom reason
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="np. Brak prądu, zamknięte z przyczyn technicznych..."
                className="w-full bg-white border border-[#EAE3D2] rounded-lg px-3 py-2 text-xs text-[#121826] focus:outline-none focus:ring-1 focus:ring-[#9E690A] h-20 resize-none font-sans"
                required
              />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full py-3 px-4 rounded-lg font-medium tracking-wide text-white transition-all shadow-sm flex items-center justify-center space-x-2 font-sans ${
          action === "approve"
            ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700"
            : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Przetwarzanie... / Processing...</span>
          </>
        ) : (
          <span>
            {action === "approve"
              ? "Zatwierdź i Wyślij / Approve & Notify Client"
              : "Odrzuć i Wyślij / Reject & Notify Client"}
          </span>
        )}
      </button>
    </form>
  );
}
