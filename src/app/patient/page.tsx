"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHearth } from "@/lib/useHearth";
import { Loading } from "@/components/ui";
import { DemoClock } from "@/components/DemoClock";
import { PatientApp } from "@/components/patient/PatientApp";
import { PatientWhatsApp } from "@/components/patient/PatientWhatsApp";

function PatientInner() {
  const { state } = useHearth();
  const params = useSearchParams();
  const mode = params.get("mode") === "whatsapp" ? "whatsapp" : "app";
  const embed = params.has("embed");
  if (!state) return <Loading />;

  return (
    <>
      {!embed && (
        <nav className="no-print mx-auto mt-3 flex w-max items-center gap-1 rounded-full bg-paper/80 p-1 text-sm shadow-float backdrop-blur-xl">
          <Link href="/patient" className={`rounded-full px-3 py-1.5 font-semibold ${mode === "app" ? "bg-hearth-soft text-hearth-ink" : "text-ink-2"}`}>
            App
          </Link>
          <Link href="/patient?mode=whatsapp" className={`rounded-full px-3 py-1.5 font-semibold ${mode === "whatsapp" ? "bg-hearth-soft text-hearth-ink" : "text-ink-2"}`}>
            WhatsApp
          </Link>
          <Link href="/" className="rounded-full px-3 py-1.5 text-ink-2">
            Home
          </Link>
        </nav>
      )}
      {mode === "whatsapp" ? <PatientWhatsApp state={state} /> : <PatientApp state={state} />}
      {!embed && <DemoClock />}
    </>
  );
}

export default function PatientPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PatientInner />
    </Suspense>
  );
}
