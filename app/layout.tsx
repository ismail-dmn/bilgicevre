import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BİLGİÇEVRE | Günlük Araç Kullanım Takip Formu',
  description:
    'BİLGİÇEVRE günlük araç kullanım takip formu. Telefon veya tabletten hızlıca doldurun, Excel çıktısı alın, e-posta veya WhatsApp ile paylaşın.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Araç Takip',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1f9d55',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="light bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
