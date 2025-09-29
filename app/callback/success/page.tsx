'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { useWalletStore } from '@/lib/store/wallet';
import { formatCurrency, generatePublicKey } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { ENV_CONFIG } from '@/lib/config/env';

export default function SuccessCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasWallet, setHasWallet, setPubkey, onrampFake } = useWalletStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const orderId = searchParams.get('orderId') || searchParams.get('id') || searchParams.get('order_id') || searchParams.get('ref');
  const amount = parseFloat(searchParams.get('amount') || searchParams.get('total') || '0');
  const token = (searchParams.get('token') as 'SOL' | 'USDC' | 'USDT' | null) || null;
  const currency = (searchParams.get('currency') as 'USD' | 'VND' | null) || (searchParams.get('currency_code') as 'USD' | 'VND' | null);
  const status = searchParams.get('status');

  useEffect(() => {
    if (orderId && amount && token && currency) {
      // Simulate the onramp transaction
      onrampFake(amount, currency, token, orderId);
    }
  }, [orderId, amount, token, currency, onrampFake]);

  const handleReturnToApp = async () => {
    setIsProcessing(true);

    if (!hasWallet && ENV_CONFIG.ENABLE_DEMO) {
      // Generate wallet and pubkey
      const newPubkey = generatePublicKey();
      setPubkey(newPubkey);
      setHasWallet(true);
      
      toast({
        title: t('success.walletReady'),
        description: t('success.walletReadyDesc'),
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    router.push('/buy');
  };

  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Invalid Callback</h1>
            <p className="text-muted-foreground mb-4">
              This callback page requires valid order parameters.
            </p>
            <Button onClick={() => router.push('/')}>
              Return to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">{t('success.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('success.orderId')}</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{orderId}</span>
                <CopyButton text={orderId} />
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('success.amount')}</span>
              <span>{formatCurrency(amount, currency)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('success.token')}</span>
              <span>{amount.toFixed(2)} {token}</span>
            </div>

            {hasWallet && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('success.publicKey')}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">
                    {useWalletStore.getState().pubkey?.slice(0, 8)}...{useWalletStore.getState().pubkey?.slice(-4)}
                  </span>
                  <CopyButton text={useWalletStore.getState().pubkey || ''} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={handleReturnToApp} 
          className="w-full"
          disabled={isProcessing}
        >
          {isProcessing ? t('common.loading') : t('success.returnToApp')}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t('app.prototype')}
          </p>
        </div>
      </div>
    </div>
  );
}