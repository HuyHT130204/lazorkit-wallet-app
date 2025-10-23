import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ENV_CONFIG } from '@/lib/config/env';
import {
  Fiat,
  TokenSym,
  PaymentMethod,
  ActivityKind,
  TokenHolding,
  Device,
  AppCard,
  Activity,
} from '@/lib/mock-data/types';
import { 
  getTokenBalance, 
  getAllTokenBalances,
  getSwapQuote,
  getSwapTransaction,
  defaultConnection,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS
} from '@/lib/services/jupiter';
import { fetchRealTokenData } from '@/lib/services/real-token-service';
import { getBackendBalance } from '@/lib/services/backend-balance';
import { Connection } from '@solana/web3.js';

// Re-export types for backward compatibility
export type {
  Fiat,
  TokenSym,
  PaymentMethod,
  ActivityKind,
  TokenHolding,
  Device,
  AppCard,
  Activity,
};
import { sampleTokens } from '@/lib/mock-data/tokens';
import { sampleApps } from '@/lib/mock-data/apps';
import { sampleActivity } from '@/lib/mock-data/activity';

export interface WalletState {
  hasPasskey: boolean;
  hasWallet: boolean;
  pubkey?: string;
  walletName?: string;
  fiat: Fiat;
  rateUsdToVnd: number;
  tokens: TokenHolding[];
  devices: Device[];
  apps: AppCard[];
  activity: Activity[];
  // Derived selectors (stable lambdas preferred in components)
  getTokenAmount?: (symbol: TokenSym) => number;
  getPortfolioValueUsd?: () => number;
  hasAssets?: () => boolean;
  hasNoAssets?: () => boolean;
  getNumTokens?: () => number;
  getNumNonZeroTokens?: () => number;
  getTokenValueUsd?: (symbol: TokenSym) => number;
  getEffectivePriceUsd?: (symbol: TokenSym) => number;
  getVisibleTokens?: (hideZero: boolean) => TokenHolding[];

  // Mutators
  setHasPasskey: (hasPasskey: boolean) => void;
  setHasWallet: (hasWallet: boolean) => void;
  setPubkey: (pubkey: string) => void;
  setWalletName: (name: string) => void;
  setTokenAmount?: (symbol: TokenSym, amount: number, priceUsdOverride?: number) => void;
  setFiat: (fiat: Fiat) => void;
  onrampFake: (
    amount: number,
    fiat: Fiat,
    token: TokenSym,
    orderId: string
  ) => void;
  swapFake: (fromToken: TokenSym, toToken: TokenSym, amount: number) => void;
  swapReal: (fromToken: TokenSym, toToken: TokenSym, amount: number) => Promise<boolean>;
  sendFake: (token: TokenSym, amount: number, recipient: string) => void;
  depositFake: (token: TokenSym, amount: number) => void;
  addActivity: (activity: Activity) => void;
  resetDemoData: () => void;
  // New blockchain functions
  generateNewWallet?: () => void; // removed in favor of LazorKit connect
  refreshBalances: () => Promise<void>;
  getRealTokenBalance: (tokenMint: string) => Promise<number>;
  
  // Fake wallet functions for testing
  createFakeWallet: () => void;
  createFakeTransaction: (type: 'swap' | 'send' | 'deposit', data: any) => void;
  simulateWalletCreation: () => Promise<void>;
  
  // Logout and reset functions
  logout: () => void;
  resetPasskey: () => void;
  resetWallet: () => void;
}

// Only use mock data if demo mode is enabled
const getInitialData = () => {
  if (ENV_CONFIG.ENABLE_DEMO) {
    return {
      pubkey: undefined,
      tokens: sampleTokens,
      devices: [],
      apps: sampleApps,
      activity: sampleActivity,
    };
  }
  return {
    pubkey: undefined,
    tokens: [],
    devices: [],
    apps: [],
    activity: [],
  };
};

// Check if we need to clear localStorage due to environment change
const checkEnvironmentChange = () => {
  if (typeof window === 'undefined') return;

  const storageKey = 'lazorkit-wallet-storage';
  const envKey = 'lazorkit-env-config';
  const currentEnv = ENV_CONFIG.ENABLE_DEMO.toString();
  const storedEnv = localStorage.getItem(envKey);

  // Proactively clear corrupted persisted state that would break JSON.parse during hydration
  try {
    const persistedRaw = localStorage.getItem(storageKey);
    if (persistedRaw === 'undefined') {
      localStorage.removeItem(storageKey);
    } else if (persistedRaw) {
      try {
        JSON.parse(persistedRaw);
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  } catch {}

  if (storedEnv && storedEnv !== currentEnv) {
    // Environment changed, clear the wallet storage
    localStorage.removeItem(storageKey);
    console.log('Environment changed, cleared wallet storage');
  }

  // Store current environment
  localStorage.setItem(envKey, currentEnv);
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => {
      // Check for environment changes and clear storage if needed
      checkEnvironmentChange();

      const initialData = getInitialData();
      return {
        hasPasskey: false,
        hasWallet: false,
        pubkey: initialData.pubkey,
        walletName: 'My Wallet',
        fiat: 'USD',
        rateUsdToVnd: 27000,
        tokens: initialData.tokens,
        devices: initialData.devices,
        apps: initialData.apps,
        activity: initialData.activity,

        // Derived selectors
        getTokenAmount: (symbol: TokenSym) => {
          const state = get();
          const found = state.tokens.find((t) => t.symbol === symbol);
          return found ? found.amount : 0;
        },
        getPortfolioValueUsd: () => {
          const state = get();
          return state.tokens.reduce((sum, token) => sum + token.amount * token.priceUsd, 0);
        },
        hasAssets: () => {
          const state = get();
          return state.tokens.some((t) => t.amount > 0);
        },
        hasNoAssets: () => {
          const state = get();
          return !state.tokens.some((t) => t.amount > 0);
        },
        getNumTokens: () => {
          const state = get();
          return state.tokens.length;
        },
        getNumNonZeroTokens: () => {
          const state = get();
          return state.tokens.filter((t) => t.amount > 0).length;
        },
        getTokenValueUsd: (symbol: TokenSym) => {
          const state = get();
          const found = state.tokens.find((t) => t.symbol === symbol);
          return found ? found.amount * found.priceUsd : 0;
        },
        getEffectivePriceUsd: (symbol: TokenSym) => {
          const state = get();
          const found = state.tokens.find((t) => t.symbol === symbol);
          return found ? found.priceUsd : 0;
        },
        getVisibleTokens: (hideZero: boolean) => {
          const state = get();
          return hideZero ? state.tokens.filter((t) => t.amount > 0) : state.tokens;
        },

        setHasPasskey: (hasPasskey) => set({ hasPasskey }),
        setHasWallet: (hasWallet) => set({ hasWallet }),
        setPubkey: (pubkey) => {
          if (typeof window !== 'undefined') {
            (window as any).__lz_pubkey = pubkey;
          }
          set({ pubkey });
        },
        setWalletName: (name: string) => set({ walletName: name }),
        setFiat: (fiat) => set({ fiat }),
        setTokenAmount: (symbol: TokenSym, amount: number, priceUsdOverride?: number) => {
          const state = get();
          console.log('setTokenAmount called:', { symbol, amount, priceUsdOverride });
          console.log('Current tokens:', state.tokens.map(t => ({ symbol: t.symbol, amount: t.amount })));
          const idx = state.tokens.findIndex((t) => t.symbol === symbol);
          const next = [...state.tokens];
          if (idx >= 0) {
            // Add to existing amount (original behavior)
            next[idx] = {
              ...next[idx],
              amount: (next[idx].amount || 0) + amount,
              ...(priceUsdOverride != null ? { priceUsd: priceUsdOverride } : {}),
            } as any;
          } else {
            // Create new token if not found
            next.push({
              symbol,
              amount,
              priceUsd: priceUsdOverride ?? 1,
              change24hPct: 0,
              mint: TOKEN_ADDRESSES[symbol as keyof typeof TOKEN_ADDRESSES] || '',
            } as any);
          }
          set({ tokens: next });
          console.log('Tokens after setTokenAmount:', next.map(t => ({ symbol: t.symbol, amount: t.amount })));
        },

        onrampFake: (amount, fiat, token, orderId) => {
          const state = get();
          const tokenIndex = state.tokens.findIndex((t) => t.symbol === token);
          const next = [...state.tokens];
          if (tokenIndex >= 0) {
            // Overwrite amount (not additive) for onramp success to avoid accumulation across runs
            next[tokenIndex] = {
              ...next[tokenIndex],
              amount,
            } as any;
          } else {
            // If token not found, add it (e.g., BTC mock)
            const newToken = {
              symbol: token,
              amount: amount,
              priceUsd: (token as any) === 'BTC' ? 110956 : 1, // Mock BTC price
              change24hPct: 0,
              mint: (token as any) === 'BTC' ? 'mock-btc-mint' : (TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES] || ''),
            } as any;
            next.push(newToken);
          }
          set({ tokens: next });

          const newActivity: Activity = {
            id: Date.now().toString(),
            kind: 'onramp',
            ts: new Date().toISOString(),
            summary: `Bought ${amount} ${token} with ${
              fiat === 'USD' ? '$' : '₫'
            }${amount.toFixed(2)}`,
            amount,
            token,
            orderId,
          };

          set({ activity: [newActivity, ...state.activity] });
        },

        swapFake: (fromToken, toToken, amount) => {
          const state = get();
          const fromIndex = state.tokens.findIndex(
            (t) => t.symbol === fromToken
          );
          const toIndex = state.tokens.findIndex((t) => t.symbol === toToken);

          if (fromIndex >= 0 && toIndex >= 0) {
            const newTokens = [...state.tokens];
            newTokens[fromIndex] = {
              ...newTokens[fromIndex],
              amount: newTokens[fromIndex].amount - amount,
            };
            // Simulate swap rate (simplified)
            const swapAmount = amount * 0.95; // 5% slippage
            newTokens[toIndex] = {
              ...newTokens[toIndex],
              amount: newTokens[toIndex].amount + swapAmount,
            };
            set({ tokens: newTokens });
          }

          const newActivity: Activity = {
            id: Date.now().toString(),
            kind: 'swap',
            ts: new Date().toISOString(),
            summary: `Swapped ${amount} ${fromToken} for ${(
              amount * 0.95
            ).toFixed(2)} ${toToken}`,
            amount,
            token: fromToken,
          };

          set({ activity: [newActivity, ...state.activity] });
        },

        sendFake: (token, amount, recipient) => {
          const state = get();
          const tokenIndex = state.tokens.findIndex((t) => t.symbol === token);
          if (tokenIndex >= 0) {
            const newTokens = [...state.tokens];
            newTokens[tokenIndex] = {
              ...newTokens[tokenIndex],
              amount: newTokens[tokenIndex].amount - amount,
            };
            set({ tokens: newTokens });
          }

          const newActivity: Activity = {
            id: Date.now().toString(),
            kind: 'send',
            ts: new Date().toISOString(),
            summary: `Sent ${amount} ${token} to ${recipient.slice(
              0,
              4
            )}...${recipient.slice(-4)}`,
            amount,
            token,
            counterparty: recipient,
          };

          set({ activity: [newActivity, ...state.activity] });
        },

        depositFake: (token, amount) => {
          const state = get();
          const tokenIndex = state.tokens.findIndex((t) => t.symbol === token);
          if (tokenIndex >= 0) {
            const newTokens = [...state.tokens];
            newTokens[tokenIndex] = {
              ...newTokens[tokenIndex],
              amount: newTokens[tokenIndex].amount + amount,
            };
            set({ tokens: newTokens });
          }

          const newActivity: Activity = {
            id: Date.now().toString(),
            kind: 'deposit',
            ts: new Date().toISOString(),
            summary: `Deposited ${amount} ${token}`,
            amount,
            token,
          };

          set({ activity: [newActivity, ...state.activity] });
        },


        addActivity: (activity) => {
          const state = get();
          set({ activity: [activity, ...state.activity] });
        },

        resetDemoData: () => {
          const data = getInitialData();
          set({
            hasPasskey: false,
            hasWallet: false,
            pubkey: data.pubkey,
            fiat: 'USD',
            tokens: data.tokens,
            devices: data.devices,
            apps: data.apps,
            activity: data.activity,
          });
        },

        // New blockchain functions
        // generateNewWallet: removed; handled by LazorKit SDK

        refreshBalances: async () => {
          const state = get();
          if (!state.pubkey) {
            console.warn('No pubkey available for refreshBalances');
            return;
          }

          try {
            console.log('🔄 Refreshing balances for wallet:', state.pubkey);
            
            // PRIORITY 1: Try to get balance from backend first (our source of truth)
            try {
              const backendData = await getBackendBalance(state.pubkey);
              console.log('📊 Backend balance data:', backendData);
              
              if (backendData.balances && Object.keys(backendData.balances).length > 0) {
                console.log('📊 Processing backend balances:', backendData.balances);
                
                // Start with current tokens or create default tokens if empty
                let nextTokens = [...state.tokens];
                
                // If no tokens exist, create default USDC token
                if (nextTokens.length === 0) {
                  nextTokens = [{
                    symbol: 'USDC',
                    amount: 0,
                    priceUsd: 1,
                    change24hPct: 0,
                    mint: TOKEN_ADDRESSES.USDC || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                  }];
                  console.log('🔧 Created default USDC token');
                }
                
                // Update each token with backend balance
                nextTokens = nextTokens.map((token) => {
                  const backendAmount = backendData.balances[token.symbol];
                  if (backendAmount !== undefined) {
                    console.log(`💰 Updating ${token.symbol} from backend: ${backendAmount}`);
                    return { ...token, amount: backendAmount } as any;
                  }
                  return token;
                });
                
                // Add any new tokens from backend that don't exist in current tokens
                Object.entries(backendData.balances).forEach(([symbol, amount]) => {
                  const existingToken = nextTokens.find(t => t.symbol === symbol);
                  if (!existingToken) {
                    console.log(`➕ Adding new token from backend: ${symbol} = ${amount}`);
                    nextTokens.push({
                      symbol: symbol as any,
                      amount: amount,
                      priceUsd: 1,
                      change24hPct: 0,
                      mint: TOKEN_ADDRESSES[symbol as keyof typeof TOKEN_ADDRESSES] || ''
                    });
                  }
                });

                // Remove any mock/demo-only tokens (e.g., BTC) or tokens not returned by backend
                const backendSymbols = new Set(Object.keys(backendData.balances));
                nextTokens = nextTokens.filter(t => {
                  // Keep BTC mock token even if not in backend
                  if ((t.symbol as any) === 'BTC') {
                    return true;
                  }
                  return backendSymbols.has(t.symbol);
                });
                
                console.log('📋 Final tokens array:', nextTokens);
                set({ tokens: nextTokens });
                console.log('✅ Balances updated from backend');
                return; // Success, exit early
              }
            } catch (backendError) {
              console.warn('⚠️ Backend balance fetch failed, falling back to on-chain:', backendError);
            }

            // FALLBACK: Use on-chain data if backend fails
            console.log('🔗 Falling back to on-chain balance fetch...');
            
            if (!defaultConnection) {
              console.error('No connection available for fallback');
              return;
            }

            const balances = await getAllTokenBalances(state.pubkey, defaultConnection);

            if (!balances || typeof balances !== 'object') {
              console.warn('Invalid balances response:', balances);
              return;
            }

            const symbolToMint = TOKEN_ADDRESSES as Record<string, string>;
            const mintToSymbol: Record<string, TokenSym> = Object.keys(symbolToMint).reduce((acc, sym) => {
              acc[symbolToMint[sym]] = sym as TokenSym;
              return acc;
            }, {} as Record<string, TokenSym>);

            // Start from current tokens; update when we find balances
            let nextTokens = [...state.tokens];

            // Update known tokens based on mint mapping
            nextTokens = nextTokens.map((tk) => {
              const mint = symbolToMint[tk.symbol];
              if (mint && balances.has(mint)) {
                const bal = balances.get(mint) as number;
                return { ...tk, amount: bal } as any;
              }
              return tk;
            });

            // Add any extra mints that are not mapped; put them under USDC slot if empty
            for (const [mint, bal] of balances.entries()) {
              const symbol = mintToSymbol[mint];
              if (!symbol) {
                // place under USDC slot if its amount is 0
                const idx = nextTokens.findIndex((t) => t.symbol === 'USDC');
                if (idx >= 0 && (nextTokens[idx].amount || 0) === 0) {
                  nextTokens[idx] = { ...nextTokens[idx], amount: bal, priceUsd: 1 } as any;
                }
              }
            }

            set({ tokens: nextTokens });
            console.log('✅ Balances updated from on-chain fallback');
          } catch (error) {
            console.error('❌ Error refreshing balances:', error);
            // Don't throw error, just log it
          }
        },

        getRealTokenBalance: async (tokenMint: string) => {
          const state = get();
          if (!state.pubkey) {
            console.warn('No pubkey available for getRealTokenBalance');
            return 0;
          }

          if (!tokenMint || typeof tokenMint !== 'string') {
            console.warn('Invalid tokenMint:', tokenMint);
            return 0;
          }

          try {
            if (!defaultConnection) {
              console.error('No connection available');
              return 0;
            }

            const balance = await getTokenBalance(state.pubkey, tokenMint, defaultConnection);
            return typeof balance === 'number' ? balance : 0;
          } catch (error) {
            console.error('Error getting token balance:', error);
            return 0;
          }
        },

        swapReal: async (fromToken: TokenSym, toToken: TokenSym, amount: number) => {
          const state = get();
          if (!state.pubkey) {
            console.warn('No pubkey available for swapReal');
            return false;
          }

          if (!fromToken || !toToken || !amount || amount <= 0) {
            console.warn('Invalid swap parameters:', { fromToken, toToken, amount });
            return false;
          }

          try {
            const fromMint = (TOKEN_ADDRESSES as Record<string, string>)[fromToken];
            const toMint = (TOKEN_ADDRESSES as Record<string, string>)[toToken];
            
            if (!fromMint || !toMint) {
              console.error('Invalid token addresses:', { fromToken, toToken, fromMint, toMint });
              return false;
            }

            // Validate amount
            if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
              console.error('Invalid amount:', amount);
              return false;
            }

            // Convert amount to raw units using correct decimals of from token
            const decimals = TOKEN_DECIMALS[fromToken as keyof typeof TOKEN_DECIMALS] ?? 9;
            const rawAmount = Math.round(amount * Math.pow(10, decimals));

            // Get swap quote with error handling
            const quote = await getSwapQuote(fromMint, toMint, rawAmount);
            if (!quote || typeof quote !== 'object') {
              console.error('Failed to get swap quote or invalid quote:', quote);
              return false;
            }

            // Get swap transaction with error handling
            const swapTransaction = await getSwapTransaction(quote, state.pubkey);
            if (!swapTransaction || typeof swapTransaction !== 'object') {
              console.error('Failed to get swap transaction or invalid transaction:', swapTransaction);
              return false;
            }

            // In a real implementation, you would sign and send the transaction here
            // For demo purposes, we'll simulate the swap
            console.log('Swap transaction prepared:', swapTransaction.swapTransaction);
            
            // Simulate successful swap
            state.swapFake(fromToken, toToken, amount);
            
            return true;
          } catch (error) {
            console.error('Error performing real swap:', error);
            return false;
          }
        },

        // Fake wallet functions for testing
        createFakeWallet: () => {
          const fakeAddress = 'FakeWallet' + Math.random().toString(36).substr(2, 9);
          console.log('Creating fake wallet with address:', fakeAddress);
          set({ 
            pubkey: fakeAddress,
            hasPasskey: true,
            hasWallet: true 
          });
        },

        createFakeTransaction: (type: 'swap' | 'send' | 'deposit', data: any) => {
          const state = get();
          const transactionId = 'fake_tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          
          console.log(`Creating fake ${type} transaction:`, { transactionId, data });
          
          // Tạo activity entry cho transaction
          const newActivity: Activity = {
            id: transactionId,
            kind: type,
            ts: new Date().toISOString(),
            summary: `Fake ${type} transaction completed`,
            amount: data.amount,
            token: data.token,
            counterparty: data.recipient,
            status: 'Success'
          };

          // Thêm vào activity list
          set({ activity: [newActivity, ...state.activity] });
        },

        simulateWalletCreation: async () => {
          console.log('=== Simulating wallet creation process ===');
          
          // Step 1: Simulate passkey creation
          console.log('Step 1: Creating fake passkey...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          set({ hasPasskey: true });
          console.log('✓ Fake passkey created');

          // Step 2: Simulate wallet creation
          console.log('Step 2: Creating fake wallet...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          const fakeAddress = 'FakeWallet' + Math.random().toString(36).substr(2, 9);
          set({ 
            pubkey: fakeAddress,
            hasWallet: true 
          });
          console.log('✓ Fake wallet created with address:', fakeAddress);

          // Step 3: Add some initial fake tokens for testing
          console.log('Step 3: Adding initial fake tokens...');
          const initialTokens: TokenHolding[] = [
            {
              symbol: 'SOL',
              amount: 5.0,
              priceUsd: 95.5,
              change24hPct: 2.3,
              mint: 'So11111111111111111111111111111111111111112',
            },
            {
              symbol: 'USDC',
              amount: 100.0,
              priceUsd: 1.0,
              change24hPct: 0.1,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
            {
              symbol: 'USDT',
              amount: 50.0,
              priceUsd: 1.0,
              change24hPct: -0.1,
              mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            }
          ];
          
          set({ tokens: initialTokens });
          console.log('✓ Initial fake tokens added');

          // Step 4: Add some fake activity
          const fakeActivity: Activity[] = [
            {
              id: 'fake_activity_1',
              kind: 'deposit',
              ts: new Date().toISOString(),
              summary: 'Initial deposit of 5 SOL',
              amount: 5.0,
              token: 'SOL',
              status: 'Success'
            },
            {
              id: 'fake_activity_2',
              kind: 'deposit',
              ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              summary: 'Initial deposit of 100 USDC',
              amount: 100.0,
              token: 'USDC',
              status: 'Success'
            }
          ];
          
          set({ activity: [...fakeActivity, ...get().activity] });
          console.log('✓ Fake activity added');

          console.log('=== Fake wallet setup complete ===');
        },

        // Logout and reset functions
        logout: () => {
          console.log('Logging out user...');
          set({
            hasPasskey: false,
            hasWallet: false,
            pubkey: undefined,
            tokens: [],
            activity: []
          });
          
          // Xóa passkeyData khỏi localStorage để đảm bảo đăng xuất hoàn toàn
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('lazorkit-passkey-data');
              localStorage.removeItem('lz_last_ref');
              console.log('✓ Cleared passkeyData from localStorage');
            } catch (e) {
              console.warn('Failed to clear localStorage:', e);
            }
          }
          
          console.log('✓ User logged out successfully');
          // Redirect to /buy after logout
          if (typeof window !== 'undefined') {
            window.location.href = '/buy';
          }
        },

        resetPasskey: () => {
          console.log('Resetting passkey...');
          set({ hasPasskey: false });
          
          // Xóa passkeyData khỏi localStorage khi reset passkey
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('lazorkit-passkey-data');
              localStorage.removeItem('lz_last_ref');
              console.log('✓ Cleared passkeyData from localStorage');
            } catch (e) {
              console.warn('Failed to clear localStorage:', e);
            }
          }
          
          console.log('✓ Passkey reset successfully');
        },

        resetWallet: () => {
          console.log('Resetting wallet...');
          set({
            hasPasskey: false,
            hasWallet: false,
            pubkey: undefined,
            tokens: [],
            activity: []
          });
          
          // Xóa passkeyData khỏi localStorage khi reset wallet
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('lazorkit-passkey-data');
              localStorage.removeItem('lz_last_ref');
              console.log('✓ Cleared passkeyData from localStorage');
            } catch (e) {
              console.warn('Failed to clear localStorage:', e);
            }
          }
          
          console.log('✓ Wallet reset successfully');
        },
      };
    },
    {
      name: 'lazorkit-wallet-storage',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // If migrating from version 0 (no version) or if demo mode is disabled,
        // reset the wallet state to match the environment configuration
        if (version === 0 || !ENV_CONFIG.ENABLE_DEMO) {
          const initialData = getInitialData();
          const base = (persistedState && typeof persistedState === 'object') ? (persistedState as Record<string, unknown>) : {};
          return {
            ...base,
            hasPasskey: false,
            hasWallet: false,
            pubkey: initialData.pubkey,
            tokens: initialData.tokens,
            devices: initialData.devices,
            apps: initialData.apps,
            activity: initialData.activity,
          };
        }
        return persistedState;
      },
    }
  )
);
