"use client"

import Image from "next/image"

export function FormHeader({ taslakNo }: { taslakNo: string }) {
  return (
    <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <Image src="/bilgicevre-logo.png" alt="BİLGİÇEVRE logosu" width={420} height={120} className="h-12 w-auto max-w-[360px] object-contain object-left sm:h-14" priority />
      <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">GÜNLÜK ARAÇ KULLANIM TAKİP FORMU</h1>
        <span className="mt-2 inline-flex w-fit rounded-lg bg-secondary px-3 py-1 text-xs font-medium sm:mt-0">Taslak No: {taslakNo}</span>
      </div>
    </header>
  )
}
