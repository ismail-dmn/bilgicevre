// Merkezi konfigürasyon: araçlar, şoförler, kontrol listesi, ekipmanlar ve kurallar.
// Bu veriler ileride kolayca veritabanından yönetilebilir hale getirilebilir.

export const VEHICLES = ["34 KNR 404", "34 SJ 8172", "34 NLB 100", "34 KNG 868"] as const

export const LOCATIONS = ["Tekirdağ", "İstanbul"] as const
export type LocationType = (typeof LOCATIONS)[number]

export const DRIVERS_BY_LOCATION: Record<LocationType, readonly string[]> = {
  "Tekirdağ": [
    "EZGİ YILMAZ",
    "KÜBRA ÇOBAN",
    "M. ONUR AĞZITEMİZ",
    "BİHTER KESKİNEL",
  ],
  "İstanbul": [
    "ELMAS MENKEŞ",
    "GAMZE YILDIZ",
    "RABİA AKPINAR",
    "SEMA ÇÖLLÜ",
    "SERHAT YOLDA",
    "SÜMEYYE TOPAL",
    "VİLDAN BAYRAKTAR",
  ],
}

// Geriye dönük uyumluluk için eski DRIVERS listesi (gerekirse)
export const DRIVERS = [
  ...DRIVERS_BY_LOCATION["Tekirdağ"],
  ...DRIVERS_BY_LOCATION["İstanbul"],
] as const

// Araç kontrol listesi maddeleri
export const CHECKLIST_ITEMS = [
  { id: "cam_kaporta", label: "Cam / Kaporta" },
  { id: "lastikler", label: "Lastikler" },
  { id: "farlar", label: "Farlar" },
  { id: "korna", label: "Korna" },
  { id: "silecek", label: "Silecek" },
  { id: "camlar", label: "Camlar" },
] as const

// Araçta bulunması gereken ekipmanlar
export const EQUIPMENT_ITEMS = [
  { id: "yangin_tupu", label: "Yangın tüpü" },
  { id: "ilk_yardim", label: "İlk yardım çantası" },
  { id: "reflektor", label: "Üçgen reflektör" },
  { id: "kriko", label: "Kriko" },
  { id: "bijon_anahtari", label: "Bijon anahtarı" },
  { id: "seyyar_lamba", label: "Seyyar lamba" },
  { id: "stepne", label: "Stepne" },
  { id: "kaza_tutanagi", label: "Kaza tutanağı" },
  { id: "ruhsat", label: "Ruhsat" },
  { id: "sigorta", label: "Araç sigortası" },
  { id: "egzoz_pulu", label: "Egzoz pulu" },
  { id: "muayene", label: "Araç Muayene Belgesi" },
] as const

// Araç kullanım kuralları
export const USAGE_RULES = [
  "Araca alkollü şekilde binmek ve alkollü araç kullanmak yasaktır.",
  "Araç içinde sigara içmek yasaktır.",
  "Araç kullanırken telefonla konuşmak yasaktır.",
  "Emniyet kemeri takılmadan araç kullanılmamalıdır.",
  "Ehliyeti kemersiz takmadan araç kullanmak yasaktır.",
  "Hız sınırlarına uyulmalıdır.",
  "Yayalara ve diğer sürücülere saygılı olunmalıdır.",
  "Trafik kurallarına aykırı davranmak yasaktır.",
  "Şoför kabini temiz tutulmalı ve araç konsoluna zarar verilmemelidir.",
  "Kötü yol koşullarında veya tehlikeli bir şekilde araç kullanılmamalıdır.",
  "Araç malzeme yüklenirken yüklü konumda kalınmalı ve trafikte diğer araçlara zarar vermesi engellenmelidir.",
  "Araç park ettiği yer seçilirken aracın güvenliği, diğer araç sahiplerinin, esnafın ve insanların zarar görmemesi sağlanmalıdır.",
  "Araç bakım, sigorta ve vize zamanları takip edilmelidir.",
  "Aracınızı şoför ve firma personeli dışında kimseye kullandırmayınız.",
  "Araç kullanırken aracı sürekli olarak dikkatli kullanın; fark ettiğiniz en ufak bir problemde ilgiliye haber verin.",
] as const

// E-posta ayarları (ileride SMTP / Resend ile değiştirilebilir)
export const CORPORATE_EMAIL = "filo@bilgicevre.com"

// WhatsApp paylaşımı için kurumsal numara (opsiyonel, boş bırakılabilir)
export const CORPORATE_WHATSAPP = ""
