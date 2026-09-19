"use client"

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Props = {
  onBack?: () => void
}

type Card = {
  id: number
  title: string
  img: string
  desc?: string
  link?: string
}

export default function Section3({ onBack }: Props) {
  const router = useRouter()
  const cards: Card[] = [
  { id: 1, title: 'FLX.', img: '/SHIREN%20NFT/felixnew.png', desc: 'President', link: 'https://x.com/flxthesixth' },
  { id: 2, title: 'Jun', img: '/SHIREN%20NFT/jun.png', desc: 'Chief Executive Officer', link: 'https://x.com/lsdjun' },
  { id: 3, title: 'Krisnaf', img: '/SHIREN%20NFT/krisna.png', desc: 'Artist', link: 'https://x.com/Krisnaf_' },
  { id: 4, title: 'Ryu J', img: '/SHIREN%20NFT/ryuji.png', desc: 'Artist', link: 'https://x.com/drunkenryu1' },
  { id: 5, title: 'KucingNKL', img: '/SHIREN%20NFT/Kucingg.png', desc: 'Social Media Manager', link: 'https://x.com/rizkibahari_66' },
  { id: 6, title: 'AzrTen4', img: '/SHIREN%20NFT/azura.png', desc: 'Community Manager', link: 'https://x.com/Azuraten4' },
  // { id: 7, title: 'Damm', img: '/SHIREN%20NFT/dam.png', desc: 'Community Manager', link: 'https://x.com/0xdamm28' },
  ]

  return (
    <div className="shiren-clean flex flex-col items-center justify-center z-20 bg-black md:min-h-screen">
      <div className="w-full max-w-6xl px-4 md:px-6 py-10 md:py-16">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-white">MEET THE TEAM</h2>
          <p className="mt-2 md:mt-3 text-sm md:text-lg text-gray-300 max-w-3xl mx-auto">
            The team behind SHIREN, building alongside its community.
          </p>
        </div>

        {/* Flex cards container */}
        <div className="flex-cards flex gap-4 h-auto md:h-[60vh]">
          {cards.map((c) => (
            <div key={c.id} className="flex-card relative overflow-hidden">
              <Image
                src={c.img}
                alt={c.title}
                fill
                className="object-cover transition-all duration-500"
              />

              {/* dark overlay, will become lighter on hover so image can show fully */}
              <div className="absolute inset-0 overlay transition-colors duration-500" />

              {/* center title/description horizontally, keep y (bottom) the same */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-6 text-white z-10 text-center card-meta">
                <h3 className="text-3xl font-bold mb-2">{c.title}</h3>

                <a
                  href={c.link ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mb-2 icon-x p-0 bg-transparent"
                  style={{ background: 'transparent' }}
                >
                  {/* Use uploaded xlogo as the X/Twitter icon (no extra rounded white background) */}
                  <Image src="/xlogo.png" alt="X / Twitter" width={28} height={28} className="object-cover rounded-none" />
                </a>

                <p className="mt-1 max-w-xs opacity-0 transition-opacity duration-500">
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Styles: standby scale when container is idle, and expand hovered card to 1:1 */}
        <style jsx>{`
          .flex-cards { gap: 1rem; height: 60vh; }
          .flex-card {
            position: relative;
            overflow: hidden;
            flex: 1 1 0%;
            min-width: 0; /* allows flex children to shrink properly */
            transition: transform 360ms ease, flex-basis 360ms ease, flex 360ms ease;
            transform-origin: center;
            border-radius: 8px;
          }

          /* Standby: when container is NOT hovered, slightly enlarge all cards */
          .flex-cards:not(:hover) .flex-card {
            transform: scale(1.03);
          }

          /* Hover: expand hovered card to a square (1:1) so image shows fully. We set a fixed flex-basis equal to container height to make it square. */
          .flex-card:hover {
            flex: 0 0 calc(60vh);
            transform: scale(1);
            z-index: 20;
          }

          /* Reveal description and reduce overlay darkness on hover */
          .flex-card:hover .card-meta p { opacity: 1; }
          .flex-card:hover .overlay { background: rgba(0,0,0,0.18); }

          /* Switch image to contain so the full image is visible within the square */
          .flex-card:hover :global(img) {
            object-fit: contain !important;
          }

          /* ensure overlay default is darker */
          .overlay { background: rgba(0,0,0,0.6); }

          /* on small screens, make the expansion less aggressive */
          @media (max-width: 768px) {
            /* Convert to a horizontally scrollable list on mobile to prevent overflow and tall layout */
            .flex-cards { height: auto; display: flex; overflow-x: auto; padding-bottom: 0.75rem; }
            .flex-card { flex: 0 0 auto; min-width: 60vw; border-radius: 10px; }
            .flex-card:hover { flex: 0 0 60vw; transform: none; }
            .flex-cards:not(:hover) .flex-card { transform: none; }
          }
        `}</style>

        {/* Back button centered below cards */}
        <div className="w-full flex justify-center mt-10 ticket-pass-header">
          <button
            onClick={() => {
              if (typeof onBack === 'function') return onBack()
              router.push('/')
            }}
            className="back-btn"
            aria-label="Back"
            type="button"
          >
            <span className="outline" aria-hidden>
              <svg className="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
