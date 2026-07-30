import path from 'path';

export const DATA_ROW = 12;

// Vercel'deki Turbopack uyarılarını gizlemek için yorum satırı bırakıldı
export const TEMPLATE_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'arac-kullanim-sablon.xlsx');
export const TEMPLATE_SHEET = 'ÇİZELGE';

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
  // Checkbox (Onay kutusu) formatlama fonksiyonu
  const formatCheck = (madde: any) => {
    if (!madde) return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun Değil') return `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${madde.aciklama || 'Belirtilmedi'}`;
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
  };

  // 1. Formdaki seferleri (gidiş-dönüşleri) topla
  const seferler = [];
  if (formData.gidisKm1 || formData.donusKm1) seferler.push({ gidis: formData.gidisKm1, donus: formData.donusKm1 });
  if (formData.gidisKm2 || formData.donusKm2) seferler.push({ gidis: formData.gidisKm2, donus: formData.donusKm2 });
  if (formData.gidisKm3 || formData.donusKm3) seferler.push({ gidis: formData.gidisKm3, donus: formData.donusKm3 });

  // Eğer formu dolduran hiç KM girmemişse bile en az 1 ana satır yazsın
  if (seferler.length === 0) {
    seferler.push({ gidis: '', donus: '' });
  }

  // 2. Her satırda aynı kalacak "Ortak Verileri" bir kez hazırla
  const kontrol = formData.kontrol || {};
  const camKaportaVal = formatCheck(kontrol['cam_kaporta']);
  const lastikVal = formatCheck(kontrol['lastikler']);
  
  const isFarKornaUygunDegil = 
    kontrol['farlar']?.durum === 'Uygun Değil' || 
    kontrol['korna']?.durum === 'Uygun Değil' || 
    kontrol['silecek']?.durum === 'Uygun Değil' || 
    kontrol['camlar']?.durum === 'Uygun Değil';
    
  let farKornaAciklama = '';
  if (isFarKornaUygunDegil) {
      farKornaAciklama = [kontrol['farlar']?.aciklama, kontrol['korna']?.aciklama, kontrol['silecek']?.aciklama, kontrol['camlar']?.aciklama].filter(Boolean).join(', ');
  }
  const farKornaVal = formatCheck({
      durum: isFarKornaUygunDegil ? 'Uygun Değil' : 'Uygun',
      aciklama: farKornaAciklama
  });

  const yakitTarihVal = (formData.yakitAlindi === 'Evet' ? formData.yakitTarihi : '-') || '-';
  const personellerVal = [formData.sofor2, formData.sofor3].filter(Boolean).join(', ');
  const saatVal = `${formData.cikisSaati || '-'} - ${formData.donusSaati || '-'}`;

  // 3. Kaç tane sefer (gidiş-dönüş) varsa Excel'de o kadar alt alta satır oluştur
  seferler.forEach((sefer, index) => {
    // İlk sefer 12. satıra, 2. sefer 13. satıra, 3. sefer 14. satıra yazılır
    const currentRow = DATA_ROW + index; 

    // Ortak veriler tüm satırlara aynen yazılır
    worksheet.getCell(cellAddress(CELL_COLUMNS.surucu, currentRow)).value = formData.sofor1 || '';
    worksheet.getCell(cellAddress(CELL_COLUMNS.tarih, currentRow)).value = formData.tarih || '';
    worksheet.getCell(cellAddress(CELL_COLUMNS.plaka, currentRow)).value = formData.plaka || '';
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolCamKaporta, currentRow)).value = camKaportaVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolLastik, currentRow)).value = lastikVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolFarKorna, currentRow)).value = farKornaVal;
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakit, currentRow)).value = formData.yakitAlindi || '';
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakitTarih, currentRow)).value = yakitTarihVal;
    
    // Güzergah metni (Eğer birden fazla sefer varsa sonuna 1. Sefer, 2. Sefer diye not düşer)
    let guzergahMetni = formData.guzergah || '';
    if (seferler.length > 1) {
        guzergahMetni += `\n(${index + 1}. Sefer)`;
    }
    worksheet.getCell(cellAddress(CELL_COLUMNS.guzergah, currentRow)).value = guzergahMetni;
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.personel, currentRow)).value = personellerVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.saat, currentRow)).value = saatVal;

    // SADECE BU KISIM DEĞİŞİR: İlgili satıra o seferin Gidiş ve Dönüş KM'si yazılır
    worksheet.getCell(cellAddress(CELL_COLUMNS.kmBaslangic, currentRow)).value = sefer.gidis || '';
    worksheet.getCell(cellAddress(CELL_COLUMNS.kmBitis, currentRow)).value = sefer.donus || '';
  });
};
