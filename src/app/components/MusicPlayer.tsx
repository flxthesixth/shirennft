"use client"

import { useEffect } from 'react'
import { useAudio } from '../lib/AudioContext'

export default function MusicPlayer() {
  const ctx = useAudio()
  const { playing, toggle, next, prev, setVolume, muted, setMuted, playlist, index, play, autoplayBlocked } = ctx as any

  useEffect(() => {
    // keep a quiet effect to ensure audio element exists and metadata loads when track changes
    const a = (document.querySelector('audio') as HTMLAudioElement | null)
    if (!a) return
    const onLoaded = () => { /* noop — metadata available if needed elsewhere */ }
    a.addEventListener('loadedmetadata', onLoaded)
    return () => a.removeEventListener('loadedmetadata', onLoaded)
  }, [index])

  return (
    <div className={`w-full bg-white/5 p-3 rounded-md text-white ${playing ? 'playing' : ''}`}>
      <style>{`
        .song-title-container{ overflow:hidden; max-width:220px; margin:0 auto; text-align:center }
        .song-title{ display:inline-block; white-space:nowrap; animation: marquee 10s linear infinite; }
        .song-title:hover{ animation-play-state:paused; }
        @keyframes marquee{ 0%{ transform: translateX(100%);} 100%{ transform: translateX(-100%);} }
        .playing .play-btn{ animation: pulse 1s infinite; }
        @keyframes pulse{ 0%{ box-shadow: 0 0 0 rgba(255,160,242,0.6);} 70%{ box-shadow: 0 0 10px rgba(255,160,242,0.0);} 100%{ box-shadow: 0 0 0 rgba(255,160,242,0);} }
      `}</style>
      <div className="relative flex items-center justify-between gap-3">
        <div />

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          <button onClick={prev} aria-label="Previous track" className="p-2 rounded bg-white/6 hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M19 19L12 12L19 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button onClick={() => toggle()} aria-label={playing ? 'Pause' : 'Play'} className="p-3 rounded bg-white/8 play-btn">
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
              </svg>
            )}
          </button>

          <button onClick={next} aria-label="Next track" className="p-2 rounded bg-white/6 hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M5 19L12 12L5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 19L19 12L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input aria-label="volume" type="range" min={0} max={1} step={0.01} defaultValue={0.9} onChange={(e) => setVolume(Number(e.target.value))} className="w-24" />
          <button
            onClick={async () => {
              try {
                if (muted) {
                  // User is unmuting via explicit gesture — ensure playback resumes audibly
                  setMuted(false)
                  await play()
                } else {
                  setMuted(true)
                }
              } catch (e) {
                // ignore
              }
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-2 rounded bg-white/6 hover:bg-white/10"
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M9 9v6h4l5 5V4l-5 5H9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M9 9v6h4l5 5V4l-5 5H9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 7.5a5 5 0 010 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Muted-autoplay hint: browser blocked unmuted autoplay — tap to unmute */}
      {autoplayBlocked && muted && (
        <button
          onClick={async () => { setMuted(false); await play() }}
          className="mt-2 w-full text-xs text-[#f5d76e] bg-white/5 hover:bg-white/10 rounded px-2 py-1"
        >
          Tap to unmute
        </button>
      )}

      {/* Title and artist moved to bottom */}
      <div className="mt-3 text-center">
        <div className="font-semibold song-title-container">
          <div className="song-title">{playlist[index]?.title}</div>
        </div>
        {playlist[index]?.artist && <div className="text-sm text-white/70">{playlist[index].artist}</div>}
      </div>
    </div>
  )
}
