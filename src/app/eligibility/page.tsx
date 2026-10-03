'use client'

import { FormEvent, useState } from 'react'
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
  const [connecting, setConnecting] = useState(false)

  function updateAddress(value: string) {
    setAddress(value)
    setError('')
    setSubmitted('')
  }

  function checkAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = address.trim()
    if (!isAddress(value)) {
      setError('Enter a valid 0x wallet address (42 characters).')
      setSubmitted('')
      return
    }
    setError('')
    // ponytail: do not infer eligibility in the client; query a private API when the whitelist is ready.
    setSubmitted(value)
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
          <div className={styles.intro}>
            <p className={styles.kicker}>SHIREN / WALLET CHECK <span>01—02</span></p>
            <h1>Know where<br />you <em>stand.</em></h1>
            <p className={styles.lede}>One wallet. One clear answer. Enter an address or connect your wallet to check when the eligibility list goes live.</p>
          </div>

          <section className={styles.terminal} aria-labelledby="checker-title">
            <div className={styles.terminalHead}><span id="checker-title">ELIGIBILITY CHECKER</span><span>SHIREN / 2,222</span></div>
            <div className={styles.terminalBody}>
              <p className={styles.step}>01 / YOUR WALLET</p>
              <h2>Enter wallet address</h2>
              <p className={styles.help}>A read-only check. Never share your recovery phrase or sign a transaction here.</p>

              <form onSubmit={checkAddress} noValidate>
                <label htmlFor="wallet-address" className={styles.label}>WALLET ADDRESS</label>
                <input id="wallet-address" type="text" value={address} onChange={(event) => updateAddress(event.target.value)} placeholder="0x..." autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? 'wallet-error' : undefined} className={styles.input} maxLength={100} />
                {error && <p id="wallet-error" className={styles.error} role="alert">{error}</p>}
                <button type="submit" className={styles.primary}>CHECK STATUS <span aria-hidden="true">↗</span></button>
              </form>

              <div className={styles.divider}><span>OR</span></div>
              <button type="button" onClick={connectWallet} disabled={connecting} className={styles.secondary}>{connecting ? 'WAITING FOR WALLET...' : 'CONNECT WALLET'} <span aria-hidden="true">↗</span></button>
              <p className={styles.note}>Connect only fills the address above. No signature or transaction requested.</p>

              <div className={styles.result} role="status" aria-live="polite">
                <span className={styles.resultLabel}>02 / RESULT</span>
                {submitted ? (
                  <><strong>CHECK NOT LIVE YET</strong><code>{submitted}</code><p>Your address is valid. Eligibility cannot be confirmed until the whitelist is published. No result has been saved.</p></>
                ) : (
                  <><strong>AWAITING ADDRESS</strong><p>Enter an address to begin. Whitelist verification will be available when the list is ready.</p></>
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
