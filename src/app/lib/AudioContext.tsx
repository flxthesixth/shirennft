"use client"

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react'

type Track = { title: string; src: string; artist?: string }

type AudioContextValue = {
  playing: boolean
  index: number
  playlist: Track[]
  play: () => Promise<void>
  pause: () => void
  toggle: () => Promise<void>
  next: () => void
  prev: () => void
  seek: (t: number) => void
  setVolume: (v: number) => void
  muted: boolean
  setMuted: (m: boolean) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function useAudio() {
  const c = React.useContext(AudioCtx)
  if (!c) throw new Error('useAudio must be used inside AudioProvider')
  return c
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.9)

  const defaultPlaylist: Track[] = [
    { title: 'Bintang 5 (8D)', artist: 'Tenxi & Jemsii', src: encodeURI('/Tenxi & Jemsii - Bintang 5 (8D AUDIO).mp3') },
  ]
  const [playlist] = useState<Track[]>(defaultPlaylist)

  // ensure audio element exists
  useEffect(() => {
    if (!audioRef.current) {
      const a = document.createElement('audio')
      a.preload = 'metadata'
      a.style.display = 'none'
      document.body.appendChild(a)
      audioRef.current = a
    }

    const a = audioRef.current!
    a.src = playlist[index].src
    a.volume = volume
    a.muted = muted

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setIndex((i) => (i + 1) % playlist.length)

    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)

    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // update src when index changes
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.src = playlist[index].src
    a.load()
    if (playing) {
      const p = a.play()
      if (p && typeof (p as any).catch === 'function') (p as any).catch(() => setPlaying(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = volume
  }, [volume])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.muted = muted
  }, [muted])

  const play = useCallback(async () => {
    const a = audioRef.current
    if (!a) return
    try {
      await a.play()
      setPlaying(true)
    } catch (e) {
      setPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    a.pause()
    setPlaying(false)
  }, [])

  const toggle = useCallback(async () => {
    if (playing) pause()
    else await play()
  }, [playing, pause, play])

  const next = useCallback(() => setIndex((i) => (i + 1) % playlist.length), [playlist.length])
  const prev = useCallback(() => setIndex((i) => (i - 1 + playlist.length) % playlist.length), [playlist.length])

  const seek = useCallback((t: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = t
  }, [])

  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), [])

  // Idle autoplay: if the user is idle for N seconds, try to play
  useEffect(() => {
    let idle = false
    let timeoutId: number | null = null
    let interacted = false

    const reset = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      idle = false
      timeoutId = window.setTimeout(() => {
        idle = true
        // attempt autoplay when idle
        if (!playing) {
          // only try to play; browsers may block but we'll silently handle rejection
          play().catch(() => {})
        }
      }, 10_000) // 10s idle
    }

    const onUser = () => {
      interacted = true
      reset()
    }

    ['mousemove', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, onUser))
    reset()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      ['mousemove', 'keydown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, onUser))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, playing])

  const value: AudioContextValue = {
    playing,
    index,
    playlist,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    muted,
    setMuted,
  }

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  )
}
