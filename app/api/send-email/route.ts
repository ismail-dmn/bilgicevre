import { NextResponse } from "next/server"
import { buildExcelBuffer, excelFileName } from "@/lib/excel"
import { CORPORATE_EMAIL } from "@/lib/form-config"
import type { FormData } from "@/lib/form-types"

function fmtTarih(iso: string): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

export async function POST(request: Request) {
  const data = (await request.json()) as FormData

  // Excel dosyasını gerçek şablondan sunucu tarafında oluştur (merkezi mapping).
  const buffer = await buildExcelBuffer(data)
  const fileName = excelFileName(data)

  const subject = `Günlük Araç Kullanım Formu - ${fmtTarih(data.tarih)} - ${data.plaka || "-"}`

  // ---------------------------------------------------------------------
  // DEMO / MOCK GÖNDERİM
  // Gerçek SMTP veya Resend bilgileri verildiğinde aşağıdaki blok
  // gerçek gönderim ile değiştirilebilir. Örneğin Resend ile:
  //
  //   const resend = new Resend(process.env.RESEND_API_KEY)
  //   await resend.emails.send({
  //     from: "filo@bilgicevre.com",
  //     to: CORPORATE_EMAIL,
  //     subject,
  //     text: "Günlük araç kullanım formu ektedir.",
  //     attachments: [{ filename: fileName, content: Buffer.from(buffer) }],
  //   })
  // ---------------------------------------------------------------------

  console.log("[v0] Mock e-posta gönderimi:", {
    to: CORPORATE_EMAIL,
    subject,
    attachment: fileName,
    boyutKB: Math.round(buffer.byteLength / 1024),
  })

  return NextResponse.json({
    ok: true,
    message: `E-posta ${CORPORATE_EMAIL} adresine gönderilmek üzere hazırlandı (demo modu). "${fileName}" dosyası eklendi.`,
  })
}
