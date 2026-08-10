"use client"

import { useState } from "react"
import { Mail, MessageCircle, Download, X, Check, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { excelFileName } from "@/lib/excel-client"
import { generatePDF, pdfFileName } from "@/lib/pdf-client"
import { CORPORATE_WHATSAPP, CORPORATE_EMAIL, EQUIPMENT_ITEMS } from "@/lib/form-config"
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

// PDF doğrudan tarayıcıda oluşturulur; Vercel sunucusunda Python/LibreOffice gerekmez.
async function fetchTemplatePdf(data: FormData): Promise<Blob> {
  return generatePDF(data)
}

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
      const blob = await fetchTemplatePdf(data)
      const fileName = pdfFileName(data)
      const file = new File([blob], fileName, { type: "application/pdf" })

      // Eğer tarayıcı Web Share API (dosya paylaşımı) destekliyorsa doğrudan dosyayı paylaş
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Günlük Araç Kullanım Formu (PDF)",
            text: buildWhatsappText(data),
            files: [file],
          })
          setActionResult("PDF dosyası başarıyla paylaşıldı.")
          return
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Share error:", err)
          }
        }
      }

      // Desteklemiyorsa dosyayı indir ve WhatsApp web bağlantısını aç
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const text = encodeURIComponent(buildWhatsappText(data))
      const base = CORPORATE_WHATSAPP
        ? `https://wa.me/${CORPORATE_WHATSAPP}?text=${text}`
        : `https://wa.me/?text=${text}`
      window.open(base, "_blank", "noopener,noreferrer" )
      setActionResult("PDF dosyası indirildi. Açılan WhatsApp sohbetinde indirilen PDF dosyasını ek olarak gönderebilirsiniz.")
    } catch {
      setActionResult("WhatsApp paylaşımı sırasında bir hata oluştu.")
    } finally {
      setBusy(null)
    }
  }

  function buildEmailBody(data: FormData): string {
    const eksik = EQUIPMENT_ITEMS.filter((e) => !data.ekipman[e.id]).map((e) => e.label)
    
    return [
      "BİLGİÇEVRE GÜNLÜK ARAÇ KULLANIM FORMU",
      "------------------------------------------",
      `Tarih: ${fmtTarih(data.tarih)}`,
      `Plaka: ${data.plaka || "-"}`,
      `Lokasyon: ${data.lokasyon || "-"}`,
      `Şoför: ${data.sofor1 || "-"}`,
      `Diğer Personel: ${[data.sofor2, data.sofor3].filter(Boolean).join(", ") || "-"}`,
      `Taslak No: ${data.taslakNo}`,
      "",
      "ARAÇ KONTROL BİLGİLERİ:",
      `- Cam/Kaporta: ${data.kontrol["cam_kaporta"]?.durum || "Uygun"} ${data.kontrol["cam_kaporta"]?.aciklama ? `(${data.kontrol["cam_kaporta"].aciklama})` : ""}`,
      `- Lastikler: ${data.kontrol["lastikler"]?.durum || "Uygun"} ${data.kontrol["lastikler"]?.aciklama ? `(${data.kontrol["lastikler"].aciklama})` : ""}`,
      `- Farlar/Korna/Silecek/Cam: ${data.kontrol["farlar"]?.durum || "Uygun"}, ${data.kontrol["korna"]?.durum || "Uygun"}, ${data.kontrol["silecek"]?.durum || "Uygun"}, ${data.kontrol["camlar"]?.durum || "Uygun"}`,
      "",
      "KM VE GÜZERGAH:",
      `- Çıkış Saati: ${data.cikisSaati || "-"}`,
      `- Dönüş Saati: ${data.donusSaati || "-"}`,
      `- Başlangıç KM: ${data.gidisKm1 || "-"}`,
      `- Bitiş KM: ${data.donusKm3 || data.gidisKm3 || data.donusKm2 || data.gidisKm2 || data.donusKm1 || "-"}`,
      `- Güzergah: ${data.guzergah || "-"}`,
      `- Eksik Ekipman: ${eksik.length ? eksik.join(", ") : "Yok"}`,
      "",
      "YAKIT BİLGİSİ:",
      `- Yakıt Alındı mı?: ${data.yakitAlindi || "Hayır"}`,
      data.yakitAlindi === "Evet" ? `- Yakıt Tarihi: ${fmtTarih(data.yakitTarihi)}` : "",
      "",
      "İyi çalışmalar."
    ].filter(line => line !== "").join("\n")
  }

  async function handlePDF() {
    setBusy("pdf")
    setActionResult(null)
    try {
      const blob = await fetchTemplatePdf(data)
      const fileName = pdfFileName(data)
      const file = new File([blob], fileName, { type: "application/pdf" })

      // Paylaşım desteği varsa
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Günlük Araç Kullanım Formu (PDF)",
            text: "Günlük araç kullanım formu PDF formatında ekte yer almaktadır.",
            files: [file],
          })
          setActionResult("PDF dosyası başarıyla paylaşıldı.")
          return
        } catch (err) {
          if ((err as Error).name !== "AbortError") console.error("PDF Share error:", err)
        }
      }

      // Destek yoksa indir
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setActionResult("PDF dosyası indirildi.")
    } catch (err) {
      console.error(err)
      setActionResult("PDF oluşturulurken bir hata oluştu.")
    } finally {
      setBusy(null)
    }
  }

  async function handleEmail() {
    setBusy("email")
    setActionResult(null)
    try {
      // PDF'i oluştur ve indir (kullanıcıya kolaylık olsun diye)
      const pdfBlob = await fetchTemplatePdf(data)
      const pdfName = pdfFileName(data)
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = pdfName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

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
      
      const body = buildEmailBody(data)

      const mailtoUrl = `mailto:${CORPORATE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.location.href = mailtoUrl

      setActionResult(`PDF dosyası indirildi ve form verileriyle e-posta istemcisi açıldı. İndirilen PDF'i maile ekleyebilirsiniz.`)
    } catch {
      setActionResult("E-posta istemcisi açılırken veya dosya oluşturulurken bir hata oluştu.")
    } finally {
      setBusy(null)
    }
  }

  async function handleCopy() {
    setBusy("copy")
    try {
      const text = buildEmailBody(data)
      await navigator.clipboard.writeText(text)
      setActionResult("Form verileri metin olarak panoya kopyalandı.")
    } catch {
      setActionResult("Kopyalama sırasında bir hata oluştu.")
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
            label="E-POSTA İLE PAYLAŞ"
            desc="Formun PDF versiyonunu hazırlar ve e-posta istemcisini açar"
            loading={busy === "email"}
            onClick={handleEmail}
          />
          <ActionButton
            icon={<MessageCircle className="size-5" />}
            label="WHATSAPP İLE PAYLAŞ"
            desc="Formun PDF versiyonunu WhatsApp üzerinden paylaşır"
            loading={busy === "whatsapp"}
            onClick={handleWhatsapp}
          />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={<Download className="size-4" />}
              label="PDF KAYDET"
              desc="PDF olarak indir"
              loading={busy === "pdf"}
              onClick={handlePDF}
              compact
            />
            <ActionButton
              icon={<Download className="size-4" />}
              label="EXCEL KAYDET"
              desc="Excel olarak indir"
              loading={busy === "excel"}
              onClick={handleExcel}
              compact
            />
          </div>
          <ActionButton
            icon={<Copy className="size-5" />}
            label="FORM METNİNİ KOPYALA"
            desc="Tüm verileri metin olarak kopyala (Hızlı paylaşım için)"
            loading={busy === "copy"}
            onClick={handleCopy}
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
  compact = false,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  loading: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border border-border bg-background transition-colors hover:bg-muted disabled:opacity-60 ${compact ? "p-3" : "p-4"} text-left`}
    >
      <span className={`flex ${compact ? "size-9" : "size-11"} shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary`}>
        {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      </span>
      <span className="flex-1 overflow-hidden">
        <span className={`block ${compact ? "text-sm" : "text-base"} font-semibold text-foreground truncate`}>{label}</span>
        {!compact && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
    </button>
  )
}
