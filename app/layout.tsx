import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s — Civic Park',
    default: 'Civic Park — Crowdsourced Parking Enforcement, Bangalore',
  },
  description: 'Report illegal parking in Bangalore. Crowdsourced enforcement for Bangalore Traffic Police.',
  keywords: ['Bangalore', 'parking', 'traffic', 'civic', 'reporting', 'BTP'],
  icons: {
    icon: { url: '/icon.png', type: 'image/png' },
    apple: { url: '/apple-touch-icon.png' },
  },
  openGraph: {
    title: 'Civic Park — Bangalore Illegal Parking Reporting',
    description: 'Report illegal parking in Bangalore. Crowdsourced enforcement for Bangalore Traffic Police.',
    images: [{ url: '/images/OG : Social Preview Image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Civic Park',
    description: 'Report illegal parking in Bangalore.',
    images: ['/images/OG : Social Preview Image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Civic Park',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-mode="light" data-grain="on" data-density="default">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Fraunces:ital,wght@0,400;0,600;1,400&family=Noto+Sans+Kannada:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
