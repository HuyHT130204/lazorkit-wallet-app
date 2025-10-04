'use client';

import { useEffect } from 'react';
import { useWallet } from '@/hooks/use-lazorkit-wallet';

export function useLazorkitAuth(jwtToken: string | null) {
  const wallet = useWallet();

  useEffect(() => {
    if (jwtToken && wallet) {
      console.log('🔧 Injecting JWT token into LazorKit wallet instance');
      
      // Try to inject JWT token into wallet instance
      if (typeof wallet === 'object' && wallet !== null) {
        // Method 1: Direct property assignment
        (wallet as any).authToken = jwtToken;
        (wallet as any).jwtToken = jwtToken;
        (wallet as any).token = jwtToken;
        
        // Method 2: Set in account if available
        if (wallet.account && typeof wallet.account === 'object') {
          (wallet.account as any).authToken = jwtToken;
          (wallet.account as any).jwtToken = jwtToken;
          (wallet.account as any).token = jwtToken;
        }
        
        // Method 3: Set in any nested objects
        Object.keys(wallet).forEach(key => {
          const value = (wallet as any)[key];
          if (value && typeof value === 'object' && value !== null) {
            (value as any).authToken = jwtToken;
            (value as any).jwtToken = jwtToken;
            (value as any).token = jwtToken;
          }
        });
        
        console.log('✅ JWT token injected into wallet instance');
        console.log('🔍 Wallet instance keys after injection:', Object.keys(wallet));
      }
    }
  }, [jwtToken, wallet]);

  return wallet;
}
