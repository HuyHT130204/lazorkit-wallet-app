'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { formatCurrency } from '@/lib/utils/format';
import { useWalletStore } from '@/lib/store/wallet';

export default function FailedCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const reason = search.get('reason') || search.get('message') || 'Payment failed or canceled.';
  const orderId = search.get('orderId') || search.get('id') || search.get('ref') || '';
  const wallet = search.get('wallet') || '';

  const details = useMemo(() => {
    const amount = parseFloat(search.get('amount') || '0');
    const token = search.get('token');
    const currency = (search.get('currency') as 'USD' | 'VND' | null) || 'USD';
    return { amount, token, currency };
  }, [search]);

  // Kiểm tra nếu user đã có wallet từ trước
  useEffect(() => {
    (async () => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('lazorkit-passkey-data') : null;
        if (!stored) return;
        
        const passkeyData = JSON.parse(stored);
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const resp = await fetch(`${apiBase}/api/orders/check-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passkeyData })
        });
        
        if (resp.ok) {
          const data = await resp.json();
          if (data?.exists && data?.walletAddress) {
            try {
              const store = useWalletStore.getState();
              store.setHasWallet?.(true);
              store.setPubkey?.(data.walletAddress);
            } catch {}
          }
        }
      } catch (error) {
        console.warn('Failed to check existing wallet:', error);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(239,68,68,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.06),transparent_40%)]" />
      <div className="relative flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Failed Icon */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-400/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] backdrop-blur-sm flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white">Payment Failed</h1>
              <p className="text-sm text-gray-400">We couldn't process your payment. Please try again.</p>
            </div>
          </div>

          {/* Transaction Details Card */}
          <Card className="bg-[#0f1015]/80 backdrop-blur border-[#1e1e2e] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_30px_rgba(0,0,0,0.35)]">
            <CardHeader className="border-b border-[#1e1e2e] pb-4">
              <CardTitle className="text-base font-medium text-white">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
            {orderId && (
              <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                <span className="text-sm text-gray-400">Order ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{orderId}</span>
                  <CopyButton text={orderId} />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
              <span className="text-sm text-gray-400">Amount</span>
              <span className="text-base font-medium text-white">
                {formatCurrency(details.amount || 0, details.currency as any)}
              </span>
            </div>

            {details.token && (
              <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                <span className="text-sm text-gray-400">Token</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-white">
                    {(details.amount || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                    {details.token}
                  </span>
                </div>
              </div>
            )}

            {wallet && (
              <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                <span className="text-sm text-gray-400">Wallet</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{wallet.slice(0,8)}...{wallet.slice(-4)}</span>
                  <CopyButton text={wallet} />
                </div>
              </div>
            )}

            {/* Error Message */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-300 mb-1">Error Details</h3>
                  <p className="text-sm text-red-200 break-words">{reason}</p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button className="w-full h-11 bg-white hover:bg-gray-100 text-black font-medium transition-colors" onClick={() => router.replace('/buy')}>
            Return to App
          </Button>
        </div>
      </div>
    </div>
  );
}