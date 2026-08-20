import { NextResponse } from "next/server"
import JSZip from "jszip"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

const fmtDate = (value: unknown) => {
  const parts = String(value ?? "").split("-")
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : String(value ?? "")
}

const checkText = (item: any) => item?.durum === "Uygun Değil"
  ? `□ Kontrol Edildi.\n■ Uygun değil.\n■ Diğer: ${item.aciklama || "Belirtilmedi"}`
  : "■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…..............."

function setExistingCell(xml: string, address: string, value: unknown): string {
  const selfClosing = new RegExp(`<c\\s+([^>]*\\br="${address}"[^>]*)\\s*\/>`)
  const normal = new RegExp(`<c\\s+([^>]*\\br="${address}"[^>]*)>([\\s\\S]*?)<\\/c>`)
  const match = xml.match(selfClosing) || xml.match(normal)
  if (!match) throw new Error(`Şablonda ${address} hücresi bulunamadı`)
  const attrs = match[1].replace(/\s+t="[^"]*"/g, "").trim()
  const replacement = `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
  return selfClosing.test(xml) ? xml.replace(selfClosing, replacement) : xml.replace(normal, replacement)
}

export async function POST(request: Request) {
  try {
    const { month = "aylik", records = [] } = await request.json()
    const template = await readFile(join(process.cwd(), "data", "arac-kullanim-sablon.xlsx"))
    const zip = await JSZip.loadAsync(template)
    const sheetPath = "xl/worksheets/sheet1.xml"
    const sheetFile = zip.file(sheetPath)
    if (!sheetFile) throw new Error("Excel şablonundaki ÇİZELGE sayfası bulunamadı")
    let xml = await sheetFile.async("string")
    xml = setExistingCell(xml, "C1", "GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ")

    ;(Array.isArray(records) ? records : []).slice(0, 175).forEach((record: any, index: number) => {
      const row = 12 + index
      const kontrol = record.kontrol || {}
      const combined = [kontrol.gostergeler, kontrol.ic_yan_aynalar, kontrol.cam_temizligi_durumu, kontrol.cam_suyu, kontrol.far_isik, kontrol.sinyal, kontrol.aydinlatma_yangin_tupu]
      const combinedValue = combined.find((x: any) => x?.durum === "Uygun Değil") || combined.find(Boolean)
      const values: Record<string, unknown> = {
        [`A${row}`]: record.sofor1 || "", [`C${row}`]: fmtDate(record.tarih), [`E${row}`]: record.plaka || "",
        [`F${row}`]: checkText(kontrol.kaporta_hasar), [`G${row}`]: checkText(kontrol.lastik_basinci_hasar), [`H${row}`]: checkText(combinedValue),
        [`I${row}`]: record.yakitAlindi1 === "Evet" ? "Evet" : "Hayır", [`J${row}`]: record.yakitAlindi1 === "Evet" ? fmtDate(record.yakitTarihi1) : "-",
        [`K${row}`]: record.guzergah1 || record.guzergah || "", [`L${row}`]: record.personeller1 || "", [`M${row}`]: record.gidisKm1 || "",
        [`N${row}`]: record.donusKm1 || "", [`O${row}`]: `${record.cikisSaati1 || "-"} - ${record.donusSaati1 || "-"}`,
        [`Q${row}`]: record.imzaAdSoyad || record.kullaniciAdSoyad || "",
      }
      for (const [address, value] of Object.entries(values)) xml = setExistingCell(xml, address, value)
    })

    zip.file(sheetPath, xml)
    const output = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
    return new NextResponse(output, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${month}_GUNLUK_ARAC_KULLANIM_TAKIP_CIZELGESI.xlsx"`, "Cache-Control": "no-store",
    }})
  } catch (error) {
    console.error("Excel export error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Excel oluşturulamadı" }, { status: 500 })
  }
}
