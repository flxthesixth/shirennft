import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import '../styles/globals.css'

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
    icon: '/SHIREN_NEW_LOGO_WHITE.png',
    shortcut: '/SHIREN_NEW_LOGO_WHITE.png',
    apple: '/SHIREN_NEW_LOGO_WHITE.png',
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
        <link rel="icon" href="/SHIREN_NEW_LOGO_WHITE.png?v=2" />
        <link rel="shortcut icon" href="/SHIREN_NEW_LOGO_WHITE.png?v=2" />
        <link rel="apple-touch-icon" href="/SHIREN_NEW_LOGO_WHITE.png?v=2" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={vazirmatn.className}>{children}</body>
    </html>
  )
}
