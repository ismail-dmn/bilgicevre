import path from 'path';

export const DATA_ROW = 12;

// Vercel'deki Turbopack uyarılarını gizlemek için yorum satırı bırakıldı
export const TEMPLATE_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'arac-kullanim-sablon.xlsx');
export const TEMPLATE_SHEET = 'ÇİZELGE';

// Orijinal projenizdeki şablon sütunları (Birebir eşleştirme)
export const CELL_COLUMNS = {
  surucu: "A", 
  tarih: "C", 
  plaka: "E", 
  kontrolCamKaporta: "F", 
  kontrolLastik: "G", 
  kontrolFarKorna: "H", 
  yakit: "I", 
  yakitTarih: "J", 
  guzergah: "K", 
  personel: "L", 
  kmBaslangic: "M", 
  kmBitis: "N", 
  saat: "O", 
  imza: "Q",
} as const;

export const cellAddress = (col: string, row: number) => `${col}${row}`;

export const mapFormDataToExcel = (worksheet: any, formData: any) => {
  // Checkbox (Onay kutusu) formatlama fonksiyonu (Web'deki durumları Excel'deki kutucuklara çevirir)
  const formatCheck = (madde: any) => {
    if (!madde) return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun Değil') return `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${madde.aciklama || 'Belirtilmedi'}`;
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
  };

  // Araç ve Sürücü (Frontend'deki gerçek key'ler: sofor1, plaka, tarih)
  worksheet.getCell(cellAddress(CELL_COLUMNS.surucu, DATA_ROW)).value = formData.sofor1 || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.tarih, DATA_ROW)).value = formData.tarih || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.plaka, DATA_ROW)).value = formData.plaka || '';
  
  // Kontrol Alanları (Cam, Lastik)
  const kontrol = formData.kontrol || {};
  worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolCamKaporta, DATA_ROW)).value = formatCheck(kontrol['cam_kaporta']);
  worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolLastik, DATA_ROW)).value = formatCheck(kontrol['lastikler']);
  
  // Farlar / Korna / Silecek / Cam tek bir hücrede birleşiyor (Orijinal şablondaki gibi)
  const isFarKornaUygunDegil = 
    kontrol['farlar']?.durum === 'Uygun Değil' || 
    kontrol['korna']?.durum === 'Uygun Değil' || 
    kontrol['silecek']?.durum === 'Uygun Değil' || 
    kontrol['camlar']?.durum === 'Uygun Değil';
    
  let farKornaAciklama = '';
  if (isFarKornaUygunDegil) {
      farKornaAciklama = [kontrol['farlar']?.aciklama, kontrol['korna']?.aciklama, kontrol['silecek']?.aciklama, kontrol['camlar']?.aciklama].filter(Boolean).join(', ');
  }

  worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolFarKorna, DATA_ROW)).value = formatCheck({
      durum: isFarKornaUygunDegil ? 'Uygun Değil' : 'Uygun',
      aciklama: farKornaAciklama
  });
  
  // Yakıt Bilgileri
  worksheet.getCell(cellAddress(CELL_COLUMNS.yakit, DATA_ROW)).value = formData.yakitAlindi || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.yakitTarih, DATA_ROW)).value = (formData.yakitAlindi === 'Evet' ? formData.yakitTarihi : '-') || '-';
  
  // Güzergah Metni (KM kırılımları ve eksik ekipman notlarıyla birleşik)
  let guzergahMetni = formData.guzergah || '';
  const kmSatir = [];
  if (formData.gidisKm1 || formData.donusKm1) kmSatir.push(`1) Gidiş ${formData.gidisKm1 || "-"} / Dönüş ${formData.donusKm1 || "-"}`);
  if (formData.gidisKm2 || formData.donusKm2) kmSatir.push(`2) Gidiş ${formData.gidisKm2 || "-"} / Dönüş ${formData.donusKm2 || "-"}`);
  if (formData.gidisKm3 || formData.donusKm3) kmSatir.push(`3) Gidiş ${formData.gidisKm3 || "-"} / Dönüş ${formData.donusKm3 || "-"}`);
  if (kmSatir.length) guzergahMetni += '\nKM Detay: ' + kmSatir.join(" | ");

  worksheet.getCell(cellAddress(CELL_COLUMNS.guzergah, DATA_ROW)).value = guzergahMetni;
  
  // Görevli Personeller (Şoför 2 ve Şoför 3 birleşiyor)
  const personeller = [formData.sofor2, formData.sofor3].filter(Boolean).join(', ');
  worksheet.getCell(cellAddress(CELL_COLUMNS.personel, DATA_ROW)).value = personeller;
  
  // Kilometre Bilgileri (Başlangıç 1. Gidiş KM, Bitiş ise girilmiş olan en son Dönüş KM)
  worksheet.getCell(cellAddress(CELL_COLUMNS.kmBaslangic, DATA_ROW)).value = formData.gidisKm1 || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.kmBitis, DATA_ROW)).value = formData.donusKm3 || formData.gidisKm3 || formData.donusKm2 || formData.gidisKm2 || formData.donusKm1 || '';
  
  // Saatler (O sütununda Çıkış - Dönüş şeklinde)
  const cikisSaati = formData.cikisSaati || '-';
  const donusSaati = formData.donusSaati || '-';
  worksheet.getCell(cellAddress(CELL_COLUMNS.saat, DATA_ROW)).value = `${cikisSaati} - ${donusSaati}`;
};
