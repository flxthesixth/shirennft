'use client'

import { useState } from 'react'
import { useAudio } from '../lib/AudioContext'
import styles from './GlobalMusicControls.module.css'

export default function GlobalMusicControls() {
  const [open, setOpen] = useState(false)
  const { playing, toggle, next, prev, playlist, index, muted, setMuted, setVolume, autoplayBlocked } = useAudio()
  return <div className={styles.wrap}>
    {open && <div id="global-music-panel" className={styles.panel}>
      <span className={styles.title}>{playlist[index]?.title ?? 'MUSIC'}</span>
      <div className={styles.row}>
        <button type="button" onClick={prev} aria-label="Previous track">‹‹</button>
        <button type="button" onClick={() => void toggle()} aria-label={playing ? 'Pause music' : 'Play music'}>{playing ? 'PAUSE' : 'PLAY'}</button>
        <button type="button" onClick={next} aria-label="Next track">››</button>
        <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute music' : 'Mute music'}>{muted ? 'UNMUTE' : 'MUTE'}</button>
      </div>
      <label className={styles.volume}>VOLUME <input type="range" min="0" max="1" step="0.01" defaultValue="0.9" onChange={event => setVolume(Number(event.target.value))} aria-label="Music volume" /></label>
      {autoplayBlocked && !playing && <span className={styles.hint}>Tap PLAY to start music.</span>}
    </div>}
    <button type="button" className={styles.trigger} aria-label="Music settings" aria-expanded={open} aria-controls="global-music-panel" onClick={() => setOpen(!open)}>MUSIC {playing ? 'ON' : 'OFF'}</button>
  </div>
}
