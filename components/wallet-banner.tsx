'use client';

import { Eye, EyeOff, Plus, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { CopyButton } from './ui/copy-button';
import { Blockie } from './ui/blockie';
import { useWalletStore } from '@/lib/store/wallet';
import { fetchCommonTokens, JupiterToken } from '@/lib/services/jupiter';
import { formatAddress, formatCurrency } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

interface WalletBannerProps {
  onDepositClick?: () => void;
  hideDeposit?: boolean;
}

export const WalletBanner = ({
  onDepositClick,
  hideDeposit = false,
}: WalletBannerProps) => {
  const { pubkey, fiat, rateUsdToVnd, tokens, hasNoAssets } = useWalletStore();
  const [showBalance, setShowBalance] = useState(true);
  const [tokenData, setTokenData] = useState<Map<string, JupiterToken>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingPrices(true);
        setLoadError(null);
        const data = await fetchCommonTokens();
        if (mounted) setTokenData(data);
      } catch (e) {
        if (mounted) setLoadError('failed');
      } finally {
        if (mounted) setLoadingPrices(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalBalance = useMemo(() => {
    console.log('WalletBanner: Current tokens array:', tokens);
    console.log('WalletBanner: Tokens length:', tokens?.length);
    
    if (!tokens || tokens.length === 0) {
      console.log('WalletBanner: No tokens found');
      return 0;
    }
    console.log('WalletBanner: Calculating total balance from tokens:', tokens.map(t => ({ symbol: t.symbol, amount: t.amount, priceUsd: t.priceUsd })));
    // If env TOKEN_MINT is set, prioritize that token's raw amount as USD 1:1
    const priorityMint = process.env.NEXT_PUBLIC_TOKEN_MINT || process.env.TOKEN_MINT;
    const sum = tokens.reduce((sum, tk) => {
      const j = tokenData.get(tk.symbol);
      const price = j?.usdPrice ?? tk.priceUsd ?? 1;
      const value = tk.amount * price;
      console.log(`Token ${tk.symbol}: amount=${tk.amount}, price=${price}, value=${value}`);
      return sum + value;
    }, 0);
    console.log('WalletBanner: Total balance calculated:', sum);
    return sum;
  }, [tokens, tokenData]);

  const displayBalance =
    fiat === 'VND' ? totalBalance * rateUsdToVnd : totalBalance;

  return (
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
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[color:#16ffbb]/30 shadow-sm flex items-center justify-center">
                  <Blockie seed={pubkey || 'demo'} size={8} scale={4} className="w-full h-full" />
                </div>
                <span className="text-white font-bold text-sm tracking-wide">SOLANA</span>
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
                      ? (loadingPrices && totalBalance === 0
                        ? '—'
                        : formatCurrency(displayBalance, fiat))
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
                <p className="font-bold text-xl tracking-wider">
                  <span className='text-white'>Ramp</span>
                  <span className='text-[color:#16ffbb]'>Fi</span>
                </p>
                <p className="text-gray-500 text-xs tracking-wide">Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
