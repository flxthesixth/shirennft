'use client'

import Section1 from '@/app/containers/Section1'

import { useEffect, useState } from 'react'
import Section2 from './containers/Section2'
import Section3 from './containers/Section3'
import { AnimatePresence, motion } from 'framer-motion'

// NOTE: ganti ini dengan URL Discord kamu yang sebenarnya
const DISCORD_URL = 'https://discord.gg/mDsMXCUDXy'

export default function Home() {
  const [active, setActive] = useState<'home' | 'pass' | 'about'>('home')
  useEffect(() => {
    const sync = () => setActive(location.hash === '#collection' ? 'pass' : location.hash === '#team' ? 'about' : 'home')
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  function select(id: 'home' | 'pass' | 'about') {
    history.pushState(null, '', id === 'pass' ? '/#collection' : id === 'about' ? '/#team' : '/')
    setActive(id)
  }

  return (
    <main>
      <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
            className="md:min-h-screen"
          >
            {active === 'home' && (
              <Section1
                onSelect={(id) => select(id === 'pass' ? 'pass' : 'about')}
                discordUrl={DISCORD_URL}
                skipIntroDelay
              />
            )}

            {active === 'pass' && <Section2 onBack={() => select('home')} />}

            {active === 'about' && <Section3 onBack={() => select('home')} />}
          </motion.div>
        </AnimatePresence>
    </main>
  )
}
