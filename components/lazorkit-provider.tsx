'use client';

import React, { useEffect, useState } from 'react';
import { useWalletStore } from '@/lib/store/wallet';
import { useLazorkitJWT } from '@/hooks/use-lazorkit-jwt';
import { LazorkitProviderWrapper } from './lazorkit-provider-wrapper';

type Props = { children: React.ReactNode };

export function LazorkitRootProvider({ children }: Props) {
	const [jwtToken, setJwtToken] = useState<string | null>(null);
	const { pubkey } = useWalletStore();
	
	// Use JWT interceptor hook
	useLazorkitJWT();

	// Read env from Next public variables
	const rpcUrl = process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL || process.env.LAZORKIT_RPC_URL || '';
	// Use proxy for paymaster to avoid CORS issues
	const paymasterUrl = process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL || process.env.LAZORKIT_PAYMASTER_URL || '/api/paymaster';
    const ipfsUrl = process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL || process.env.LAZORKIT_PORTAL_URL || '';

	// Generate JWT token when wallet is available
	useEffect(() => {
		const generateJWT = async () => {
			if (!pubkey) {
				setJwtToken(null);
				return;
			}

			try {
				console.log('🔑 Generating JWT token for wallet:', pubkey);
				
				// Get passkeyData from localStorage
				let passkeyData = null;
				try {
					const storedPasskey = localStorage.getItem('lazorkit-passkey-data');
					if (storedPasskey) {
						passkeyData = JSON.parse(storedPasskey);
					}
				} catch (e) {
					console.warn('Failed to parse stored passkey data:', e);
				}

				const response = await fetch('/api/auth/jwt', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						walletAddress: pubkey,
						passkeyData,
					}),
				});

				if (!response.ok) {
					throw new Error(`JWT generation failed: ${response.status}`);
				}

				const data = await response.json();
				setJwtToken(data.token);
				
				// Store JWT token in localStorage for LazorKit SDK to access
				try {
					localStorage.setItem('lazorkit-jwt-token', data.token);
					console.log('💾 JWT token stored in localStorage');
				} catch (e) {
					console.warn('Failed to store JWT token in localStorage:', e);
				}
				
				// Also set as global variable for SDK access
				if (typeof window !== 'undefined') {
					(window as any).__lazorkit_jwt_token = data.token;
					console.log('🌐 JWT token set as global variable');
					
					// Try to set JWT token in environment variables for LazorKit SDK
					process.env.NEXT_PUBLIC_LAZORKIT_JWT_TOKEN = data.token;
					console.log('🔧 JWT token set in environment variables');
				}
				
				console.log('✅ JWT token generated successfully');
			} catch (error) {
				console.error('❌ Failed to generate JWT token:', error);
				setJwtToken(null);
			}
		};

		generateJWT();
	}, [pubkey]);

	// Debug environment variables
	console.log('🔧 LazorkitProvider environment variables:', {
		rpcUrl,
		paymasterUrl,
		ipfsUrl,
		hasRpcUrl: !!rpcUrl,
		hasPaymasterUrl: !!paymasterUrl,
		hasIpfsUrl: !!ipfsUrl,
		hasJwtToken: !!jwtToken,
		hasPubkey: !!pubkey
	});

	// If envs are missing, still render children to avoid blocking the app
    if (!rpcUrl || !paymasterUrl || !ipfsUrl) {
		console.warn('⚠️ Missing environment variables, LazorkitProvider will not initialize');
		return <>{children}</>;
	}

	// If no JWT token yet but we have a pubkey, show loading state
	if (pubkey && !jwtToken) {
		console.log('⏳ Waiting for JWT token generation...');
		return <>{children}</>;
	}

	// Create paymaster URL with JWT token if available
	const paymasterUrlWithAuth = jwtToken 
		? `${paymasterUrl}?token=${encodeURIComponent(jwtToken)}`
		: paymasterUrl;
		
	console.log('🔧 Paymaster URL configuration:', {
		originalUrl: paymasterUrl,
		withAuth: paymasterUrlWithAuth,
		hasJwtToken: !!jwtToken,
		jwtTokenLength: jwtToken?.length || 0
	});

	return (
		<LazorkitProviderWrapper 
			rpcUrl={rpcUrl} 
			paymasterUrl={paymasterUrlWithAuth} 
			portalUrl={ipfsUrl}
			jwtToken={jwtToken}
		>
			{children}
		</LazorkitProviderWrapper>
	);
}

export default LazorkitRootProvider;


