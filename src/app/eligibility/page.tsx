'use client'

import { FormEvent, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

type WalletProvider = {
  request: (args: { method: string }) => Promise<unknown>
}

type WalletWindow = Window & { ethereum?: WalletProvider }

const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)

export default function EligibilityPage() {
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  function updateAddress(value: string) {
    requestRef.current?.abort()
    setChecking(false)
    setAddress(value)
    setError('')
    setSubmitted('')
    setEligible(null)
    setRevealed(false)
  }

  async function checkAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = address.trim()
    if (!isAddress(value)) {
      setError('Enter a valid 0x wallet address (42 characters).')
      setSubmitted('')
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setError('')
    setChecking(true)
    setSubmitted('')
    setEligible(null)
    setRevealed(false)
    try {
      const response = await fetch('/api/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: value }), signal: controller.signal })
      if (!response.ok) throw new Error('Check unavailable. Please try again.')
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object' || !('eligible' in result) || typeof result.eligible !== 'boolean') throw new Error('Check unavailable. Please try again.')
      setEligible(result.eligible)
      setSubmitted(value)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Check unavailable. Please try again.')
    } finally {
      if (requestRef.current === controller) { setChecking(false); requestRef.current = null }
    }
  }

  async function connectWallet() {
    const provider = (window as WalletWindow).ethereum
    if (!provider?.request) {
      setError('No browser wallet detected. Paste your address instead, or open this page in your wallet browser.')
      return
    }
    setConnecting(true)
    setError('')
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const first = Array.isArray(accounts) ? accounts[0] : undefined
      if (typeof first !== 'string' || !isAddress(first)) throw new Error('No valid address returned by the wallet.')
      updateAddress(first)
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `Wallet not connected: ${cause.message}` : 'Wallet connection cancelled or unavailable.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="SHIREN home">SHIRΞN<span>.</span></Link>
          <Link href="/" className={styles.back}>← BACK TO HOME</Link>
        </header>

        <div className={styles.content}>
          <section className={styles.terminal} aria-labelledby="checker-title">
            <div className={styles.terminalHead}><span id="checker-title">ELIGIBILITY CHECKER</span><span>SHIREN / 2,222</span></div>
            <div className={styles.terminalBody}>
              <h2>Enter wallet address</h2>

              <form onSubmit={checkAddress} noValidate>
                <label htmlFor="wallet-address" className={styles.label}>WALLET ADDRESS</label>
                <input id="wallet-address" type="text" value={address} onChange={(event) => updateAddress(event.target.value)} placeholder="0x..." autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? 'wallet-error' : undefined} className={styles.input} maxLength={100} />
                {error && <p id="wallet-error" className={styles.error} role="alert">{error}</p>}
                <button type="submit" disabled={checking} className={styles.primary}>{checking ? 'CHECKING...' : 'CHECK STATUS'} <span aria-hidden="true">↗</span></button>
              </form>

              <div className={styles.divider}><span>OR</span></div>
              <button type="button" onClick={connectWallet} disabled={connecting} className={styles.secondary}>{connecting ? 'WAITING FOR WALLET...' : 'CONNECT WALLET'} <span aria-hidden="true">↗</span></button>

              <div className={styles.result}>
                {submitted && eligible !== null ? (
                  <div className={styles.revealWrap}>
                    <button type="button" className={styles.revealButton} onClick={() => setRevealed(true)} disabled={revealed} aria-label={revealed ? 'Result revealed' : 'Reveal eligibility result'}>
                      <span className={`${styles.card} ${revealed ? styles.cardRevealed : ''}`}>
                        <span className={styles.cardBack} aria-hidden="true"><span>SHIRΞN</span><small>TAP TO REVEAL ↗</small></span>
                        <span className={`${styles.cardFront} ${eligible ? styles.cardEligible : styles.cardNotEligible}`} aria-hidden="true"><small>SHIREN / WALLET CHECK</small><strong>{eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</strong><small>{eligible ? 'YOU ARE ON THE LIST' : 'NOT ON THE CURRENT LIST'}</small></span>
                      </span>
                    </button>
                    <p role="status" aria-live="polite" className={styles.resultText}>{revealed ? (eligible ? 'Eligible — this wallet is on the current list.' : 'Not eligible — this wallet is not on the current list.') : 'Result ready. Tap the card to reveal.'}</p>
                    <code>{submitted}</code>
                    <p>This check does not reserve a spot or verify wallet ownership.</p>
                  </div>
                ) : (
                  <div role="status" aria-live="polite"><strong>{checking ? 'CHECKING ADDRESS' : 'AWAITING ADDRESS'}</strong><p>{checking ? 'Checking the current list…' : 'Enter an address or connect your wallet to begin.'}</p></div>
                )}
              </div>
            </div>
          </section>
        </div>
        <footer className={styles.footer}><span>SHIREN / SOON ON RISE MAINNET</span><span>END OF 2026</span></footer>
      </div>
    </main>
  )
}
