"use client"

import React, { forwardRef, useRef } from "react"

import { cn } from "../lib/utils"
import { AnimatedBeam } from "./ui/animated-beam"

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "border-border z-10 flex size-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      {children}
    </div>
  )
})

Circle.displayName = "Circle"

export function AnimatedBeamMultipleOutputDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const rightRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]

  const dapps = [
    { name: "FTK", img: "/pfpftk.png" },
    { name: "RISEX", img: "/risex.jpg" },
    { name: "ICARUS", img: "/icarus.jpg" },
    { name: "SPINE", img: "/spine.jpg" },
    { name: "YEARN", img: "/yearn.jpg" },
    { name: "STAGE0", img: "/stage0.jpg" },
  ]

  const urlFor = (name: string) => {
    switch (name.toUpperCase()) {
      case "RISE":
        return "https://x.com/risechain"
      case "RISEX":
        return "https://x.com/RISEx_trade"
      case "SHIREN":
        return "https://x.com/shiren_NFT"
      case "FTK":
        return "https://x.com/4thekingdom_xyz"
      case "SPINE":
        return "https://x.com/spineprotocol"
      case "YEARN":
        return "https://x.com/yearnfi"
      case "ICARUS":
        return "https://x.com/Icarus_Fi"
      case "STAGE0":
        return "https://x.com/Stage0_"
      default:
        return undefined
    }
  }

  return (
    <div ref={containerRef} className={cn("relative flex w-full items-center justify-center overflow-hidden p-6 md:p-24 mx-auto", className)}>
      <div className="flex flex-col md:flex-row w-full max-w-[2400px] items-center justify-between gap-10 md:gap-48">
        {/* Left: RISE (icon) */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <a href={urlFor("RISE")} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">
              <div ref={leftRef} className="rounded-full bg-white/6 border border-white/10 p-2 flex items-center justify-center">
                <img src="/pfprise.png" alt="RISE" className="w-14 h-14 md:w-24 md:h-24 object-contain" />
              </div>
              <div className="text-xs md:text-sm font-semibold text-white mt-2">RISE</div>
            </a>
          </div>
        </div>

        {/* Center: SHIREN (logo) */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <a href={urlFor("SHIREN")} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">
              <div ref={centerRef} className="rounded-full bg-white/6 border border-white/10 p-2 flex items-center justify-center">
                <img src="/shiren_pfp.JPG" alt="SHIREN" className="w-14 h-14 md:w-24 md:h-24 object-cover rounded-full" />
              </div>
              <div className="text-xs md:text-sm font-semibold text-white mt-2">SHIREN</div>
            </a>
          </div>
        </div>

        {/* Right: Dapps list with images */}
        <div className="flex flex-row flex-wrap md:flex-col items-center justify-center gap-4 md:gap-6">
          {dapps.map((it, i) => (
            <div key={it.name} className="flex flex-col items-center gap-1 md:gap-2">
              <a href={urlFor(it.name) ?? "#"} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">
                <div ref={rightRefs[i]} className="rounded-full bg-white/6 border border-white/8 p-1">
                  <img src={it.img} alt={it.name} className="w-10 h-10 md:w-20 md:h-20 object-cover rounded-full" />
                </div>
                <div className="text-xs md:text-sm font-semibold text-white">{it.name}</div>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Beams: center to left and center to each dapp on right */}
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={leftRef} />
      {rightRefs.map((r, idx) => (
        <AnimatedBeam key={idx} containerRef={containerRef} fromRef={centerRef} toRef={r} />
      ))}
      
      {/* Beams: dapp to center and center to left  */}
      {/* {rightRefs.map((r, idx) => (
        <AnimatedBeam key={idx} containerRef={containerRef} fromRef={r} toRef={centerRef} />
      ))}
      <AnimatedBeam containerRef={containerRef} fromRef={leftRef} toRef={centerRef} /> */}
    </div>
  )
}

export default AnimatedBeamMultipleOutputDemo
