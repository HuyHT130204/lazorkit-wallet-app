'use client';

import { useEffect, useRef } from 'react';

interface BlockieProps {
  seed: string;
  size?: number;
  scale?: number;
  className?: string;
}

export function Blockie({ seed, size = 8, scale = 6, className }: BlockieProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = size;
    const height = size;
    canvas.width = width * scale;
    canvas.height = height * scale;

    // Hash seed to deterministic numbers
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = () => {
      h = Math.imul(48271, h) % 0x7fffffff;
      return (h & 0x7fffffff) / 0x7fffffff;
    };

    // Colors
    const primary = '#7857ff';
    const bg = '#14151B';

    // Mirror pattern horizontally for identicon look
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < Math.ceil(width / 2); x++) {
        row[x] = rand() > 0.5 ? 1 : 0;
      }
      const mirror = row.slice(0, Math.floor(width / 2)).reverse();
      grid[y] = row.concat(mirror);
    }

    // Draw
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = primary;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [seed, size, scale]);

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: 'pixelated' }} />;
}


