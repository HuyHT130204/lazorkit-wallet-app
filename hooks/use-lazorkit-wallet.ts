'use client';

import { useMemo } from 'react';
import { useWallet as useLazorWallet } from '@lazorkit/wallet';

// Wrap SDK hook to keep a single import path across the app
export function useWallet(): any {
  // LazorKit SDK already memoizes internal state; we keep a thin wrapper
  const sdk = useLazorWallet();

  return useMemo(() => ({
    ...sdk,
    // Map SDK README naming to our app naming for compatibility
    connectPasskey: (sdk as any)?.connectPasskey,
    createSmartWallet: (sdk as any)?.createSmartWallet,
    // Backward-compatible aliases expected by our app in some places
    createPasskeyOnly: (sdk as any)?.connectPasskey,
    createSmartWalletOnly: (sdk as any)?.createSmartWallet,
  }), [sdk]);
}