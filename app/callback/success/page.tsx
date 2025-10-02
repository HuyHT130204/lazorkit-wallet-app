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

async function notifyBackendSuccess(reference: string, passkeyData?: any, walletAddress?: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/orders/callback/success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, passkeyData, walletAddress }),
    });
    return await res.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Notify backend error:', e);
    return null;
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

  const orderId = searchParams.get('orderId') || searchParams.get('id') || searchParams.get('order_id') || searchParams.get('ref');
  const amount = parseFloat(searchParams.get('amount') || searchParams.get('total') || '0');
  const token = (searchParams.get('token') as 'SOL' | 'USDC' | 'USDT' | null) || null;
  const currencyParam = (searchParams.get('currency') as 'USD' | 'VND' | null) || (searchParams.get('currency_code') as 'USD' | 'VND' | null);
  const currency: 'USD' | 'VND' = currencyParam || 'USD';
  const status = searchParams.get('status');

  useEffect(() => {
    if (orderId && amount && token && currency) {
      // Simulate the onramp transaction
      onrampFake(amount, currency, token, orderId);
    }
  }, [orderId, amount, token, currency, onrampFake]);

  // Gọi BE ngay khi vào trang success nếu có orderId, sau đó chuyển thẳng về Home
  useEffect(() => {
    if (status === 'success' && orderId) {
      (async () => {
        // Lấy passkeyData từ localStorage nếu có
        let passkeyData = null;
        try {
          const storedPasskey = localStorage.getItem('lazorkit-passkey-data');
          if (storedPasskey) {
            passkeyData = JSON.parse(storedPasskey);
          }
        } catch (e) {
          console.warn('Failed to parse stored passkey data:', e);
        }

        const resp = await notifyBackendSuccess(orderId, passkeyData).catch(() => null);
        let w = resp?.walletAddress || null;
        const credited = resp?.creditedAmount;
        // Nếu chưa có địa chỉ ví trong response, thử lấy từ DB (poll tối đa ~3s)
        if (!w) {
          for (let i = 0; i < 6; i++) {
            const info = await fetchOrderWallet(orderId);
            if (info?.walletAddress) { w = info.walletAddress; break; }
            await new Promise(r => setTimeout(r, 500));
          }
        }
        if (orderId) {
          try { localStorage.setItem('lz_last_ref', String(orderId)); } catch {}
        }
        if (w) {
          setResolvedWallet(w);
          try { setHasWallet(true); } catch {}
          try { setPubkey(w); } catch {}
          // Xóa cờ pending khi đã có ví (đồng nghĩa BE success)
          try { localStorage.removeItem('lz_last_ref'); } catch {}
          // Cập nhật số dư ngay nếu có creditedAmount và token param
          const urlToken = (searchParams.get('token') as 'USDC' | 'USDT' | 'SOL' | null) || 'USDC';
          if (typeof credited === 'number' && credited > 0 && setTokenAmount) {
            console.log('Setting token amount:', urlToken, credited);
            setTokenAmount(urlToken, credited, 1);
          }
          // Always refresh balances from backend to get accurate data
          try { 
            console.log('🔄 Refreshing balances after successful payment...');
            await refreshBalances?.(); 
          } catch (error) {
            console.error('Failed to refresh balances:', error);
          }
        }
        // Nếu chưa có ví, kiểm tra trạng thái order để xoá cờ nếu đã success
        if (!w && orderId) {
          const info = await fetchOrderWallet(orderId);
          if (info?.status === 'success') {
            try { localStorage.removeItem('lz_last_ref'); } catch {}
          }
        }
        // Không auto chuyển. Người dùng bấm nút để về Home.
      })();
    }
  }, [status, orderId]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.06),transparent_40%)]" />
      <div className="relative flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Hero */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur-sm flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white">Payment Successful</h1>
              <p className="text-sm text-gray-400">Your transaction has been completed.</p>
            </div>
          </div>

          {/* Details */}
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
                <span className="text-base font-medium text-white">{formatCurrency(amount || 0, currency)}</span>
              </div>

              {token && (
                <div className="flex justify-between items-center py-3 border-b border-[#1e1e2e]">
                  <span className="text-sm text-gray-400">Token</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-white">{(amount || 0).toFixed(2)}</span>
                    <span className="text-sm text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">{token}</span>
                  </div>
                </div>
              )}

              {resolvedWallet && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-400">Wallet</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">{resolvedWallet.slice(0,8)}...{resolvedWallet.slice(-4)}</span>
                    <CopyButton text={resolvedWallet} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Button className="w-full h-11 bg-white hover:bg-gray-100 text-black font-medium transition-colors" onClick={() => router.replace('/buy')}>
            Return to App
          </Button>
        </div>
      </div>
    </div>
  );
}