import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { FormData } from "./form-types"
import { EQUIPMENT_ITEMS } from "./form-config"
import { ROBOTO_REGULAR_B64 } from "./font-data"

function fmtTarih(iso: string): string {
  if (!iso) return "-"
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}.${m}.${y}` : iso
}
const MONTHS: Record<string, string> = {"01":"OCAK","02":"ŞUBAT","03":"MART","04":"NİSAN","05":"MAYIS","06":"HAZİRAN","07":"TEMMUZ","08":"AĞUSTOS","09":"EYLÜL","10":"EKİM","11":"KASIM","12":"ARALIK"}
function checkText(item: { durum?: string; aciklama?: string } | undefined): string {
  return item?.durum === "Uygun Değil" ? `□ Kontrol Edildi.\n■ Uygun değil.\n□ Diğer: ${item.aciklama || "Belirtilmedi"}` : "■ Kontrol Edildi.\n□ Uygun değil.\n□ Diğer…..............."
}
function rowsFor(data: FormData) {
  const trips = [[data.gidisKm1,data.donusKm1],[data.gidisKm2,data.donusKm2],[data.gidisKm3,data.donusKm3]].filter(([a,b]) => a || b) as string[][]
  if (!trips.length) trips.push(["", ""])
  const farKorna = ["farlar","korna","silecek","camlar"].map(k => data.kontrol[k]).find(x => x?.durum === "Uygun Değil")
  return trips.map((trip, i) => [data.sofor1 || "", fmtTarih(data.tarih), checkText(data.kontrol["cam_kaporta"]), checkText(data.kontrol["lastikler"]), checkText(farKorna), data.yakitAlindi || "Hayır", data.yakitAlindi === "Evet" ? fmtTarih(data.yakitTarihi) : "-", `${data.guzergah || ""}${trips.length > 1 ? `\n(${i + 1}. Sefer)` : ""}`, [data.sofor2,data.sofor3].filter(Boolean).join(", "), trip[0] || "", trip[1] || "", `${data.cikisSaati || "-"} - ${data.donusSaati || "-"}`, ""])
}
export async function generatePDF(data: FormData): Promise<Blob> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.setFont("Roboto")
  const date = data.tarih || new Date().toISOString().slice(0, 10), [year, month] = date.split("-"), title = `${year || ""}-${MONTHS[month] || "AY"} AYI GÜNLÜK ARAÇ KULLANIMI TAKİP ÇİZELGESİ`
  const rows = rowsFor(data)
  ;[[1,62],[63,124],[125,186]].forEach(([start,end], pageIndex) => {
    if (pageIndex) doc.addPage()
    doc.setDrawColor(40); doc.setLineWidth(.25); doc.rect(7,7,283,185); doc.setTextColor(0)
    doc.setFontSize(13); doc.text("BİLGİÇEVRE",148.5,14,{align:"center"}); doc.setFontSize(9); doc.text(title,148.5,20,{align:"center"}); doc.setFontSize(7)
    doc.text(`Doküman No: 19-BÇ-001    Taslak No: ${data.taslakNo || "-"}`,12,27); doc.text(`Lokasyon: ${data.lokasyon || "-"}    Plaka: ${data.plaka || "-"}`,188,27)
    autoTable(doc,{startY:31,margin:{left:9,right:9},head:[["SÜRÜCÜ AD-SOYAD","TARİH","CAM / KAPORTA","LASTİKLER","FAR / KORNA / SİL. / CAM","YAKIT","YAKIT TAR.","GÜZERGAH","PERSONEL","KM BAŞ.","KM BİT.","SAAT","İMZA"]],body:pageIndex===0&&rows.length?rows:[["","","","","","","","","","","","",""]],theme:"grid",styles:{font:"Roboto",fontSize:6.1,cellPadding:1.2,lineColor:[50,50,50],textColor:[0,0,0],valign:"middle",minCellHeight:18},headStyles:{fillColor:[235,235,235],textColor:[0,0,0],fontStyle:"bold",fontSize:5.7,halign:"center",minCellHeight:10},columnStyles:{0:{cellWidth:25},1:{cellWidth:17},2:{cellWidth:28},3:{cellWidth:27},4:{cellWidth:31},5:{cellWidth:13},6:{cellWidth:17},7:{cellWidth:29},8:{cellWidth:24},9:{cellWidth:15},10:{cellWidth:15},11:{cellWidth:22},12:{cellWidth:17}},didDrawPage:()=>{doc.setFontSize(6);doc.text(`Şablon sayfası ${pageIndex+1}/3 — Excel satır aralığı ${start}-${end}`,148.5,198,{align:"center"})}})
    const finalY=(doc as any).lastAutoTable.finalY as number
    if(pageIndex===2){const missing=EQUIPMENT_ITEMS.filter(e=>!data.ekipman[e.id]).map(e=>e.label).join(", ")||"Yok";doc.setFontSize(7);doc.text(`Eksik ekipman: ${missing}`,12,Math.min(finalY+9,182));doc.text("Sürücü İmzası: ____________________        Kontrol Eden: ____________________",12,188)}
  })
  return doc.output("blob")
}
export function pdfFileName(data: FormData): string { const tarih=data.tarih||new Date().toISOString().slice(0,10); const plaka=(data.plaka||"Arac").replace(/[^a-z0-9]/gi,"_"); return `Gunluk_Arac_Kullanim_Takip_Cizelgesi_${tarih}_${plaka}.pdf` }
