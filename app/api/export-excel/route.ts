import { NextResponse } from "next/server"
import JSZip from "jszip"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

const esc = (v: unknown) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

const fmtDate = (v: unknown) => {
  const s = String(v ?? "")
  const p = s.split("-")
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s
}

const check = (v: any) => v?.durum === "Uygun Değil"
  ? `□ Kontrol edildi\n■ Kontrol edilemedi\n${v.aciklama || ""}`
  : "■ Kontrol edildi\n□ Kontrol edilemedi"

function setCell(xml: string, address: string, value: unknown): string {
  const rowNo = address.match(/\d+/)?.[0]
  if (!rowNo) return xml
  const cell = `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`
  const cellRe = new RegExp(`<c\\s+[^>]*r="${address}"[^>]*(?:/>|>[\\s\\S]*?<\\/c>)`)
  if (cellRe.test(xml)) return xml.replace(cellRe, cell)
  const rowRe = new RegExp(`(<row\\s+[^>]*r="${rowNo}"[^>]*>)([\\s\\S]*?)(<\\/row>)`)
  if (rowRe.test(xml)) return xml.replace(rowRe, `$1$2${cell}$3`)
  return xml.replace("</sheetData>", `<row r="${rowNo}">${cell}</row></sheetData>`)
}

export async function POST(request: Request) {
  try {
    const { month = "aylik", records = [] } = await request.json()
    const template = await readFile(join(process.cwd(), "data", "arac-kullanim-sablon.xlsx"))
    const zip = await JSZip.loadAsync(template)
    const sheetPath = "xl/worksheets/sheet1.xml"
    const sheetFile = zip.file(sheetPath)
    if (!sheetFile) throw new Error("Excel şablon sayfası bulunamadı")
    let xml = await sheetFile.async("string")
    xml = setCell(xml, "C1", "GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ")

    ;(Array.isArray(records) ? records : []).slice(0, 175).forEach((r: any, i: number) => {
      const n = 12 + i
      const c = r.kontrol || {}
      const lighting = [c.gostergeler, c.ic_yan_aynalar, c.cam_temizligi_durumu, c.cam_suyu, c.far_isik, c.sinyal, c.aydinlatma_yangin_tupu]
      const lightingValue = lighting.find((x: any) => x?.durum === "Uygun Değil") || lighting.find(Boolean)
      const cells: Record<string, unknown> = {
        [`A${n}`]: r.sofor1,
        [`C${n}`]: fmtDate(r.tarih),
        [`E${n}`]: r.plaka,
        [`F${n}`]: check(c.kaporta_hasar),
        [`G${n}`]: check(c.lastik_basinci_hasar),
        [`H${n}`]: check(lightingValue),
        [`I${n}`]: r.yakitAlindi1 === "Evet" ? "Yakıt alındı" : "Yakıt alınmadı",
        [`J${n}`]: r.yakitAlindi1 === "Evet" ? fmtDate(r.yakitTarihi1) : "-",
        [`K${n}`]: r.guzergah1 || r.guzergah,
        [`L${n}`]: r.personeller1,
        [`M${n}`]: r.gidisKm1,
        [`N${n}`]: r.donusKm1,
        [`O${n}`]: `${r.cikisSaati1 || "-"} - ${r.donusSaati1 || "-"}`,
        [`Q${n}`]: r.imzaAdSoyad || r.kullaniciAdSoyad,
      }
      for (const [address, value] of Object.entries(cells)) xml = setCell(xml, address, value)
    })

    zip.file(sheetPath, xml)
    const output = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
    return new NextResponse(output, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${month}_GUNLUK_ARAC_KULLANIM_TAKIP_CIZELGESI.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Excel export error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Excel oluşturulamadı" }, { status: 500 })
  }
}
