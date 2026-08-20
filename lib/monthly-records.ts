import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from "./firebase"
import type { FormData } from "./form-types"

const LOCAL_KEY = "bilgicevre_monthly_records_v2"

export type SavedRecord = FormData & { deviceId: string; userAgent: string; kaydedildiAt: string; ay: string }

function loadLocal(): SavedRecord[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") } catch { return [] }
}

function saveLocal(records: SavedRecord[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records))
}

export async function saveDailyRecord(record: SavedRecord) {
  const local = loadLocal().filter((x) => !(x.tarih === record.tarih && x.deviceId === record.deviceId))
  saveLocal([...local, record])
  if (db) await setDoc(doc(db, "arac-kullanim-kayitlari", `${record.tarih}_${record.deviceId}`), record)
}

export async function getMonthlyRecords(month: string): Promise<SavedRecord[]> {
  if (db) {
    const snap = await getDocs(query(collection(db, "arac-kullanim-kayitlari"), where("ay", "==", month)))
    return snap.docs.map((d) => d.data() as SavedRecord).sort((a, b) => a.tarih.localeCompare(b.tarih))
  }
  return loadLocal().filter((x) => x.ay === month).sort((a, b) => a.tarih.localeCompare(b.tarih))
}

export async function getAvailableMonths(): Promise<string[]> {
  if (db) {
    const snap = await getDocs(collection(db, "arac-kullanim-kayitlari"))
    return [...new Set(snap.docs.map((d) => String(d.data().ay || "")))].filter(Boolean).sort().reverse()
  }
  return [...new Set(loadLocal().map((x) => x.ay))].filter(Boolean).sort().reverse()
}
