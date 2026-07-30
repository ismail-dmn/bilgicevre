import ExcelJS from 'exceljs';
import { VehicleFormData } from './form-types'; // Kendi type'ınıza göre güncelleyin

export const mapFormDataToExcel = (worksheet: ExcelJS.Worksheet, formData: any) => {
  // İlk veri satırı 12. satırdır
  const rowIndex = 12;

  // Checkbox (Onay kutusu) formatlama fonksiyonu
  const formatCheck = (status: string) => {
    if (status === 'uygun') return '■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............';
    if (status === 'uygun_degil') return '□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer…...............';
    if (status === 'diger') return '□ Kontrol Edildi.\n□ Uygun değil.\n■ Diğer…...............';
    return '□ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…...............'; // Boş durum
  };

  // Hücre Eşleştirmeleri
  worksheet.getCell(`C${rowIndex}`).value = formData.surucuAdSoyad || '';
  worksheet.getCell(`D${rowIndex}`).value = formData.tarih || '';
  worksheet.getCell(`E${rowIndex}`).value = formData.plakaNo || '';

  // Kontrol Alanları
  worksheet.getCell(`F${rowIndex}`).value = formatCheck(formData.camKaporta);
  worksheet.getCell(`G${rowIndex}`).value = formatCheck(formData.lastik);
  worksheet.getCell(`H${rowIndex}`).value = formatCheck(formData.farlarKorna);

  // Diğer Bilgiler
  worksheet.getCell(`I${rowIndex}`).value = formData.yakitDurumu || '';
  worksheet.getCell(`J${rowIndex}`).value = formData.yakitAlinanTarih || '-';
  worksheet.getCell(`K${rowIndex}`).value = formData.guzergah || '';
  worksheet.getCell(`L${rowIndex}`).value = formData.personeller || '';

  worksheet.getCell(`M${rowIndex}`).value = formData.kmBaslangic || '';
  worksheet.getCell(`N${rowIndex}`).value = formData.kmBitis || '';
  worksheet.getCell(`O${rowIndex}`).value = formData.cikisSaati || '';
  worksheet.getCell(`P${rowIndex}`).value = formData.donusSaati || '';
};