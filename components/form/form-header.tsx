"use client"
import Image from "next/image"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FormHeader({ onDownload }: { onDownload: () => void }) {
  return (
    <header className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/bilgicevre-logo.png" alt="BİLGİÇEVRE" width={52} height={52} className="rounded-xl" priority />
          <div><p className="text-xs font-semibold tracking-widest text-primary">BİLGİÇEVRE</p><h1 className="text-lg font-bold leading-tight">Günlük Araç Kullanım Takip Formu</h1></div>
        </div>
        <Button type="button" variant="outline" onClick={onDownload} className="gap-2"><Download className="size-4" /> Kayıtları indir</Button>
      </div>
    </header>
  )
}
