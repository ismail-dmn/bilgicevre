import path from 'path';

export const DATA_ROW = 12;

// Turbopack'in path.join konusunda hata vermesini engellemek için yorum satırı eklendi
export const TEMPLATE_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'GÜNCEL GÜNLÜK_ARAÇ_KULLANIM_FORMU__rGÜNCEL.xlsx');

export const TEMPLATE_SHEET = 'ÇİZELGE';

export const CELL_COLUMNS = {
  surucuAdSoyad: 'C',
  tarih: 'D',
  plakaNo: 'E',
  camKaporta: 'F',
  lastik: 'G',
  farlarKorna: 'H',
  yakitDurumu: 'I',
  yakitAlinanTarih: 'J',
  guzergah: 'K',
  personeller: 'L',
  kmBaslangic: 'M',
  kmBitis: 'N',
  cikisSaati: 'O',
  donusSaati: 'P',
};

export const cellAddress = (col: string, row: number) => `${col}${row}`;

export const mapFormDataToExcel = (worksheet: any, formData: any) => {
  const formatCheck = (status: string) => {
    if (status === 'uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (status === 'uygun_degil') return '□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer…...............';
    if (status === 'diger') return '□ Kontrol Edildi.\n□ Uygun değil.\n■ Diğer…...............';
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
  };

  worksheet.getCell(cellAddress(CELL_COLUMNS.surucuAdSoyad, DATA_ROW)).value = formData.surucuAdSoyad || formData.driverName || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.tarih, DATA_ROW)).value = formData.tarih || formData.date || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.plakaNo, DATA_ROW)).value = formData.plakaNo || formData.plateNumber || '';
  
  worksheet.getCell(cellAddress(CELL_COLUMNS.camKaporta, DATA_ROW)).value = formatCheck(formData.camKaporta);
  worksheet.getCell(cellAddress(CELL_COLUMNS.lastik, DATA_ROW)).value = formatCheck(formData.lastik);
  worksheet.getCell(cellAddress(CELL_COLUMNS.farlarKorna, DATA_ROW)).value = formatCheck(formData.farlarKorna);
  
  worksheet.getCell(cellAddress(CELL_COLUMNS.yakitDurumu, DATA_ROW)).value = formData.yakitDurumu || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.yakitAlinanTarih, DATA_ROW)).value = formData.yakitAlinanTarih || '-';
  worksheet.getCell(cellAddress(CELL_COLUMNS.guzergah, DATA_ROW)).value = formData.guzergah || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.personeller, DATA_ROW)).value = formData.personeller || '';
  
  worksheet.getCell(cellAddress(CELL_COLUMNS.kmBaslangic, DATA_ROW)).value = formData.kmBaslangic || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.kmBitis, DATA_ROW)).value = formData.kmBitis || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.cikisSaati, DATA_ROW)).value = formData.cikisSaati || '';
  worksheet.getCell(cellAddress(CELL_COLUMNS.donusSaati, DATA_ROW)).value = formData.donusSaati || '';
};
