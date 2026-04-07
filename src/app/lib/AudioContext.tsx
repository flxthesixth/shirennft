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
  const userPausedRef = useRef<boolean>(false)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.9)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const defaultPlaylist: Track[] = [
    // Populate playlist from known public audio files. Use `encodeURIComponent`
    // to ensure special characters (like '&' or brackets) are encoded so
    // the file path resolves correctly from `public/` when served at '/'.
    { title: 'Sam Feldt - Show Me Love (EDX\'s Indian Summer Remix)', src: '/' + encodeURIComponent("Sam Feldt - Show Me Love (EDX's Indian Summer Remix) [Official Video].mp3") },
    { title: 'Tenxi & Jemsii - Bintang 5 (8D)', artist: 'Tenxi & Jemsii', src: '/' + encodeURIComponent('Tenxi & Jemsii - Bintang 5 (8D AUDIO).mp3') },
    { title: 'YOASOBI - Racing Into The Night', src: '/' + encodeURIComponent('YOASOBI - Racing Into The Night Lyrics (JPNROMENG).mp3') },
    { title: 'ZHU - Cocaine Model', src: '/' + encodeURIComponent('ZHU - Cocaine Model [OFFICIAL VIDEO HD].mp3') },
    { title: 'ZHU - Working for It (feat. Skrillex)', src: '/' + encodeURIComponent('ZHU - Working for It (feat. Skrillex).mp3') },
  ]
  const [playlist] = useState<Track[]>(defaultPlaylist)

  // ensure audio element exists
  useEffect(() => {
    if (!audioRef.current) {
      const a = document.createElement('audio')
      a.preload = 'metadata'
      a.style.display = 'none'
      // Do not autoplay immediately; we'll attempt playback after a short
      // 'idle' period so the UX feels less abrupt.
      a.autoplay = false
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

    // Do not start playback immediately here; idle/autoplay logic will handle
    // when to attempt playback so it's not abrupt on page load.

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
    // clear manual pause flag when programmatically starting playback
    userPausedRef.current = false
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

  // Idle autoplay: if the user is idle for N seconds, try to play
  useEffect(() => {
    let idle = false
    let timeoutId: number | null = null
    let interacted = false

    const reset = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      idle = false
      timeoutId = window.setTimeout(() => {
        idle = true
        // attempt autoplay when idle
        if (!playing && !userPausedRef.current) {
          // First try to unmute and play (user wants unmuted autoplay after standby).
          const a = audioRef.current
          if (a) {
            try {
              a.muted = false
              setMuted(false)
            } catch (e) {
              // ignore
            }
          }
          // only try to play; if browser blocks unmuted autoplay we'll fallback
          // to a muted autoplay so at least audio will start silently.
          play()
            .then(() => {
              // started playing unmuted
            })
            .catch((err: any) => {
              console.debug('[Audio] idle unmuted play() blocked, falling back to muted autoplay', err)
              setAutoplayBlocked(true)
              try {
                if (a) {
                  a.muted = true
                  setMuted(true)
                  a.play().catch((err2) => console.debug('[Audio] muted fallback failed', err2))
                }
              } catch (e) {
                console.debug('[Audio] muted fallback error', e)
              }
            })
        }
      }, 10_000) // 10s idle
    }

    const onUser = () => {
      interacted = true
      // reset idle timer on meaningful user gestures; do not auto-unmute/play on simple mousemove
      // (we'll only listen to gesture events below)
      reset()
    }

    // listen only to gesture events (mousedown/touchstart/keydown). Avoid `mousemove` because
    // it is noisy and should not be considered a user gesture that unpauses/unmutes playback.
    ['mousedown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, onUser))
    reset()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      ['mousedown', 'keydown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, onUser))
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
    autoplayBlocked,
  }

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  )
}
