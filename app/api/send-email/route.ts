import { NextResponse } from "next/server"
import { buildExcelBuffer, excelFileName } from "@/lib/excel"
import { CORPORATE_EMAIL } from "@/lib/form-config"
import type { FormData } from "@/lib/form-types"

function fmtTarih(iso: string): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

const AY_ISIMLERI: Record<string, string> = {
  "01": "OCAK",
  "02": "ŞUBAT",
  "03": "MART",
  "04": "NİSAN",
  "05": "MAYIS",
  "06": "HAZİRAN",
  "07": "TEMMUZ",
  "08": "AĞUSTOS",
  "09": "EYLÜL",
  "10": "EKİM",
  "11": "KASIM",
  "12": "ARALIK",
}

export async function POST(request: Request) {
  const data = (await request.json()) as FormData

  // Excel dosyasını gerçek şablondan sunucu tarafında oluştur (merkezi mapping).
  const buffer = await buildExcelBuffer(data)
  const fileName = excelFileName(data)

  const tarihStr = data.tarih || new Date().toISOString().slice(0, 10)
  const [yil, ayNum] = tarihStr.split("-")
  const ayIsmi = AY_ISIMLERI[ayNum] || "AY"
  const lokasyonStr = data.lokasyon ? data.lokasyon.toUpperCase() : "İSTANBUL"
  const subject = `${lokasyonStr}-${yil}-${ayIsmi} AYI GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ`.toUpperCase()

  console.log("[v0] Mock e-posta gönderimi:", {
    to: CORPORATE_EMAIL,
    subject,
    attachment: fileName,
    boyutKB: Math.round(buffer.byteLength / 1024),
  })

  return NextResponse.json({
    ok: true,
    message: `E-posta başarıyla ${CORPORATE_EMAIL} adresine "${subject}" konu başlığı ve "${fileName}" ekiyle gönderildi (demo modu).`,
  })
}
