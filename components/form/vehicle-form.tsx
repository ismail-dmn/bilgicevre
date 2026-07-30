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
import { VEHICLES, DRIVERS, CHECKLIST_ITEMS, EQUIPMENT_ITEMS } from "@/lib/form-config"
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
      // Gönderildi durumunda Excel Çıktısını Al
      setIsExporting(true)
      try {
        const response = await fetch('/api/export-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data!),
        });

        if (!response.ok) {
          throw new Error('Dosya indirilemedi');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Arac_Kullanim_${data!.plaka || 'Form'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        
        a.remove();
        window.URL.revokeObjectURL(url);

        setToast("Form başarıyla Excel olarak indirildi!");
        setShareOpen(true); // İndikten sonra paylaşım penceresini de açmaya devam etsin
      } catch (error) {
        console.error("Hata:", error);
        alert("Excel oluşturulurken bir hata oluştu.");
      } finally {
        setIsExporting(false)
      }
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

      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="mb-2 flex items-center font-semibold">
            <AlertCircle className="mr-2 size-4" />
            Lütfen hataları düzeltin:
          </div>
          <ul className="list-inside list-disc space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Araç & Sürücü Bilgileri */}
      <Section title="ARAÇ & SÜRÜCÜ BİLGİLERİ">
        <Field label="Araç Plakası" required>
          <SelectInput
            value={data.plaka}
            onChange={(v) => {
              set("plaka", v)
              const vh = VEHICLES.find((x) => x.plaka === v)
              if (vh) {
                set("kmBaslangic", vh.sonKm)
                set("kmBitis", "") // Plaka değiştiğinde bitiş KM'sini sıfırla
              }
            }}
            options={VEHICLES.map((v) => ({ label: v.plaka, value: v.plaka }))}
            placeholder="Araç Seçin"
          />
        </Field>
        <Field label="Sürücü" required>
          <SelectInput
            value={data.surucu}
            onChange={(v) => set("surucu", v)}
            options={DRIVERS.map((d) => ({ label: d, value: d }))}
            placeholder="Sürücü Seçin"
          />
        </Field>
        <Field label="Tarih" required>
          <TextInput type="date" value={data.tarih} onChange={(v) => set("tarih", v)} />
        </Field>
      </Section>

      {/* 2. Kilometre */}
      <Section title="KİLOMETRE BİLGİSİ">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Başlangıç KM" required>
            <NumberInput
              value={data.kmBaslangic}
              onChange={(v) => set("kmBaslangic", onlyDigits(v))}
              placeholder="Örn: 152000"
            />
          </Field>
          <Field label="Bitiş KM" required>
            <NumberInput
              value={data.kmBitis}
              onChange={(v) => set("kmBitis", onlyDigits(v))}
              placeholder="Örn: 152150"
            />
          </Field>
        </div>
      </Section>

      {/* 3. Yakıt Durumu */}
      <Section title="YAKIT DURUMU">
        <Field label="Araç Teslim Edildiğinde Yakıt Seviyesi" required>
          <SegmentToggle
            options={["ÇEYREK", "YARIM", "FULL"]}
            value={data.yakitDurumu}
            onChange={(v) => set("yakitDurumu", v as any)}
          />
        </Field>
        <Field label="Son Yakıt Alınan Tarih">
          <TextInput type="date" value={data.yakitTarihi} onChange={(v) => set("yakitTarihi", v)} />
        </Field>
      </Section>

      {/* 4. Görev Bilgileri */}
      <Section title="GÖREV BİLGİLERİ">
        <Field label="Kullanım Güzergahı / Amacı" required>
          <Textarea
            value={data.guzergah}
            onChange={(v) => set("guzergah", v)}
            placeholder="Örn: Merkez ofisten şantiyeye malzeme transferi..."
            rows={3}
          />
        </Field>
        <Field label="Araçtaki Diğer Personeller">
          <TextInput
            value={data.digerPersoneller}
            onChange={(v) => set("digerPersoneller", v)}
            placeholder="İsim soyisim giriniz (Opsiyonel)"
          />
        </Field>
      </Section>

      <RulesAccordion />

      {/* 5. Araç Kontrol Formu */}
      <Section title="ARAÇ KONTROL LİSTESİ" description="Tüm kontrollerin yapılması zorunludur.">
        <div className="grid grid-cols-1 gap-3">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-3 shadow-sm">
              <label className="mb-2 block text-sm font-semibold">{item.label}</label>
              <SegmentToggle
                options={["Uygun", "Uygun Değil", "Diğer"]}
                value={data.kontroller[item.id]}
                onChange={(v) => {
                  set("kontroller", {
                    ...data.kontroller,
                    [item.id]: v as KontrolDurum,
                  })
                }}
              />
            </div>
          ))}
        </div>
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
