import type { FormData } from "./form-types"

// "Tamamlandı" durumunda zorunlu alanları doğrular.
// Taslak durumunda hiçbir alan zorunlu değildir.
export function validateForm(data: FormData): string[] {
  const errors: string[] = []
  if (data.durum !== "Tamamlandı") return errors

  if (!data.tarih) errors.push("Tarih alanı zorunludur.")
  if (!data.plaka) errors.push("Araç / Plaka seçimi zorunludur.")
  if (!data.sofor1) errors.push("Şoför 1 seçimi zorunludur.")
  if (!data.gidisKm1) errors.push("1. Gidiş KM alanı zorunludur.")
  if (!data.donusKm1) errors.push("1. Dönüş KM alanı zorunludur.")
  if (!data.cikisSaati) errors.push("Çıkış saati zorunludur.")
  if (!data.donusSaati) errors.push("Dönüş saati zorunludur.")

  // Araç kontrolü: "Uygun Değil" seçilen maddelerde açıklama zorunlu
  for (const [, madde] of Object.entries(data.kontrol)) {
    if (madde.durum === "Uygun Değil" && !madde.aciklama.trim()) {
      errors.push("Uygun olmayan kontrol maddeleri için açıklama giriniz.")
      break
    }
  }

  // En az bir ekipman işaretlenmiş olmalı
  const ekipmanSecili = Object.values(data.ekipman).some(Boolean)
  if (!ekipmanSecili) {
    errors.push("Araç ekipman kontrolünde en az bir madde işaretlenmelidir.")
  }

  if (data.yakitAlindi === "Evet" && !data.yakitTarihi) {
    errors.push("Yakıt alındıysa yakıt tarihi zorunludur.")
  }

  return errors
}
