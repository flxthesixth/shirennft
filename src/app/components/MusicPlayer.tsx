"use client"

import { useEffect, useRef, useState } from 'react'

type Track = { title: string; src: string; artist?: string }

const encode = (s: string) => encodeURI(s)

export default function MusicPlayer({ playlist }: { playlist?: Track[] }) {
  const defaultPlaylist: Track[] = playlist ?? [
    { title: 'Bintang 5 (8D)', artist: 'Tenxi & Jemsii', src: encode('/Tenxi & Jemsii - Bintang 5 (8D AUDIO).mp3') },
  ]

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onTime = () => setProgress(a.currentTime)
    const onLoaded = () => setDuration(a.duration || 0)
    const onEnd = () => handleNext()

    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('ended', onEnd)
    }
  }, [index])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = volume
    a.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.src = defaultPlaylist[index].src
    a.load()
    // if playing was true, try to resume
    if (playing) {
      const p = a.play()
      if (p && typeof (p as any).catch === 'function') (p as any).catch(() => setPlaying(false))
    }
    setProgress(0)
    setDuration(0)
  }, [index])

  const togglePlay = async () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      try {
        await a.play()
        setPlaying(true)
      } catch (e) {
        setPlaying(false)
      }
    }
  }

  const handleNext = () => setIndex((i) => (i + 1) % defaultPlaylist.length)
  const handlePrev = () => setIndex((i) => (i - 1 + defaultPlaylist.length) % defaultPlaylist.length)

  const seek = (t: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = t
    setProgress(t)
  }

  return (
    <div className="w-full max-w-xl bg-white/5 p-3 rounded-md text-white">
      <audio ref={audioRef} preload="metadata" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{defaultPlaylist[index]?.title}</div>
          {defaultPlaylist[index]?.artist && <div className="text-sm text-white/70">{defaultPlaylist[index].artist}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="px-3 py-1 rounded bg-white/6">Prev</button>
          <button onClick={togglePlay} className="px-4 py-1 rounded bg-white/8">{playing ? 'Pause' : 'Play'}</button>
          <button onClick={handleNext} className="px-3 py-1 rounded bg-white/6">Next</button>
        </div>

        <div className="flex items-center gap-2">
          <input aria-label="volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-24" />
          <button onClick={() => setMuted((m) => !m)} className="px-2 py-1 rounded bg-white/6">{muted ? 'Unmute' : 'Mute'}</button>
        </div>
      </div>

      <div className="mt-3">
        <input aria-label="seek" type="range" min={0} max={duration || 0} step={0.01} value={progress} onChange={(e) => seek(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-white/60 mt-1">
          <span>{new Date(progress * 1000).toISOString().substr(14, 5)}</span>
          <span>{duration ? new Date(duration * 1000).toISOString().substr(14, 5) : '0:00'}</span>
        </div>
      </div>
    </div>
  )
}
