import { jsPDF } from "jspdf"
import "jspdf-autotable"
import type { FormData } from "./form-types"
import { CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "./form-config"

// jsPDF types for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

function fmtTarih(iso: string): string {
  if (!iso) return "-"
  const parts = iso.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y}`
  }
  return iso
}

export async function generatePDF(data: FormData): Promise<Blob> {
  const doc = new jsPDF()
  
  // Title
  const tarihStr = data.tarih || new Date().toISOString().slice(0, 10)
  const [yil, ayNum] = tarihStr.split("-")
  const AY_ISIMLERI_TR: Record<string, string> = {
    "01": "OCAK", "02": "ŞUBAT", "03": "MART", "04": "NİSAN",
    "05": "MAYIS", "06": "HAZİRAN", "07": "TEMMUZ", "08": "AĞUSTOS",
    "09": "EYLÜL", "10": "EKİM", "11": "KASIM", "12": "ARALIK",
  }
  const ayIsmi = AY_ISIMLERI_TR[ayNum] || "AY"
  const titleText = `${yil}-${ayIsmi} AYI GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ`
  
  doc.setFontSize(14)
  doc.text("BİLGİÇEVRE", 105, 15, { align: "center" })
  doc.setFontSize(12)
  doc.text(titleText, 105, 25, { align: "center" })
  
  // Basic Info Table
  const basicInfo = [
    ["Tarih", fmtTarih(data.tarih), "Plaka", data.plaka || "-"],
    ["Şoför", data.sofor1 || "-", "Taslak No", data.taslakNo || "-"]
  ]
  
  doc.autoTable({
    startY: 35,
    head: [],
    body: basicInfo,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { fontStyle: "bold", cellWidth: 30 },
      3: { cellWidth: 60 }
    }
  })
  
  // Controls Table
  const controls = [
    ["Kontrol Maddesi", "Durum", "Açıklama"],
    ["Cam / Kaporta", data.kontrol["cam_kaporta"]?.durum || "Uygun", data.kontrol["cam_kaporta"]?.aciklama || "-"],
    ["Lastikler", data.kontrol["lastikler"]?.durum || "Uygun", data.kontrol["lastikler"]?.aciklama || "-"],
    ["Farlar", data.kontrol["farlar"]?.durum || "Uygun", data.kontrol["farlar"]?.aciklama || "-"],
    ["Korna", data.kontrol["korna"]?.durum || "Uygun", data.kontrol["korna"]?.aciklama || "-"],
    ["Silecek", data.kontrol["silecek"]?.durum || "Uygun", data.kontrol["silecek"]?.aciklama || "-"],
    ["Camlar", data.kontrol["camlar"]?.durum || "Uygun", data.kontrol["camlar"]?.aciklama || "-"]
  ]
  
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [controls[0]],
    body: controls.slice(1),
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  })
  
  // KM and Route
  const kmInfo = [
    ["KM Başlangıç", data.gidisKm1 || "-", "KM Bitiş", data.donusKm3 || data.gidisKm3 || data.donusKm2 || data.gidisKm2 || data.donusKm1 || "-"],
    ["Çıkış Saati", data.cikisSaati || "-", "Dönüş Saati", data.donusSaati || "-"]
  ]
  
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    body: kmInfo,
    theme: "grid",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { fontStyle: "bold" }
    }
  })
  
  // Route and Equipment
  const guzergah = data.guzergah || "-"
  const eksikEkipman = EQUIPMENT_ITEMS.filter(e => !data.ekipman[e.id]).map(e => e.label).join(", ") || "Yok"
  
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    body: [
      ["Güzergah", guzergah],
      ["Eksik Ekipman", eksikEkipman],
      ["Diğer Personel", [data.sofor2, data.sofor3].filter(Boolean).join(", ") || "-"]
    ],
    theme: "grid",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 }
    }
  })
  
  // Fuel
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    body: [
      ["Yakıt Alındı mı?", data.yakitAlindi || "Hayır", "Yakıt Tarihi", data.yakitAlindi === "Evet" ? fmtTarih(data.yakitTarihi) : "-"]
    ],
    theme: "grid",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { fontStyle: "bold" }
    }
  })
  
  // Footer
  doc.setFontSize(10)
  doc.text("İmza:", 150, (doc as any).lastAutoTable.finalY + 20)
  
  return doc.output("blob")
}

export function pdfFileName(data: FormData): string {
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  const plaka = (data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")
  return `Arac_Kullanim_Formu_${tarih}_${plaka}.pdf`
}
