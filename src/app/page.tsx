"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChatCircleTextIcon,
  DeviceMobileIcon,
  FireIcon,
  StethoscopeIcon,
  UserIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import { DemoClock } from "@/components/DemoClock";
import { PillSwatch } from "@/components/ui";
import { useHearth } from "@/lib/useHearth";

const VIEWS: { href: string; Icon: Icon; title: string; desc: string }[] = [
  { href: "/elder", Icon: DeviceMobileIcon, title: "Elder phone", desc: "WhatsApp pop-ups, then a voice call that reads the reminder aloud" },
  { href: "/patient", Icon: UserIcon, title: "Patient app", desc: "Large text: I took them, Later, Didn't take, plus voice notes" },
  { href: "/patient?mode=whatsapp", Icon: ChatCircleTextIcon, title: "Patient on WhatsApp", desc: "Simulated reminders with reply buttons" },
  { href: "/family", Icon: UsersThreeIcon, title: "Family", desc: "Status, duty roster, alerts and medicines" },
  { href: "/summary", Icon: StethoscopeIcon, title: "Doctor summary", desc: "One printable page for the clinic visit" },
];

export default function Home() {
  const { state } = useHearth();
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 md:px-8">
      <nav className="mx-auto mt-5 flex w-max items-center gap-6 rounded-full bg-paper/80 py-2 pl-4 pr-2 shadow-float backdrop-blur-xl">
        <span className="flex items-center gap-1.5 font-semibold">
          <FireIcon size={18} weight="fill" className="text-hearth" aria-hidden /> HearthCare
        </span>
        <Link href="/summary" className="hidden text-sm text-ink-2 hover:text-ink sm:block">
          Doctor summary
        </Link>
        <Link href="/demo" className="press rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Watch the demo
        </Link>
      </nav>

      {/* Hero: message left, the real patient screen right */}
      <section className="grid items-center gap-12 pt-14 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div className="enter flex flex-col gap-6">
          <h1 className="max-w-[14ch] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-6xl">
            Medicine reminders the whole family shares.
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-ink-2">
            Ma gets a simple reminder, her children share the follow-up, and her doctor gets one clear page.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/demo" className="press group flex h-14 items-center gap-4 rounded-full bg-hearth pl-6 pr-1.5 font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_14px_28px_-14px_rgb(194_85_58/0.6)]">
              Watch the demo
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.18] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRightIcon size={18} />
              </span>
            </Link>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          {/* The real patient screen at phone width, scaled down to fit beside the headline */}
          <div className="relative h-[640px] w-[328px] rounded-[3rem] bg-tray shadow-[inset_0_0_0_1px_rgb(30_39_48/0.05)]">
            <div className="absolute left-2 top-2 h-[780px] w-[390px] origin-top-left scale-[0.8] overflow-hidden rounded-[3.2rem] bg-ground shadow-lift">
              <iframe src="/patient?embed=1" title="Live patient screen" className="h-full w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* The three people, in a bento that isn't three equal cards */}
      <section className="mt-28 flex flex-col gap-8">
        <h2 className="max-w-[22ch] text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">One picture for the patient, the family and the doctor.</h2>
        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Link href="/patient" className="press group flex flex-col justify-between gap-10 rounded-[32px] bg-paper p-7 shadow-soft md:col-span-2 md:row-span-2">
            <div aria-hidden className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-3">
                {(state?.meds.filter((m) => m.active) ?? []).map((m) => (
                  <span key={m.id} className="flex items-center gap-3 rounded-full bg-ground py-1.5 pl-1.5 pr-4">
                    <PillSwatch med={m} size={44} />
                    <span className="flex flex-col leading-tight">
                      <span className="font-semibold">{m.nameZh ?? m.name}</span>
                      <span className="text-sm text-ink-2">{m.name}</span>
                    </span>
                  </span>
                ))}
              </div>
              <span className="flex h-16 w-full max-w-[340px] items-center gap-3.5 rounded-full bg-hearth pl-2 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_12px_24px_-12px_rgb(194_85_58/0.55)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.18]">
                  <CheckIcon size={24} weight="bold" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-xl font-bold">我吃了</span>
                  <span className="text-sm">I took them</span>
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-semibold tracking-[-0.01em]">For Ma: one question, one answer</h3>
              <p className="max-w-[48ch] text-ink-2">Big text in her language, a picture of each pill, and an undo for the wrong button. If she doesn&apos;t reply, her phone rings and reads it aloud.</p>
              <span className="flex items-center gap-1 text-sm font-semibold text-hearth-ink">
                Open the patient app <ArrowUpRightIcon size={14} aria-hidden className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
          <Link href="/family" className="press group flex flex-col gap-3 rounded-[32px] bg-gradient-to-b from-paper to-[#f2f9f4] p-7 shadow-soft">
            <UsersThreeIcon size={26} weight="bold" className="text-ok" aria-hidden />
            <h3 className="text-xl font-semibold tracking-[-0.01em]">For the family: a shared duty roster</h3>
            <p className="text-sm text-ink-2">Only whoever is on duty gets the alert, so nobody worries all day.</p>
          </Link>
          <Link href="/summary" className="press group flex flex-col gap-3 rounded-[32px] bg-ink p-7 text-white shadow-[0_24px_50px_-28px_rgb(30_39_48/0.6)]">
            <StethoscopeIcon size={26} weight="bold" className="text-[#f2cc8f]" aria-hidden />
            <h3 className="text-xl font-semibold tracking-[-0.01em]">For the doctor: one page</h3>
            <p className="text-sm text-white/75">Doses, patterns, symptoms and questions, readable in 30 seconds.</p>
          </Link>
        </div>
      </section>

      {/* Prototype views and the demo clock */}
      <section className="mt-28 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.01em]">Prototype views</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {VIEWS.map((v) => (
              <li key={v.href}>
                <Link href={v.href} className="press flex h-full items-start gap-3.5 rounded-[22px] bg-paper p-4 shadow-soft transition-shadow duration-200 hover:shadow-lift">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ground text-ink-2">
                    <v.Icon size={20} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">{v.title}</span>
                    <span className="block text-sm text-ink-2">{v.desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.01em]">Demo clock</h2>
          <DemoClock inline />
          <p className="px-1 text-sm text-ink-3">
            Open the family view on your phone (same Wi-Fi, this computer&apos;s IP address) and the patient view here. Every screen syncs every 1.5 seconds.
          </p>
        </div>
      </section>
    </div>
  );
}
