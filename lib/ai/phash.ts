/**
 * Perceptual hash (pHash) for duplicate image detection.
 * Port of the Python `imagehash.phash()` algorithm using `sharp`.
 * Produces a 64-bit hex string matching Python's imagehash output format.
 */

import sharp from 'sharp'

const HASH_SIZE = 8          // 8×8 = 64-bit hash
const DCT_SIZE  = HASH_SIZE * 4  // resize to 32×32 before DCT

/** Compute pHash of an image buffer. Returns a 16-char hex string. */
export async function computePHash(imageBuffer: Buffer): Promise<string> {
  // 1. Resize to DCT_SIZE × DCT_SIZE greyscale
  const pixels = await sharp(imageBuffer)
    .resize(DCT_SIZE, DCT_SIZE, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer()

  const n = DCT_SIZE
  const floats = Array.from(pixels).map(Number)

  // 2. 2-D DCT (naive but correct for small sizes)
  const dct = dct2d(floats, n)

  // 3. Take top-left HASH_SIZE × HASH_SIZE coefficients (excluding [0,0])
  const coeffs: number[] = []
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      coeffs.push(dct[row * n + col])
    }
  }
  // Exclude DC component from mean
  const mean = (coeffs.slice(1).reduce((a, b) => a + b, 0)) / (coeffs.length - 1)

  // 4. Build bit string: 1 if coeff > mean
  let bits = BigInt(0)
  for (let i = 0; i < coeffs.length; i++) {
    if (coeffs[i] > mean) bits |= BigInt(1) << BigInt(63 - i)
  }

  return bits.toString(16).padStart(16, '0')
}

/** Hamming distance between two pHash hex strings. */
export function hammingDistance(h1: string, h2: string): number {
  const a = BigInt('0x' + h1)
  const b = BigInt('0x' + h2)
  let xor = a ^ b
  let dist = 0
  while (xor > BigInt(0)) {
    if (xor & BigInt(1)) dist++
    xor >>= BigInt(1)
  }
  return dist
}

/** Compute pHashes for multiple image buffers. */
export async function computePHashes(buffers: Buffer[]): Promise<string[]> {
  return Promise.all(buffers.map(computePHash))
}

// ── Internal DCT ────────────────────────────────────────────────────────────

function dct2d(pixels: number[], n: number): number[] {
  // Row-wise DCT then column-wise DCT
  const temp = new Array(n * n).fill(0)
  const out  = new Array(n * n).fill(0)

  for (let row = 0; row < n; row++) {
    const slice = pixels.slice(row * n, row * n + n)
    const d = dct1d(slice)
    for (let col = 0; col < n; col++) temp[row * n + col] = d[col]
  }

  for (let col = 0; col < n; col++) {
    const slice: number[] = []
    for (let row = 0; row < n; row++) slice.push(temp[row * n + col])
    const d = dct1d(slice)
    for (let row = 0; row < n; row++) out[row * n + col] = d[row]
  }

  return out
}

function dct1d(signal: number[]): number[] {
  const N = signal.length
  const result: number[] = []
  for (let k = 0; k < N; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += signal[n] * Math.cos((Math.PI / N) * (n + 0.5) * k)
    }
    result.push(sum)
  }
  return result
}
