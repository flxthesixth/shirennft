"use client"

import { useEffect, useState } from 'react'
import { useAudio } from '../lib/AudioContext'

export default function MusicPlayer() {
  const ctx = useAudio()
  const { playing, toggle, next, prev, setVolume, muted, setMuted, playlist, index } = ctx
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    let mounted = true
    const a = (document.querySelector('audio') as HTMLAudioElement | null)
    if (!a) return
    const onTime = () => { if (!mounted) return; setProgress(a.currentTime) }
    const onLoaded = () => { if (!mounted) return; setDuration(a.duration || 0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onLoaded)
    return () => { mounted = false; a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoaded) }
  }, [index])

  const seek = (t: number) => {
    const a = (document.querySelector('audio') as HTMLAudioElement | null)
    if (!a) return
    a.currentTime = t
    setProgress(t)
  }

  return (
    <div className={`w-full max-w-xl bg-white/5 p-3 rounded-md text-white ${playing ? 'playing' : ''}`}>
      <style>{`
        .song-title-container{ overflow:hidden; max-width:220px; }
        .song-title{ display:inline-block; white-space:nowrap; animation: marquee 10s linear infinite; }
        .song-title:hover{ animation-play-state:paused; }
        @keyframes marquee{ 0%{ transform: translateX(100%);} 100%{ transform: translateX(-100%);} }
        .playing .play-btn{ animation: pulse 1s infinite; }
        @keyframes pulse{ 0%{ box-shadow: 0 0 0 rgba(255,160,242,0.6);} 70%{ box-shadow: 0 0 10px rgba(255,160,242,0.0);} 100%{ box-shadow: 0 0 0 rgba(255,160,242,0);} }
      `}</style>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold song-title-container">
            <div className="song-title">{playlist[index]?.title}</div>
          </div>
          {playlist[index]?.artist && <div className="text-sm text-white/70">{playlist[index].artist}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prev} className="px-3 py-1 rounded bg-white/6">Prev</button>
          <button onClick={() => toggle()} className="px-4 py-1 rounded bg-white/8 play-btn">{playing ? 'Pause' : 'Play'}</button>
          <button onClick={next} className="px-3 py-1 rounded bg-white/6">Next</button>
        </div>

        <div className="flex items-center gap-2">
          <input aria-label="volume" type="range" min={0} max={1} step={0.01} defaultValue={0.9} onChange={(e) => setVolume(Number(e.target.value))} className="w-24" />
          <button onClick={() => setMuted(!muted)} className="px-2 py-1 rounded bg-white/6">{muted ? 'Unmute' : 'Mute'}</button>
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
