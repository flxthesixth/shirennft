"use client"

import React, { useEffect, useRef } from 'react'

type Props = React.PropsWithChildren<{ className?: string }>

export function ScrollVelocityContainer({ children, className }: Props) {
  return (
    <div className={className ?? ''} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
      {children}
    </div>
  )
}

export function ScrollVelocityRow({ children, baseVelocity = 10, direction = 1 }: React.PropsWithChildren<{ baseVelocity?: number; direction?: 1 | -1 }>) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let pos = 0
    const speed = baseVelocity * 0.2 * (direction || 1)

    const step = () => {
      pos = (pos + speed) % (el.scrollWidth || 1)
      el.style.transform = `translateX(${ -pos }px)`
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [baseVelocity, direction])

  return (
    <div ref={ref} style={{ display: 'inline-block', willChange: 'transform' }}>
      {children}
    </div>
  )
}

export default ScrollVelocityContainer
