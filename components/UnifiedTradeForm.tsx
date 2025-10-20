'use client';

import { useEffect, useState } from 'react';
import ErrorBoundary from '@/components/error-boundary';
import { OnRampForm } from '@/components/onramp-form';
import { SwapForm } from '@/components/swap-form';
import { JupiterToken } from '@/lib/services/jupiter';
import { useWalletStore } from '@/lib/store/wallet';

type Mode = 'buy' | 'swap';

interface UnifiedTradeFormProps {
  tokenData?: Map<string, JupiterToken>;
}

export const UnifiedTradeForm = ({ tokenData }: UnifiedTradeFormProps) => {
  const getTokenAmount = useWalletStore((s) => s.getTokenAmount);
  const tokens = useWalletStore((s) => s.tokens);
  const hasAssets = useWalletStore((s) => s.hasAssets?.());
  const refreshBalances = useWalletStore((s) => s.refreshBalances);

  // Derive current BTC balance; fallback to any assets presence
  const btcBalance = getTokenAmount
    ? getTokenAmount('BTC' as any)
    : (tokens.find((t: any) => t.symbol === 'BTC')?.amount || 0);

  const [mode, setMode] = useState<Mode>('buy');
  const [swapInit, setSwapInit] = useState<{ fromToken?: any; toToken?: any } | null>(null);
  const [buyInitFiat, setBuyInitFiat] = useState<'USD' | 'VND' | undefined>(undefined);
  const [autoApplied, setAutoApplied] = useState(false);

  // Refresh balances once on mount
  useEffect(() => {
    if (typeof refreshBalances === 'function') {
      refreshBalances().catch(() => {});
    }
  }, [refreshBalances]);

  // Auto decide default mode: if wallet has any assets → swap BTC->SOL, else buy USD->BTC (mock)
  useEffect(() => {
    if (autoApplied) return; // don't override if already applied or user changed

    if ((btcBalance && btcBalance > 0) || hasAssets) {
      setMode('swap');
      setSwapInit({ fromToken: 'BTC' as any, toToken: 'SOL' });
    } else {
      setMode('buy');
      setBuyInitFiat('USD');
    }
    setAutoApplied(true);
  }, [btcBalance, hasAssets, autoApplied]);

  return (
    <div className='bg-card'>
      {mode === 'buy' ? (
        <ErrorBoundary>
          <OnRampForm
            tokenData={tokenData}
            onSwitchToSwap={({ fromToken, toToken }) => {
              setSwapInit({ fromToken, toToken });
              setMode('swap');
              setAutoApplied(true); // user took an action; stop auto switching
            }}
            initialFromCurrency={buyInitFiat}
          />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <SwapForm
            tokenData={tokenData}
            initialFromToken={swapInit?.fromToken}
            initialToToken={swapInit?.toToken}
            onSwitchToBuy={({ fiat }) => {
              setBuyInitFiat(fiat);
              setMode('buy');
              setAutoApplied(true); // user took an action; stop auto switching
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};





