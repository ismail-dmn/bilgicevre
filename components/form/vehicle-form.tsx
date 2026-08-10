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
import { excelFileName } from "@/lib/excel-client"
import { generateExcelInBrowser } from "@/lib/excel-browser"
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

function getDraftStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY_BASE
  let tabId = window.sessionStorage.getItem("bilgicevre_form_tab_id")
  if (!tabId) {
    tabId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.sessionStorage.setItem("bilgicevre_form_tab_id", tabId)
  }
  return `${STORAGE_KEY_BASE}_${tabId}`
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

  // İlk yüklemede localStorage taslağını geri yükle veya yeni taslak oluştur.
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

  // Değişiklikte taslağı otomatik kaydet.
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

  async function fetchExcelBlob(formData: FormData): Promise<Blob> {
    return generateExcelInBrowser(formData)
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
      const excelBlob = await fetchExcelBlob(data)
      const fileName = excelFileName(data)
      const file = new File([excelBlob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

      const downloadExcel = () => {
        const url = URL.createObjectURL(excelBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        const text = [
          "BİLGİÇEVRE Günlük Araç Kullanım Formu",
          `Tarih: ${data.tarih || "-"}`,
          `Plaka: ${data.plaka || "-"}`,
          `Şoför: ${data.sofor1 || "-"}`,
          `Taslak No: ${data.taslakNo}`,
          "Doldurulmuş Excel dosyası indirildi; lütfen mesajınıza veya e-postanıza ekleyin.",
        ].join("\\n")
        const encodedText = encodeURIComponent(text)
        const whatsappTarget = CORPORATE_WHATSAPP ? `https://wa.me/${CORPORATE_WHATSAPP}` : "https://wa.me/"
        setShareFile(file)
        setShareLinks({
          whatsapp: `${whatsappTarget}?text=${encodedText}`,
          email: `mailto:${CORPORATE_EMAIL}?subject=${encodeURIComponent("Günlük Araç Kullanım Formu")}&body=${encodedText}`,
        })
        setShareOpen(true)
        setToast("Excel dosyası oluşturuldu. Paylaşım kanalını seçin.")
      }

      // Dosya üretimi asenkron olduğu için bazı tarayıcılar navigator.share çağrısında
      // kullanıcı iznini kaybedip "Permission denied" döndürebilir. Bu durumda
      // işlemi başarısız göstermeden Excel dosyasını otomatik indiriyoruz.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Günlük Araç Kullanım Formu",
            text: `${data.plaka || "Araç"} - ${data.tarih} tarihli kullanım formu ekte yer almaktadır.`,
            files: [file],
          })
          setToast("Form başarıyla paylaşıldı.")
        } catch (shareError) {
          const message = shareError instanceof Error ? shareError.message.toLowerCase() : ""
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            setToast("Paylaşım iptal edildi.")
          } else if (message.includes("permission") || message.includes("not allowed") || message.includes("user activation")) {
            downloadExcel()
          } else {
            throw shareError
          }
        }
      } else {
        downloadExcel()
      }
    } catch (err) {
      console.error("Paylaşım hatası:", err)
      if ((err as Error).name !== "AbortError") {
        setToast(`Paylaşım sırasında bir hata oluştu: ${(err as Error).message || "Bilinmeyen hata"}`)
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
      <Section title="ARAÇ BİLGİLERİ">
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

      {/* 2. Güzergah ve KM */}
      <Section title="GÜZERGAH VE KM BİLGİLERİ">
        <div className="grid grid-cols-2 gap-3">
          <Field label="1. Gidiş KM" htmlFor="gidisKm1" required>
            <NumberInput id="gidisKm1" value={data.gidisKm1} onChange={(e) => set("gidisKm1", onlyDigits(e.target.value))} />
          </Field>
          <Field label="1. Dönüş KM" htmlFor="donusKm1" required>
            <NumberInput id="donusKm1" value={data.donusKm1} onChange={(e) => set("donusKm1", onlyDigits(e.target.value))} />
          </Field>
          <Field label="2. Gidiş KM" htmlFor="gidisKm2">
            <NumberInput id="gidisKm2" value={data.gidisKm2} onChange={(e) => set("gidisKm2", onlyDigits(e.target.value))} />
          </Field>
          <Field label="2. Dönüş KM" htmlFor="donusKm2">
            <NumberInput id="donusKm2" value={data.donusKm2} onChange={(e) => set("donusKm2", onlyDigits(e.target.value))} />
          </Field>
          <Field label="3. Gidiş KM" htmlFor="gidisKm3">
            <NumberInput id="gidisKm3" value={data.gidisKm3} onChange={(e) => set("gidisKm3", onlyDigits(e.target.value))} />
          </Field>
          <Field label="3. Dönüş KM" htmlFor="donusKm3">
            <NumberInput id="donusKm3" value={data.donusKm3} onChange={(e) => set("donusKm3", onlyDigits(e.target.value))} />
          </Field>
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((trip) => {
            const routeKey = `guzergah${trip}` as "guzergah1" | "guzergah2" | "guzergah3"
            const staffKey = `personeller${trip}` as "personeller1" | "personeller2" | "personeller3"
            return (
              <div key={trip} className="grid gap-3 rounded-xl border border-border/60 p-3">
                <div className="text-sm font-semibold text-foreground">{trip}. Sefer</div>
                <Field label="Araç Kullanımı / Güzergahı" htmlFor={routeKey}>
                  <Textarea
                    id={routeKey}
                    value={data[routeKey]}
                    onChange={(e) => set(routeKey, e.target.value)}
                    placeholder="Örn: Kadıköy - Gebze Şantiye - Kadıköy"
                  />
                </Field>
                <Field label="Araçtaki Görevli Personeller" htmlFor={staffKey} hint="Birden fazla kişi için virgül kullanabilirsiniz">
                  <TextInput
                    id={staffKey}
                    value={data[staffKey]}
                    onChange={(e) => set(staffKey, e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz, Ayşe Demir"
                  />
                </Field>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 3. Saatler */}
      <Section title="ARAÇ KULLANIM SAATLERİ">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Çıkış Saati" htmlFor="cikisSaati" required>
            <TextInput id="cikisSaati" type="time" value={data.cikisSaati} onChange={(e) => set("cikisSaati", e.target.value)} />
          </Field>
          <Field label="Dönüş Saati" htmlFor="donusSaati" required={data.durum === "Tamamlandı"}>
            <TextInput id="donusSaati" type="time" value={data.donusSaati} onChange={(e) => set("donusSaati", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* 4. Yakıt */}
      <Section title="YAKIT DURUMU">
        <Field label="Yakıt alındı mı?">
          <SegmentToggle
            value={data.yakitAlindi}
            onChange={(v) => set("yakitAlindi", v)}
            options={[
              { value: "Evet", label: "Evet" },
              { value: "Hayır", label: "Hayır" },
            ]}
          />
        </Field>
        {data.yakitAlindi === "Evet" && (
          <Field label="Yakıt Alınan Tarih" htmlFor="yakitTarihi" required>
            <TextInput id="yakitTarihi" type="date" value={data.yakitTarihi} onChange={(e) => set("yakitTarihi", e.target.value)} />
          </Field>
        )}
      </Section>

      {/* 5. Kontrol listesi */}
      <Section title="ARAÇ KONTROL LİSTESİ">
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
      <Section title="ARAÇ EKİPMAN KONTROLÜ">
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
                <p className="text-sm text-muted-foreground">Excel dosyası indirildi. Kanal seçin.</p>
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
                      await navigator.share({ files: [shareFile], title: "Günlük Araç Kullanım Formu", text: "Excel dosyası ektedir." })
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
                      await navigator.share({ files: [shareFile], title: "Günlük Araç Kullanım Formu", text: "Excel dosyası ektedir." })
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
