/** Small deterministic PRNG (mulberry32) so generated demo analytics are stable between renders. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function series(seed: string, length: number, base: number, variance: number, trend = 0): number[] {
  const rand = seeded(seed);
  return Array.from({ length }, (_, i) => Math.max(0, Math.round(base + trend * i + (rand() - 0.5) * 2 * variance)));
}
