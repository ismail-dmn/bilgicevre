import type { FormData } from "./form-types"

// "Tamamlandı" durumunda zorunlu alanları doğrular.
// Taslak durumunda hiçbir alan zorunlu değildir.
export function validateForm(data: FormData): string[] {
  const errors: string[] = []
  if (data.durum !== "Tamamlandı") return errors

  if (!data.lokasyon) errors.push("Lokasyon (Bölge) seçimi zorunludur.")
  if (!data.tarih) errors.push("Tarih alanı zorunludur.")
  if (!data.plaka) errors.push("Araç / Plaka seçimi zorunludur.")
  if (!data.sofor1) errors.push("Şoför 1 seçimi zorunludur.")
  if (!data.gidisKm1) errors.push("1. Gidiş KM alanı zorunludur.")
  if (!data.donusKm1) errors.push("1. Dönüş KM alanı zorunludur.")
  // Saatler artık her sefer için ayrı tutuluyor. Tamamlanan kayıtta ilk seferin
  // yeni alanlarını kontrol ediyoruz; eski ortak alanlar yalnızca geriye dönük uyumluluk içindir.
  if (!data.cikisSaati1 && !data.cikisSaati) errors.push("1. sefer çıkış saati zorunludur.")
  if (!data.donusSaati1 && !data.donusSaati) errors.push("1. sefer dönüş saati zorunludur.")

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
