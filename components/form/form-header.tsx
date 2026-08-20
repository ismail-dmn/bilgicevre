"use client"
import Image from "next/image"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
export function FormHeader({onDownload,admin}:{onDownload:()=>void;admin:boolean}){return <header className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><Image src="/bilgicevre-logo.png" alt="BİLGİÇEVRE" width={420} height={120} className="h-12 w-auto object-contain object-left" priority/>{admin&&<Button type="button" variant="outline" onClick={onDownload} className="gap-2"><Download className="size-4"/>Kayıtları indir</Button>}</div><h1 className="mt-4 border-t pt-4 text-xl font-bold sm:text-2xl">GÜNLÜK ARAÇ KULLANIM TAKİP FORMU</h1></header>}
