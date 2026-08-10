import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import type { FormData } from "./form-types"
import { ROBOTO_REGULAR_B64 } from "./font-data"

function fmtTarih(iso: string): string {
  if (!iso) return ""
  const [year, month, day] = iso.split("-")
  return year && month && day ? `${day}.${month}.${year}` : iso
}

function toBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function fuelText(level: number): string {
  const safe = Math.max(0, Math.min(4, Number(level || 0)))
  if (!safe) return ""
  const label = safe === 1 ? "¼" : safe === 2 ? "½" : safe === 3 ? "¾" : "1"
  return `${Array.from({ length: 4 }, (_, index) => index < safe ? "■" : "□").join("│")}\n${label}`
}

function drawCell(page: any, font: any, text: string, x: number, top: number, width: number, height: number, size = 6.2) {
  if (!text) return
  const lines = String(text).split("\n")
  const lineHeight = size + 1
  const startY = page.getHeight() - top - size - Math.max(0, (height - lines.length * lineHeight) / 2)
  lines.slice(0, 3).forEach((line, index) => {
    const value = line.length > 34 ? `${line.slice(0, 33)}…` : line
    page.drawText(value, { x: x + 2, y: startY - index * lineHeight, size, font, color: rgb(0, 0, 0), maxWidth: width - 4 })
  })
}

export async function generatePDF(data: FormData): Promise<Blob> {
  const response = await fetch("/data/sablon.pdf", { cache: "no-store" })
  if (!response.ok) throw new Error("PDF şablonu yüklenemedi.")
  const source = await response.arrayBuffer()
  const pdf = await PDFDocument.load(source)
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(toBytes(ROBOTO_REGULAR_B64), { subset: true })
  const page = pdf.getPages()[0]
  // Şablonun başlık, talimatlar ve üst bilgi alanları korunur. Bu alanların
  // üzerine beyaz katman çizmek tablo başlıklarını bozabildiği için veri yalnızca
  // boş tablo hücrelerine yazılır.

  const trips = [
    { driver: data.sofor1, route: data.guzergah1 || data.guzergah, staff: data.personeller1, start: data.gidisKm1, end: data.donusKm1, from: data.cikisSaati1 || data.cikisSaati, to: data.donusSaati1 || data.donusSaati, fuel: data.yakitSeviyesi1, fuelDate: data.yakitTarihi1 },
    { driver: data.sofor2, route: data.guzergah2, staff: data.personeller2, start: data.gidisKm2, end: data.donusKm2, from: data.cikisSaati2, to: data.donusSaati2, fuel: data.yakitSeviyesi2, fuelDate: data.yakitTarihi2 },
    { driver: data.sofor3, route: data.guzergah3, staff: data.personeller3, start: data.gidisKm3, end: data.donusKm3, from: data.cikisSaati3, to: data.donusSaati3, fuel: data.yakitSeviyesi3, fuelDate: data.yakitTarihi3 },
  ]

  // PDF koordinatları şablonun gerçek satır aralıklarından ölçüldü.
  // İlk boş veri satırı yaklaşık 140.8 pt, sonraki satırlar 21.2 pt aralıkla başlar.
  const rowTop = 137
  const rowHeight = 21.2
  trips.forEach((trip, index) => {
    const top = rowTop + index * rowHeight
    // Şablonun zemin renkleri, çizgileri ve kontrol kutuları aynen korunur.
    drawCell(page, font, trip.driver || "", 18, top, 49, rowHeight)
    drawCell(page, font, fmtTarih(data.tarih), 67, top, 29, rowHeight)
    drawCell(page, font, data.plaka || "", 96, top, 25, rowHeight)
    drawCell(page, font, fuelText(trip.fuel), 238, top, 28, rowHeight, 5.5)
    drawCell(page, font, trip.fuel ? fmtTarih(trip.fuelDate || "") : "-", 266, top, 29, rowHeight, 5.5)
    drawCell(page, font, trip.route || "", 295, top, 83, rowHeight, 5.7)
    drawCell(page, font, trip.staff || "", 378, top, 32, rowHeight, 5.5)
    drawCell(page, font, trip.start || "", 410, top, 25, rowHeight, 6)
    drawCell(page, font, trip.end || "", 435, top, 25, rowHeight, 6)
    drawCell(page, font, `${trip.from || "-"} - ${trip.to || "-"}`, 460, top, 31, rowHeight, 5.5)
  })

  const bytes = await pdf.save()
  return new Blob([bytes], { type: "application/pdf" })
}

export function pdfFileName(data: FormData): string {
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  const plaka = (data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")
  return `Gunluk_Arac_Kullanim_Takip_Cizelgesi_${tarih}_${plaka}.pdf`
}
