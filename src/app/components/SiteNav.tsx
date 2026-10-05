'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import styles from './SiteNav.module.css'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Collection', href: '/#collection' },
  { label: 'Team', href: '/#team' },
  { label: 'Eligibility', href: '/eligibility' },
  { label: 'Wallet Tracker', href: '/wallet-tracker' },
  { label: 'Trading Desk', href: '/trading' },
  { label: 'Community', href: 'https://discord.gg/mDsMXCUDXy' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  return <nav className={styles.nav} aria-label="Main navigation">
    <div className={styles.inner}>
      <a className={styles.brand} href="https://x.com/shirennft" target="_blank" rel="noopener noreferrer">SHIRΞN</a>
      <button className={styles.toggle} type="button" aria-label="Toggle menu" aria-expanded={open} aria-controls="site-nav-links" onClick={() => setOpen(!open)}>
        <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}/></svg>
      </button>
      <div id="site-nav-links" className={`${styles.links} ${open ? styles.open : ''}`}>
        {links.map(({ label, href }) => href.startsWith('http')
          ? <a key={href} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{label}</a>
          : href.includes('#') ? <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          : <Link key={href} href={href} aria-current={href === pathname ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
      </div>
    </div>
  </nav>
}
