"use client"

import React, { useEffect, useRef, useState } from 'react'

type Props = React.PropsWithChildren<{ className?: string }>

export function ScrollVelocityContainer({ children, className }: Props) {
  // Render each child as its own horizontal marquee row stacked vertically.
  return (
    <div
      className={className ?? ''}
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#000' }}
    >
      {React.Children.map(children, (child, i) => (
        <div key={i} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {child}
        </div>
      ))}
    </div>
  )
}

export function ScrollVelocityRow({ children, baseVelocity = 10, direction = 1 }: React.PropsWithChildren<{ baseVelocity?: number; direction?: 1 | -1 }>) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [copies, setCopies] = useState<number>(2)
  // persistent position refs so recreating the RAF loop doesn't jump
  const posRef = useRef<number>(0)
  const displayPosRef = useRef<number>(0)
  const prevWidthRef = useRef<number | null>(null)

  // measure and decide how many copies we need so there's no visible gap
  useEffect(() => {
    const resize = () => {
      const track = trackRef.current
      const container = containerRef.current
      if (!track || !container) return
      const first = track.children[0] as HTMLElement | undefined
      if (!first) return
      const singleWidth = first.scrollWidth || 0
      const containerWidth = container.clientWidth || container.offsetWidth || 0
      if (singleWidth <= 0 || containerWidth <= 0) return
      const needed = Math.max(2, Math.ceil(containerWidth / singleWidth) + 1)
      if (needed !== copies) setCopies(needed)
    }

    // measure after a tick so initial render has painted
    const to = setTimeout(resize, 50)
    window.addEventListener('resize', resize)
    return () => {
      clearTimeout(to)
      window.removeEventListener('resize', resize)
    }
  }, [copies])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const first = track.children[0] as HTMLElement | undefined
    if (!first) return

    let raf = 0
    let lastTime = performance.now()
    let startTimeRef = 0
    const singleWidthInitial = first.scrollWidth || 0
    if (singleWidthInitial === 0) return

    // Map baseVelocity (arbitrary units) to pixels per second. Conservative multiplier.
    const pxPerSecond = Math.max(0, baseVelocity) * 0.6
    const smoothing = 0.12 // lerp alpha for display smoothing (0-1)

    const step = (now: number) => {
      const dt = Math.min(50, now - lastTime) // cap delta to avoid huge jumps (smaller cap for startup)
      lastTime = now

      const singleWidth = first.scrollWidth || singleWidthInitial || 1

      // If width changed significantly, snap display position to logical position to avoid big jumps
      const prevW = prevWidthRef.current
      if (prevW !== null && Math.abs(singleWidth - prevW) > 8) {
        // adjust both refs proportionally to new width
        // keep ratio of position to width
        const ratio = prevW > 0 ? (posRef.current / prevW) : 0
        posRef.current = (ratio * singleWidth) % singleWidth
        displayPosRef.current = posRef.current
      }
      prevWidthRef.current = singleWidth

      // ramp up factor to avoid an initial burst — smooth from 0->1 over rampMs
      if (!startTimeRef) startTimeRef = now
      const rampMs = 600
      const elapsedSinceStart = Math.max(0, now - startTimeRef)
      const accel = Math.min(1, elapsedSinceStart / rampMs)

      // update logical position (apply accel)
      posRef.current += pxPerSecond * accel * (dt / 1000) * (direction || 1)

      // normalize into [0, singleWidth)
      posRef.current = ((posRef.current % singleWidth) + singleWidth) % singleWidth

      // smooth displayed position to reduce stutter, but handle wrap-around by snapping when difference is large
      const target = posRef.current
      let delta = target - displayPosRef.current
      // choose shortest circular delta
      if (Math.abs(delta) > singleWidth / 2) {
        // snap to target to avoid long interpolation across wrap
        displayPosRef.current = target
      } else {
        displayPosRef.current += delta * smoothing
      }

      track.style.transform = `translateX(${-displayPosRef.current}px)`
      raf = requestAnimationFrame(step)
    }

    // Initialize display pos to logical pos to avoid an initial jump
    displayPosRef.current = posRef.current

    // Helper to start RAF after two frames
    let startHandle = 0
    const startAfterRaf = () => {
      startHandle = requestAnimationFrame(() => {
        startHandle = requestAnimationFrame(() => {
          raf = requestAnimationFrame(step)
        })
      })
    }

    // Wait for images/fonts to stabilize before starting to avoid incorrect width measurement on refresh
    const waitForAssetsAndStart = async () => {
      try {
        const trackEl = track as HTMLElement
        if (trackEl) {
          // hide track visually until we're ready to avoid visible jump/glitch
          try {
            trackEl.style.opacity = '0'
          } catch (e) {
            // ignore
          }
          const imgs: HTMLImageElement[] = Array.from(trackEl.querySelectorAll('img'))
          const notLoaded = imgs.filter((img) => !img.complete)
          if (notLoaded.length > 0) {
            // wait for all images or timeout after 700ms
            await Promise.race([
              Promise.all(
                notLoaded.map(
                  (img) =>
                    new Promise<void>((res) => {
                      img.addEventListener('load', () => res(), { once: true })
                      img.addEventListener('error', () => res(), { once: true })
                    })
                )
              ),
              new Promise((res) => setTimeout(res, 700)),
            ])
          }
        }

        // also wait a short time for fonts to be ready (if supported)
        if ((document as any).fonts && (document as any).fonts.ready) {
          await Promise.race([ (document as any).fonts.ready, new Promise((res) => setTimeout(res, 300)) ])
        }
      } catch (e) {
        // ignore and start
      } finally {
        startAfterRaf()
        // fade in track once RAF started
        try {
          // small timeout to ensure transform applied at least once
          setTimeout(() => {
            if (track && (track as HTMLElement).style) {
              ;(track as HTMLElement).style.transition = 'opacity 260ms ease'
              ;(track as HTMLElement).style.opacity = '1'
            }
          }, 120)
        } catch (e) {
          // ignore
        }
      }
    }

    waitForAssetsAndStart()

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(startHandle)
    }
  }, [baseVelocity, direction, copies])

  // Render N copies of the content back-to-back with a single non-breaking space between copies
  const renderedCopies = [] as React.ReactNode[]
  for (let i = 0; i < copies; i++) {
    renderedCopies.push(
      <span key={`c-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex' }}>{children}</span>
        {/* single non-breaking space as explicit separator */}
        <span style={{ whiteSpace: 'pre' }}>{'\u00A0'}</span>
      </span>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div ref={trackRef} style={{ display: 'inline-flex', whiteSpace: 'nowrap', willChange: 'transform', color: 'inherit' }}>
        {renderedCopies}
      </div>
    </div>
  )
}

export default ScrollVelocityContainer
