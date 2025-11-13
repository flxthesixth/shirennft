'use client'

import Loading from './containers/Loading'
import Section1 from '@/app/containers/Section1'

import { useState } from 'react'
import Section2 from './containers/Section2'
import Section3 from './containers/Section3'
import { AnimatePresence, motion } from 'framer-motion'

// NOTE: ganti ini dengan URL Discord kamu yang sebenarnya
const DISCORD_URL = 'https://discord.gg/mDsMXCUDXy'

export default function Home() {
  const [active, setActive] = useState<'home' | 'pass' | 'about'>('home')
  // track whether this is the first time landing on the home section
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  // State to track initial page load
  const [isInitialPageLoad, setIsInitialPageLoad] = useState(true)

  // Effect to handle initial page load
  // NOTE: we no longer auto-clear the initial page load flag on mount
  // The `Loading` component will call `onFinished` when its animation completes
  // and notify us to hide the loading screen. This prevents the loading
  // from disappearing immediately on refresh.

  // no page transitions — render sections directly

  return (
    <main>
      {/* Immediate lightweight overlay to prevent Section1 flash before the Loading component mounts */}
      {isInitialPageLoad && (
        <div className="fixed inset-0 z-50 bg-white" aria-hidden />
      )}
      {/* keep loading visible until Loading calls onFinished */}
      {isInitialPageLoad && <Loading onFinished={() => setIsInitialPageLoad(false)} />}

      {/*
        When we're in the initial page load, render Section1 directly (no motion)
        so the handoff from Loading -> Section1 has no transition. After the
        initial load completes, use AnimatePresence + motion for smooth page
        transitions between sections.
      */}
      {isInitialPageLoad && active === 'home' ? (
        <Section1
          onSelect={(id) => {
            setIsFirstVisit(false)
            setActive(id === 'pass' ? 'pass' : 'about')
          }}
          discordUrl={DISCORD_URL}
          skipIntroDelay={!isFirstVisit}
          isInitialLoad={isInitialPageLoad}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
            className="min-h-screen"
          >
            {active === 'home' && (
              <Section1
                onSelect={(id) => {
                  setIsFirstVisit(false)
                  setActive(id === 'pass' ? 'pass' : 'about')
                }}
                discordUrl={DISCORD_URL}
                skipIntroDelay={!isFirstVisit}
                isInitialLoad={isInitialPageLoad}
              />
            )}

            {active === 'pass' && <Section2 onBack={() => setActive('home')} />}

            {active === 'about' && <Section3 onBack={() => setActive('home')} />}
          </motion.div>
        </AnimatePresence>
      )}
    </main>
  )
}
