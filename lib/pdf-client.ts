import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { FormData } from "./form-types"
import { CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "./form-config"
import { ROBOTO_REGULAR_B64 } from "./font-data"

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
  const doc = new jsPDF({ orientation: 'landscape' })
  
  // Add Turkish Font
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64)
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
  doc.setFont("Roboto")

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
  
  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.text("BÖLGEÇEVRE", 148, 15, { align: "center" })
  
  doc.setFontSize(12)
  doc.text(titleText, 148, 23, { align: "center" })
  
  // Excel Formatına Uygun Tablo Verileri
  const formatCheck = (madde: any) => {
    if (!madde) return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun Değil') return `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${madde.aciklama || 'Belirtilmedi'}`;
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
  };

  const isFarKornaUygunDegil = 
    data.kontrol['farlar']?.durum === 'Uygun Değil' || 
    data.kontrol['korna']?.durum === 'Uygun Değil' || 
    data.kontrol['silecek']?.durum === 'Uygun Değil' || 
    data.kontrol['camlar']?.durum === 'Uygun Değil';
    
  let farKornaAciklama = '';
  if (isFarKornaUygunDegil) {
      farKornaAciklama = [data.kontrol['farlar']?.aciklama, data.kontrol['korna']?.aciklama, data.kontrol['silecek']?.aciklama, data.kontrol['camlar']?.aciklama].filter(Boolean).join(', ');
  }

  const seferler = [];
  if (data.gidisKm1 || data.donusKm1) seferler.push({ gidis: data.gidisKm1, donus: data.donusKm1 });
  if (data.gidisKm2 || data.donusKm2) seferler.push({ gidis: data.gidisKm2, donus: data.donusKm2 });
  if (data.gidisKm3 || data.donusKm3) seferler.push({ gidis: data.gidisKm3, donus: data.donusKm3 });
  if (seferler.length === 0) seferler.push({ gidis: '', donus: '' });

  const tableData = seferler.map((sefer, index) => {
    return [
      data.sofor1 || '',
      fmtTarih(data.tarih),
      formatCheck(data.kontrol['cam_kaporta']),
      formatCheck(data.kontrol['lastikler']),
      formatCheck({ durum: isFarKornaUygunDegil ? 'Uygun Değil' : 'Uygun', aciklama: farKornaAciklama }),
      data.yakitAlindi || '',
      data.yakitAlindi === 'Evet' ? fmtTarih(data.yakitTarihi) : '-',
      `${data.guzergah || ''}${seferler.length > 1 ? ` (${index + 1}. Sefer)` : ''}`,
      [data.sofor2, data.sofor3].filter(Boolean).join(', ') || '-',
      sefer.gidis || '',
      sefer.donus || '',
      `${data.cikisSaati || '-'} - ${data.donusSaati || '-'}`,
      '' // İmza alanı
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [['Şoför', 'Tarih', 'Cam / Kaporta', 'Lastikler', 'Far/Korna/Sil.', 'Yakıt', 'Yakıt Tar.', 'Güzergah', 'Personel', 'KM Baş.', 'KM Bit.', 'Saat', 'İmza']],
    body: tableData,
    theme: 'grid',
    styles: { font: "Roboto", fontSize: 7, cellPadding: 1.5, lineColor: [200, 200, 200], valign: 'middle' },
    headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 15 },
      6: { cellWidth: 20 },
      7: { cellWidth: 35 },
      8: { cellWidth: 25 },
      9: { cellWidth: 15 },
      10: { cellWidth: 15 },
      11: { cellWidth: 20 },
      12: { cellWidth: 15 },
    },
    margin: { left: 5, right: 5 }
  });

  // Eksik Ekipman Notu
  const finalY = (doc as any).lastAutoTable.finalY;
  const eksik = EQUIPMENT_ITEMS.filter(e => !data.ekipman[e.id]).map(e => e.label).join(", ") || "Yok";
  doc.setFontSize(9);
  doc.text(`Eksik Ekipmanlar: ${eksik}`, 10, finalY + 10);
  
  return doc.output("blob")
}

export function pdfFileName(data: FormData): string {
  const tarih = data.tarih || new Date().toISOString().slice(0, 10)
  const plaka = (data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")
  return `Arac_Kullanim_Formu_${tarih}_${plaka}.pdf`
}
