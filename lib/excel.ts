import ExcelJS from "exceljs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "./form-config"
import type { FormData, KontrolMaddesi } from "./form-types"
import { CELL_COLUMNS, DATA_ROW, TEMPLATE_PATH, TEMPLATE_SHEET, cellAddress } from "./excel-mapping"
import { excelFileName } from "./excel-client"

export { excelFileName }

// -----------------------------------------------------------------------------
// Gerçek müşteri şablonu ("GÜNCEL GÜNLÜK ARAÇ KULLANIM FORMU.xlsx") temel alınır.
// Şablon; logo, başlık, tablo yapısı, renkler ve yazı formatları ile birlikte
// olduğu gibi korunur; sadece ilgili hücrelere form verileri yazılır.
//
// Alan <-> hücre eşleştirmesi lib/excel-mapping.ts içinde TEK YERDE tanımlıdır.
// Bu dosya yalnızca SUNUCU tarafında çalışır (dosya sistemi erişimi gerekir).
// -----------------------------------------------------------------------------

function fmtTarih(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function fmtKontrol(madde: KontrolMaddesi | undefined): string {
  if (!madde) return "Uygun"
  if (madde.durum === "Uygun Değil") {
    return madde.aciklama ? `Uygun Değil: ${madde.aciklama}` : "Uygun Değil"
  }
  return "Uygun"
}

// Farlar / Korna / Silecek / Cam tek bir şablon hücresinde birleştirilir (H sütunu).
function fmtFarKorna(data: FormData): string {
  const parcalar = [
    { id: "farlar", label: "Farlar" },
    { id: "korna", label: "Korna" },
    { id: "silecek", label: "Silecek" },
    { id: "camlar", label: "Cam" },
  ]
  return parcalar
    .map((p) => {
      const m = data.kontrol[p.id]
      const durum = m?.durum === "Uygun Değil" ? "Uygun Değil" : "Uygun"
      return `${p.label}: ${durum}`
    })
    .join("\n")
}

// KM başlangıç: 1. gidiş KM. Bitiş: en son dolu dönüş (yoksa en son gidiş).
function kmBaslangic(data: FormData): string {
  return data.gidisKm1 || ""
}
function kmBitis(data: FormData): string {
  return data.donusKm3 || data.gidisKm3 || data.donusKm2 || data.gidisKm2 || data.donusKm1 || ""
}

// Güzergah hücresi: açıklama + KM kırılımı + (varsa) eksik ekipman notu.
// Şablonda bunlar için ayrı hücre olmadığından tek metin olarak toplanır.
function guzergahMetni(data: FormData): string {
  const satirlar: string[] = []
  if (data.guzergah) satirlar.push(data.guzergah)

  const kmSatir: string[] = []
  if (data.gidisKm1 || data.donusKm1) kmSatir.push(`1) Gidiş ${data.gidisKm1 || "-"} / Dönüş ${data.donusKm1 || "-"}`)
  if (data.gidisKm2 || data.donusKm2) kmSatir.push(`2) Gidiş ${data.gidisKm2 || "-"} / Dönüş ${data.donusKm2 || "-"}`)
  if (data.gidisKm3 || data.donusKm3) kmSatir.push(`3) Gidiş ${data.gidisKm3 || "-"} / Dönüş ${data.donusKm3 || "-"}`)
  if (kmSatir.length) satirlar.push("KM: " + kmSatir.join("  |  "))

  const eksik = EQUIPMENT_ITEMS.filter((e) => !data.ekipman[e.id]).map((e) => e.label)
  if (eksik.length) satirlar.push("Eksik ekipman: " + eksik.join(", "))

  return satirlar.join("\n")
}

function personelMetni(data: FormData): string {
  return [data.sofor2, data.sofor3].filter(Boolean).join(", ")
}

function saatMetni(data: FormData): string {
  const cikis = data.cikisSaati || "-"
  const donus = data.donusSaati || "-"
  return `${cikis} - ${donus}`
}

// Sayısal KM değerini number'a çevir (boşsa metin bırakılmaz).
function setKm(cell: ExcelJS.Cell, val: string) {
  if (!val) return
  const n = Number(val)
  cell.value = Number.isFinite(n) ? n : val
}

/**
 * Şablonu yükler ve form verilerini eşleştirilmiş hücrelere yazar.
 * Sadece sunucu tarafında çalışır (fs erişimi).
 */
export async function buildWorkbook(data: FormData): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)

  const ws = wb.getWorksheet(TEMPLATE_SHEET)
  if (!ws) throw new Error(`Şablonda "${TEMPLATE_SHEET}" sayfası bulunamadı.`)

  // Şablonun özgün başlık, renk, yazı tipi, birleşik hücre ve sayfa ayarlarına dokunulmaz.
  // Sadece form verilerinin bulunduğu tablo hücreleri değiştirilir.

  // Excel şablonunun birleşik hücrelerini, stillerini ve sayfa düzenini bozmadan doldur.
  const trips = [
    [data.gidisKm1, data.donusKm1],
    [data.gidisKm2, data.donusKm2],
    [data.gidisKm3, data.donusKm3],
  ].filter(([a, b]) => a || b) as string[][]
  if (!trips.length) trips.push(["", ""])
  const formatCheck = (item: KontrolMaddesi | undefined) => item?.durum === "Uygun Değil"
    ? `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${item.aciklama || "Belirtilmedi"}`
    : "■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…..............."
  const farKorna = ["farlar", "korna", "silecek", "camlar"].map((key) => data.kontrol[key]).find((item) => item?.durum === "Uygun Değil")
  const route = data.guzergah || ""
  trips.forEach(([startKm, endKm], index) => {
    const row = DATA_ROW + index
    const set = (col: string, value: string | number) => { ws.getCell(`${col}${row}`).value = value }
    set(CELL_COLUMNS.surucu, data.sofor1 || "")
    set(CELL_COLUMNS.tarih, fmtTarih(data.tarih))
    set(CELL_COLUMNS.plaka, data.plaka || "")
    set(CELL_COLUMNS.kontrolCamKaporta, formatCheck(data.kontrol["cam_kaporta"]))
    set(CELL_COLUMNS.kontrolLastik, formatCheck(data.kontrol["lastikler"]))
    set(CELL_COLUMNS.kontrolFarKorna, formatCheck(farKorna))
    set(CELL_COLUMNS.yakitDurumu, data.yakitAlindi || "Hayır")
    set(CELL_COLUMNS.yakit, data.yakitAlindi === "Evet" ? fmtTarih(data.yakitTarihi) : "-")
    set(CELL_COLUMNS.guzergah, `${route}${trips.length > 1 ? `\n(${index + 1}. Sefer)` : ""}`)
    set(CELL_COLUMNS.personel, [data.sofor2, data.sofor3].filter(Boolean).join(", "))
    set(CELL_COLUMNS.kmBaslangic, startKm || "")
    set(CELL_COLUMNS.kmBitis, endKm || "")
    set(CELL_COLUMNS.saat, `${data.cikisSaati || "-"} - ${data.donusSaati || "-"}`)
  })
  void CHECKLIST_ITEMS

  return wb
}

// Şablonu doldurup Buffer döndürür (API route'larda kullanılır).
export async function buildExcelBuffer(data: FormData): Promise<Buffer> {
  const wb = await buildWorkbook(data)
  const arr = await wb.xlsx.writeBuffer()
  return Buffer.from(arr as ArrayBuffer)
}
