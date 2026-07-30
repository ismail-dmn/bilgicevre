export const dynamic = "force-static"

export function GET() {
  const manifest = {
    name: "BİLGİÇEVRE Günlük Araç Kullanım Takip Formu",
    short_name: "Araç Takip",
    description: "BİLGİÇEVRE günlük araç kullanım takip formu",
    start_url: "/form",
    scope: "/form",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4faf7",
    theme_color: "#1f9d55",
    icons: [
      { src: "/bilgicevre-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  })
}
