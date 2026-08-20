"use client"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
export function FormHeader({admin,onDownload}:{admin:boolean;onDownload:()=>void}){return <header className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><img src="/bilgicevre-logo.png" alt="BİLGİÇEVRE" className="h-auto w-full max-w-[430px] object-contain object-left"/>{admin&&<Button variant="outline" onClick={onDownload} className="gap-2"><Download className="size-4"/>Kayıtları indir</Button>}</div><h1 className="mt-4 border-t pt-4 text-xl font-bold">GÜNLÜK ARAÇ KULLANIM TAKİP FORMU</h1></header>}
