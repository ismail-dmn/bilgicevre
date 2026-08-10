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

function fitLine(font: any, text: string, width: number, size: number): string {
  let value = text.trim()
  while (value && font.widthOfTextAtSize(value, size) > width) {
    value = value.slice(0, -1).trimEnd()
  }
  return value
}

function drawCell(page: any, font: any, text: string, x: number, top: number, width: number, height: number, size = 6.2) {
  if (!text) return
  const lines = String(text).split("\n").slice(0, 2)
  const lineHeight = size + 1
  const startY = page.getHeight() - top - size - Math.max(0, (height - lines.length * lineHeight) / 2)
  lines.forEach((line, index) => {
    const value = fitLine(font, line, width - 4, size)
    if (!value) return
    page.drawText(value, { x: x + 2, y: startY - index * lineHeight, size, font, color: rgb(0, 0, 0) })
  })
}

function plateLines(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return parts.length >= 3 ? `${parts.slice(0, 2).join(" ")}\n${parts.slice(2).join(" ")}` : value
}

function drawFuelCell(page: any, font: any, level: number, top: number, height: number, shaded: boolean) {
  const safe = Math.max(0, Math.min(4, Number(level || 0)))
  page.drawRectangle({ x: 224, y: page.getHeight() - top - height + 1, width: 39, height: height - 2, color: shaded ? rgb(0.91, 0.96, 0.89) : rgb(1, 1, 1) })
  const boxY = page.getHeight() - top - 9
  for (let index = 0; index < 4; index += 1) {
    page.drawRectangle({ x: 226 + index * 8.4, y: boxY, width: 6.2, height: 4.2, borderColor: rgb(0.15, 0.15, 0.15), borderWidth: 0.45, color: index < safe ? rgb(0, 0, 0) : undefined })
  }
  if (safe > 0) {
    const label = safe === 1 ? "¼" : safe === 2 ? "½" : safe === 3 ? "¾" : "1"
    page.drawText(label, { x: 241, y: page.getHeight() - top - 17, size: 5.2, font, color: rgb(0, 0, 0) })
  }
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
    drawCell(page, font, fmtTarih(data.tarih), 68, top, 27, rowHeight, 4.0)
    drawCell(page, font, plateLines(data.plaka || ""), 96, top, 25, rowHeight, 5.2)
    // Şablondaki yakıt kutuları yazı karakterine bağlı kalmadan vektörel çizilir.
    drawFuelCell(page, font, trip.fuel, top, rowHeight, index % 2 === 1)
    drawCell(page, font, trip.fuel ? fmtTarih(trip.fuelDate || "") : "-", 263, top, 29, rowHeight, 5.2)
    drawCell(page, font, trip.route || "", 292, top, 62, rowHeight, 5.4)
    drawCell(page, font, trip.staff || "", 355, top, 53, rowHeight, 5.2)
    drawCell(page, font, trip.start || "", 410, top, 23, rowHeight, 5.4)
    drawCell(page, font, trip.end || "", 433, top, 23, rowHeight, 5.4)
    drawCell(page, font, `${trip.from || "-"} - ${trip.to || "-"}`, 456, top, 34, rowHeight, 5.1)
  })

  const bytes = await pdf.save()
  return new Blob([bytes], { type: "application/pdf" })
}

export function pdfFileName(data: FormData): string {
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  const plaka = (data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")
  return `Gunluk_Arac_Kullanim_Takip_Cizelgesi_${tarih}_${plaka}.pdf`
}
