"use client"

import { useState } from "react"
import { Mail, MessageCircle, Download, X, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excelFileName } from "@/lib/excel-client"
import { CORPORATE_WHATSAPP, CORPORATE_EMAIL } from "@/lib/form-config"
import type { FormData } from "@/lib/form-types"

// Sunucudan doldurulmuş şablonu Excel Blob olarak al
async function fetchExcelBlob(data: FormData): Promise<Blob> {
  const res = await fetch("/api/export-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Excel oluşturulamadı.")
  return await res.blob()
}

// Excel dosyasını cihaza indir
async function downloadExcel(data: FormData): Promise<void> {
  const blob = await fetchExcelBlob(data)
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
  const parts = iso.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y}`
  }
  return iso
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
    "Günlük araç kullanım formu ekte yer almaktadır.",
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
  const [actionResult, setActionResult] = useState<string | null>(null)

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
    setActionResult(null)
    try {
      const blob = await fetchExcelBlob(data)
      const fileName = excelFileName(data)
      const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

      // Eğer tarayıcı Web Share API (dosya paylaşımı) destekliyorsa doğrudan dosyayı paylaş
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Günlük Araç Kullanım Formu",
            text: buildWhatsappText(data),
            files: [file],
          })
          setActionResult("Excel dosyası ve form bilgileri başarıyla paylaşıldı.")
          return
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Share error:", err)
          }
        }
      }

      // Desteklemiyorsa dosyayı indir ve WhatsApp web bağlantısını aç
      await downloadExcel(data)
      const text = encodeURIComponent(buildWhatsappText(data))
      const base = CORPORATE_WHATSAPP
        ? `https://wa.me/${CORPORATE_WHATSAPP}?text=${text}`
        : `https://wa.me/?text=${text}`
      window.open(base, "_blank", "noopener,noreferrer" )
      setActionResult("Excel dosyası indirildi. Açılan WhatsApp sohbetinde indirilen Excel dosyasını ek olarak gönderebilirsiniz.")
    } catch {
      setActionResult("WhatsApp paylaşımı sırasında bir hata oluştu.")
    } finally {
      setBusy(null)
    }
  }

  async function handleEmail() {
    setBusy("email")
    setActionResult(null)
    try {
      await downloadExcel(data)

      const tarihStr = data.tarih || new Date().toISOString().slice(0, 10)
      const parts = tarihStr.split("-")
      const yil = parts[0] || "2026"
      const ayNum = parts[1] || "06"
      
      const AY_ISIMLERI: Record<string, string> = {
        "01": "OCAK", "02": "ŞUBAT", "03": "MART", "04": "NİSAN",
        "05": "MAYIS", "06": "HAZİRAN", "07": "TEMMUZ", "08": "AĞUSTOS",
        "09": "EYLÜL", "10": "EKİM", "11": "KASIM", "12": "ARALIK",
      }
      const ayIsmi = AY_ISIMLERI[ayNum] || "AY"
      const lokasyonStr = data.lokasyon ? data.lokasyon.toUpperCase() : "İSTANBUL"
      const subject = `${lokasyonStr}-${yil}-${ayIsmi} AYI GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ`.toUpperCase()
      const fileName = excelFileName(data)
      
      const body = [
        "Merhaba,",
        "",
        `Ekte ${fmtTarih(data.tarih)} tarihli ve ${data.plaka || "-"} plakalı araca ait Günlük Araç Kullanım Formu (${fileName}) yer almaktadır.`,
        "",
        `Lokasyon: ${data.lokasyon || "-"}`,
        `Şoför: ${data.sofor1 || "-"}`,
        `Taslak No: ${data.taslakNo}`,
        "",
        "İyi çalışmalar."
      ].join("\n")

      const mailtoUrl = `mailto:${CORPORATE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = mailtoUrl

      setActionResult(`Excel dosyası indirildi ve ${CORPORATE_EMAIL} adresine yönelik e-posta istemcisi açıldı. İndirilen Excel dosyasını maile ekleyebilirsiniz.`)
    } catch {
      setActionResult("E-posta istemcisi açılırken veya dosya indirilirken bir hata oluştu.")
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
            desc="Excel'i indirir ve mailto ile e-posta istemcisini açar"
            loading={busy === "email"}
            onClick={handleEmail}
          />
          <ActionButton
            icon={<MessageCircle className="size-5" />}
            label="WHATSAPP"
            desc="Excel dosyasını direkt paylaşır veya indirip WhatsApp'ı açar"
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

        {actionResult && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{actionResult}</span>
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
