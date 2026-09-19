'use client'

import Section1 from '@/app/containers/Section1'

import { useState } from 'react'
import Section2 from './containers/Section2'
import Section3 from './containers/Section3'
import { AnimatePresence, motion } from 'framer-motion'

// NOTE: ganti ini dengan URL Discord kamu yang sebenarnya
const DISCORD_URL = 'https://discord.gg/mDsMXCUDXy'

export default function Home() {
  const [active, setActive] = useState<'home' | 'pass' | 'about'>('home')

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
                onSelect={(id) => {
                  setActive(id === 'pass' ? 'pass' : 'about')
                }}
                discordUrl={DISCORD_URL}
                skipIntroDelay
              />
            )}

            {active === 'pass' && <Section2 onBack={() => setActive('home')} />}

            {active === 'about' && <Section3 onBack={() => setActive('home')} />}
          </motion.div>
        </AnimatePresence>
    </main>
  )
}
