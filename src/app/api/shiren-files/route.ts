import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'SHIREN NFT')
    const entries = await fs.promises.readdir(dir)
    const images = entries
      .filter((f) => /\.(png|jpe?g|webp|avif|gif)$/i.test(f))
      .map((f) => encodeURI(`/SHIREN NFT/${f}`))

    return NextResponse.json({ images })
  } catch (e) {
    // If folder doesn't exist or read fails, return empty list
    return NextResponse.json({ images: [] }, { status: 200 })
  }
}
