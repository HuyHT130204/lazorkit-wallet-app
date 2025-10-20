'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';
import { DrawerNav } from '@/components/drawer-nav';
import { WalletBanner } from '@/components/wallet-banner';
import { OnRampForm } from '@/components/onramp-form';
import { UnifiedTradeForm } from '@/components/UnifiedTradeForm';
import { DepositModal } from '@/components/deposit-modal';
import ErrorBoundary from '@/components/error-boundary';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchCommonTokens, JupiterToken } from '@/lib/services/jupiter';
import { fetchRealTokenData } from '@/lib/services/real-token-service';
import { useWalletStore } from '@/lib/store/wallet';
import { Zap, Shield, Clock, Globe, Star, TrendingUp } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function BuyPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'swap' | 'buy'>('buy');
  const [tokenData, setTokenData] = useState<Map<string, JupiterToken>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const { hasWallet, pubkey, refreshBalances } = useWalletStore();

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
      <AppHeader showMenu={hasWallet} onMenuClick={() => setDrawerOpen(true)} />

      <DrawerNav open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className='container mx-auto px-4 py-2 max-w-md'>
        <div className='space-y-10'>
          {hasWallet && (
            <WalletBanner
              hideDeposit
              onDepositClick={() => setDepositModalOpen(true)}
            />
          )}

          {/* First Time Buyer Section for users without a wallet */}
          {!hasWallet && (
            <div className='space-y-4 pb-4'>
              {/* Main Buy Section */}
              <div className='text-center'>
                <h1 className='text-4xl font-black text-white mb-1'>
                  {t('buyPage.titleUSDC')}
                </h1>
                <p className='text-2xl font-bold text-primary mb-4'>
                  {t('buyPage.subtitleInstantSecure')}
                </p>

                {/* Tags */}
                <div className='flex flex-wrap gap-1.5 justify-center'>
                  <Badge
                    variant='outline'
                    className='px-2.5 py-1 text-xs border-green-400/30 text-green-500 bg-green-400/10 hover:bg-green-400/20 transition-colors shadow-sm'
                  >
                    <Shield className='w-3 h-3 mr-1' />
                    {t('buyPage.badges.faceIdLogin')}
                  </Badge>
                  <Badge
                    variant='outline'
                    className='px-2.5 py-1 text-xs border-blue-400/30 text-blue-500 bg-blue-400/10 hover:bg-blue-400/20 transition-colors shadow-sm'
                  >
                    <Zap className='w-3 h-3 mr-1' />
                    {t('buyPage.badges.scanAndPay')}
                  </Badge>
                  <Badge
                    variant='outline'
                    className='px-2.5 py-1 text-xs border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors shadow-sm'
                  >
                    <Clock className='w-3 h-3 mr-1' />
                    {t('buyPage.badges.under30s')}
                  </Badge>
                </div>
              </div>
            </div>
          )}

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
