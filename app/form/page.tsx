"use client"

import { VehicleForm } from "@/components/form/vehicle-form"
import { AuthGate } from "@/components/form/auth-gate"

export default function FormPage() {
  return <AuthGate>{(profile) => <main className="min-h-screen bg-background"><VehicleForm currentUser={profile} /></main>}</AuthGate>
}
