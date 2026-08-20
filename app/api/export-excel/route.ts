import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import { mapFormDataToExcel } from '@/lib/excel-mapping';

export async function POST(request: Request) {
  try {
    const formData = await request.json();

    // Şablon Excel dosyasının yolu (data klasörü içinde)
    // Şablon isminizi buraya tam olarak yazın
    const templatePath = path.join(process.cwd(), 'data', 'arac-kullanim-sablon.xlsx'); 

    // Yeni bir Workbook oluştur ve şablonu oku
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // İlk çalışma sayfasını (worksheet) seç (ÇİZELGE veya Sayfa1)
    const worksheet = workbook.worksheets[0];

    // Form verilerini Excel'e yaz
    mapFormDataToExcel(worksheet, formData);

    // Excel'i buffer'a çevir
    const buffer = await workbook.xlsx.writeBuffer();

    // İndirilebilir dosya olarak yanıt dön
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Arac_Kullanim_Formu_${formData.tarih || 'Yeni'}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Excel dosyası oluşturulurken bir hata meydana geldi.' },
      { status: 500 }
    );
  }
}