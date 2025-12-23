"use client"

import { useRouter } from 'next/navigation'
import TiltCard from '../components/TiltCard'
import { motion } from 'framer-motion'

export default function Section4() {
  const router = useRouter()
  const cards = [
    { id: 1, title: 'Silver Pass', image: '/shirensilver.png' },
    { id: 2, title: 'Gold Pass', image: '/shirengold.png' },
    { id: 3, title: 'Magical Avatar Pass', image: '/shirenmagical.png' },
  ]

  return (
    <main className="min-h-screen bg-[#07070a] text-white flex items-center justify-center py-16">
        <motion.div className="w-full max-w-7xl px-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="relative mb-10 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-center">Ticket Pass</h1>
          </div>

          <div className="cards-grid mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-20 lg:gap-24 items-stretch">
            {cards.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.08 }}>
                <TiltCard title={c.title} image={c.image} />
              </motion.div>
            ))}
          </div>

          {/* Back button centered below cards */}
          <div className="w-full flex justify-center mt-8 ticket-pass-header">
            <button
              onClick={() => router.push('/')}
              className="back-btn"
              aria-label="Back"
              type="button"
            >
              <span className="outline" aria-hidden>
                <svg className="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </span>
            </button>
          </div>
        </motion.div>
    </main>
  )
}
