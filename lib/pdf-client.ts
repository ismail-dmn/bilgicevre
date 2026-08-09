import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { FormData } from "./form-types"
import { CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "./form-config"

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
  // jsPDF standard fonts have issues with Turkish characters. 
  // We'll use a trick to replace them with similar looking characters if needed,
  // or just use them and hope the environment supports it (standard in modern browsers).
  const doc = new jsPDF()
  
  // Title
  const tarihStr = data.tarih || new Date().toISOString().slice(0, 10)
  const [yil, ayNum] = tarihStr.split("-")
  const AY_ISIMLERI_TR: Record<string, string> = {
    "01": "OCAK", "02": "SUBAT", "03": "MART", "04": "NISAN",
    "05": "MAYIS", "06": "HAZIRAN", "07": "TEMMUZ", "08": "AGUSTOS",
    "09": "EYLUL", "10": "EKIM", "11": "KASIM", "12": "ARALIK",
  }
  const ayIsmi = AY_ISIMLERI_TR[ayNum] || "AY"
  const titleText = `${yil}-${ayIsmi} AYI GUNLUK ARAC KULLANIMI TAKIP CIZELGESI`
  
  doc.setFontSize(16)
  doc.setTextColor(44, 62, 80)
  doc.text("BILGICEVRE", 105, 15, { align: "center" })
  
  doc.setFontSize(11)
  doc.text(titleText, 105, 22, { align: "center" })
  
  // Basic Info Table
  const basicInfo = [
    ["Tarih", fmtTarih(data.tarih), "Plaka", data.plaka || "-"],
    ["Sofor", data.sofor1 || "-", "Taslak No", data.taslakNo || "-"]
  ]
  
  autoTable(doc, {
    startY: 30,
    body: basicInfo,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3, lineColor: [189, 195, 199] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] },
      1: { cellWidth: 60 },
      2: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] },
      3: { cellWidth: 60 }
    }
  })
  
  // Controls Table
  const controls = [
    ["Kontrol Maddesi", "Durum", "Aciklama"],
    ["Cam / Kaporta", data.kontrol["cam_kaporta"]?.durum || "Uygun", data.kontrol["cam_kaporta"]?.aciklama || "-"],
    ["Lastikler", data.kontrol["lastikler"]?.durum || "Uygun", data.kontrol["lastikler"]?.aciklama || "-"],
    ["Farlar", data.kontrol["farlar"]?.durum || "Uygun", data.kontrol["farlar"]?.aciklama || "-"],
    ["Korna", data.kontrol["korna"]?.durum || "Uygun", data.kontrol["korna"]?.aciklama || "-"],
    ["Silecek", data.kontrol["silecek"]?.durum || "Uygun", data.kontrol["silecek"]?.aciklama || "-"],
    ["Camlar", data.kontrol["camlar"]?.durum || "Uygun", data.kontrol["camlar"]?.aciklama || "-"]
  ]
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [controls[0]],
    body: controls.slice(1),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 249, 253] }
  })
  
  // KM and Route
  const kmInfo = [
    ["KM Baslangic", data.gidisKm1 || "-", "KM Bitis", data.donusKm3 || data.gidisKm3 || data.donusKm2 || data.gidisKm2 || data.donusKm1 || "-"],
    ["Cikis Saati", data.cikisSaati || "-", "Donus Saati", data.donusSaati || "-"]
  ]
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    body: kmInfo,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] },
      2: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] }
    }
  })
  
  // Route and Equipment
  const guzergah = data.guzergah || "-"
  const eksikEkipman = EQUIPMENT_ITEMS.filter(e => !data.ekipman[e.id]).map(e => e.label).join(", ") || "Yok"
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    body: [
      ["Guzergah", guzergah],
      ["Eksik Ekipman", eksikEkipman],
      ["Diger Personel", [data.sofor2, data.sofor3].filter(Boolean).join(", ") || "-"]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] }
    }
  })
  
  // Fuel
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    body: [
      ["Yakit Alindi mi?", data.yakitAlindi || "Hayir", "Yakit Tarihi", data.yakitAlindi === "Evet" ? fmtTarih(data.yakitTarihi) : "-"]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] },
      2: { fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 245] }
    }
  })
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text("Imza:", 160, finalY + 20)
  
  // Draw a line for signature
  doc.setDrawColor(200)
  doc.line(150, finalY + 25, 190, finalY + 25)
  
  return doc.output("blob")
}

export function pdfFileName(data: FormData): string {
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  const plaka = (data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")
  return `Arac_Kullanim_Formu_${tarih}_${plaka}.pdf`
}
