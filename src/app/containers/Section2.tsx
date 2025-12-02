"use client"

import React from 'react'
import Image from 'next/image'

type Props = {
  onBack?: () => void
}

export default function Section2({ onBack }: Props) {
  

  return (
    <div className="relative z-20 bg-black overflow-visible md:overflow-hidden md:min-h-screen">
      <div className="banner relative">
        {/* overlay is transparent on white background */}
        <div className="absolute inset-0 bg-transparent pointer-events-none z-20" />
        {/* decorative orb GIF centered behind the rotating cards */}
        <div className="orb absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Image src="/orb3.gif" alt="orb" width={480} height={480} className="object-contain" />
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
            <Image src="/SHIREN%20NFT/ripdoteth.png" alt="Rip dot eth" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 6 } as any}>
            <Image src="/SHIREN%20NFT/sasha.png" alt="Rip dot eth" fill className="object-cover" />
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
      </div>
    </div>
  )
}
