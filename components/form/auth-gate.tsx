"use client"

import { useEffect, useState, type ReactNode } from "react"
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { LogIn, LogOut, ShieldAlert } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import type { YetkiliKullanici } from "@/lib/auth-types"
import { Button } from "@/components/ui/button"

export function AuthGate({ children }: { children: (profile: YetkiliKullanici) => ReactNode }) {
  const [profile, setProfile] = useState<YetkiliKullanici | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function authorize(user: User) {
    const email = user.email?.trim().toLowerCase()
    if (!email) throw new Error("Google hesabında e-posta adresi bulunamadı.")
    const snap = await getDoc(doc(db, "yetkili-kullanicilar", email))
    if (!snap.exists()) throw new Error("Bu Gmail hesabının uygulamaya erişim yetkisi bulunmuyor.")
    const data = snap.data()
    if (data.aktif !== true) throw new Error("Bu kullanıcı hesabı pasif durumdadır.")
    const rol = data.rol === "yonetici" ? "yonetici" : "personel"
    setProfile({ uid: user.uid, email, adSoyad: String(data.adSoyad || user.displayName || email), rol, aktif: true, photoURL: user.photoURL })
  }

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    setLoading(true); setError("")
    try { if (user) await authorize(user); else setProfile(null) }
    catch (e) { setProfile(null); setError(e instanceof Error ? e.message : "Yetki kontrolü yapılamadı."); await signOut(auth) }
    finally { setLoading(false) }
  }), [])

  async function login() {
    setLoading(true); setError("")
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" })
    try { const result = await signInWithPopup(auth, provider); await authorize(result.user) }
    catch (e: any) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e?.code)) { await signInWithRedirect(auth, provider); return }
      if (e?.code !== "auth/popup-closed-by-user") setError(e?.message || "Google ile giriş yapılamadı.")
    } finally { setLoading(false) }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-background p-6"><p className="text-muted-foreground">Oturum kontrol ediliyor...</p></main>
  if (!profile) return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-xl"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><LogIn className="size-8" /></div><p className="text-sm font-bold tracking-widest text-primary">BİLGİÇEVRE</p><h1 className="mt-2 text-2xl font-bold">Günlük Araç Kullanım Takip Formu</h1><p className="mt-3 text-sm text-muted-foreground">Devam etmek için yetkili Gmail hesabınızla oturum açın.</p>{error && <div className="mt-4 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive"><ShieldAlert className="mt-0.5 size-5 shrink-0" />{error}</div>}<Button onClick={login} className="mt-6 h-12 w-full gap-2" disabled={loading}><LogIn className="size-5" /> Google ile giriş yap</Button></section></main>

  return <><div className="mx-auto flex max-w-3xl items-center justify-between border-b bg-card px-4 py-2 text-sm"><div><strong>{profile.adSoyad}</strong><div className="text-xs text-muted-foreground">{profile.email} · {profile.rol}</div></div><Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="gap-2"><LogOut className="size-4" /> Çıkış</Button></div>{children(profile)}</>
}
