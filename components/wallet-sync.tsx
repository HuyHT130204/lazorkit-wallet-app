'use client';

import { useEffect } from 'react';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { useWalletStore } from '@/lib/store/wallet';

export function WalletSync() {
	// SDK disabled → không cần đồng bộ pubkey
	return null;
}

export default WalletSync;



