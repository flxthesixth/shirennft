import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import '../styles/globals.css'

const vazirmatn = Vazirmatn({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SHIREN',
  description: 'SHIREN by flxthesixth',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={vazirmatn.className}>{children}</body>
    </html>
  )
}
