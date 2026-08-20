import path from 'path';

export const DATA_ROW = 30;

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
  yakitDurumu: "I",
  yakit: "J", 
  guzergah: "K", 
  personel: "L", 
  kmBaslangic: "M", 
  kmBitis: "N", 
  saat: "O", 
  imza: "Q",
} as const;

export const cellAddress = (col: string, row: number) => `${col}${row}`;

function fmtTarih(iso: string): string {
  if (!iso) return ""
  const parts = iso.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y}`
  }
  return iso
}

export const mapFormDataToExcel = (worksheet: any, formData: any) => {
  worksheet.getCell("C1").value = "GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ"

  // Plaka ve form verileri, şablondaki tablo satırlarına yazılır.
  if (formData.plaka) worksheet.getCell("E30").value = formData.plaka;

  const formatCheck = (madde: any) => {
    if (!madde) return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (madde.durum === 'Uygun Değil') return `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${madde.aciklama || 'Belirtilmedi'}`;
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
  };

  const seferler = [];
  if (formData.gidisKm1 || formData.donusKm1) seferler.push({ gidis: formData.gidisKm1, donus: formData.donusKm1 });
  if (formData.gidisKm2 || formData.donusKm2) seferler.push({ gidis: formData.gidisKm2, donus: formData.donusKm2 });
  if (formData.gidisKm3 || formData.donusKm3) seferler.push({ gidis: formData.gidisKm3, donus: formData.donusKm3 });

  if (seferler.length === 0) {
    seferler.push({ gidis: '', donus: '' });
  }

  const kontrol = formData.kontrol || {};
  const camKaportaVal = formatCheck(kontrol['cam_kaporta'] || kontrol['camKaporta']);
  const lastikVal = formatCheck(kontrol['lastikler'] || kontrol['lastik']);
  
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

  const yakitDurumuVal = formData.yakitAlindi || '';
  const yakitTarihVal = formData.yakitAlindi === 'Evet' ? fmtTarih(formData.yakitTarihi) : '-';
  const personellerVal = [formData.sofor2, formData.sofor3].filter(Boolean).join(', ');
  const saatVal = `${formData.cikisSaati || '-'} - ${formData.donusSaati || '-'}`;

  seferler.forEach((sefer, index) => {
    const currentRow = DATA_ROW + index; 

    worksheet.getCell(cellAddress(CELL_COLUMNS.surucu, currentRow)).value = formData.sofor1 || '';
    worksheet.getCell(cellAddress(CELL_COLUMNS.tarih, currentRow)).value = fmtTarih(formData.tarih) || '';
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolCamKaporta, currentRow)).value = camKaportaVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolLastik, currentRow)).value = lastikVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.kontrolFarKorna, currentRow)).value = farKornaVal;
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakitDurumu, currentRow)).value = yakitDurumuVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.yakit, currentRow)).value = yakitTarihVal;
    
    let guzergahMetni = formData.guzergah || '';
    if (seferler.length > 1) {
        guzergahMetni += `\n(${index + 1}. Sefer)`;
    }
    worksheet.getCell(cellAddress(CELL_COLUMNS.guzergah, currentRow)).value = guzergahMetni;
    
    worksheet.getCell(cellAddress(CELL_COLUMNS.personel, currentRow)).value = personellerVal;
    worksheet.getCell(cellAddress(CELL_COLUMNS.saat, currentRow)).value = saatVal;

    const setKm = (col: string, val: string) => {
      if (!val) {
        worksheet.getCell(cellAddress(col, currentRow)).value = '';
        return;
      }
      const n = Number(val);
      worksheet.getCell(cellAddress(col, currentRow)).value = Number.isFinite(n) ? n : val;
    };

    setKm(CELL_COLUMNS.kmBaslangic, sefer.gidis);
    setKm(CELL_COLUMNS.kmBitis, sefer.donus);
  });
};
