import { collection,doc,getDocs,query,setDoc,where } from "firebase/firestore"
import { db } from "./firebase"
import type { FormData } from "./form-types"
import type { YetkiliKullanici } from "./auth-types"
export async function saveRecord(d:FormData,u:YetkiliKullanici,deviceId:string){await setDoc(doc(db,"arac-kullanim-kayitlari",`${d.tarih}_${deviceId}`),{...d,ay:d.tarih.slice(0,7),deviceId,userAgent:navigator.userAgent,kaydedildiAt:new Date().toISOString(),kullaniciUid:u.uid,kullaniciAdSoyad:u.adSoyad,kullaniciEmail:u.email,kullaniciRol:u.rol,girisSaglayici:"google.com"})}
export async function listMonths(){const s=await getDocs(collection(db,"arac-kullanim-kayitlari"));return [...new Set(s.docs.map(d=>String(d.data().ay||"")))].filter(Boolean).sort().reverse()}
export async function getMonth(m:string){const s=await getDocs(query(collection(db,"arac-kullanim-kayitlari"),where("ay","==",m)));return s.docs.map(d=>d.data()).sort((a:any,b:any)=>String(a.tarih).localeCompare(String(b.tarih)))}
