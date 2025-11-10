'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';
import { DrawerNav } from '@/components/drawer-nav';
import { WalletBanner } from '@/components/wallet-banner';
import { UnifiedTradeForm } from '@/components/UnifiedTradeForm';
import { DepositModal } from '@/components/deposit-modal';
import { Card } from '@/components/ui/card';
import { fetchCommonTokens, JupiterToken } from '@/lib/services/jupiter';
import { useWalletStore } from '@/lib/store/wallet';

export default function BuyPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [tokenData, setTokenData] = useState<Map<string, JupiterToken>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const { pubkey, refreshBalances } = useWalletStore();

  // Fetch token data on mount and when pubkey changes
  useEffect(() => {
    const loadTokenData = async () => {
      try {
        setLoading(true);
        const tokens = await fetchCommonTokens();
        console.log('Loaded token data:', tokens);
        setTokenData(tokens);
        
        // Refresh real balances if we have a pubkey
        if (pubkey && refreshBalances) {
          await refreshBalances();
        }
      } catch (error) {
        console.error('Failed to load token data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokenData();
  }, [pubkey, refreshBalances]);

  return (
    <div className='min-h-screen bg-background'>
      <AppHeader showMenu={true} onMenuClick={() => setDrawerOpen(true)} />

      <DrawerNav open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className='container mx-auto px-4 py-2 max-w-md'>
        <div className='space-y-10'>
          {/* Always show WalletBanner - will show ----...---- and balance = 0 for new users */}
          <WalletBanner
            hideDeposit
            onDepositClick={() => setDepositModalOpen(true)}
          />

          {/* Jupiter-style Card Container */}
          <Card className='swap-buy-glow overflow-hidden'>
            {/* Content */}
            <div className='bg-card'>
              {loading ? (
                <div className='p-6 space-y-3'>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className='h-10 rounded bg-muted/30 animate-pulse' />
                  ))}
                </div>
              ) : (
                <UnifiedTradeForm tokenData={tokenData} />
              )}
            </div>
          </Card>
        </div>
      </main>

      <DepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
      />
    </div>
  );
}
