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
      case 'sol':
        return '/placeholder-logo.png'; // Default SOL logo
      case 'usdc':
        return '/placeholder-logo.png'; // Default USDC logo
      case 'usdt':
        return '/placeholder-logo.png'; // Default USDT logo
      default:
        return '/placeholder-logo.png';
    }
  };

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <Image
        src={getLogoPath(symbol)}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        className="rounded-full"
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder-logo.png';
        }}
      />
    </div>
  );
};


