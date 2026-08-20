"use client"
import { useEffect,useState,type ReactNode } from "react"
import { GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,type User } from "firebase/auth"
import { doc,getDoc } from "firebase/firestore"
import { LogIn,LogOut,ShieldAlert } from "lucide-react"
import { auth,db } from "@/lib/firebase"
import type { YetkiliKullanici } from "@/lib/auth-types"
import { Button } from "@/components/ui/button"
export function AuthGate({children}:{children:(u:YetkiliKullanici)=>ReactNode}){
 const [u,setU]=useState<YetkiliKullanici|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("")
 async function authorize(user:User){const email=(user.email||"").trim().toLowerCase();if(!email)throw Error("Google hesabında e-posta bulunamadı.");const s=await getDoc(doc(db,"yetkili-kullanicilar",email));if(!s.exists())throw Error("Bu Gmail hesabının erişim yetkisi bulunmuyor.");const d=s.data();if(d.aktif!==true)throw Error("Bu kullanıcı hesabı pasif.");setU({uid:user.uid,email,adSoyad:String(d.adSoyad||user.displayName||email),rol:d.rol==="yonetici"?"yonetici":"personel",aktif:true,photoURL:user.photoURL})}
 useEffect(()=>onAuthStateChanged(auth,async user=>{setLoading(true);try{if(user)await authorize(user);else setU(null)}catch(e){setU(null);setError(e instanceof Error?e.message:"Yetki kontrolü başarısız.");await signOut(auth)}finally{setLoading(false)}}),[])
 async function login(){setLoading(true);setError("");try{const p=new GoogleAuthProvider();p.setCustomParameters({prompt:"select_account"});await authorize((await signInWithPopup(auth,p)).user)}catch(e:any){if(e?.code!=="auth/popup-closed-by-user")setError(e?.message||"Google ile giriş yapılamadı.")}finally{setLoading(false)}}
 if(loading)return <main className="grid min-h-screen place-items-center">Oturum kontrol ediliyor...</main>
 if(!u)return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-xl"><p className="text-sm font-bold tracking-widest text-primary">BİLGİÇEVRE</p><h1 className="mt-2 text-2xl font-bold">Günlük Araç Kullanım Takip Formu</h1><p className="mt-3 text-sm text-muted-foreground">Yetkili Gmail hesabınızla oturum açın.</p>{error&&<div className="mt-4 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive"><ShieldAlert className="size-5"/>{error}</div>}<Button onClick={login} className="mt-6 h-12 w-full gap-2"><LogIn className="size-5"/>Google ile giriş yap</Button></section></main>
 return <><div className="mx-auto flex max-w-3xl items-center justify-between border-b bg-card px-4 py-2 text-sm"><div><strong>{u.adSoyad}</strong><div className="text-xs text-muted-foreground">{u.email} · {u.rol}</div></div><Button variant="ghost" size="sm" onClick={()=>signOut(auth)} className="gap-2"><LogOut className="size-4"/>Çıkış</Button></div>{children(u)}</>
}
