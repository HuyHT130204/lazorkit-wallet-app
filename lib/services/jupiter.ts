import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { SwapMode } from '@jup-ag/core';

export interface JupiterToken {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  fdv?: number;
  mcap?: number;
  usdPrice?: number;
  liquidity?: number;
  holderCount?: number;
  isVerified?: boolean;
  tags?: string[];
}

export interface SwapQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: SwapMode;
  slippageBps: number;
  platformFee?: unknown;
  priceImpactPct?: string;
  routePlan?: unknown[];
}

export interface SwapTransaction {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
}

// RPC endpoints
const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  helius: 'https://rpc-devnet.helius.xyz/?api-key=demo', // Free Helius endpoint
  quicknode: 'https://api.devnet.solana.com', // Fallback to official devnet
  mainnet: 'https://api.mainnet-beta.solana.com',
} as const;

// Common token addresses on Solana
export const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  JitoSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
} as const;

// Common token decimals (fallback when API metadata not available)
export const TOKEN_DECIMALS: Record<keyof typeof TOKEN_ADDRESSES, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
  BONK: 5,
  RAY: 6,
  JUP: 6,
  ORCA: 6,
  mSOL: 9,
  JitoSOL: 9,
  PYTH: 6,
};

export function getSymbolDecimals(symbol: string, jupToken?: JupiterToken): number {
  if (jupToken && typeof jupToken.decimals === 'number') return jupToken.decimals;
  const key = symbol as keyof typeof TOKEN_DECIMALS;
  return TOKEN_DECIMALS[key] ?? 9;
}

// Create connection instances
export const connections = {
  devnet: new Connection(RPC_ENDPOINTS.devnet, 'confirmed'),
  helius: new Connection(RPC_ENDPOINTS.helius, 'confirmed'),
  quicknode: new Connection(RPC_ENDPOINTS.quicknode, 'confirmed'),
  mainnet: new Connection(RPC_ENDPOINTS.mainnet, 'confirmed'),
};

// Default connection (using official devnet for reliability)
export const defaultConnection = connections.devnet;

// Cache for token data
const tokenCache = new Map<string, JupiterToken>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const lastFetchTime = new Map<string, number>();

export async function fetchTokenData(
  symbolOrAddress: string
): Promise<JupiterToken | null> {
  // Check cache first
  const cacheKey = symbolOrAddress.toUpperCase();
  const cached = tokenCache.get(cacheKey);
  const lastFetch = lastFetchTime.get(cacheKey) || 0;

  if (cached && Date.now() - lastFetch < CACHE_DURATION) {
    return cached;
  }

  try {
    // Use the address if we have it, otherwise search by symbol
    const query =
      TOKEN_ADDRESSES[cacheKey as keyof typeof TOKEN_ADDRESSES] ||
      symbolOrAddress;

    const response = await fetch(
      `https://lite-api.jup.ag/tokens/v2/search?query=${query}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch token data: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`No token data found for ${symbolOrAddress}`);
      return null;
    }

    // Take the first result
    const token = data[0];

    const result: JupiterToken = {
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      icon: token.icon,
      decimals: token.decimals,
      fdv: token.fdv,
      mcap: token.mcap,
      usdPrice: token.usdPrice,
      liquidity: token.liquidity,
      holderCount: token.holderCount,
      isVerified: token.isVerified,
      tags: token.tags,
    };

    // Update cache
    tokenCache.set(cacheKey, result);
    lastFetchTime.set(cacheKey, Date.now());

    return result;
  } catch (error) {
    console.error(`Error fetching token data for ${symbolOrAddress}:`, error);
    return null;
  }
}

export async function fetchCommonTokens(): Promise<Map<string, JupiterToken>> {
  const tokens = new Map<string, JupiterToken>();

  // Fetch data for common tokens in parallel
  const symbols = ['SOL', 'USDC', 'USDT', 'BONK', 'RAY', 'JUP', 'ORCA', 'mSOL', 'JitoSOL', 'PYTH'];
  const promises = symbols.map((symbol) => fetchTokenData(symbol));
  const results = await Promise.all(promises);

  results.forEach((token, index) => {
    if (token) {
      tokens.set(symbols[index], token);
    }
  });

  return tokens;
}

// Jupiter swap functions
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50 // 0.5% default slippage
): Promise<SwapQuote | null> {
  try {
    // Validate inputs
    if (!inputMint || !outputMint || !amount || amount <= 0) {
      console.warn('Invalid swap quote parameters:', { inputMint, outputMint, amount });
      return null;
    }

    // Additional validation
    if (typeof inputMint !== 'string' || typeof outputMint !== 'string') {
      console.warn('Invalid mint addresses:', { inputMint, outputMint });
      return null;
    }

    if (typeof amount !== 'number' || !isFinite(amount)) {
      console.warn('Invalid amount:', amount);
      return null;
    }

    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(inputMint)}&outputMint=${encodeURIComponent(outputMint)}&amount=${amount}&slippageBps=${slippageBps}`;
    
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Jupiter API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Validate response data structure
    if (!data || typeof data !== 'object') {
      console.warn('Invalid response from Jupiter API:', data);
      return null;
    }

    // Check for required fields
    if (!data.inputMint || !data.outputMint || !data.inAmount || !data.outAmount) {
      console.warn('Missing required fields in Jupiter response:', data);
      return null;
    }

    return data as SwapQuote;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error getting swap quote:', error.message);
    } else {
      console.error('Unknown error getting swap quote:', error);
    }
    return null;
  }
}

export async function getSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string,
  wrapAndUnwrapSol: boolean = true
): Promise<SwapTransaction | null> {
  try {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get swap transaction: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting swap transaction:', error);
    return null;
  }
}

// Generate fake wallet addresses for demo
export function generateFakeWalletAddress(): string {
  const keypair = Keypair.generate();
  return keypair.publicKey.toBase58();
}

// Get token balance from blockchain
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string,
  connection: Connection = defaultConnection
): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMint);

    if (tokenMint === TOKEN_ADDRESSES.SOL) {
      // For SOL, get native balance
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } else {
      // For SPL tokens, get token account balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: mintPublicKey }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

// Get all token balances for a wallet
export async function getAllTokenBalances(
  walletAddress: string,
  connection: Connection = defaultConnection
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();

  try {
    const publicKey = new PublicKey(walletAddress);

    // Get SOL balance
    const solBalance = await connection.getBalance(publicKey);
    balances.set(TOKEN_ADDRESSES.SOL, solBalance / 1e9);

    // Get SPL token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    for (const account of tokenAccounts.value) {
      const mint = account.account.data.parsed.info.mint;
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
      if (balance && balance > 0) {
        balances.set(mint, balance);
      }
    }
  } catch (error) {
    console.error('Error getting all token balances:', error);
  }

  return balances;
}
