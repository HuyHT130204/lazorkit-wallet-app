'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Eye, EyeOff, ShoppingCart, Filter, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { TokenDetailModal } from './token-detail-modal';
import { useWalletStore, TokenHolding } from '@/lib/store/wallet';
import { AssetsActivity } from './assets-activity';
import { fetchCommonTokens, JupiterToken } from '@/lib/services/jupiter';
import { fetchRealTokenData } from '@/lib/services/real-token-service';
import { Button } from './ui/button';
import {
  formatCurrency,
  formatTokenAmount,
  formatPercentage,
} from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

// Fallback icons if API doesn't provide them
const fallbackTokenIcons: Record<string, string> = {
  SOL: '◉',
  USDC: '$',
  USDT: '$',
  BONK: '🐕',
  RAY: '🟣',
  JUP: '🪐',
  ORCA: '🐋',
  mSOL: '◉',
  JitoSOL: '◉',
  PYTH: '🔮',
  XYZ: '✨',
};

export const AssetsTab = () => {
  const { tokens, fiat, rateUsdToVnd, hasAssets, hasNoAssets, getNumNonZeroTokens, getVisibleTokens, pubkey, refreshBalances } = useWalletStore();
  const router = useRouter();
  const [showBalance, setShowBalance] = useState(true);
  const [selectedToken, setSelectedToken] = useState<TokenHolding | null>(null);
  const [tokenData, setTokenData] = useState<Map<string, JupiterToken>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideZero, setHideZero] = useState<boolean>(false);
  const isNoAssets = hasNoAssets ? hasNoAssets() : (!hasAssets ? tokens.length === 0 : !hasAssets());

  // Fetch token data on mount and when pubkey changes
  useEffect(() => {
    const loadTokenData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load Jupiter metadata
        const jupiterTokens = await fetchCommonTokens();
        setTokenData(jupiterTokens);
        
        // Refresh real balances if we have a pubkey
        if (pubkey && refreshBalances) {
          await refreshBalances();
        }
      } catch (error) {
        console.error('Failed to load token data:', error);
        setError('failed');
      } finally {
        setLoading(false);
      }
    };

    loadTokenData();
  }, [pubkey, refreshBalances]);

  // Default hideZero behavior: if user already has assets, hide zero balances by default
  useEffect(() => {
    if (hasAssets && hasAssets()) {
      setHideZero(true);
    }
  }, [hasAssets]);

  const handleTokenClick = (token: TokenHolding) => {
    setSelectedToken(token);
  };

  // Get token icon from Jupiter data or use fallback
  const getTokenIcon = (symbol: string) => {
    const jupiterToken = tokenData.get(symbol);
    if (jupiterToken?.icon) {
      return (
        <>
          <img
            src={jupiterToken.icon}
            alt={symbol}
            className='w-10 h-10 rounded-lg object-cover'
            onError={(e) => {
              // Fallback to text icon if image fails to load
              e.currentTarget.style.display = 'none';
              const nextElement = e.currentTarget.nextSibling as HTMLElement;
              nextElement?.classList.remove('hidden');
            }}
          />
          <span className='hidden text-lg'>
            {fallbackTokenIcons[symbol] || '?'}
          </span>
        </>
      );
    }
    return <span className='text-lg'>{fallbackTokenIcons[symbol] || '?'}</span>;
  };

  const visibleTokens = useMemo(() => {
    return getVisibleTokens ? getVisibleTokens(hideZero) : (hideZero ? tokens.filter(t => t.amount > 0) : tokens);
  }, [getVisibleTokens, hideZero, tokens]);

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>{t('assets.title')}</h3>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/50'>
            {t('assets.tokensCount', { count: getNumNonZeroTokens ? getNumNonZeroTokens() : tokens.filter(t => t.amount > 0).length })}
          </span>
          <button
            className={`px-2 h-7 rounded-md border text-xs items-center gap-1 hidden sm:inline-flex ${hideZero ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted/40 border-border/50 text-muted-foreground'}`}
            onClick={() => setHideZero(!hideZero)}
            aria-label={hideZero ? 'Show zero-balance tokens' : 'Hide zero-balance tokens'}
          >
            <Filter className='h-3.5 w-3.5' />
            {hideZero ? 'Ẩn 0' : 'Hiện 0'}
          </button>
          <button
          className='p-2 rounded-md hover:bg-muted/50 text-muted-foreground'
          onClick={() => setShowBalance(!showBalance)}
          aria-label={showBalance ? 'Hide balances' : 'Show balances'}
        >
          {showBalance ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
          </button>
        </div>
      </div>

      {/* Token List */}
      <div className='space-y-2'>
        {loading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='h-16 rounded-lg bg-muted/30 smooth-loading' />
            ))}
          </>
        )}

        {!loading && error && (
          <div className='text-center py-10 border rounded-lg bg-destructive/5 border-destructive/40'>
            <div className='text-sm text-destructive mb-3'>{t('common.error')}</div>
            <div className='text-xs text-muted-foreground mb-4'>Failed to load token metadata</div>
            <Button size='sm' variant='outline' className='inline-flex items-center gap-1' onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const jupiterTokens = await fetchCommonTokens();
                setTokenData(jupiterTokens);
                if (pubkey && refreshBalances) {
                  await refreshBalances();
                }
              } catch (error) {
                setError('failed');
              } finally {
                setLoading(false);
              }
            }}>
              <RefreshCcw className='h-4 w-4' />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!loading && !error && isNoAssets && (
          <div className='text-center py-10 border rounded-lg bg-muted/20'>
            <div className='text-sm text-muted-foreground mb-3'>{t('assets.emptyTitle')}</div>
            <div className='text-xs text-muted-foreground mb-4'>{t('assets.emptySubtitle')}</div>
            <Button size='sm' className='inline-flex items-center gap-1' onClick={() => router.push('/buy')}>
              <ShoppingCart className='h-4 w-4' />
              {t('assets.buyCta')}
            </Button>
          </div>
        )}

        {!loading && !error && visibleTokens.map((token) => {
          const jupiterToken = tokenData.get(token.symbol);
          const effectivePriceUsd = jupiterToken?.usdPrice ?? token.priceUsd;
          const value = token.amount * effectivePriceUsd;
          const displayValue = fiat === 'VND' ? value * rateUsdToVnd : value;
          const ChangeIcon =
            token.change24hPct >= 0 ? TrendingUp : TrendingDown;
          const changeColor =
            token.change24hPct >= 0 ? 'text-green-500' : 'text-red-500';

          return (
            <Card
              key={token.symbol}
              className='cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 glass-card smooth-hover stagger-item'
              onClick={() => handleTokenClick(token)}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <div className='relative'>
                      <div className='w-10 h-10 rounded-lg overflow-hidden border border-border/50 shadow-sm flex items-center justify-center bg-muted/30'>
                        {jupiterToken?.icon ? (
                          <img
                            src={jupiterToken.icon}
                            alt={token.symbol}
                            className='w-10 h-10 rounded-lg object-cover'
                            onError={(e) => {
                              // Fallback to text icon if image fails to load
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextSibling as HTMLElement;
                              nextElement?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-lg ${jupiterToken?.icon ? 'hidden' : ''}`}>
                          {fallbackTokenIcons[token.symbol] || token.symbol.slice(0, 2)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className='font-semibold text-base'>
                        {token.symbol}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {jupiterToken?.name || `${token.symbol} Token`}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {showBalance
                          ? formatTokenAmount(token.amount, token.symbol)
                          : '••••••'}
                      </div>
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='font-semibold text-base'>
                      {showBalance
                        ? formatCurrency(displayValue, fiat)
                        : '••••••'}
                    </div>
                    <div
                      className={`text-sm flex items-center justify-end ${changeColor}`}
                    >
                      <ChangeIcon className='h-3 w-3 mr-1' />
                      {showBalance
                        ? formatPercentage(token.change24hPct)
                        : '••••'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Section */}
      <div className='space-y-3'>
        <h3 className='text-base font-semibold text-muted-foreground'>
          {t('assets.recentActivity')}
        </h3>
        <AssetsActivity />
      </div>

      {/* Token Detail Modal */}
      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          open={!!selectedToken}
          onOpenChange={(open) => !open && setSelectedToken(null)}
        />
      )}
    </div>
  );
};
