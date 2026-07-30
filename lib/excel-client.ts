import type { FormData } from "./form-types"

// İstemci + sunucu tarafında güvenle kullanılabilen saf yardımcılar
// (node:fs / exceljs gibi sunucu bağımlılıkları içermez).

export function excelFileName(data: FormData): string {
  const plaka = (data.plaka || "PLAKASIZ").replace(/\s+/g, "")
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  return `GUNLUK_ARAC_KULLANIM_${tarih}_${plaka}.xlsx`
}
