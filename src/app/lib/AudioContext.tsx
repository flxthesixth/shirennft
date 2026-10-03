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
  autoplayBlocked: boolean
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function useAudio() {
  const c = React.useContext(AudioCtx)
  if (!c) throw new Error('useAudio must be used inside AudioProvider')
  return c
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const indexInitializedRef = useRef(false)
  const userPausedRef = useRef<boolean>(false)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.9)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const defaultPlaylist: Track[] = [
    { title: 'SONG 1', src: '/shiren-song/black-catcher.mp3' },
    { title: 'SONG 2', src: '/shiren-song/silhouette.mp3' },
    { title: 'SONG 3', src: '/shiren-song/anime-mv.mp3' },
    { title: 'SONG 4', src: '/shiren-song/inferno.mp3' },
    { title: 'SONG 5', src: '/shiren-song/blue-encount.mp3' },
    { title: 'SONG 6', src: '/shiren-song/noragami-opening-2.mp3' },
  ]
  const [playlist] = useState<Track[]>(defaultPlaylist)

  // ensure audio element exists
  useEffect(() => {
    if (!audioRef.current) {
      const a = document.createElement('audio')
      a.preload = 'metadata'
      a.style.display = 'none'
      a.autoplay = true
      a.muted = false
      // reflect initial muted state in provider
      setMuted(false)
      document.body.appendChild(a)
      audioRef.current = a
    }

    const a = audioRef.current!
    // Ensure the src/volume/muted state are set before attempting to play.
    a.src = playlist[index].src
    a.volume = volume
    a.muted = muted

    // Attach diagnostic listeners to help debug autoplay / loading issues
    const onAudioError = (ev: any) => console.debug('[Audio] error', ev)
    const onLoadedMeta = () => console.debug('[Audio] loadedmetadata', { src: a.src })
    const onCanPlay = () => console.debug('[Audio] canplay', { src: a.src })
    const onCanPlayThrough = () => console.debug('[Audio] canplaythrough', { src: a.src })
    a.addEventListener('error', onAudioError)
    a.addEventListener('loadedmetadata', onLoadedMeta)
    a.addEventListener('canplay', onCanPlay)
    a.addEventListener('canplaythrough', onCanPlayThrough)

    // Audible autoplay may be blocked until the first user gesture.
    const attemptPlay = () => a.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true))
    attemptPlay()
    const onGesture = () => {
      if (userPausedRef.current || !a.paused) return
      attemptPlay()
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    // Cleanup diagnostics when effect re-runs / component unmounts
    const removeDiagnostics = () => {
      a.removeEventListener('error', onAudioError)
      a.removeEventListener('loadedmetadata', onLoadedMeta)
      a.removeEventListener('canplay', onCanPlay)
      a.removeEventListener('canplaythrough', onCanPlayThrough)
    }

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setIndex((i) => (i + 1) % playlist.length)

    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)

    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      removeDiagnostics()
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
    if (!indexInitializedRef.current) {
      indexInitializedRef.current = true
      return
    }
    a.src = playlist[index].src
    a.load()
    if (!userPausedRef.current) a.play().then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true))
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
    // clear manual pause flag when programmatically starting playback
    userPausedRef.current = false
    try {
      await a.play()
      setAutoplayBlocked(false)
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
    // mark that user explicitly paused playback so idle/autoplay won't resume
    userPausedRef.current = true
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
    autoplayBlocked,
  }

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  )
}
