"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Download, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, Field, NumberInput, SelectInput, Textarea, TextInput, SegmentToggle, CheckRow } from "./fields"
import { FormHeader } from "./form-header"
import { RulesAccordion } from "./rules-accordion"
import { VEHICLES, LOCATIONS, DRIVERS_BY_LOCATION, CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "@/lib/form-config"
import { createEmptyForm, generateTaslakNo, type FormData, type KontrolDurum } from "@/lib/form-types"
import { validateForm } from "@/lib/form-validation"
import { getAvailableMonths, getMonthlyRecords, saveDailyRecord } from "@/lib/monthly-records"

const DRAFT_KEY = "bilgicevre_daily_draft_v2"
const DEVICE_ID_KEY = "bilgicevre_device_id_v2"
const istanbulDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
const monthLabel = (m: string) => new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(`${m}-01T12:00:00+03:00`))

function deviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_ID_KEY, id) }
  return id
}

export function VehicleForm() {
  const [data, setData] = useState<FormData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [months, setMonths] = useState<string[]>([])
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const today = istanbulDate()
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as FormData | null
      if (saved?.tarih === today) setData(saved)
      else setData({ ...createEmptyForm(generateTaslakNo()), tarih: today })
    } catch { setData({ ...createEmptyForm(generateTaslakNo()), tarih: today }) }
    getAvailableMonths().then(setMonths).catch(() => setMonths([]))
  }, [])

  useEffect(() => {
    if (!data) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    const timer = window.setInterval(() => {
      const today = istanbulDate()
      setData((current) => {
        if (!current || current.tarih === today) return current
        const archived = { ...current, deviceId: deviceId(), userAgent: navigator.userAgent, kaydedildiAt: new Date().toISOString(), ay: current.tarih.slice(0, 7) }
        void saveDailyRecord(archived).catch(() => undefined)
        return { ...createEmptyForm(generateTaslakNo()), tarih: today }
      })
    }, 30000)
    return () => window.clearInterval(timer)
  }, [data])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const set = useMemo(() => <K extends keyof FormData>(key: K, value: FormData[K]) => setData((p) => p ? { ...p, [key]: value } : p), [])
  const drivers = useMemo(() => data?.lokasyon ? DRIVERS_BY_LOCATION[data.lokasyon as keyof typeof DRIVERS_BY_LOCATION] || [] : [], [data?.lokasyon])
  const locked = Boolean(data && data.tarih < istanbulDate())
  if (!data) return <div className="p-10 text-center text-muted-foreground">Form yükleniyor...</div>

  async function save() {
    const completed = { ...data, durum: "Tamamlandı" as const }
    const errs = validateForm(completed)
    if (!completed.imzaAdSoyad.trim()) errs.push("İmza karşılığı ad soyad zorunludur.")
    if (locked) errs.push("Günü geçmiş kayıtlarda değişiklik yapılamaz.")
    setErrors(errs)
    if (errs.length) return window.scrollTo({ top: 0, behavior: "smooth" })
    setBusy(true)
    try {
      const now = new Date().toISOString()
      await saveDailyRecord({ ...completed, deviceId: deviceId(), userAgent: navigator.userAgent, kaydedildiAt: now, ay: completed.tarih.slice(0, 7) })
      setData(completed)
      setMonths(await getAvailableMonths())
      setToast("Günlük kayıt kaydedildi.")
    } catch { setToast("Kayıt kaydedilemedi. Firebase ayarlarını kontrol edin.") } finally { setBusy(false) }
  }

  async function downloadMonth(month: string) {
    setBusy(true)
    try {
      const records = await getMonthlyRecords(month)
      const res = await fetch("/api/export-excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, records }) })
      if (!res.ok) throw new Error()
      const a = document.createElement("a"); a.href = URL.createObjectURL(await res.blob()); a.download = `Arac_Kullanim_Aylik_${month}.xlsx`; a.click(); URL.revokeObjectURL(a.href)
    } catch { setToast("Aylık Excel indirilemedi.") } finally { setBusy(false) }
  }

  const digits = (v: string) => v.replace(/[^\d]/g, "")
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28">
    <FormHeader onDownload={() => setArchiveOpen((v) => !v)} />
    {archiveOpen && <section className="rounded-2xl border bg-card p-4 shadow-sm"><h2 className="mb-3 font-bold">Aylık kayıtlar</h2>{months.length ? <div className="grid gap-2 sm:grid-cols-2">{months.map((m) => <Button key={m} type="button" variant="outline" disabled={busy} onClick={() => downloadMonth(m)} className="justify-between capitalize">{monthLabel(m)} <Download className="size-4" /></Button>)}</div> : <p className="text-sm text-muted-foreground">Henüz kayıt bulunmuyor.</p>}</section>}
    {locked && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Bu kayıt geçmiş güne aittir ve düzenlemeye kapalıdır.</div>}
    {errors.length > 0 && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4"><div className="mb-2 flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-5" /> Eksik alanlar</div><ul className="list-disc pl-5 text-sm">{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
    <fieldset disabled={locked || busy} className="contents">
      <Section title="GÜNLÜK KAYIT"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Lokasyon" htmlFor="lokasyon"><SelectInput id="lokasyon" value={data.lokasyon} onChange={(e) => { set("lokasyon", e.target.value); set("sofor1", "") }}><option value="">Seçiniz</option>{LOCATIONS.map((x) => <option key={x} value={x}>{x}</option>)}</SelectInput></Field><Field label="Tarih" htmlFor="tarih"><TextInput id="tarih" type="date" value={data.tarih} max={istanbulDate()} onChange={(e) => set("tarih", e.target.value)} /></Field><Field label="Araç / Plaka" htmlFor="plaka"><SelectInput id="plaka" value={data.plaka} onChange={(e) => set("plaka", e.target.value)}><option value="">Seçiniz</option>{VEHICLES.map((x) => <option key={x} value={x}>{x}</option>)}</SelectInput></Field><Field label="Şoför" htmlFor="sofor1"><SelectInput id="sofor1" value={data.sofor1} onChange={(e) => set("sofor1", e.target.value)}><option value="">Seçiniz</option>{drivers.map((x) => <option key={x} value={x}>{x}</option>)}</SelectInput></Field></div></Section>
      <Section title="ARAÇ KULLANIMI"><div className="grid grid-cols-2 gap-4"><Field label="Çıkış saati" htmlFor="cikis"><TextInput id="cikis" type="time" value={data.cikisSaati1} onChange={(e) => set("cikisSaati1", e.target.value)} /></Field><Field label="Dönüş saati" htmlFor="donus"><TextInput id="donus" type="time" value={data.donusSaati1} onChange={(e) => set("donusSaati1", e.target.value)} /></Field><Field label="Başlangıç KM" htmlFor="gkm"><NumberInput id="gkm" value={data.gidisKm1} onChange={(e) => set("gidisKm1", digits(e.target.value))} /></Field><Field label="Bitiş KM" htmlFor="dkm"><NumberInput id="dkm" value={data.donusKm1} onChange={(e) => set("donusKm1", digits(e.target.value))} /></Field></div><Field label="Güzergah" htmlFor="guz"><Textarea id="guz" value={data.guzergah1} onChange={(e) => set("guzergah1", e.target.value)} /></Field><Field label="Araçtaki personeller" htmlFor="per"><Textarea id="per" value={data.personeller1} onChange={(e) => set("personeller1", e.target.value)} /></Field></Section>
      <Section title="YAKIT"><SegmentToggle value={data.yakitAlindi1} onChange={(v) => { set("yakitAlindi1", v); set("yakitAlindi", v) }} options={[{ value: "Evet", label: "Evet" }, { value: "Hayır", label: "Hayır" }]} />{data.yakitAlindi1 === "Evet" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Yakıt seviyesi (1-4)" htmlFor="yseviye"><NumberInput id="yseviye" min={1} max={4} value={String(data.yakitSeviyesi1 || "")} onChange={(e) => set("yakitSeviyesi1", Math.min(4, Math.max(0, Number(e.target.value))) as 0|1|2|3|4)} /></Field><Field label="Yakıt tarihi" htmlFor="ytarih"><TextInput id="ytarih" type="date" value={data.yakitTarihi1} onChange={(e) => { set("yakitTarihi1", e.target.value); set("yakitTarihi", e.target.value) }} /></Field></div>}</Section>
      <Section title="ARAÇ KONTROL LİSTESİ">{CHECKLIST_ITEMS.map((item) => { const k=data.kontrol[item.id]; return <div key={item.id} className="space-y-2"><div className="text-sm font-medium">{item.label}</div><SegmentToggle<KontrolDurum> value={k.durum} onChange={(v) => set("kontrol", { ...data.kontrol, [item.id]: { ...k, durum: v } })} options={[{ value: "Uygun", label: "Uygun" }, { value: "Uygun Değil", label: "Uygun Değil" }]} />{k.durum === "Uygun Değil" && <TextInput placeholder="Açıklama" value={k.aciklama} onChange={(e) => set("kontrol", { ...data.kontrol, [item.id]: { ...k, aciklama: e.target.value } })} />}</div>})}</Section>
      <Section title="ARAÇ EKİPMAN KONTROLÜ">{EQUIPMENT_ITEMS.map((item) => <CheckRow key={item.id} id={item.id} label={item.label} checked={data.ekipman[item.id]} onChange={(v) => set("ekipman", { ...data.ekipman, [item.id]: v })} />)}</Section>
      <Section title="İMZA"><Field label="İmza karşılığı ad soyad" htmlFor="imza"><TextInput id="imza" value={data.imzaAdSoyad} onChange={(e) => set("imzaAdSoyad", e.target.value)} placeholder="Ad Soyad" /></Field><div className="mt-3 h-20 rounded-xl border border-dashed bg-muted/20" aria-label="İmza alanı" /></Section>
      <RulesAccordion />
    </fieldset>
    <div className="sticky bottom-3 z-20"><Button type="button" size="lg" disabled={locked || busy} onClick={save} className="h-14 w-full gap-2 shadow-lg"><Save className="size-5" />{busy ? "İşleniyor..." : "Kaydet"}</Button></div>
    {toast && <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-xl"><CheckCircle2 className="size-4" />{toast}</div>}
  </div>
}
