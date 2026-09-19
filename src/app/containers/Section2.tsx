"use client"

import React from 'react'
import Image from 'next/image'

type Props = {
  onBack?: () => void
}

export default function Section2({ onBack }: Props) {
  

  return (
    <div className="shiren-clean shiren-collection relative z-20 bg-black overflow-visible md:overflow-hidden md:min-h-screen">
      <div className="banner relative">
        {/* overlay is transparent on white background */}
        <div className="absolute inset-0 bg-transparent pointer-events-none z-20" />
        {/* decorative orb GIF centered behind the rotating cards */}
        <div className="orb absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Image src="/orb3.webp" alt="orb" width={480} height={480} className="object-contain" />
        </div>

        <div className="slider" style={{ '--quantity': 7 } as any}>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 1 } as any}>
            <Image src="/SHIREN%20NFT/thaiji.png" alt="Thaiji" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 2 } as any}>
            <Image src="/SHIREN%20NFT/samb.png" alt="Sam" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 3 } as any}>
            <Image src="/SHIREN%20NFT/hainguyen.png" alt="Hai Nguyen" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 4 } as any}>
            <Image src="/SHIREN%20NFT/safetybot.png" alt="Safety Bot" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 5 } as any}>
            <Image src="/SHIREN%20NFT/ripdoteth.png" alt="Sasha" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 6 } as any}>
            <Image src="/SHIREN%20NFT/sasha.png" alt="Sasha" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 7 } as any}>
            <Image src="/SHIREN%20NFT/samarth.png" alt="Kucing" fill className="object-cover" />
          </div>
  </div>

  <div className="content">
          <h1
            data-content="COMING SOON"
            className="mx-auto glow-text cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onBack?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onBack?.()
              }
            }}
          >
            COMING SOON
          </h1>
          <div className="model"></div>
        </div>

        <div className="w-full flex justify-center mt-2 ticket-pass-header">
        <button
          onClick={() => onBack?.()}
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
      </div>
    </div>
  )
}
