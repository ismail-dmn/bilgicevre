"use client"
import { AuthGate } from "@/components/form/auth-gate"
import { VehicleForm } from "@/components/form/vehicle-form"
export default function FormPage(){return <AuthGate>{u=><main className="min-h-screen bg-background"><VehicleForm currentUser={u}/></main>}</AuthGate>}
