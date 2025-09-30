'use client';

import { useState } from 'react';
import { Send, Plus, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { DrawerNav } from '@/components/drawer-nav';
import { AssetsTab } from '@/components/assets-tab';
import { DevicesTab } from '@/components/devices-tab';
import { SettingsTab } from '@/components/settings-tab';
import { SendModalViewport } from '@/components/send-modal-viewport';
import { DepositModalCompact } from '@/components/deposit-modal-compact';
import ErrorBoundary from '@/components/error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Blockie } from '@/components/ui/blockie';
import { useWalletStore } from '@/lib/store/wallet';
import { formatAddress, formatCurrency } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

export default function AccountPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  const { pubkey, tokens, fiat, rateUsdToVnd } = useWalletStore();

  const totalBalance = tokens.reduce((sum, token) => {
    const value = token.amount * token.priceUsd;
    return sum + value;
  }, 0);

  const displayBalance =
    fiat === 'VND' ? totalBalance * rateUsdToVnd : totalBalance;

  return (
    <>
      <div className='min-h-screen bg-background'>
        <AppHeader showMenu onMenuClick={() => setDrawerOpen(true)} />

        <DrawerNav open={drawerOpen} onOpenChange={setDrawerOpen} />

        <main className='container mx-auto px-4 py-6 max-w-md pb-24'>
          <div className='space-y-6'>
            {/* Premium Wallet Card */}
            <div className="relative w-full max-w-lg mx-auto">
              <div 
                className="relative rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:scale-[1.01] hover:shadow-[0_25px_70px_rgba(0,0,0,0.9)] aspect-[1.586/1] card-entrance"
                style={{
                  backgroundImage: 'url(/card_wallet.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Card Content */}
                <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                  {/* Top Section */}
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-500/30 shadow-sm">
                          <Blockie seed={pubkey || 'demo'} size={8} scale={4} />
                        </div>
                        <span className="text-purple-500 font-bold text-sm tracking-wide">SOLANA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-gray-400 text-xs font-medium">Devnet</span>
                      </div>
                    </div>

                    {/* Contactless Payment Icon */}
                    <div className="absolute top-6 right-6">
                      <svg className="w-10 h-10 text-gray-600/30" viewBox="0 0 40 40" fill="none">
                        <path d="M8 20C8 14.5 11 9 16 9M12 20C12 16.5 14 14 16 14M16 20C16 18 16 20 16 20" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 20C16 14.5 19 9 24 9M20 20C20 16.5 22 14 24 14M24 20C24 18 24 20 24 20" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M24 20C24 14.5 27 9 32 9M28 20C28 16.5 30 14 32 14M32 20C32 18 32 20 32 20" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Bottom Section - Address and Portfolio Value */}
                  <div className="space-y-2">
                    {/* Address - positioned above Portfolio Value */}
                    <div className="flex items-center gap-2">
                      <code className="text-gray-200 font-mono text-lg tracking-[0.2em]">
                        {pubkey ? formatAddress(pubkey) : '----...----'}
                      </code>
                      {pubkey && (
                        <div className="flex items-center gap-1">
                          <CopyButton text={pubkey} />
                          <Button
                            size="sm"
                            variant="ghost"
                            className='h-7 w-7 p-0 hover:bg-white/10'
                            onClick={() => window.open(`https://explorer.solana.com/address/${pubkey}?cluster=devnet`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Value */}
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 font-medium">
                          {t('wallet.totalBalance')}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-3xl font-bold tracking-tight">
                            {showBalance
                              ? formatCurrency(displayBalance, fiat)
                              : '••••••'}
                          </p>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setShowBalance(!showBalance)}
                            className='h-8 w-8 p-0 hover:bg-white/10 transition-all duration-200'
                          >
                            {showBalance ? (
                              <EyeOff className='h-4 w-4 text-gray-400' />
                            ) : (
                              <Eye className='h-4 w-4 text-gray-400' />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-500 font-bold text-xl tracking-wider">LazorKit</p>
                        <p className="text-gray-500 text-xs tracking-wide">Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='grid grid-cols-2 gap-3'>
              <Button
                variant='outline'
                size='sm'
                className='h-10 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 smooth-hover button-press slide-in-left'
                onClick={() => setSendModalOpen(true)}
              >
                <Send className='mr-2 h-4 w-4' />
                {t('wallet.send')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-10 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 smooth-hover button-press slide-in-right'
                onClick={() => setDepositModalOpen(true)}
              >
                <Plus className='mr-2 h-4 w-4' />
                {t('wallet.deposit')}
              </Button>
            </div>

            {/* Content */}
            <div className='w-full'>
              <Tabs defaultValue='assets' className='w-full'>
                <TabsList className='w-full h-12 rounded-xl bg-muted/40 p-1 shadow-sm'>
                  <TabsTrigger value='assets' className='flex-1 h-10 text-sm md:text-base'>
                    Assets
                  </TabsTrigger>
                  <TabsTrigger value='devices' className='flex-1 h-10 text-sm md:text-base'>
                    Devices
                  </TabsTrigger>
                  <TabsTrigger value='settings' className='flex-1 h-10 text-sm md:text-base'>
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='assets' className='mt-4'>
                  <ErrorBoundary>
                    <AssetsTab />
                  </ErrorBoundary>
                </TabsContent>
                <TabsContent value='devices' className='mt-4'>
                  <ErrorBoundary>
                    <DevicesTab />
                  </ErrorBoundary>
                </TabsContent>
                <TabsContent value='settings' className='mt-4'>
                  <ErrorBoundary>
                    <SettingsTab />
                  </ErrorBoundary>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      {/* Modals - Rendered outside of main container */}
      <SendModalViewport open={sendModalOpen} onOpenChange={setSendModalOpen} />
      <DepositModalCompact
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
      />

    </>
  );
}
