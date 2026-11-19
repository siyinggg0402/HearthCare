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
        <div className="no-print flex justify-center gap-1 bg-ink px-2 py-1.5 text-xs text-white">
          <span className="mr-2 opacity-60">Patient view:</span>
          <Link href="/patient" className={`rounded px-2 py-0.5 ${mode === "app" ? "bg-white/20" : ""}`}>
            App
          </Link>
          <Link href="/patient?mode=whatsapp" className={`rounded px-2 py-0.5 ${mode === "whatsapp" ? "bg-white/20" : ""}`}>
            WhatsApp (simulated)
          </Link>
          <Link href="/" className="ml-2 rounded px-2 py-0.5 opacity-60">
            Home
          </Link>
        </div>
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
