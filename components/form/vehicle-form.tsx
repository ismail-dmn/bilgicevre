"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Send, RotateCcw } from "lucide-react"
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
import { ShareModal } from "./share-modal"
import { VEHICLES, LOCATIONS, DRIVERS_BY_LOCATION, CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "@/lib/form-config"
import {
  createEmptyForm,
  generateTaslakNo,
  type FormData,
  type FormDurum,
  type KontrolDurum,
} from "@/lib/form-types"
import { validateForm } from "@/lib/form-validation"

const STORAGE_KEY = "bilgicevre_arac_form_draft"

export function VehicleForm() {
  const [data, setData] = useState<FormData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const loaded = useRef(false)

  // İlk yüklemede localStorage taslağını geri yükle veya yeni taslak oluştur.
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

  async function handleSubmit() {
    const errs = validateForm(data!)
    setErrors(errs)
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (data!.durum === "Taslak") {
      setToast("Taslak olarak kaydedildi.")
    } else {
      // Gönderildi durumunda Paylaşım Seçeneklerini Göster
      setToast("Form hazırlandı. Gönderim seçeneklerini seçin.");
      setShareOpen(true);
    }
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
        <Field label="Güzergah / Açıklama" htmlFor="guzergah">
          <Textarea id="guzergah" value={data.guzergah} onChange={(e) => set("guzergah", e.target.value)} placeholder="Örn: Kadıköy - Gebze Şantiye - Kadıköy" />
        </Field>
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
          {isExporting ? "İNDİRİLİYOR..." : <><Send className="mr-2 size-5" />GÖNDER</>}
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

      <ShareModal open={shareOpen} data={data} onClose={() => setShareOpen(false)} />
    </div>
  )
}
