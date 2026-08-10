import { NextResponse } from "next/server"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import os from "node:os"
import { buildExcelBuffer } from "@/lib/excel"
import { excelFileName } from "@/lib/excel-client"
import type { FormData } from "@/lib/form-types"

export const runtime = "nodejs"
const execFileAsync = promisify(execFile)

export async function POST(request: Request) {
  let workDir = ""
  try {
    const data = (await request.json()) as FormData
    const xlsxBuffer = await buildExcelBuffer(data)
    workDir = await mkdtemp(path.join(os.tmpdir(), "bilgicevre-pdf-"))
    const xlsxName = excelFileName(data)
    const xlsxPath = path.join(workDir, xlsxName)
    await writeFile(xlsxPath, xlsxBuffer)

    // Python gerektirmeden, sunucudaki LibreOffice ile Excel görünümünü PDF'ye aktar.
    await execFileAsync("libreoffice", ["--headless", "--convert-to", "pdf", "--outdir", workDir, xlsxPath], { timeout: 120000 })
    const pdfPath = path.join(workDir, xlsxName.replace(/\.xlsx$/i, ".pdf"))
    const pdf = await readFile(pdfPath)
    const name = `Gunluk_Arac_Kullanim_Takip_Cizelgesi_${data.tarih || "Yeni"}_${(data.plaka || "Arac").replace(/[^a-z0-9]/gi, "_")}.pdf`
    return new NextResponse(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Birebir Excel-PDF dönüşüm hatası:", error)
    const detail = error instanceof Error ? error.message : "Bilinmeyen sunucu hatası"
    return NextResponse.json({ error: `Excel şablonu PDF'ye dönüştürülemedi: ${detail}` }, { status: 500 })
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
