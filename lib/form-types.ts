import { CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "./form-config"

export type FormDurum = "Taslak" | "Tamamlandı"

export type KontrolDurum = "Uygun" | "Uygun Değil"

export interface KontrolMaddesi {
  durum: KontrolDurum
  aciklama: string
}

export interface FormData {
  taslakNo: string
  durum: FormDurum

  // Araç bilgileri
  lokasyon: string // "Tekirdağ" veya "İstanbul"
  tarih: string // YYYY-MM-DD
  plaka: string
  sofor1: string
  sofor2: string
  sofor3: string

  // Güzergah ve KM
  gidisKm1: string
  donusKm1: string
  gidisKm2: string
  donusKm2: string
  gidisKm3: string
  donusKm3: string
  guzergah: string

  // Saatler
  cikisSaati: string
  donusSaati: string

  // Yakıt
  yakitAlindi: "Evet" | "Hayır"
  yakitTarihi: string

  // Kontrol listesi + ekipman
  kontrol: Record<string, KontrolMaddesi>
  ekipman: Record<string, boolean>
}

export function createEmptyForm(taslakNo: string): FormData {
  const bugun = new Date().toISOString().slice(0, 10)

  const kontrol: Record<string, KontrolMaddesi> = {}
  for (const item of CHECKLIST_ITEMS) {
    kontrol[item.id] = { durum: "Uygun", aciklama: "" }
  }

  const ekipman: Record<string, boolean> = {}
  for (const item of EQUIPMENT_ITEMS) {
    ekipman[item.id] = false
  }

  return {
    taslakNo,
    durum: "Taslak",
    lokasyon: "",
    tarih: bugun,
    plaka: "",
    sofor1: "",
    sofor2: "",
    sofor3: "",
    gidisKm1: "",
    donusKm1: "",
    gidisKm2: "",
    donusKm2: "",
    gidisKm3: "",
    donusKm3: "",
    guzergah: "",
    cikisSaati: "",
    donusSaati: "",
    yakitAlindi: "Hayır",
    yakitTarihi: "",
    kontrol,
    ekipman,
  }
}

// Taslak numarası üret: ARAC-YYYYMMDD-XXX
export function generateTaslakNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const datePart = `${y}${m}${d}`

  // Aynı gün içindeki sıra numarasını localStorage üzerinden takip et
  let seq = 1
  if (typeof window !== "undefined") {
    const key = `bilgicevre_seq_${datePart}`
    const current = Number.parseInt(window.localStorage.getItem(key) || "0", 10)
    seq = current + 1
    window.localStorage.setItem(key, String(seq))
  }
  return `ARAC-${datePart}-${String(seq).padStart(3, "0")}`
}
