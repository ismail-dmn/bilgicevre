"use client"

import Image from "next/image"
import { SelectInput } from "./fields"
import type { FormDurum } from "@/lib/form-types"

export function FormHeader({
  taslakNo,
  durum,
  onDurumChange,
}: {
  taslakNo: string
  durum: FormDurum
  onDurumChange: (d: FormDurum) => void
}) {
  return (
    <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center">
          <Image
            src="/bilgicevre-logo.png"
            alt="BİLGİÇEVRE logosu"
            width={420}
            height={120}
            className="h-12 w-auto max-w-[360px] object-contain object-left sm:h-14 sm:max-w-[420px]"
            priority
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="durum" className="mb-1 block text-xs font-medium text-muted-foreground">
            Durum
          </label>
          <SelectInput
            id="durum"
            value={durum}
            onChange={(e) => onDurumChange(e.target.value as FormDurum)}
          >
            <option value="Taslak">Taslak</option>
            <option value="Tamamlandı">Tamamlandı</option>
          </SelectInput>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            GÜNLÜK ARAÇ KULLANIM TAKİP FORMU
          </h1>
        </div>
        <span className="mt-2 inline-flex w-fit items-center rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:mt-0">
          Taslak No: {taslakNo}
        </span>
      </div>
    </header>
  )
}
