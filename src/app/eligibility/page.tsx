'use client'

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import styles from './page.module.css'
import { EligibilityResult, parseEligibilityResult, revealProfiles } from './reveal'

type WalletProvider = { request: (args: { method: string }) => Promise<unknown> }
type WalletWindow = Window & { ethereum?: WalletProvider }
type RevealStep = 'scan' | 'breach' | 'result'

const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)
const particles = Array.from({ length: 30 }, (_, index) => ({
  x: Math.round(Math.cos((Math.PI * 2 * index) / 30) * (150 + (index % 6) * 22)),
  y: Math.round(Math.sin((Math.PI * 2 * index) / 30) * (150 + (index % 5) * 24)),
  delay: (index % 8) * 0.04,
}))

function RevealDialog({ result, address, returnFocus, onClose }: { result: EligibilityResult; address: string; returnFocus: HTMLElement | null; onClose: () => void }) {
  const [step, setStep] = useState<RevealStep>('scan')
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const timers = useRef<number[]>([])
  const profile = revealProfiles[result.profile]

  function clearTimers() {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
  }

  function showResult() {
    clearTimers()
    setStep('result')
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>(`.${styles.revealActions} button`)?.focus(), 0)
  }

  useEffect(() => {
    restoreFocus.current = returnFocus ?? document.activeElement as HTMLElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shell = document.querySelector<HTMLElement>('[data-checker-shell]')
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Main navigation"]')
    const music = document.querySelector<HTMLElement>('[aria-label="Music settings"]')?.parentElement
    for (const element of [shell, nav, music]) if (element) element.inert = true
    document.body.classList.add(styles.revealOpen)
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }
    window.addEventListener('keydown', closeOnEscape)
    if (reduced) setStep('result')
    else {
      timers.current.push(window.setTimeout(() => setStep('breach'), 1700))
      timers.current.push(window.setTimeout(() => setStep('result'), 2600))
    }
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus(), 0)
    return () => {
      clearTimers()
      window.removeEventListener('keydown', closeOnEscape)
      for (const element of [shell, nav, music]) if (element) element.inert = false
      document.body.classList.remove(styles.revealOpen)
      restoreFocus.current?.focus({ preventScroll: true })
    }
  }, [onClose, returnFocus])

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []).filter((element) => element.offsetParent !== null)
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <div ref={dialogRef} className={styles.reveal} data-profile={result.profile} data-step={step} role="dialog" aria-modal="true" aria-labelledby="reveal-title" onKeyDown={handleKeys}>
      <div className={styles.grain} aria-hidden="true" />
      <header className={styles.revealTop}>
        <div className={styles.revealIdentity}><span className={styles.revealMark} aria-hidden="true">✦</span><div><strong id="reveal-title">SHIRΞN / Soul Portal</strong><small>THE SOUL REVEAL PROTOCOL</small></div></div>
        <div className={styles.revealControls}><span className={styles.phase}><b>{step === 'scan' ? '01' : step === 'breach' ? '02' : '03'}</b> / 03</span>{step !== 'result' && <button type="button" onClick={showResult}>SKIP ANIMATION ↗</button>}<button type="button" className={styles.close} onClick={onClose} aria-label="Close reveal">×</button></div>
      </header>
      <div className={styles.revealMeta}><span>SHIRΞN / VERIFIED WALLET CHECK</span><span>✦ RISE UNIVERSE</span></div>
      <main className={styles.revealStage}>
        <div className={styles.portalRings} aria-hidden="true" />
        <div className={styles.sequence}>
          <div className={styles.coreWrap} aria-hidden="true"><div className={styles.core}><span>✧</span><i /></div></div>
          <div className={styles.flash} aria-hidden="true" />
          <div className={styles.scanCopy}><span>{step === 'breach' ? 'SIGNAL DETECTED' : 'INITIALIZING SOUL SCAN'}</span><strong>{step === 'breach' ? 'Opening the soul portal...' : 'Decoding your signal...'}</strong><small>Locating the frequency of your soul</small><i /></div>
          <div className={styles.particles} aria-hidden="true">{result.eligible && particles.map((particle, index) => <i key={index} style={{ '--x': `${particle.x}px`, '--y': `${particle.y}px`, '--delay': `${particle.delay}s` } as React.CSSProperties} />)}</div>
          <div className={styles.cardWrap}>
            <article className={styles.revealCard} aria-label={`${profile.title} eligibility result`}>
              <div className={styles.cardTop}><span>SHIRΞN ✦ ACCESS CARD</span><span>2,222 SOULS</span></div>
              <div className={styles.cardArt}><div className={styles.rune} aria-hidden="true" /><span aria-hidden="true">{profile.glyph}</span></div>
              <div className={styles.cardCopy}><small>{profile.eyebrow}</small><h2>{profile.title}</h2><p>{profile.description}</p></div>
              <div className={styles.cardBottom}><span>API RESULT / VERIFIED</span><span>{profile.code}</span></div>
            </article>
          </div>
          <div className={styles.revealActions}>
            <p role="status" aria-live="polite">{profile.completion}</p>
            <button type="button" onClick={onClose}>VIEW RESULT DETAILS</button>
            <small>LIVE CHECK COMPLETE · ELIGIBILITY DOES NOT VERIFY WALLET OWNERSHIP</small>
          </div>
        </div>
      </main>
      <footer className={styles.revealBottom}><span role="status" aria-live="polite">{step === 'scan' ? 'SCANNING / SOUL FREQUENCY' : step === 'breach' ? 'PORTAL OPENING / SIGNAL FOUND' : 'REVEAL COMPLETE / SOUL IDENTIFIED'}</span><span>{address.slice(0, 8)}…{address.slice(-6)}</span></footer>
    </div>
  )
}

export default function EligibilityPage() {
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [result, setResult] = useState<EligibilityResult | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const scanButtonRef = useRef<HTMLButtonElement>(null)
  const resultRef = useRef<HTMLElement>(null)

  const closeReveal = useCallback(() => {
    setRevealOpen(false)
    window.setTimeout(() => {
      resultRef.current?.focus({ preventScroll: true })
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    }, 0)
  }, [])

  function updateAddress(value: string) {
    requestRef.current?.abort()
    setChecking(false); setAddress(value); setError(''); setSubmitted(''); setResult(null); setRevealOpen(false)
  }

  async function checkAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = address.trim()
    if (!isAddress(value)) { setError('Enter a valid 0x wallet address (42 characters).'); setSubmitted(''); return }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setError(''); setChecking(true); setSubmitted(''); setResult(null); setRevealOpen(false)
    try {
      const response = await fetch('/api/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: value }), signal: controller.signal })
      if (!response.ok) throw new Error('Check unavailable. Please try again.')
      const parsed = parseEligibilityResult(await response.json())
      setResult(parsed); setSubmitted(value); setRevealOpen(true)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Check unavailable. Please try again.')
    } finally {
      if (requestRef.current === controller) { setChecking(false); requestRef.current = null }
    }
  }

  async function connectWallet() {
    const provider = (window as WalletWindow).ethereum
    if (!provider?.request) { setError('No browser wallet detected. Paste your address instead, or open this page in your wallet browser.'); return }
    setConnecting(true); setError('')
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const first = Array.isArray(accounts) ? accounts[0] : undefined
      if (typeof first !== 'string' || !isAddress(first)) throw new Error('No valid address returned by the wallet.')
      updateAddress(first)
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `Wallet not connected: ${cause.message}` : 'Wallet connection cancelled or unavailable.')
    } finally { setConnecting(false) }
  }

  const profile = result ? revealProfiles[result.profile] : null
  return <>
    <main className={styles.page} data-checker-shell>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.shell}>
        <section className={styles.hero}><span className={styles.kicker}>01 / SOUL IDENTIFICATION</span><h1>Find your<br /><em>signal.</em></h1><p>Enter a wallet address to check the current SHIRΞN pilot list. No signature or transaction required.</p></section>
        <section className={styles.checker} aria-labelledby="checker-title" aria-busy={checking}>
          <div className={styles.checkerHead}><span id="checker-title">ELIGIBILITY CHECKER</span><span>SHIRΞN / 2,222</span></div>
          <form onSubmit={checkAddress} noValidate>
            <label htmlFor="wallet-address">WALLET ADDRESS</label>
            <input id="wallet-address" value={address} onChange={(event) => updateAddress(event.target.value)} placeholder="0x..." autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? 'wallet-error' : undefined} maxLength={100} />
            {error && <p id="wallet-error" className={styles.error} role="alert">{error}</p>}
            <button ref={scanButtonRef} type="submit" disabled={checking}>{checking ? 'SCANNING SIGNAL...' : 'SCAN ELIGIBILITY'} <span aria-hidden="true">↗</span></button>
          </form>
          <div className={styles.or}><span>OR</span></div>
          <button type="button" className={styles.connect} onClick={connectWallet} disabled={connecting}>{connecting ? 'WAITING FOR WALLET...' : 'CONNECT WALLET'} <span aria-hidden="true">↗</span></button>
          <p className={styles.note}>Read-only check. Connecting requests your public address only.</p>
        </section>
        <section ref={resultRef} className={styles.resultPanel} aria-live="polite" tabIndex={-1}>
          <span className={styles.kicker}>02 / SOUL RESULT</span>
          <div className={styles.resultRow}><span className={styles.resultGlyph} aria-hidden="true">{profile?.glyph ?? '✧'}</span><div><strong>{profile?.title ?? 'AWAITING SIGNAL'}</strong><p>{profile?.description ?? 'Your verified result will appear here after the scan.'}</p>{submitted && <code>{submitted}</code>}</div>{result && <button type="button" onClick={() => setRevealOpen(true)}>REPLAY REVEAL</button>}</div>
        </section>
        <footer className={styles.footer}><span>SHIRΞN / SOON ON RISE MAINNET</span><span>END OF 2026</span></footer>
      </div>
    </main>
    {revealOpen && result && <RevealDialog result={result} address={submitted} returnFocus={scanButtonRef.current} onClose={closeReveal} />}
  </>
}
