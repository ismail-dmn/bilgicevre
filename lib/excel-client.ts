import type { FormData } from "./form-types"

// İstemci + sunucu tarafında güvenle kullanılabilen saf yardımcılar
// (node:fs / exceljs gibi sunucu bağımlılıkları içermez).

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

export function excelFileName(data: FormData): string {
  const tarihStr = data.tarih || new Date().toISOString().slice(0, 10)
  const [yil, ayNum] = tarihStr.split("-")
  const ayIsmi = AY_ISIMLERI[ayNum] || "AY"
  const lokasyonPrefix = data.lokasyon ? `${data.lokasyon.toLowerCase()}-` : ""
  return `${lokasyonPrefix}${yil}-${ayIsmi}_AYI_GUNLUK_ARAC_KULLANIM_TAKIP_CIZELGESI.xlsx`
}
