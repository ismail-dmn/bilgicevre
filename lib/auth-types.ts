export type YetkiliKullanici = {
  uid: string
  email: string
  adSoyad: string
  rol: "yonetici" | "personel"
  aktif: boolean
  photoURL?: string | null
}
