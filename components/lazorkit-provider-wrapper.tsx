'use client';

import React, { useEffect, useRef } from 'react';
import { LazorkitProvider } from '@lazorkit/wallet';

interface LazorkitProviderWrapperProps {
  rpcUrl: string;
  paymasterUrl: string;
  portalUrl: string;
  jwtToken?: string | null;
  children: React.ReactNode;
}

export function LazorkitProviderWrapper({ 
  rpcUrl, 
  paymasterUrl, 
  portalUrl, 
  jwtToken,
  children 
}: LazorkitProviderWrapperProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (jwtToken && !initialized.current) {
      console.log('🔧 Initializing LazorKit SDK with JWT token');
      
      // Try to set JWT token in various ways for LazorKit SDK
      if (typeof window !== 'undefined') {
        // Method 1: Set in global variables
        (window as any).__lazorkit_auth_token = jwtToken;
        (window as any).__lazorkit_jwt_token = jwtToken;
        
        // Method 2: Set in localStorage
        localStorage.setItem('lazorkit-auth-token', jwtToken);
        localStorage.setItem('lazorkit-jwt-token', jwtToken);
        
        // Method 3: Set in sessionStorage
        sessionStorage.setItem('lazorkit-auth-token', jwtToken);
        sessionStorage.setItem('lazorkit-jwt-token', jwtToken);
        
        // Method 4: Try to set in process.env (for client-side)
        if (typeof process !== 'undefined' && process.env) {
          process.env.NEXT_PUBLIC_LAZORKIT_JWT_TOKEN = jwtToken;
          process.env.LAZORKIT_JWT_TOKEN = jwtToken;
          process.env.LAZORKIT_AUTH_TOKEN = jwtToken;
        }
        
        console.log('✅ JWT token set in multiple locations for LazorKit SDK');
        initialized.current = true;
      }
    }
  }, [jwtToken]);

  return (
    <LazorkitProvider 
      rpcUrl={rpcUrl} 
      paymasterUrl={paymasterUrl} 
      portalUrl={portalUrl}
    >
      {children}
    </LazorkitProvider>
  );
}
