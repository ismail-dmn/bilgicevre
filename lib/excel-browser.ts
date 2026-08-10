import ExcelJS from "exceljs"
import type { FormData } from "./form-types"
import { mapFormDataToExcelClient } from "./excel-mapping-client"

export async function generateExcelInBrowser(data: FormData): Promise<Blob> {
  const response = await fetch("/arac-kullanim-sablon.xlsx", { cache: "no-store" })
  if (!response.ok) throw new Error("Excel şablonu yüklenemedi.")
  const buffer = await response.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.getWorksheet("ÇİZELGE") || workbook.worksheets[0]
  if (!worksheet) throw new Error("Excel çalışma sayfası bulunamadı.")
  mapFormDataToExcelClient(worksheet, data)
  const output = await workbook.xlsx.writeBuffer()
  return new Blob([output as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
