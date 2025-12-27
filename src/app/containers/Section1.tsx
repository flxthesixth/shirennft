"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Frame from '../components/Frame'
import MusicPlayer from '../components/MusicPlayer'
import AnimatedBeamMultipleOutputDemo from '@/components/AnimatedBeamMultipleOutputDemo'
import Loading from './Loading'

type Props = {
  onSelect?: (id: 'pass' | 'about') => void
  discordUrl?: string
  skipIntroDelay?: boolean
  isInitialLoad?: boolean
}

function Section1({ onSelect, discordUrl, skipIntroDelay = false, isInitialLoad = true }: Props) {
  // Timer state (added days)
  const [timeLeft, setTimeLeft] = useState({
    days: 69,
    hours: 7,
    minutes: 1,
    seconds: 59
  })
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const walletRef = useRef<any>(null)
  const [showWalletSidebar, setShowWalletSidebar] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const openBtnRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // beamEndRef is no longer needed when using multiple-output demo
  // Sidebar vertical anchor (keep top dynamic) and computed height to match card
  const [sidebarStartTop, setSidebarStartTop] = useState<string | null>(null)
  const [sidebarHeight, setSidebarHeight] = useState<string | null>(null)
  const fetchTokenRef = useRef<number>(0)
  const fetchCountRef = useRef<number>(0)
  const manualFetchCountRef = useRef<number>(0)
  const manualTimeoutsRef = useRef<Map<number, number>>(new Map())
  const [balance, setBalance] = useState<string | null>(null)
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false)
  const BALANCE_DECIMALS = 4
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null)
  const FAUCET_URL = 'https://faucet.testnet.riselabs.xyz'
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [srnCollection, setSrnCollection] = useState<Array<{ tokenId: string; name?: string; image?: string }>>([])
  const [srnCount, setSrnCount] = useState<number | null>(null)
  const [showSrnModal, setShowSrnModal] = useState(false)
  // Featured images for slideshow (uses public/SHIREN NFT)
  const [featuredImages, setFeaturedImages] = useState<string[]>(['/SHIREN%20NFT/felixxx.png'])
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)

  // wallet connect handler — now that rise-wallet is installed we can import normally
  async function connectToWallet() {
    try {
      // dynamic import (bundler will resolve now that package is installed)
  const mod = await import('rise-wallet')
  const anyMod: any = mod
      let walletInstance: any = null

      if (anyMod?.Wallet) {
        walletInstance = new anyMod.Wallet({ network: 'testnet' })
        if (walletInstance.connect) await walletInstance.connect()
      } else if (anyMod?.default && typeof anyMod.default === 'function') {
        walletInstance = new anyMod.default({ network: 'testnet' })
        if (walletInstance.connect) await walletInstance.connect()
      } else if (anyMod?.connect) {
        await anyMod.connect({ network: 'testnet' })
        walletInstance = anyMod
      }

      // fallback to injected provider if walletInstance not created
      if (!walletInstance) {
        const w = (window as any).ethereum
        if (w?.request) {
          await w.request({ method: 'eth_requestAccounts' })
          // try to read accounts
          const accounts = await w.request({ method: 'eth_accounts' })
          const acct = Array.isArray(accounts) && accounts.length ? accounts[0] : null
          setConnected(Boolean(acct))
          setAddress(acct)
          return
        } else {
          alert('rise-wallet not available and no web3 provider found')
          return
        }
      }

        walletRef.current = walletInstance
      const addr = walletInstance.address ?? (await walletInstance.getAddress?.()) ?? null
      setConnected(true)
      setAddress(addr)
      // fetch balance after connecting
        if (addr) {
          // don't flash the spinner on initial connect — use quiet fetch
          fetchBalanceForAddress(addr, { showSpinner: false })
        }
    } catch (err) {
      console.error('connect error', err)
      alert('Failed to connect wallet. See console for details or ensure rise-wallet is installed.')
    }
  }

  function disconnectWallet() {
    try {
      const w = walletRef.current
      if (w?.disconnect) {
        w.disconnect()
      }
    } catch (e) {
      console.warn('disconnect failed', e)
    }
    walletRef.current = null
    setConnected(false)
    setAddress(null)
    setBalance(null)
    // cancel any in-flight balance fetch and stop loading spinner
    fetchTokenRef.current += 1
    // reset any in-progress fetch counters and clear spinner
    fetchCountRef.current = 0
    setLoadingBalance(false)
  }

  async function fetchBalanceForAddress(addr: string | null, opts?: { showSpinner?: boolean }) {
    if (!addr) return setBalance(null)
    const showSpinner = Boolean(opts?.showSpinner)
    // increment a token to mark this fetch; callers can cancel by bumping token
    fetchTokenRef.current += 1
    const token = fetchTokenRef.current
    // If a fetch is already running, allow manual requests (showSpinner) to proceed but skip auto ones
    if (fetchCountRef.current > 0 && !showSpinner) {
      // eslint-disable-next-line no-console
      console.debug('fetchBalanceForAddress: skipping auto fetch because one is already in progress', { addr, token, fetchCount: fetchCountRef.current })
      return
    }
    // track in-flight fetches
    fetchCountRef.current += 1
    // If caller requested spinner, track manual spinner counter and enable spinner
    if (showSpinner) {
      manualFetchCountRef.current += 1
      setLoadingBalance(true)
      // set a safety timeout so spinner can't hang indefinitely (10s)
      const to = window.setTimeout(() => {
        try {
          manualFetchCountRef.current = Math.max(0, manualFetchCountRef.current - 1)
        } catch (e) {
          manualFetchCountRef.current = 0
        }
        // if no manual fetches remain, clear spinner
        if (manualFetchCountRef.current <= 0) setLoadingBalance(false)
        // cleanup this timeout entry
        manualTimeoutsRef.current.delete(token)
      }, 10_000)
      manualTimeoutsRef.current.set(token, to)
    }
    // debug
    // eslint-disable-next-line no-console
    console.debug('fetchBalanceForAddress: start', { addr, token, fetchCount: fetchCountRef.current, showSpinner })
    try {
      const w = walletRef.current
      // If wallet exposes getBalance, prefer it
      if (w?.getBalance) {
  const b = await w.getBalance(addr)
        // b may be BigNumber-like or string
        const bStr = typeof b === 'string' ? b : b?.toString?.() ?? String(b)
        const wei = BigInt(bStr)
        const DEC = BigInt('1000000000000000000')
        const whole = wei / DEC
        const frac = wei % DEC
        const fractional = String(frac).padStart(18, '0').slice(0, BALANCE_DECIMALS)
        // ignore if a newer fetch was started or address changed
        if (token !== fetchTokenRef.current || addr !== (address ?? addr)) return
        return setBalance(`${whole.toString()}.${fractional}`)
      }

      // fallback to provider RPC (eth_getBalance) or public RISE Testnet RPC
      const provider = w?.provider ?? (window as any).ethereum
      if (provider?.request) {
        try {
          const hex = await provider.request({ method: 'eth_getBalance', params: [addr, 'latest'] })
          // Some providers may return unexpected shapes — normalize to string
          const hexStr = typeof hex === 'string' ? hex : String(hex)
          if (hexStr && hexStr.startsWith && hexStr.startsWith('0x')) {
            try {
              const wei = BigInt(hexStr)
              const DEC = BigInt('1000000000000000000')
              const whole = wei / DEC
              const frac = wei % DEC
              const fractional = String(frac).padStart(18, '0').slice(0, BALANCE_DECIMALS)
              if (token !== fetchTokenRef.current || addr !== (address ?? addr)) return
              return setBalance(`${whole.toString()}.${fractional}`)
            } catch (e) {
              console.error('parsing provider hex balance failed', e, { hexStr })
            }
          } else {
            // If provider returned something unexpected, log and fallthrough to RPC
            console.warn('provider.request returned non-hex balance, falling back to RPC', { val: hex })
          }
        } catch (e) {
          console.error('provider.request eth_getBalance failed', e)
        }
      }

      // If no injected provider, call the public RISE Testnet RPC directly
      try {
        const RISE_TESTNET_RPC = 'https://testnet.riselabs.xyz'
        const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
        const res = await fetch(RISE_TESTNET_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        const j = await res.json()
        const hex = j?.result ?? '0x0'
        const wei = BigInt(hex)
        const DEC = BigInt('1000000000000000000')
        const whole = wei / DEC
        const frac = wei % DEC
        const fractional = String(frac).padStart(18, '0').slice(0, BALANCE_DECIMALS)
        if (token !== fetchTokenRef.current || addr !== (address ?? addr)) return
        return setBalance(`${whole.toString()}.${fractional}`)
      } catch (e) {
        console.error('RPC balance fetch failed', e)
      }

      setBalance('N/A')
    } catch (e) {
      console.error('balance fetch failed', e)
      setBalance('N/A')
    }
    finally {
      // decrement in-flight counter
      try {
        fetchCountRef.current = Math.max(0, fetchCountRef.current - 1)
      } catch (e) {
        fetchCountRef.current = 0
      }
      // if this was a manual request, decrement manual counter
      if (showSpinner) {
        try {
          manualFetchCountRef.current = Math.max(0, manualFetchCountRef.current - 1)
        } catch (e) {
          manualFetchCountRef.current = 0
        }
        // clear associated safety timeout if present
        try {
          const to = manualTimeoutsRef.current.get(token)
          if (to) {
            clearTimeout(to)
            manualTimeoutsRef.current.delete(token)
          }
        } catch (e) {
          // ignore
        }
      }
      // eslint-disable-next-line no-console
      console.debug('fetchBalanceForAddress: end', { addr, token, fetchCount: fetchCountRef.current, manualFetchCount: manualFetchCountRef.current })
      // only clear spinner when no manual fetches remain
      if (manualFetchCountRef.current <= 0) {
        setLoadingBalance(false)
      }
    }
  }

  // ScrollReveal refs
  const homeRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const nftCardRef = useRef<HTMLDivElement>(null)
  const playerInlineRef = useRef<HTMLDivElement>(null)
  const playerAbsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch list of images from API (server reads public/SHIREN NFT)
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/shiren-files')
        const j = await res.json()
        if (!mounted) return
        if (Array.isArray(j?.images) && j.images.length > 0) {
          setFeaturedImages(j.images)
          setCurrentImageIndex(0)
        }
      } catch (e) {
        // ignore, keep default image
        // console.debug('shiren-files fetch failed', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Slideshow interval (10 seconds)
  useEffect(() => {
    if (!featuredImages || featuredImages.length <= 1) return
    const iv = setInterval(() => {
      setCurrentImageIndex((i) => (i + 1) % featuredImages.length)
    }, 10_000)
    return () => clearInterval(iv)
  }, [featuredImages])
  // Dynamically import ScrollReveal on the client to avoid SSR evaluation
  useEffect(() => {
    let srInstance: any = null
    ;(async () => {
      try {
        const SR = (await import('scrollreveal')).default
        srInstance = SR({
          origin: 'top',
          distance: '60px',
          duration: 2500,
          delay: 400,
          reset: false,
        })

        if (homeRef.current) srInstance.reveal(homeRef.current, { origin: 'left' })
        if (statsRef.current) srInstance.reveal(statsRef.current, { origin: 'bottom', delay: 800 })
        if (nftCardRef.current) srInstance.reveal(nftCardRef.current, { origin: 'right', delay: 600 })
        if (playerInlineRef.current) srInstance.reveal(playerInlineRef.current, { origin: 'bottom', delay: 900 })
        if (playerAbsRef.current) srInstance.reveal(playerAbsRef.current, { origin: 'bottom', delay: 900 })
      } catch (e) {
        // If ScrollReveal fails to load on server or in test env, ignore silently
        console.warn('ScrollReveal failed to load', e)
      }
    })()

    return () => srInstance?.destroy?.()
  }, [])

  // click outside / escape to close the wallet sidebar
  useEffect(() => {
    if (!showWalletSidebar) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(target) &&
        openBtnRef.current &&
        !openBtnRef.current.contains(target)
      ) {
        setShowWalletSidebar(false)
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowWalletSidebar(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showWalletSidebar])

  // auto-refresh balance while sidebar is open
  useEffect(() => {
    if (!showWalletSidebar || !address) return
    // fetch once immediately (if not loading)
    if (!loadingBalance) fetchBalanceForAddress(address, { showSpinner: false })
    // fetch SRN collection when sidebar opens
    fetchSRNCollection(address)
    const iv = setInterval(() => {
      fetchBalanceForAddress(address, { showSpinner: false })
    }, 30_000)

    return () => clearInterval(iv)
  }, [showWalletSidebar, address, loadingBalance])

  function requestFromFaucet() {
    try {
      if (address && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(address)
        setFaucetStatus('Address copied to clipboard')
      } else if (!address) {
        setFaucetStatus('No address to copy — open faucet and paste manually')
      }
    } catch (e) {
      console.warn('clipboard failed', e)
      setFaucetStatus('Could not copy address — open faucet manually')
    }

    // open faucet in a new tab regardless
    try {
      window.open(FAUCET_URL, '_blank')
    } catch (e) {
      console.warn('failed to open faucet', e)
    }

    // clear status after a few seconds
    setTimeout(() => setFaucetStatus(null), 4000)
  }

  function copyAddressToClipboard() {
    if (!address) {
      setCopyStatus('No address to copy')
      setTimeout(() => setCopyStatus(null), 3000)
      return
    }

    try {
      navigator.clipboard.writeText(address)
      setCopyStatus('Address copied')
    } catch (e) {
      console.warn('copy failed', e)
      setCopyStatus('Copy failed')
    }

    setTimeout(() => setCopyStatus(null), 3000)
  }

  // Fetch SRN collection for the connected address. This tries multiple strategies and
  // degrades gracefully when no indexer is available.
  async function fetchSRNCollection(addr: string | null) {
    if (!addr) {
      setSrnCollection([])
      setSrnCount(0)
      return
    }

    try {
      // Prefer a wallet-provided helper if available
      const w = walletRef.current
      if (w?.getNFTs) {
        const items = await w.getNFTs(addr)
        // Expect items to be an array of { tokenId, name, image }
        setSrnCollection(Array.isArray(items) ? items : [])
        setSrnCount(Array.isArray(items) ? items.length : 0)
        return
      }

      // Try provider-specific RPC (e.g., Alchemy) if exposed by provider
      const provider = w?.provider ?? (window as any).ethereum
      if (provider?.request) {
        try {
          // alchemy_getNFTs is a common method for some providers — try it, but don't fail hard
          const res = await provider.request({ method: 'alchemy_getNFTs', params: [addr] })
          // different providers return results in different shapes — try to normalize
          const raw = res?.ownedNfts ?? res?.nfts ?? res?.result ?? res
          let parsed: any[] = []
          if (Array.isArray(raw)) parsed = raw
          else if (raw?.length) parsed = raw

          const normalized = parsed.map((it: any) => ({ tokenId: String(it?.id ?? it?.tokenId ?? it?.token_id ?? it?.token?.tokenId ?? ''), name: it?.title ?? it?.name ?? it?.metadata?.name, image: it?.metadata?.image ?? it?.media?.[0]?.gateway ?? it?.token?.image }))
          setSrnCollection(normalized)
          setSrnCount(normalized.length)
          return
        } catch (e: any) {
          // Many providers don't implement alchemy_getNFTs; suppress noisy repeated logs but keep a debug-level message
          if (e?.code === -32601) {
            // method not found — expected for many providers; only debug log
            // eslint-disable-next-line no-console
            console.debug('alchemy_getNFTs not supported by provider', e)
          } else {
            // other errors may be useful to surface
            // eslint-disable-next-line no-console
            console.warn('alchemy_getNFTs failed', e)
          }
        }
      }

      // As a last resort, show empty and allow user to refresh
      setSrnCollection([])
      setSrnCount(0)
    } catch (e) {
      console.warn('fetchSRNCollection failed', e)
      setSrnCollection([])
      setSrnCount(0)
    }
  }

  // Timer effect (handles days -> hours -> minutes -> seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev as {
          days: number
          hours: number
          minutes: number
          seconds: number
        }

        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else if (days > 0) {
          days--
          hours = 23
          minutes = 59
          seconds = 59
        }
        return { days, hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full md:min-h-screen z-10 overflow-visible bg-[url('/bg3.jpg')] bg-cover bg-center">
      {/* <Frame /> removed as requested */}
  {/* Loading is handled at the page level to control initial handoff; do not render Loading here */}

        <div className="container mx-auto px-4 py-6 flex items-center justify-center md:min-h-screen">
      <div ref={containerRef} className="relative bg-[url('/bg1.avif')] bg-cover bg-center backdrop-blur-md rounded-3xl border border-white/10 shadow-lg mt-4 overflow-visible p-6 md:p-8">
          {/* 50% overlay over bg3.jpg */}
          <div className="absolute inset-0 bg-black/50 rounded-3xl pointer-events-none" />
          {/* Navigation Bar */}
          <nav className="border-b border-white/10 relative z-10">
            <div className="flex justify-between items-center h-20 px-4 md:px-8 flex-wrap">
              {/* Logo */}
              <div className="text-4xl font-bold text-[#ffa0f2]">
                <a href="https://x.com/shiren_NFT" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                  SHIRΞN
                </a>
              </div>

              {/* Navigation Menu */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex flex-wrap gap-4 md:gap-12 text-white items-center">
                  <Link href="/" className="text-lg md:text-2xl hover:text-[hsl(203,71%,60%)] transition-colors font-medium">
                    Home
                  </Link>
                  <Link href="/ticket-pass" className="text-lg md:text-2xl hover:text-[hsl(203,71%,60%)] transition-colors font-medium">
                    Ticket Pass
                  </Link>
                  <button
                    onClick={() => onSelect?.('pass')}
                    className="text-lg md:text-2xl hover:text-[hsl(203,71%,60%)] transition-colors font-medium"
                  >
                    Collection
                  </button>
                  <button
                    onClick={() => onSelect?.('about')}
                    className="text-lg md:text-2xl hover:text-[hsl(203,71%,60%)] transition-colors font-medium"
                  >
                    Team
                  </button>
                  <a
                    href={discordUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg md:text-2xl hover:text-[hsl(203,71%,60%)] transition-colors font-medium"
                  >
                    Community
                  </a>
                </div>

                {/* Connect button placed at the far right of the nav group */}
                <div className="ml-2 md:ml-6">
                  <button
                    ref={openBtnRef}
                    onClick={() => {
                      // measure the button to compute a vertical position for the sidebar
                      try {
                        if (openBtnRef.current) {
                          const r = openBtnRef.current.getBoundingClientRect()
                          // position the top near the button (align with top of button) but keep inside viewport
                          // Prefer aligning the sidebar near the top of the card so it looks
                          // like it's anchored to the card. Move it a little upward for visual balance.
                          if (containerRef.current) {
                            const cr = containerRef.current.getBoundingClientRect()
                            const topPos = Math.max(8, Math.round(cr.top + 8))
                            setSidebarStartTop(`${topPos}px`)
                            // set sidebar height to roughly the card height (slightly larger than before)
                            // clamp so it never overflows the viewport.
                            const preferred = Math.round(cr.height - 8)
                            const minH = 300
                            const maxH = Math.max(240, Math.round(window.innerHeight - 32))
                            const sidebarH = Math.min(maxH, Math.max(minH, preferred))
                            setSidebarHeight(`${sidebarH}px`)
                          } else {
                            const preferredTop = Math.round(Math.max(8, r.top - 16))
                            const maxTop = Math.max(8, Math.round(window.innerHeight - 48))
                            const startTop = `${Math.min(preferredTop, maxTop)}px`
                            setSidebarStartTop(startTop)
                          }

                          // compute right offset relative to the main card container so the sidebar
                          // visually emerges from that card (fixes Safari being too far right)
                          // no container anchoring for now; keep horizontal anchored to viewport edge

                          // ensure styles apply before opening: use rAF for more deterministic timing
                          window.requestAnimationFrame(() => setShowWalletSidebar(true))
                          return
                        }
                      } catch (e) {
                        // ignore
                      }
                      setShowWalletSidebar(true)
                    }}
                    className="group text-base md:text-2xl font-medium px-3 py-1 rounded-md transform transition duration-200 ease-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[hsl(203,71%,60%)]/30 hover:text-[hsl(203,71%,60%)] inline-flex items-center gap-2"
                    aria-haspopup="dialog"
                  >
                    <span className="transform transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden>
                      {/* <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 7h14v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      </svg> */}
                    </span>
                    <span>{connected ? (address ? `${address.slice(0, 6)}...` : 'Connected') : 'Connect'}</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Overlay when sidebar is open (lighter so underlying cards remain visible) */}
          <div
            className={`fixed inset-0 z-40 transition-all duration-300 ${
              showWalletSidebar
                ? 'opacity-100 pointer-events-auto bg-black/60 backdrop-blur-md'
                : 'opacity-0 pointer-events-none bg-transparent backdrop-blur-0'
            }`}
            aria-hidden={!showWalletSidebar}
            onClick={() => setShowWalletSidebar(false)}
            style={{ WebkitBackdropFilter: showWalletSidebar ? 'blur(8px)' : 'none', backdropFilter: showWalletSidebar ? 'blur(8px)' : 'none' }}
          />

          {/* Wallet sliding sidebar (right) - now animates from the top-right card (scale + fade) */}
          <aside
            ref={sidebarRef}
            className={`fixed h-auto w-[300px] md:w-[380px] max-w-[92vw] bg-transparent z-50 transition-transform duration-300 ease-out shadow-2xl ${
              showWalletSidebar ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
            }`}
            role="dialog"
            aria-hidden={!showWalletSidebar}
            // anchor to viewport right edge; vertical top/height are computed from the card
            style={{ right: '16px', top: sidebarStartTop ?? '64px', height: sidebarHeight ?? 'auto', willChange: 'transform, opacity' }}
          >
            {/* translucent overlay to improve contrast over the background image */}
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                showWalletSidebar ? 'bg-black/60 backdrop-blur-md opacity-100' : 'bg-black/10 backdrop-blur-[2px] opacity-0'
              } pointer-events-none`}
              aria-hidden
              style={{ WebkitBackdropFilter: showWalletSidebar ? 'blur(8px)' : 'none', backdropFilter: showWalletSidebar ? 'blur(8px)' : 'none' }}
            />
            <div className="h-full flex flex-col relative z-10">
        <div className="pt-8 px-6 pb-6 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-2xl font-semibold tracking-tight">Wallet</h3>
                <div className="flex items-center gap-3">
                  {connecting && <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <button
                    onClick={() => setShowWalletSidebar(false)}
                    className="text-sm text-white/80 p-2 rounded-md hover:text-white hover:bg-white/5 transform transition duration-150 ease-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
                    aria-label="Close wallet sidebar"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-auto text-white text-lg">
                <p className="mb-3 text-lg text-white/80">Status</p>
                <p className="mb-4 text-xl font-semibold">{connected ? 'Connected' : 'Not connected'}</p>

                <div className="mb-4">
                  <p className="text-lg text-white/70 mb-1">Address</p>
                  <div className="flex items-center gap-3">
                    <code className="truncate font-mono text-lg bg-white/6 p-2 rounded w-full">{address ?? '-'}</code>
                    <button onClick={copyAddressToClipboard} className="text-lg px-3 py-2 bg-white/5 rounded transform transition duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 inline-flex items-center gap-2">
                      <svg className="w-4 h-4 text-white/90 transform transition-transform duration-150 group-hover:translate-x-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M16 3H8a2 2 0 0 0-2 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="8" y="7" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span>Copy</span>
                    </button>
                  </div>
                  {copyStatus && <div className="mt-2 text-sm text-green-300">{copyStatus}</div>}
                </div>

                <div className="mb-6">
                  <p className="text-lg text-white/70 mb-1">Balance</p>
                  <div className="flex items-center gap-5">
                    <div className="text-3xl font-bold">{balance ? `${balance} RISE` : '-'}</div>
                    {loadingBalance && (
                      <div
                        className="h-7 w-7 border-2 border-white border-t-transparent rounded-full animate-spin self-center transform -translate-y-1"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>

                {/* SRN Collection summary */}
                <div className="mb-6">
                  <p className="text-lg text-white/70 mb-1">SRN Collection</p>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-semibold">{srnCount !== null ? srnCount : '-'}</div>
                    <button
                      onClick={() => setShowSrnModal(true)}
                      disabled={srnCount === 0}
                      className="ml-2 rounded-md bg-white/5 px-4 py-2 text-white text-sm disabled:opacity-40 transform transition duration-150 hover:scale-105"
                    >
                      View Collection
                    </button>
                    <button
                      onClick={() => fetchSRNCollection(address)}
                      className="ml-auto rounded-md bg-white/5 px-3 py-2 text-white text-sm transform transition duration-150 hover:scale-105"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  {!connected ? (
                    <button
                      onClick={async () => {
                        setConnecting(true)
                        await connectToWallet()
                        setConnecting(false)
                      }}
                      className="w-full sm:w-auto faucet-glow text-2xs transform transition duration-200 ease-out hover:scale-102 active:scale-95 inline-flex items-center gap-3"
                    >
                      {/* <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M12 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 7h14v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      </svg> */}
                      <span>Connect</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => disconnectWallet()}
                      className="w-full sm:w-auto rounded-md border border-white/10 px-6 py-3 text-white text-base transform transition duration-150 active:scale-95 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/10 inline-flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 transform transition-transform duration-150 group-hover:rotate-[-10deg]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Disconnect</span>
                    </button>
                  )}
                  <button
                    onClick={() => fetchBalanceForAddress(address, { showSpinner: true })}
                    disabled={!address}
                    className="w-full sm:w-auto rounded-md bg-white/5 px-6 py-3 text-white text-base disabled:opacity-40 transform transition duration-150 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/10 inline-flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 transform transition-transform duration-300 hover:rotate-180" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M21 12a9 9 0 1 0-3.2 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Refresh</span>
                  </button>

                  {/* Faucet button moved inline and styled with custom glow class */}
                  <button
                    onClick={requestFromFaucet}
                    className="w-full sm:w-auto rounded-md bg-gradient-to-r from-[#6dd3ff] via-[#a77bff] to-[#ffa0f2] px-6 py-3 text-white text-base transform transition duration-200 ease-out hover:scale-105 active:scale-95 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[hsl(203,71%,60%)]/30 inline-flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 transform transition-transform duration-200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 7h14v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span>Faucet</span>
                  </button>
                  {faucetStatus && <div className="text-sm text-green-300">{faucetStatus}</div>}
                </div>
              </div>
            </div>
          </aside>

          {/* SRN Collection modal */}
          {showSrnModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => setShowSrnModal(false)} />
              <div className="relative z-10 w-[90%] max-w-3xl bg-[#0b0b0d] rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold">SRN Collection ({srnCount ?? 0})</h3>
                  <button onClick={() => setShowSrnModal(false)} className="text-sm text-white/70">Close</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-auto">
                  {srnCollection && srnCollection.length > 0 ? (
                    srnCollection.map((nft, idx) => (
                      <div key={idx} className="bg-white/5 p-3 rounded-lg flex flex-col items-center text-center">
                        {nft.image ? (
                          // plain img tag to avoid next/image server constraints in modal
                          <img src={nft.image} alt={nft.name ?? nft.tokenId} className="w-full h-32 object-cover rounded-md mb-2" />
                        ) : (
                          <div className="w-full h-32 bg-white/3 rounded-md mb-2 flex items-center justify-center">No image</div>
                        )}
                        <div className="text-sm font-medium">{nft.name ?? `#${nft.tokenId}`}</div>
                        <div className="text-xs text-white/60 mt-1">Token ID: {nft.tokenId}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-white/70 p-6">No SRN NFTs found for this wallet or fetcher unavailable.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="px-8 py-12 relative z-10">
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              {/* Left content */}
              <div ref={homeRef} className="welcome text-white space-y-4 text-left md:flex md:flex-col md:justify-center md:transform md:-translate-y-4">
                <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                  <span className="text-[#ffa0f2]">Explore</span> <br />
                  Find and <br />
                  Collect your SHRNs.
                </h1>
                <p className="text-[hsl(203,8%,80%)] text-lg md:text-xl whitespace-nowrap overflow-x-auto">
                  Seeking love from her is like collecting Orbs to get SHIREN in its entirety.
                </p>

                {/* Stats */}
                <div ref={statsRef} className="grid grid-cols-3 gap-6 py-4 text-left mt-4 md:mt-6">
                  <div>
                    <h3 className="text-3xl font-bold text-[#ffa0f2]">X,XXX</h3>
                    <p className="text-[hsl(203,8%,80%)]">Collection</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[#ffa0f2]">XX</h3>
                    <p className="text-[hsl(203,8%,80%)]">Legendary</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[#ffa0f2]">RISE</h3>
                    <p className="text-[hsl(203,8%,80%)]">Chain</p>
                  </div>
                </div>

                {/* Music player: inline on small screens, absolutely positioned near bottom on md+ so text doesn't move */}
                <div ref={playerInlineRef} className="mt-8 md:hidden">
                  <MusicPlayer />
                </div>
              </div>

              {/* Right content - Featured NFT */}
              <div ref={nftCardRef} className="relative">
                {/* On small screens use a fixed height to avoid overly tall cards; on md+ keep square aspect */}
                <div className="rounded-xl overflow-hidden relative h-64 md:aspect-square md:h-auto">
                  <img
                    src={featuredImages[currentImageIndex] ?? '/SHIREN%20NFT/felixxx.png'}
                    alt="Featured NFT"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {/* NFT Details overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex justify-between items-end">
                      <div className="text-left">
                        <h3 className="text-lg md:text-xl font-semibold text-white">Starts Sale in</h3>
                        <div className="flex gap-4 md:gap-6 text-white text-sm md:text-base flex-wrap">
                          <div className="flex flex-col items-center px-2">
                            <p className="text-xl md:text-3xl font-bold">{String((timeLeft as any).days).padStart(2, '0')}</p>
                            <p className="text-xs md:text-sm text-[hsl(203,8%,80%)]">days</p>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <p className="text-xl md:text-3xl font-bold">{String((timeLeft as any).hours).padStart(2, '0')}</p>
                            <p className="text-xs md:text-sm text-[hsl(203,8%,80%)]">hours</p>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <p className="text-xl md:text-3xl font-bold">{String((timeLeft as any).minutes).padStart(2, '0')}</p>
                            <p className="text-xs md:text-sm text-[hsl(203,8%,80%)]">minutes</p>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <p className="text-xl md:text-3xl font-bold">{String((timeLeft as any).seconds).padStart(2, '0')}</p>
                            <p className="text-xs md:text-sm text-[hsl(203,8%,80%)]">seconds</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AnimatedBeamMultipleOutputDemo inserted under the NFT card */}
                <div className="mt-6">
                  <AnimatedBeamMultipleOutputDemo />
                </div>
              </div>

                {/* Absolutely positioned player for md+ screens: placed at the bottom-left half of the grid container
                  so it visually aligns with the bottom of the NFT image without changing text layout. */}
              <div className="hidden md:block md:col-start-1 md:col-end-2">
                <div ref={playerAbsRef} className="md:absolute md:bottom-20 md:left-6 md:w-[calc(50%-48px)] md:z-20 md:pointer-events-auto">
                  <MusicPlayer />
                </div>
              </div>
              {/* Animated beam overlay removed — using AnimatedBeamMultipleOutputDemo above */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Section1
