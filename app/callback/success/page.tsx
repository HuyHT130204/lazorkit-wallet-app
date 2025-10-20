'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { useWalletStore } from '@/lib/store/wallet';
import { formatCurrency } from '@/lib/utils/format';

async function notifyBackendSuccess(reference: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    console.log('📤 Sending to backend:', {
      url: `${apiBase}/api/orders/callback/success`,
      reference
    });
    
    const res = await fetch(`${apiBase}/api/orders/callback/success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // CHỈ GỬI REFERENCE - Backend sẽ lấy passkeyData từ DB
      body: JSON.stringify({ reference }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Backend response error:', {
        status: res.status,
        statusText: res.statusText,
        body: errorText
      });
      throw new Error(`Backend error: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.log('✅ Backend response:', data);
    return data;
  } catch (e) {
    console.error('❌ Notify backend error:', e);
    throw e;
  }
}

async function fetchOrderWallet(reference: string): Promise<{ walletAddress?: string; status?: string } | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/orders/${encodeURIComponent(reference)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function SuccessCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasWallet, setHasWallet, setPubkey, onrampFake, setTokenAmount, refreshBalances } = useWalletStore() as any;
  const [resolvedWallet, setResolvedWallet] = useState<string | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const orderId = searchParams.get('orderId') || searchParams.get('id') || searchParams.get('order_id') || searchParams.get('ref');
  const totalAmount = parseFloat(searchParams.get('amount') || searchParams.get('total') || '0');
  const subtotalFromUrl = parseFloat(searchParams.get('subtotal') || '0');
  // Use subtotal from URL if available, otherwise calculate it (total - $1 fixed fee)
  const amount = subtotalFromUrl > 0 ? subtotalFromUrl : Math.max(0, totalAmount - 1.00);
  const btcPriceUsd = 110956; // keep in sync with buy UI mock
  const btcAmountComputed = amount > 0 ? amount / btcPriceUsd : 0;
  const token = ('BTC' as any) as 'SOL' | 'USDC' | 'USDT' | null; // mock display as BTC
  const currencyParam = (searchParams.get('currency') as 'USD' | 'VND' | null) || (searchParams.get('currency_code') as 'USD' | 'VND' | null);
  const currency: 'USD' | 'VND' = currencyParam || 'USD';
  const status = searchParams.get('status');

  useEffect(() => {
    if (orderId && amount && token && currency) {
      onrampFake(amount, currency, token, orderId); // Use subtotal for token balance
    }
  }, [orderId, amount, token, currency, onrampFake]);

  useEffect(() => {
    if (status === 'success' && orderId) {
      (async () => {
        try {
          console.log('🎉 Payment success, processing...');
          console.log('📋 Order ID:', orderId);
          console.log('💰 Amount:', amount, currency);
          console.log('🪙 Token:', token);

          // KHÔNG ĐỌC LOCALSTORAGE - Backend sẽ lấy passkeyData từ DB
          console.log('📤 Notifying backend with reference only');

          // Gửi sang backend CHỈ VỚI REFERENCE
          const resp = await notifyBackendSuccess(orderId);
          if (!resp) {
            throw new Error('No response from backend');
          }
          let w = resp?.walletAddress || null;
          const credited = resp?.creditedAmount;
          const sig = resp?.txSignature;
          
          if (sig) {
            setTxSignature(sig);
          }

          // Nếu chưa có wallet, poll DB
          if (!w) {
            console.log('⏳ Polling for wallet address...');
            for (let i = 0; i < 6; i++) {
              const info = await fetchOrderWallet(orderId);
              if (info?.walletAddress) { 
                w = info.walletAddress;
                console.log('✅ Got wallet from polling:', w);
                break; 
              }
              await new Promise(r => setTimeout(r, 500));
            }
          }
          
          if (w) {
            setResolvedWallet(w);
            setIsLoadingWallet(false);
            
            try { 
              setHasWallet(true); 
              setPubkey(w); 
            } catch (e) {
              console.error('Failed to update wallet store:', e);
            }
            
            // Do not mutate balances here; backend callback + refreshBalances will update USDC.
            
            try { 
              console.log('🔄 Refreshing balances...');
              await refreshBalances?.(); 
            } catch (error) {
              console.error('Failed to refresh balances:', error);
            }

            // KHÔNG XÓA localStorage vì không dùng nữa
            console.log('✅ Payment processing completed');
            
          } else {
            console.error('❌ Could not resolve wallet address');
            setIsLoadingWallet(false);
          }
        } catch (error) {
          console.error('❌ Error processing payment success:', error);
          setIsLoadingWallet(false);
        }
      })();
    }
  }, [status, orderId]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.06),transparent_40%)]" />
      <div className="relative flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur-sm flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {isLoadingWallet ? 'Processing Payment...' : 'Payment Successful'}
              </h1>
              <p className="text-sm text-gray-400">
                {isLoadingWallet ? 'Creating your smart wallet and transferring tokens' : 'Your transaction has been completed.'}
              </p>
            </div>
          </div>

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
                <span className="text-sm text-gray-400">Amount Paid</span>
                <span className="text-base font-medium text-white">{formatCurrency(totalAmount || 0, currency)}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                <span className="text-sm text-gray-400">Tokens Received</span>
                <span className="text-base font-medium text-white">{formatCurrency(amount || 0, currency)}</span>
              </div>

              {token && (
                <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                  <span className="text-sm text-gray-400">Token</span>
                  <div className="flex items-center gap-2">
                    <img src="/bitcoin-btc-logo.png" alt="BTC" className="w-5 h-5 rounded-full" />
                    <span className="text-base font-medium text-white">{btcAmountComputed.toFixed(8)}</span>
                    <span className="text-sm text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">BTC</span>
                  </div>
                </div>
              )}

              {resolvedWallet && (
                <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                  <span className="text-sm text-gray-400">Wallet</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">{resolvedWallet.slice(0,8)}...{resolvedWallet.slice(-4)}</span>
                    <CopyButton text={resolvedWallet} />
                  </div>
                </div>
              )}

              {txSignature && (
                <div className="flex flex-col gap-2 py-3">
                  <span className="text-sm text-gray-400">Transaction</span>
                  <a
                    href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-emerald-400 hover:text-emerald-300 break-all"
                  >
                    {txSignature}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full h-11 bg-white hover:bg-gray-100 text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => router.replace('/buy')}
            disabled={isLoadingWallet}
          >
            {isLoadingWallet ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              'Return to App'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}