"use client";

import React, { useState, useTransition } from "react";
import { submitReservationEmailAction } from "./actions";
import { useLocale } from "next-intl";

interface ReservationConfirmFormProps {
  token: string;
  action: "approve" | "reject";
}

export default function ReservationConfirmForm({ token, action }: ReservationConfirmFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const locale = useLocale();
  const isPl = locale === "pl";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitReservationEmailAction(token, action);
      setResult(res);
    });
  };

  if (result) {
    if (result.success) {
      return (
        <div className="text-center p-6 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
          <p className="text-emerald-800 font-bold font-sans">
            {isPl ? "Akcja wykonana pomyślnie!" : "Action completed successfully!"}
          </p>
          <p className="text-xs text-emerald-700 font-sans">
            {action === "approve"
              ? isPl
                ? "Rezerwacja została potwierdzona, a klient został powiadomiony."
                : "Reservation has been confirmed and the customer has been notified."
              : isPl
              ? "Rezerwacja została odrzucona, a klient został powiadomiony."
              : "Reservation has been rejected and the customer has been notified."}
          </p>
        </div>
      );
    } else {
      return (
        <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
          <p className="text-rose-800 font-bold font-sans">
            {isPl ? "Wystąpił błąd" : "An error occurred"}
          </p>
          <p className="text-xs text-rose-700 font-sans">{result.error}</p>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs text-rose-800 underline hover:text-rose-900 font-medium"
          >
            {isPl ? "Spróbuj ponownie" : "Try again"}
          </button>
        </div>
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
            <span>{isPl ? "Przetwarzanie..." : "Processing..."}</span>
          </>
        ) : (
          <span>
            {action === "approve"
              ? isPl
                ? "Potwierdź rezerwację"
                : "Confirm Reservation"
              : isPl
              ? "Potwierdź odrzucenie"
              : "Confirm Rejection"}
          </span>
        )}
      </button>
    </form>
  );
}
