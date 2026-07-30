"use client"

import { useState } from "react"
import { ChevronDown, ShieldAlert } from "lucide-react"
import { USAGE_RULES } from "@/lib/form-config"
import { cn } from "@/lib/utils"

export function RulesAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <ShieldAlert className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">Araç Kullanım Kuralları</span>
          <span className="block text-xs text-muted-foreground">Sürüş öncesi lütfen okuyunuz</span>
        </span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="list-decimal space-y-2 border-t border-border px-6 py-4 pl-8 text-sm leading-relaxed text-muted-foreground">
          {USAGE_RULES.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
