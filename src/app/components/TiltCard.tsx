"use client"

import React, { useEffect, useRef } from 'react'

type Props = {
  title: string
  subtitle?: string
  image: string
}

export default function TiltCard({ title, subtitle, image }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = elRef.current
    const img = imgRef.current
    if (!el) return

    let rafId: number | null = null
    let px = 0
    let py = 0
    // smoothed values
    let curRotX = 0
    let curRotY = 0
    let curLift = 0

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      // normalized -1..1
      px = (x - 0.5) * 2
      py = (y - 0.5) * 2
      if (rafId == null) rafId = requestAnimationFrame(update)
    }

    const update = () => {
      rafId = null
      // increase max degrees to make it more responsive
      const maxDeg = 14
      const targetRotY = px * maxDeg
      const targetRotX = -py * maxDeg
      const targetLift = Math.max(0, -py) * 12

      // lerp smoothed values for more natural movement
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t
      curRotX = lerp(curRotX, targetRotX, 0.14)
      curRotY = lerp(curRotY, targetRotY, 0.14)
      curLift = lerp(curLift, targetLift, 0.14)

      // apply transforms
      el.style.transform = `translateY(${ -Math.abs(curLift) }px) rotateX(${curRotX}deg) rotateY(${curRotY}deg) scale(1.04)`
      if (img) {
        const imgZ = 30 + Math.abs(curLift)
        const imgScale = 1.04 + Math.min(0.06, Math.abs(px) * 0.04)
        img.style.transform = `translateZ(${imgZ}px) scale(${imgScale})`
      }

      // continue animation if pointer still moved recently
      // no-op here; raf is scheduled on pointermove
    }

    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = null
      // reset to default so CSS transitions handle smooth return
      el.style.transform = ''
      if (img) img.style.transform = ''
      px = 0
      py = 0
      curRotX = 0
      curRotY = 0
      curLift = 0
    }

    // prefer pointer events for broader device support
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div ref={elRef} className="card rgb relative rounded-xl" style={{ transformStyle: 'preserve-3d' }}>
      <div className="card-inner rounded-xl overflow-hidden relative">
        <div ref={imgRef} className="card-image" style={{ backgroundImage: `url('${image}')` }} />
        <div className="card-overlay absolute left-0 right-0 bottom-0 p-4 flex flex-col items-center text-center">
          <h3 className="text-xl font-semibold">{title}</h3>
          {subtitle && <div className="text-sm text-white/70 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  )
}
