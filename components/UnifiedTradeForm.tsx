'use client';

import { useState } from 'react';
import ErrorBoundary from '@/components/error-boundary';
import { OnRampForm } from '@/components/onramp-form';
import { SwapForm } from '@/components/swap-form';
import { JupiterToken } from '@/lib/services/jupiter';

type Mode = 'buy' | 'swap';

interface UnifiedTradeFormProps {
  tokenData?: Map<string, JupiterToken>;
}

export const UnifiedTradeForm = ({ tokenData }: UnifiedTradeFormProps) => {
  const [mode, setMode] = useState<Mode>('buy');
  const [swapInit, setSwapInit] = useState<{ fromToken?: any; toToken?: any } | null>(null);
  const [buyInitFiat, setBuyInitFiat] = useState<'USD' | 'VND' | undefined>(undefined);

  return (
    <div className='bg-card'>
      {mode === 'buy' ? (
        <ErrorBoundary>
          <OnRampForm
            tokenData={tokenData}
            onSwitchToSwap={({ fromToken, toToken }) => {
              setSwapInit({ fromToken, toToken });
              setMode('swap');
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
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};



