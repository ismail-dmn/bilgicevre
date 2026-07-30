"use client"

import { useState } from "react"
import { Mail, MessageCircle, Download, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excelFileName } from "@/lib/excel-client"
import { CORPORATE_WHATSAPP } from "@/lib/form-config"
import type { FormData } from "@/lib/form-types"

// Sunucudan doldurulmuş şablonu indir (gerçek Excel şablonu fs erişimi gerektirir).
async function downloadExcel(data: FormData): Promise<void> {
  const res = await fetch("/api/export-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Excel oluşturulamadı.")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = excelFileName(data)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function fmtTarih(iso: string): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function buildWhatsappText(data: FormData): string {
  return [
    "BİLGİÇEVRE Günlük Araç Kullanım Formu",
    "",
    `Tarih: ${fmtTarih(data.tarih)}`,
    `Plaka: ${data.plaka || "-"}`,
    `Şoför: ${data.sofor1 || "-"}`,
    `Taslak No: ${data.taslakNo}`,
    "",
    "Günlük araç kullanım formu hazırlanmıştır.",
  ].join("\n")
}

export function ShareModal({
  open,
  data,
  onClose,
}: {
  open: boolean
  data: FormData
  onClose: () => void
}) {
  const [busy, setBusy] = useState<null | string>(null)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  if (!open) return null

  async function handleExcel() {
    setBusy("excel")
    try {
      await downloadExcel(data)
    } finally {
      setBusy(null)
    }
  }

  async function handleWhatsapp() {
    setBusy("whatsapp")
    try {
      // Tarayıcılar WhatsApp'a doğrudan dosya eki gönderemez.
      // Bu yüzden önce Excel'i indiriyoruz, ardından metinli paylaşım linkini açıyoruz.
      await downloadExcel(data)
      const text = encodeURIComponent(buildWhatsappText(data))
      const base = CORPORATE_WHATSAPP
        ? `https://wa.me/${CORPORATE_WHATSAPP}?text=${text}`
        : `https://wa.me/?text=${text}`
      window.open(base, "_blank", "noopener,noreferrer")
    } finally {
      setBusy(null)
    }
  }

  async function handleEmail() {
    setBusy("email")
    setEmailResult(null)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      setEmailResult(json.message || "E-posta işlemi tamamlandı.")
    } catch {
      setEmailResult("E-posta gönderilemedi. Lütfen tekrar deneyin.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="share-title" className="text-lg font-semibold text-foreground">
            Formu nasıl göndermek istiyorsunuz?
          </h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <ActionButton
            icon={<Mail className="size-5" />}
            label="E-POSTA"
            desc="Kurumsal adrese Excel eki ile gönder"
            loading={busy === "email"}
            onClick={handleEmail}
          />
          <ActionButton
            icon={<MessageCircle className="size-5" />}
            label="WHATSAPP"
            desc="Excel indirilir, WhatsApp paylaşımı açılır"
            loading={busy === "whatsapp"}
            onClick={handleWhatsapp}
          />
          <ActionButton
            icon={<Download className="size-5" />}
            label="EXCEL'İ İNDİR"
            desc="Doldurulmuş .xlsx dosyasını indir"
            loading={busy === "excel"}
            onClick={handleExcel}
          />
        </div>

        {emailResult && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{emailResult}</span>
          </div>
        )}

        <Button variant="outline" size="lg" className="mt-4 h-12 w-full text-base" onClick={onClose}>
          Kapat
        </Button>
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  desc,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted disabled:opacity-60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  )
}
