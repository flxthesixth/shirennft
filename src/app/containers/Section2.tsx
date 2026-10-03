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
        <div className="slider" style={{ '--quantity': 7 } as any}>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 1 } as any}>
            <Image src="/collection/thaiji.webp" alt="Thaiji" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 2 } as any}>
            <Image src="/collection/samb.webp" alt="Sam" fill priority sizes="(max-width: 767px) 144px, 200px" className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 3 } as any}>
            <Image src="/collection/hainguyen.webp" alt="Hai Nguyen" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 4 } as any}>
            <Image src="/collection/safetybot.webp" alt="Safety Bot" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 5 } as any}>
            <Image src="/collection/ripdoteth.webp" alt="Sasha" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 6 } as any}>
            <Image src="/collection/sasha.webp" alt="Sasha" fill className="object-cover" />
          </div>
          <div className="item relative w-36 h-44 md:w-auto md:h-auto" style={{ '--position': 7 } as any}>
            <Image src="/collection/samarth.webp" alt="Kucing" fill className="object-cover" />
          </div>
  </div>
        <div className="shiren-back">
          <button onClick={() => onBack?.()} className="shiren-back-button" type="button">
            <span aria-hidden="true">←</span> Back
          </button>
        </div>
      </div>
    </div>
  )
}
