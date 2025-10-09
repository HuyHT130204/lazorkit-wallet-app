'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenLogoProps {
  symbol: string;
  className?: string;
  size?: number;
}

export const TokenLogo = ({ symbol, className, size = 24 }: TokenLogoProps) => {
  // Map symbols to logo files
  const getLogoPath = (symbol: string) => {
    const symbolLower = symbol.toLowerCase();
    
    switch (symbolLower) {
      case 'apple':
        return '/apple_logo.png';
      case 'vietnam':
      case 'vnd':
        return '/vietnam_logo.png';
      // For tokens below we prefer emoji/text fallback instead of missing image files
      case 'sol':
      case 'usdc':
      case 'usdt':
      case 'bonk':
      case 'ray':
      case 'jup':
      case 'orca':
      case 'msol':
      case 'jitosol':
      case 'pyth':
        return null as unknown as string;
      default:
        return null as unknown as string;
    }
  };

  const getEmoji = (symbol: string) => {
    const s = symbol.toUpperCase();
    switch (s) {
      case 'SOL': return '◉';
      case 'USDC':
      case 'USDT': return '$';
      case 'BONK': return '🐕';
      case 'RAY': return '🟣';
      case 'JUP': return '🪐';
      case 'ORCA': return '🐋';
      case 'MSOL':
      case 'JITOSOL': return '◉';
      case 'PYTH': return '🔮';
      default: return '✨';
    }
  };

  const path = getLogoPath(symbol);
  if (path) {
    return (
      <div className={cn('relative flex-shrink-0', className)}>
        <Image
          src={path}
          alt={`${symbol} logo`}
          width={size}
          height={size}
          className="rounded-full"
        />
      </div>
    );
  }

  // Emoji/text fallback
  return (
    <div
      className={cn('rounded-full bg-muted/30 text-secondary flex items-center justify-center', className)}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.7)) }}
    >
      {getEmoji(symbol)}
    </div>
  );
};


