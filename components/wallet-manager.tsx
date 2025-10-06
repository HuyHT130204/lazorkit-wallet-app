'use client';

import { useState } from 'react';
import { RefreshCcw, ExternalLink, Wallet, Plus, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useWalletStore } from '@/lib/store/wallet';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { PublicKey } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const WalletManager = () => {
  const { pubkey, tokens, fiat, refreshBalances, setPubkey, logout, resetPasskey, resetWallet } = useWalletStore();
  const { isConnected, isConnecting, smartWalletPubkey, connect, disconnect } = useWallet();
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [copied, setCopied] = useState(false);

  // Calculate portfolio value directly from tokens
  const portfolioValue = tokens.reduce((sum, token) => sum + (token.amount * token.priceUsd), 0);
  const displayValue = fiat === 'VND' ? portfolioValue * 24.5 : portfolioValue; // Simplified rate

  const handleCopyAddress = () => {
    if (pubkey) {
      navigator.clipboard.writeText(pubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: t('notifications.addressCopied'),
        description: t('notifications.addressCopiedDesc'),
      });
    }
  };

  const handleConnect = async () => {
    try {
      if (!connect || typeof connect !== 'function') {
        throw new Error('Connect function not available');
      }
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
      toast({
        title: t('notifications.connectFailed'),
        description: t('notifications.connectFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleRefreshBalances = async () => {
    setLoading(true);
    try {
      if (!refreshBalances || typeof refreshBalances !== 'function') {
        throw new Error('refreshBalances function not available');
      }
      
      await refreshBalances();
      toast({
        title: t('settings.walletManager.balancesRefreshed'),
        description: t('settings.walletManager.balancesRefreshedDesc'),
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: t('settings.walletManager.refreshFailed'),
        description: t('settings.walletManager.refreshFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCustomAddress = () => {
    try {
      if (newAddress.trim()) {
        const store = useWalletStore.getState();
        // Validate Solana address format
        try {
          // Throws if invalid
          // Also ensures base58 and length are correct
          // eslint-disable-next-line no-new
          new PublicKey(newAddress.trim());
        } catch {
          toast({
            title: t('notifications.invalidAddress'),
            description: t('notifications.invalidAddressDesc'),
            variant: 'destructive',
          });
          return;
        }
        if (!store.setPubkey || typeof store.setPubkey !== 'function') {
          throw new Error('setPubkey function not available');
        }
        
        store.setPubkey(newAddress.trim());
        toast({
          title: t('settings.walletManager.addressSet'),
          description: t('settings.walletManager.addressSetDesc'),
        });
        setNewAddress('');
      }
    } catch (error) {
      console.error('Set address error:', error);
      toast({
        title: t('notifications.addressSetFailed'),
        description: t('notifications.addressSetFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    try {
      logout();
      toast({
        title: t('notifications.logoutSuccess'),
        description: t('notifications.logoutSuccessDesc'),
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: t('notifications.logoutFailed'),
        description: t('notifications.logoutFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleResetPasskey = () => {
    try {
      resetPasskey();
      toast({
        title: t('notifications.resetPasskeySuccess'),
        description: t('notifications.resetPasskeySuccessDesc'),
      });
    } catch (error) {
      console.error('Reset passkey error:', error);
      toast({
        title: t('notifications.resetPasskeyFailed'),
        description: t('notifications.resetPasskeyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleResetWallet = () => {
    try {
      resetWallet();
      toast({
        title: t('notifications.resetWalletSuccess'),
        description: t('notifications.resetWalletSuccessDesc'),
      });
    } catch (error) {
      console.error('Reset wallet error:', error);
      toast({
        title: t('notifications.resetWalletFailed'),
        description: t('notifications.resetWalletFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet Manager Card */}
      <Card className='border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm'>
        <CardHeader className='px-4 py-3 border-b border-border/30'>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            {t('settings.walletManager.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4 space-y-3'>
          {/* Address and Portfolio in compact layout */}
          <div className='space-y-3'>
            {/* Current Address - Compact */}
            <div className="space-y-1.5 -mt-8">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {t('settings.walletManager.currentAddress')}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/40">
                  <code className="flex-1 text-sm font-mono text-foreground">
                    {pubkey ? truncateAddress(pubkey) : t('wallet.noWallet')}
                  </code>
                  {pubkey && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 rounded hover:bg-accent/50 transition-colors"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className='h-7 w-7 p-0 hover:bg-accent/50'
                        onClick={() => window.open(`https://explorer.solana.com/address/${pubkey}?cluster=devnet`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Value - Compact */}
            {pubkey && (
              <div className="flex items-baseline justify-between px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('wallet.portfolioValue')}
                </span>
                <span className="text-2xl font-bold tracking-tight">
                  {formatCurrency(displayValue, fiat)}
                </span>
              </div>
            )}

            {/* Connection Info - Compact */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/60 border border-border/40">
              <div className='flex items-center gap-2'>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium">Solana Devnet</span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('wallet.connected')}</span>
            </div>
          </div>

          {/* Action Buttons - Compact Grid (SDK disabled → chỉ còn Refresh) */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={handleRefreshBalances}
              disabled={loading}
              className="h-9 text-xs font-medium"
              variant="outline"
            >
              <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {t('settings.walletManager.refreshBalances')}
            </Button>
          </div>

          {/* Reset Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleResetPasskey}
              className="h-8 text-xs font-medium"
              variant="outline"
            >
              {t('settings.regeneratePasskey')}
            </Button>
            <Button
              onClick={handleResetWallet}
              className="h-8 text-xs font-medium"
              variant="outline"
            >
              {t('settings.resetDemoData')}
            </Button>
          </div>

          {/* Custom Address Input - Compact */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('settings.walletManager.setCustomAddress')}
            </label>
            <div className="flex gap-2">
              <Input
                placeholder={t('settings.walletManager.enterSolanaAddress')}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="h-9 text-xs"
              />
              <Button
                onClick={handleSetCustomAddress}
                className="h-9 px-3 text-xs font-medium"
                variant="outline"
              >
                {t('settings.walletManager.setAddress')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};