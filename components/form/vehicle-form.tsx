"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Send, RotateCcw, MessageCircle, Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Section,
  Field,
  NumberInput,
  SelectInput,
  Textarea,
  TextInput,
  SegmentToggle,
  CheckRow,
} from "./fields"
import { FormHeader } from "./form-header"
import { RulesAccordion } from "./rules-accordion"
// import { ShareModal } from "./share-modal"
import { generateExcelInBrowser } from "@/lib/excel-browser"
import { excelFileName } from "@/lib/excel-client"
import { CORPORATE_EMAIL, CORPORATE_WHATSAPP } from "@/lib/form-config"
import { VEHICLES, LOCATIONS, DRIVERS_BY_LOCATION, CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "@/lib/form-config"
import {
  createEmptyForm,
  generateTaslakNo,
  type FormData,
  type FormDurum,
  type KontrolDurum,
} from "@/lib/form-types"
import { validateForm } from "@/lib/form-validation"

const STORAGE_KEY_BASE = "bilgicevre_arac_form_draft"
const DEVICE_ID_KEY = `${STORAGE_KEY_BASE}_device_id`

function getDraftStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_BASE
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return `${STORAGE_KEY_BASE}_${deviceId}`
}

export function VehicleForm() {
  const [data, setData] = useState<FormData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLinks, setShareLinks] = useState<{ whatsapp: string; email: string } | null>(null)
  const [shareFile, setShareFile] = useState<File | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const loaded = useRef(false)

  // Aynı tarayıcı ve cihazdaki taslağı geri yükle veya yeni taslak oluştur.
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const raw = window.localStorage.getItem(getDraftStorageKey())
      if (raw) {
        setData(JSON.parse(raw) as FormData)
        return
      }
    } catch {
      // yoksay
    }
    setData(createEmptyForm(generateTaslakNo()))
  }, [])

  // Form değiştikçe taslağı aynı tarayıcıda kalıcı olarak güncelle.
  useEffect(() => {
    if (!data) return
    try {
      window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(data))
    } catch {
      // yoksay
    }
  }, [data])

  // Toast otomatik kapanış
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const set = useMemo(
    () => <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setData((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    [],
  )

  const currentDrivers = useMemo(() => {
    if (!data?.lokasyon) return []
    return DRIVERS_BY_LOCATION[data.lokasyon as keyof typeof DRIVERS_BY_LOCATION] || []
  }, [data?.lokasyon])

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Form yükleniyor...</div>
    )
  }

  function onlyDigits(v: string) {
    return v.replace(/[^\d]/g, "")
  }

  async function handleShare() {
    if (!data) return
    const errs = validateForm(data)
    setErrors(errs)
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    setIsExporting(true)
    try {
      const excelBlob = await generateExcelInBrowser(data)
      const fileName = excelFileName(data)
      const file = new File([excelBlob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const text = [
        "BİLGİÇEVRE Günlük Araç Kullanım Formu",
        `Tarih: ${data.tarih || "-"}`,
        `Plaka: ${data.plaka || "-"}`,
        `Şoför: ${data.sofor1 || "-"}`,
        `Taslak No: ${data.taslakNo}`,
        "Doldurulmuş Excel çizelgesi ektedir.",
      ].join("\\n")
      const encodedText = encodeURIComponent(text)
      const whatsappTarget = CORPORATE_WHATSAPP ? `https://wa.me/${CORPORATE_WHATSAPP}` : "https://wa.me/"
      const downloadExcel = () => {
        const url = URL.createObjectURL(excelBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setToast("Doldurulmuş Excel dosyası indirildi. Paylaşım kanalını seçin.")
      }
      setShareFile(file)
      setShareLinks({
        whatsapp: `${whatsappTarget}?text=${encodedText}`,
        email: `mailto:${CORPORATE_EMAIL}?subject=${encodeURIComponent("Günlük Araç Kullanım Formu")}&body=${encodedText}`,
      })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: "Günlük Araç Kullanım Formu",
            text: `${data.plaka || "Araç"} - ${data.tarih} tarihli Excel çizelgesi ekte yer almaktadır.`,
            files: [file],
          })
          setToast("Excel çizelgesi başarıyla paylaşıldı.")
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            setToast("Paylaşım iptal edildi.")
          } else {
            downloadExcel()
            setShareOpen(true)
          }
        }
      } else {
        downloadExcel()
        setShareOpen(true)
      }
    } catch (err) {
      console.error("Excel paylaşım hatası:", err)
      if ((err as Error).name !== "AbortError") {
        setToast(`Excel oluşturulurken hata oluştu: ${(err as Error).message || "Bilinmeyen hata"}`)
      }
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSubmit() {
    if (data!.durum === "Taslak") {
      try {
        window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(data))
        setErrors([])
        setToast("Taslak kaydedildi.")
      } catch {
        setToast("Taslak kaydedilemedi.")
      }
      return
    }

    const errs = validateForm(data!)
    setErrors(errs)
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    try {
      // Tamamlandı durumunu da paylaşım öncesinde kalıcı olarak kaydet.
      window.localStorage.setItem(getDraftStorageKey(), JSON.stringify({ ...data!, durum: "Tamamlandı" }))
    } catch {
      setToast("Form kaydedilemedi; tekrar deneyin.")
      return
    }
    await handleShare()
  }

  function handleReset() {
    const fresh = createEmptyForm(generateTaslakNo())
    setData(fresh)
    setErrors([])
    setToast("Yeni boş form oluşturuldu.")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
      <FormHeader taslakNo={data.taslakNo} durum={data.durum} onDurumChange={(d: FormDurum) => set("durum", d)} />

      <RulesAccordion />

      {errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
            <AlertCircle className="size-5" />
            Lütfen eksik alanları tamamlayın
          </div>
          <ul className="list-disc space-y-1 pl-6 text-sm text-destructive">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Araç Bilgileri */}
      <Section title="ARAÇ BİLGİLERİ" className="bg-slate-50/90 dark:bg-slate-900/60">
        <Field label="Lokasyon / Bölge" htmlFor="lokasyon" required>
          <SelectInput
            id="lokasyon"
            placeholder="Lokasyon seçiniz"
            value={data.lokasyon}
            onChange={(e) => {
              const newLoc = e.target.value
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      lokasyon: newLoc,
                      sofor1: "",
                      sofor2: "",
                      sofor3: "",
                    }
                  : prev
              )
            }}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Tarih" htmlFor="tarih" required>
          <TextInput id="tarih" type="date" value={data.tarih} onChange={(e) => set("tarih", e.target.value)} />
        </Field>
        <Field label="Araç / Plaka" htmlFor="plaka" required>
          <SelectInput id="plaka" placeholder="Plaka seçiniz" value={data.plaka} onChange={(e) => set("plaka", e.target.value)}>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Şoför 1" htmlFor="sofor1" required>
          <SelectInput
            id="sofor1"
            placeholder={data.lokasyon ? "Şoför seçiniz" : "Önce lokasyon seçiniz"}
            value={data.sofor1}
            disabled={!data.lokasyon}
            onChange={(e) => set("sofor1", e.target.value)}
          >
            {currentDrivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Şoför 2" htmlFor="sofor2" hint="Zorunlu değil">
          <SelectInput
            id="sofor2"
            placeholder={data.lokasyon ? "Seçiniz" : "Önce lokasyon seçiniz"}
            value={data.sofor2}
            disabled={!data.lokasyon}
            onChange={(e) => set("sofor2", e.target.value)}
          >
            {currentDrivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Şoför 3" htmlFor="sofor3" hint="Zorunlu değil">
          <SelectInput
            id="sofor3"
            placeholder={data.lokasyon ? "Seçiniz" : "Önce lokasyon seçiniz"}
            value={data.sofor3}
            disabled={!data.lokasyon}
            onChange={(e) => set("sofor3", e.target.value)}
          >
            {currentDrivers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Section>

      {/* 2. Seferler */}
      <Section title="SEFERLER" className="bg-card">
        <div className="grid gap-3">
          {[1, 2, 3].map((trip) => {
            const driverKey = `sofor${trip}` as "sofor1" | "sofor2" | "sofor3"
            const routeKey = `guzergah${trip}` as "guzergah1" | "guzergah2" | "guzergah3"
            const staffKey = `personeller${trip}` as "personeller1" | "personeller2" | "personeller3"
            const startKmKey = `gidisKm${trip}` as "gidisKm1" | "gidisKm2" | "gidisKm3"
            const endKmKey = `donusKm${trip}` as "donusKm1" | "donusKm2" | "donusKm3"
            const startTimeKey = `cikisSaati${trip}` as "cikisSaati1" | "cikisSaati2" | "cikisSaati3"
            const endTimeKey = `donusSaati${trip}` as "donusSaati1" | "donusSaati2" | "donusSaati3"
            const levelKey = `yakitSeviyesi${trip}` as "yakitSeviyesi1" | "yakitSeviyesi2" | "yakitSeviyesi3"
            const takenKey = `yakitAlindi${trip}` as "yakitAlindi1" | "yakitAlindi2" | "yakitAlindi3"
            const dateKey = `yakitTarihi${trip}` as "yakitTarihi1" | "yakitTarihi2" | "yakitTarihi3"
            const level = data[levelKey]
            const optional = trip > 1
            return (
              <details key={trip} open={trip === 1} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <summary className="cursor-pointer list-none px-4 py-3 font-semibold marker:hidden">
                  <span>{trip}. Sefer</span>
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{data[driverKey] || "Şoför seçilmedi"}</span>
                </summary>
                <div className="grid gap-3 border-t border-border/60 p-4">
                  <Field label={`Şoför ${trip}`} htmlFor={driverKey} required={!optional}>
                    <SelectInput id={driverKey} placeholder={data.lokasyon ? "Şoför seçiniz" : "Önce lokasyon seçiniz"} value={data[driverKey]} disabled={!data.lokasyon} onChange={(e) => set(driverKey, e.target.value)}>
                      {currentDrivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Araç Kullanımı / Güzergahı" htmlFor={routeKey}>
                    <TextInput id={routeKey} value={data[routeKey]} onChange={(e) => set(routeKey, e.target.value)} placeholder="Örn: Tekirdağ - Şantiye" />
                  </Field>
                  <Field label="Görevli Personeller" htmlFor={staffKey} hint="Birden fazla kişi için virgül kullanabilirsiniz">
                    <TextInput id={staffKey} value={data[staffKey]} onChange={(e) => set(staffKey, e.target.value)} placeholder="Ad Soyad, Ad Soyad" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Gidiş KM" htmlFor={startKmKey} required={!optional}>
                      <NumberInput id={startKmKey} value={data[startKmKey]} onChange={(e) => set(startKmKey, onlyDigits(e.target.value))} />
                    </Field>
                    <Field label="Dönüş KM" htmlFor={endKmKey} required={data.durum === "Tamamlandı" && !optional}>
                      <NumberInput id={endKmKey} value={data[endKmKey]} onChange={(e) => set(endKmKey, onlyDigits(e.target.value))} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Çıkış saati" htmlFor={startTimeKey} required={!optional}>
                      <TextInput id={startTimeKey} type="time" value={data[startTimeKey]} onChange={(e) => set(startTimeKey, e.target.value)} />
                    </Field>
                    <Field label="Dönüş saati" htmlFor={endTimeKey} required={data.durum === "Tamamlandı" && !optional}>
                      <TextInput id={endTimeKey} type="time" value={data[endTimeKey]} onChange={(e) => set(endTimeKey, e.target.value)} />
                    </Field>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium">Yakıt seviyesi</div>
                    <div className="grid grid-cols-4 gap-2" role="group" aria-label={`${trip}. sefer yakıt seviyesi`}>
                      {[1, 2, 3, 4].map((nextLevel) => {
                        const selected = level >= nextLevel
                        const label = nextLevel === 1 ? "¼" : nextLevel === 2 ? "½" : nextLevel === 3 ? "¾" : "Dolu"
                        return <button key={nextLevel} type="button" aria-label={`${trip}. sefer depo ${label}`} aria-pressed={selected} onClick={() => { set(takenKey, "Evet"); set(levelKey, nextLevel as 0 | 1 | 2 | 3 | 4) }} className={`min-h-14 rounded-xl border text-center transition ${selected ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}><span className="block text-lg">{selected ? "■" : "□"}</span><span className="text-xs">{label}</span></button>
                      })}
                    </div>
                    <button type="button" onClick={() => { set(takenKey, "Hayır"); set(levelKey, 0) }} className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm ${level === 0 ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>Yakıt alınmadı</button>
                  </div>
                  {level > 0 && <Field label="Yakıt alınan tarih" htmlFor={dateKey}><TextInput id={dateKey} type="date" value={data[dateKey]} onChange={(e) => set(dateKey, e.target.value)} /></Field>}
                </div>
              </details>
            )
          })}
        </div>
      </Section>

      {/* 5. Kontrol listesi */}
      <Section title="ARAÇ KONTROL LİSTESİ" className="bg-slate-50/90 dark:bg-slate-900/60">
        {CHECKLIST_ITEMS.map((item) => {
          const madde = data.kontrol[item.id]
          return (
            <div key={item.id} className="flex flex-col gap-2">
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <SegmentToggle<KontrolDurum>
                value={madde.durum}
                onChange={(v) =>
                  set("kontrol", { ...data.kontrol, [item.id]: { ...madde, durum: v } })
                }
                options={[
                  { value: "Uygun", label: "Uygun" },
                  { value: "Uygun Değil", label: "Uygun Değil" },
                ]}
              />
              {madde.durum === "Uygun Değil" && (
                <TextInput
                  placeholder="Açıklama giriniz"
                  value={madde.aciklama}
                  onChange={(e) =>
                    set("kontrol", { ...data.kontrol, [item.id]: { ...madde, aciklama: e.target.value } })
                  }
                />
              )}
            </div>
          )
        })}
      </Section>

      {/* 6. Ekipman */}
      <Section title="ARAÇ EKİPMAN KONTROLÜ" className="bg-card">
        <div className="grid grid-cols-1 gap-2">
          {EQUIPMENT_ITEMS.map((item) => (
            <CheckRow
              key={item.id}
              id={`ekipman-${item.id}`}
              label={item.label}
              checked={data.ekipman[item.id]}
              onChange={(v) => set("ekipman", { ...data.ekipman, [item.id]: v })}
            />
          ))}
        </div>
      </Section>

      {/* Gönder */}
      <div className="sticky bottom-3 z-10 mt-2">
        <Button
          onClick={handleSubmit}
          disabled={isExporting}
          size="lg"
          className="h-14 w-full rounded-2xl text-lg font-semibold shadow-lg"
        >
          {isExporting ? "HAZIRLANIYOR..." : data.durum === "Taslak" ? "KAYDET" : <><Send className="mr-2 size-5" />PAYLAŞ</>}
        </Button>
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="mx-auto mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <RotateCcw className="size-4" />
        Yeni boş form oluştur
      </button>

      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg">
          <CheckCircle2 className="size-4" />
          {toast}
        </div>
      )}

      {shareOpen && shareLinks && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Paylaşım seçenekleri">
          <div className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Paylaşım seçenekleri</h2>
                <p className="text-sm text-muted-foreground">Doldurulmuş Excel çizelgesi hazır. Kanal seçin.</p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Kapat">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
                    try {
                      await navigator.share({ files: [shareFile], title: "Günlük Araç Kullanım Formu", text: "Doldurulmuş Excel çizelgesi ektedir." })
                      setShareOpen(false)
                      return
                    } catch (error) {
                      if (error instanceof DOMException && error.name === "AbortError") return
                    }
                  }
                  window.open(shareLinks.whatsapp, "_blank", "noopener,noreferrer")
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-semibold text-white"
              >
                <MessageCircle className="size-5" /> WhatsApp ile Excel gönder
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
                    try {
                      await navigator.share({ files: [shareFile], title: "Günlük Araç Kullanım Formu", text: "Doldurulmuş Excel çizelgesi ektedir." })
                      setShareOpen(false)
                      return
                    } catch (error) {
                      if (error instanceof DOMException && error.name === "AbortError") return
                    }
                  }
                  window.location.href = shareLinks.email
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >
                <Mail className="size-5" /> E-posta ile Excel gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
