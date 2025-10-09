export function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = Math.imul(48271, state) % 0x7fffffff;
    return (state & 0x7fffffff) / 0x7fffffff;
  };
}

export function generateSparkline(seed: string, points = 7, base = 1, volatility = 0.03) {
  const rand = seededRandom(seed);
  const data: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const change = (rand() - 0.5) * 2 * volatility;
    v = Math.max(0.0001, v * (1 + change));
    data.push(Number(v.toFixed(4)));
  }
  return data;
}


