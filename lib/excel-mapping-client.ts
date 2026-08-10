import type { FormData } from "./form-types"

export const DATA_ROW = 12
export const CELL_COLUMNS = {
  surucu: "A",
  tarih: "C",
  plaka: "E",
  kontrolCamKaporta: "F",
  kontrolLastik: "G",
  kontrolFarKorna: "H",
  yakitDurumu: "I",
  yakit: "J",
  guzergah: "K",
  personel: "L",
  kmBaslangic: "M",
  kmBitis: "N",
  saat: "O",
  imza: "Q",
} as const

const cellAddress = (col: string, row: number) => `${col}${row}`
// Şablonda üç sefer için ayrılmış gerçek veri satırları: 12, 13 ve 14.
// 15. satırdan sonrası sabit kontrol/şablon içeriğidir ve silinmemelidir.
const DATA_END_ROW = DATA_ROW + 2

function clearPreviousEntries(worksheet: any): void {
  // Şablondaki örnek/eski kullanıcı kayıtlarını sil; hücre biçimleri korunur.
  for (let row = DATA_ROW; row <= DATA_END_ROW; row += 1) {
    for (const column of Object.values(CELL_COLUMNS)) {
      worksheet.getCell(cellAddress(column, row)).value = ""
    }
  }
}

function fmtTarih(iso: string): string {
  if (!iso) return ""
  const parts = iso.split("-")
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : iso
}

function formatCheck(item: { durum?: string; aciklama?: string } | undefined): string {
  if (item?.durum === "Uygun Değil") {
    return `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${item.aciklama || "Belirtilmedi"}`
  }
  return "■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…..............."
}

export function mapFormDataToExcelClient(worksheet: any, formData: FormData): void {
  clearPreviousEntries(worksheet)
  const tarihStr = formData.tarih || new Date().toISOString().slice(0, 10)
  const [yil, ayNum] = tarihStr.split("-")
  const aylar: Record<string, string> = {
    "01": "OCAK", "02": "ŞUBAT", "03": "MART", "04": "NİSAN",
    "05": "MAYIS", "06": "HAZİRAN", "07": "TEMMUZ", "08": "AĞUSTOS",
    "09": "EYLÜL", "10": "EKİM", "11": "KASIM", "12": "ARALIK",
  }
  if (yil && ayNum) worksheet.getCell("C1").value = `${yil}-${aylar[ayNum] || "AY"} AYI GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ`

  const kontrol = formData.kontrol || {}
  const cam = formatCheck(kontrol.cam_kaporta || kontrol.camKaporta)
  const lastik = formatCheck(kontrol.lastikler || kontrol.lastik)
  const uygunsuz = ["farlar", "korna", "silecek", "camlar"].filter((key) => kontrol[key]?.durum === "Uygun Değil")
  const farKorna = formatCheck(uygunsuz.length ? {
    durum: "Uygun Değil",
    aciklama: uygunsuz.map((key) => kontrol[key]?.aciklama).filter(Boolean).join(", "),
  } : { durum: "Uygun" })

  const defaultPersoneller = [formData.sofor2, formData.sofor3].filter(Boolean).join(", ")
  const trips = [
    { gidis: formData.gidisKm1, donus: formData.donusKm1, guzergah: formData.guzergah1 || formData.guzergah, personeller: formData.personeller1 || defaultPersoneller },
    { gidis: formData.gidisKm2, donus: formData.donusKm2, guzergah: formData.guzergah2, personeller: formData.personeller2 || defaultPersoneller },
    { gidis: formData.gidisKm3, donus: formData.donusKm3, guzergah: formData.guzergah3, personeller: formData.personeller3 || defaultPersoneller },
  ].filter((trip) => trip.gidis || trip.donus || trip.guzergah || trip.personeller)
  if (!trips.length) trips.push({ gidis: "", donus: "", guzergah: "", personeller: "" })

  const saat = `${formData.cikisSaati || "-"} - ${formData.donusSaati || "-"}`
  trips.forEach(({ gidis, donus, guzergah, personeller }, index) => {
    const row = DATA_ROW + index
    worksheet.getCell(cellAddress(CELL_COLUMNS.surucu, row)).value = formData.sofor1 || ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.plaka, row)).value = formData.plaka || ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.tarih, row)).value = fmtTarih(formData.tarih) || ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolCamKaporta, row)).value = cam
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolLastik, row)).value = lastik
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolFarKorna, row)).value = farKorna
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakitDurumu, row)).value = formData.yakitAlindi || ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakit, row)).value = formData.yakitAlindi === "Evet" ? fmtTarih(formData.yakitTarihi) : "-"
    worksheet.getCell(cellAddress(CELL_COLUMNS.guzergah, row)).value = `${guzergah || ""}${trips.length > 1 ? `\n(${index + 1}. Sefer)` : ""}`
    worksheet.getCell(cellAddress(CELL_COLUMNS.personel, row)).value = personeller || ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.kmBaslangic, row)).value = gidis ? Number(gidis) || gidis : ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.kmBitis, row)).value = donus ? Number(donus) || donus : ""
    worksheet.getCell(cellAddress(CELL_COLUMNS.saat, row)).value = saat
  })
}
