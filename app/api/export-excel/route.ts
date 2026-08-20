import { NextResponse } from "next/server"
import ExcelJS from "exceljs"

const trMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const records = Array.isArray(body.records) ? body.records : []
    const month = String(body.month || new Date().toISOString().slice(0, 7))
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "BİLGİÇEVRE"
    const ws = workbook.addWorksheet("AYLIK ÇİZELGE", { views: [{ state: "frozen", ySplit: 3 }] })
    ws.mergeCells("A1:R1")
    ws.getCell("A1").value = "GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ"
    ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } }
    ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" }
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } }
    ws.getRow(1).height = 28
    ws.mergeCells("A2:R2")
    ws.getCell("A2").value = trMonth.format(new Date(`${month}-01T12:00:00+03:00`)).toLocaleUpperCase("tr-TR")
    ws.getCell("A2").alignment = { horizontal: "center" }
    ws.getCell("A2").font = { bold: true }
    const headers = ["Tarih", "Lokasyon", "Plaka", "Şoför", "Çıkış", "Dönüş", "Başlangıç KM", "Bitiş KM", "Güzergah", "Personeller", "Yakıt", "Yakıt Seviyesi", "Yakıt Tarihi", "Kontrol Notları", "Ekipman", "İmza Ad Soyad", "Cihaz Kimliği", "Kayıt Zamanı"]
    ws.addRow(headers)
    const header = ws.getRow(3)
    header.font = { bold: true, color: { argb: "FFFFFFFF" } }
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } }
    header.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    for (const r of records) {
      const kontrol = Object.values(r.kontrol || {}).filter((x: any) => x.durum === "Uygun Değil").map((x: any) => x.aciklama || "Uygun Değil").join("; ")
      const ekipman = Object.entries(r.ekipman || {}).filter(([, v]) => v).map(([k]) => k).join(", ")
      ws.addRow([r.tarih, r.lokasyon, r.plaka, r.sofor1, r.cikisSaati1 || r.cikisSaati, r.donusSaati1 || r.donusSaati, Number(r.gidisKm1) || r.gidisKm1, Number(r.donusKm1) || r.donusKm1, r.guzergah1 || r.guzergah, r.personeller1, r.yakitAlindi1 || r.yakitAlindi, r.yakitSeviyesi1 || r.yakitSeviyesi, r.yakitTarihi1 || r.yakitTarihi, kontrol, ekipman, r.imzaAdSoyad, r.deviceId, r.kaydedildiAt])
    }
    ws.columns = [{ width: 13 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 28 }, { width: 28 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 30 }, { width: 24 }, { width: 24 }, { width: 38 }, { width: 24 }]
    ws.eachRow((row, n) => { if (n >= 3) { row.eachCell((cell) => { cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; cell.alignment = { vertical: "top", wrapText: true } }) } })
    ws.autoFilter = { from: "A3", to: "R3" }
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Arac_Kullanim_Aylik_${month}.xlsx"` } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Excel oluşturulamadı." }, { status: 500 })
  }
}
