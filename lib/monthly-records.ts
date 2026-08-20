import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from "./firebase"
import type { FormData } from "./form-types"
import type { YetkiliKullanici } from "./auth-types"
export type SavedRecord = FormData & { ay:string; deviceId:string; userAgent:string; kaydedildiAt:string; kullaniciUid:string; kullaniciAdSoyad:string; kullaniciEmail:string; kullaniciRol:string; girisSaglayici:"google.com" }
export async function saveRecord(data:FormData,user:YetkiliKullanici,deviceId:string){
 const record:SavedRecord={...data,ay:data.tarih.slice(0,7),deviceId,userAgent:navigator.userAgent,kaydedildiAt:new Date().toISOString(),kullaniciUid:user.uid,kullaniciAdSoyad:user.adSoyad,kullaniciEmail:user.email,kullaniciRol:user.rol,girisSaglayici:"google.com"}
 await setDoc(doc(db,"arac-kullanim-kayitlari",`${data.tarih}_${deviceId}`),record)
}
export async function months(){ const s=await getDocs(collection(db,"arac-kullanim-kayitlari")); return [...new Set(s.docs.map(d=>String(d.data().ay||"")))].filter(Boolean).sort().reverse() }
export async function records(month:string){ const s=await getDocs(query(collection(db,"arac-kullanim-kayitlari"),where("ay","==",month))); return s.docs.map(d=>d.data() as SavedRecord).sort((a,b)=>a.tarih.localeCompare(b.tarih)) }
