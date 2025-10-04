'use client';

import { useEffect } from 'react';
import { useWalletStore } from '@/lib/store/wallet';

export function useLazorkitJWT() {
  const { pubkey } = useWalletStore();

  useEffect(() => {
    if (!pubkey) return;

    // Intercept fetch requests to add JWT token
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if this is a request to our paymaster proxy
      if (url.includes('/api/paymaster')) {
        console.log('🔍 Intercepting paymaster request:', url);
        
        // Get JWT token from localStorage
        const jwtToken = localStorage.getItem('lazorkit-jwt-token');
        
        if (jwtToken) {
          console.log('🔑 Adding JWT token to paymaster request');
          
          // Add JWT token to headers
          const headers = new Headers(init?.headers);
          headers.set('x-jwt-token', jwtToken);
          
          // Update init with new headers
          const newInit = {
            ...init,
            headers,
          };
          
          return originalFetch(input, newInit);
        } else {
          console.warn('⚠️ No JWT token found for paymaster request');
        }
      }
      
      // For other requests, use original fetch
      return originalFetch(input, init);
    };

    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [pubkey]);

  return null;
}
