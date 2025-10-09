'use client';

import React from 'react';
import { LazorkitProvider } from '@lazorkit/wallet';

type Props = { children: React.ReactNode };

export function LazorkitRootProvider({ children }: Props) {
	// Read env from Next public variables
	const rpcUrl = process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL || process.env.LAZORKIT_RPC_URL || '';
	const paymasterUrl = process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL || process.env.LAZORKIT_PAYMASTER_URL || '';
    const ipfsUrl = process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL || process.env.LAZORKIT_PORTAL_URL || '';

	// If envs are missing, still render children to avoid blocking the app
    if (!rpcUrl || !paymasterUrl || !ipfsUrl) {
		return <>{children}</>;
	}

	return (
		// @ts-expect-error: SDK typings may differ between versions (ipfsUrl vs portalUrl)
		<LazorkitProvider rpcUrl={rpcUrl} paymasterUrl={paymasterUrl} ipfsUrl={ipfsUrl} portalUrl={ipfsUrl}>
			{children}
		</LazorkitProvider>
	);
}

export default LazorkitRootProvider;


