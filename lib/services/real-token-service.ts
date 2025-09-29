import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterToken, fetchTokenData, getTokenBalance, defaultConnection, TOKEN_ADDRESSES } from './jupiter';
import { TokenHolding } from '@/lib/mock-data/types';

export interface RealTokenData {
  symbol: string;
  amount: number;
  priceUsd: number;
  change24hPct: number;
  mint: string;
  jupiterData?: JupiterToken;
}

// Cache for real token data
const tokenDataCache = new Map<string, RealTokenData>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
const lastFetchTime = new Map<string, number>();

export async function fetchRealTokenData(
  walletAddress: string,
  connection: Connection = defaultConnection
): Promise<TokenHolding[]> {
  try {
    const cacheKey = `tokens_${walletAddress}`;
    const lastFetch = lastFetchTime.get(cacheKey) || 0;
    
    // Return cached data if still valid
    if (Date.now() - lastFetch < CACHE_DURATION && tokenDataCache.has(cacheKey)) {
      const cached = tokenDataCache.get(cacheKey);
      if (cached) {
        return [cached];
      }
    }

    const tokens: TokenHolding[] = [];
    
    // Fetch data for all supported tokens with rate limiting
    const tokenSymbols = Object.keys(TOKEN_ADDRESSES) as Array<keyof typeof TOKEN_ADDRESSES>;
    
    // Process tokens in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < tokenSymbols.length; i += batchSize) {
      const batch = tokenSymbols.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        try {
          const mint = TOKEN_ADDRESSES[symbol];
          
          // Get Jupiter token data (with delay to avoid rate limiting)
          const jupiterData = await fetchTokenData(symbol);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Get real balance from blockchain
          const balance = await getTokenBalance(walletAddress, mint, connection);
          
          // Get price from Jupiter or fallback
          const priceUsd = jupiterData?.usdPrice || getDefaultPrice(symbol);
          
          // Get 24h change from Jupiter or fallback
          const change24hPct = jupiterData?.change24hPct || getDefaultChange(symbol);
          
          const tokenData: TokenHolding = {
            symbol,
            amount: balance,
            priceUsd,
            change24hPct,
            mint,
          };
          
          tokens.push(tokenData);
          
          // Cache individual token data
          const tokenCacheKey = `${symbol}_${walletAddress}`;
          tokenDataCache.set(tokenCacheKey, {
            ...tokenData,
            jupiterData,
          });
          
        } catch (error) {
          console.warn(`Failed to fetch data for ${symbol}:`, error);
          // Add token with zero balance if fetch fails
          tokens.push({
            symbol,
            amount: 0,
            priceUsd: getDefaultPrice(symbol),
            change24hPct: getDefaultChange(symbol),
            mint: TOKEN_ADDRESSES[symbol],
          });
        }
      }));
      
      // Delay between batches
      if (i + batchSize < tokenSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Update cache
    tokenDataCache.set(cacheKey, tokens[0]); // Store first token as representative
    lastFetchTime.set(cacheKey, Date.now());
    
    return tokens;
    
  } catch (error) {
    console.error('Error fetching real token data:', error);
    // Return empty array on error
    return [];
  }
}

// Default prices for fallback (updated regularly)
function getDefaultPrice(symbol: string): number {
  const defaultPrices: Record<string, number> = {
    'SOL': 95.5,
    'USDC': 1.0,
    'USDT': 1.0,
    'BONK': 0.000012,
    'RAY': 2.45,
    'JUP': 0.85,
    'ORCA': 3.2,
    'mSOL': 96.8,
    'JitoSOL': 97.2,
    'PYTH': 0.45,
  };
  return defaultPrices[symbol] || 0;
}

// Default 24h changes for fallback
function getDefaultChange(symbol: string): number {
  const defaultChanges: Record<string, number> = {
    'SOL': 2.3,
    'USDC': 0.1,
    'USDT': -0.1,
    'BONK': 5.2,
    'RAY': 1.8,
    'JUP': -2.1,
    'ORCA': 0.5,
    'mSOL': 2.1,
    'JitoSOL': 2.5,
    'PYTH': -1.2,
  };
  return defaultChanges[symbol] || 0;
}

// Clear cache function
export function clearTokenDataCache(): void {
  tokenDataCache.clear();
  lastFetchTime.clear();
}

// Get cached token data
export function getCachedTokenData(symbol: string, walletAddress: string): RealTokenData | null {
  const cacheKey = `${symbol}_${walletAddress}`;
  return tokenDataCache.get(cacheKey) || null;
}
