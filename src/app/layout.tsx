import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import '../styles/globals.css'
import { AudioProvider } from './lib/AudioContext'

const vazirmatn = Vazirmatn({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SHIREN',
    template: '%s | SHIREN'
  },
  description: 'find your orb, collect your shiren',
  icons: {
    icon: '/icon-256.png',
    shortcut: '/icon-256.png',
    apple: '/icon-256.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Explicit favicons (cache-busted) to avoid stale icons on deploy */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-256.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-256.png" />
        <link rel="shortcut icon" href="/icon-256.png" />
        <link rel="apple-touch-icon" href="/icon-256.png" />
        <meta name="theme-color" content="#0c2748" />
      </head>
      <body className={vazirmatn.className}>
        <AudioProvider>{children}</AudioProvider>
      </body>
    </html>
  )
}
