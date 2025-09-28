'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Settings2, ChevronDown, Sparkles, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TokenLogo } from './ui/token-logo';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatTokenAmount, formatCurrency } from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { SwapReviewModal } from './swap-review-modal';
import { toast } from '@/hooks/use-toast';
import { JupiterToken, getSwapQuote, TOKEN_ADDRESSES, getSymbolDecimals } from '@/lib/services/jupiter';

interface SwapFormProps {
  onPreview?: (data: SwapData) => void;
  tokenData?: Map<string, JupiterToken>;
  className?: string;
}

interface SwapData {
  fromToken: TokenSym;
  toToken: TokenSym;
  amount: number;
  slippage: number;
  quote?: {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    priceImpactPct?: string;
    routePlan?: unknown[];
  };
  estimatedReceive?: number;
}

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

export const SwapForm = ({
  onPreview,
  tokenData,
}: SwapFormProps) => {
  const { tokens, swapReal } = useWalletStore();
  const [fromToken, setFromToken] = useState<TokenSym>('USDC');
  const [toToken, setToToken] = useState<TokenSym>('SOL');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState<'from' | 'to' | null>(
    null
  );
  const [quote, setQuote] = useState<SwapData['quote'] | undefined>(undefined);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [useRealSwap, setUseRealSwap] = useState(false);

  const fromTokenData = tokens.find((t) => t.symbol === fromToken);
  const toTokenData = tokens.find((t) => t.symbol === toToken);
  const amountNum = parseFloat(amount) || 0;

  // Fetch Jupiter quote when amount or tokens change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amountNum || fromToken === toToken) {
        setQuote(undefined);
        return;
      }

      const fromMint = (TOKEN_ADDRESSES as Record<string, string>)[fromToken];
      const toMint = (TOKEN_ADDRESSES as Record<string, string>)[toToken];
      
      if (!fromMint || !toMint) {
        setQuote(undefined);
        return;
      }

      // Validate amount before API call
      if (amountNum <= 0 || !isFinite(amountNum)) {
        setQuote(undefined);
        return;
      }

      setLoadingQuote(true);
      try {
        const fromDecimals = getSymbolDecimals(
          fromToken,
          tokenData?.get(fromToken)
        );
        const jupiterQuote = await getSwapQuote(
          fromMint,
          toMint,
          Math.round(amountNum * Math.pow(10, fromDecimals)),
          slippage * 100 // Convert percentage to basis points
        );
        
        if (jupiterQuote && typeof jupiterQuote === 'object') {
          setQuote(jupiterQuote);
        } else {
          setQuote(undefined);
          console.warn('No valid quote received from Jupiter API');
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        setQuote(undefined);
      } finally {
        setLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [amountNum, fromToken, toToken, slippage]);

  // Get token icon from Jupiter data or use fallback
  const getTokenIcon = (symbol: string) => {
    const token = tokenData?.get(symbol);
    if (token?.icon) {
      return (
        <>
          <img
            src={token.icon}
            alt={symbol}
            className='w-5 h-5 rounded-full'
            onError={(e) => {
              // Fallback to text icon if image fails to load
              e.currentTarget.style.display = 'none';
              const nextElement = e.currentTarget.nextSibling as HTMLElement;
              nextElement?.classList.remove('hidden');
            }}
          />
          <TokenLogo symbol={symbol} size={20} />
        </>
      );
    }
    return <TokenLogo symbol={symbol} size={20} />;
  };

  // Get price from Jupiter data or fallback to local data
  const getTokenPrice = (symbol: string) => {
    const jupiterToken = tokenData?.get(symbol);
    if (jupiterToken?.usdPrice) {
      return jupiterToken.usdPrice;
    }
    const localToken = tokens.find((t) => t.symbol === symbol);
    return localToken?.priceUsd || 0;
  };

  // Calculate estimated receive amount
  const fromPrice = getTokenPrice(fromToken);
  const toPrice = getTokenPrice(toToken);
  
  // Use Jupiter quote if available, otherwise fallback to simple calculation
  const estimatedReceive = (() => {
    if (quote) {
      const toDecimals = getSymbolDecimals(
        toToken,
        tokenData?.get(toToken)
      );
      const out = parseFloat(quote.outAmount || '0');
      return out / Math.pow(10, toDecimals);
    }
    return amountNum * (fromPrice / toPrice) * (1 - slippage / 100);
  })();
  
  const amountUsd = amountNum * fromPrice;

  const validateForm = () => {
    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (fromToken === toToken) {
      setError(t('swap.sameToken'));
      return false;
    }

    if (!fromTokenData || amountNum > fromTokenData.amount) {
      setError(t('swap.insufficientBalance'));
      return false;
    }

    setError('');
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;

    const data: SwapData = {
      fromToken,
      toToken,
      amount: amountNum,
      slippage,
      quote,
      estimatedReceive,
    };

    console.log('swap_review_clicked', data);
    onPreview?.(data);
    setReviewOpen(true);
  };

  const handleMaxClick = () => {
    if (fromTokenData) {
      setAmount(fromTokenData.amount.toString());
      setError('');
    }
  };

  const handleHalfClick = () => {
    if (fromTokenData) {
      setAmount((fromTokenData.amount / 2).toString());
      setError('');
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setError('');
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setAmount(value);
    setError('');
  };

  // Format display value with commas
  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Format balance with 2 decimals and token symbol
  const formatBalance = (amount: number, symbol: TokenSym) => {
    if (amount === 0) return `0.00 ${symbol}`;
    if (amount < 0.01) return `<0.01 ${symbol}`;
    return `${amount.toFixed(2)} ${symbol}`;
  };

  // Get available tokens that we have data for
  const availableTokens = ['SOL', 'USDC', 'USDT', 'BONK', 'RAY', 'JUP', 'ORCA', 'mSOL', 'JitoSOL', 'PYTH'] as TokenSym[];

  return (
    <>
      <div className='p-4 pt-3 mobile-padding'>
        {/* Header with Ultra V2 and settings - Compact */}
        <div className='flex items-center justify-between mb-2'>
          <button className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors'>
            <Sparkles className='h-3.5 w-3.5 text-primary' />
            <span className='font-medium text-xs'>Ultra V2</span>
            <Settings2 className='h-3 w-3 text-muted-foreground' />
          </button>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setUseRealSwap(!useRealSwap)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                useRealSwap 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-muted/20 text-muted-foreground border border-border/30'
              }`}
            >
              {useRealSwap ? 'Real Swap' : 'Demo Swap'}
            </button>
            <button className='p-1.5 rounded-lg hover:bg-muted/50 transition-colors'>
              <Settings2 className='h-3.5 w-3.5 text-muted-foreground' />
            </button>
          </div>
        </div>

        {/* Two Adjacent Input Sections with Overlapping Swap Button */}
        <div className='relative'>
          {/* Selling Section */}
          <div className='bg-muted/5 rounded-t-lg p-2.5 pb-3 border border-b-0 border-border/50'>
            <div className='flex items-start justify-between'>
              {/* Left side - Label and selector */}
              <div>
                <div className='text-xs text-muted-foreground mb-2'>
                  {t('swap.from')}
                </div>
                <button
                  onClick={() => setShowTokenSelect('from')}
                  className='flex items-center gap-1.5 px-3 py-2 rounded-full bg-card hover:bg-muted/20 transition-colors border border-border/50'
                >
                  <div className='flex items-center'>
                    {getTokenIcon(fromToken)}
                  </div>
                  <span className='font-medium text-sm'>{fromToken}</span>
                  <ChevronDown className='h-3 w-3 text-muted-foreground' />
                </button>
              </div>

              {/* Right side - Balance, buttons and input */}
              <div className='flex-1 ml-3 text-right'>
                <div className='flex items-center justify-end gap-1.5 mb-1 h-4'>
                  {fromTokenData && (
                    <span className='text-xs text-muted-foreground whitespace-nowrap'>
                      {formatBalance(fromTokenData.amount, fromToken)}
                    </span>
                  )}
                  {fromTokenData && fromTokenData.amount > 0 && (
                    <>
                      <button
                        onClick={handleHalfClick}
                        className='px-2 py-0.5 text-[10px] font-medium rounded bg-muted/20 hover:bg-muted/30 transition-colors'
                      >
                        HALF
                      </button>
                      <button
                        onClick={handleMaxClick}
                        className='px-2 py-0.5 text-[10px] font-medium rounded bg-muted/20 hover:bg-muted/30 transition-colors'
                      >
                        MAX
                      </button>
                    </>
                  )}
                </div>
                <Input
                  type='text'
                  inputMode='decimal'
                  placeholder='0.00'
                  value={formatDisplayValue(amount)}
                  onChange={(e) =>
                    handleAmountChange(e.target.value.replace(/,/g, ''))
                  }
                  className='text-xl sm:text-2xl font-semibold bg-transparent border-0 p-0 h-auto text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 text-foreground mobile-input'
                />
                <div className='text-xs text-muted-foreground mt-0.5'>
                  {formatCurrency(amountUsd, 'USD')}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button - Overlapping both inputs */}
          <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10'>
            <button
              onClick={handleSwapTokens}
              className='p-2 rounded-full bg-card hover:bg-muted/20 transition-colors border-2 border-border shadow-lg'
            >
              <ArrowUpDown className='h-4 w-4 text-foreground' />
            </button>
          </div>

          {/* Buying Section */}
          <div className='bg-muted/5 rounded-b-lg p-2.5 pb-3 border border-border/50'>
            <div className='flex items-start justify-between'>
              {/* Left side - Label and selector */}
              <div>
                <div className='text-xs text-muted-foreground mb-2'>{t('swap.to')}</div>
                <button
                  onClick={() => setShowTokenSelect('to')}
                  className='flex items-center gap-1.5 px-3 py-2 rounded-full bg-card hover:bg-muted/20 transition-colors border border-border/50'
                >
                  <div className='flex items-center'>
                    {getTokenIcon(toToken)}
                  </div>
                  <span className='font-medium text-sm'>{toToken}</span>
                  <ChevronDown className='h-3 w-3 text-muted-foreground' />
                </button>
              </div>

              {/* Right side - Balance and output */}
              <div className='flex-1 ml-3 text-right'>
                <div className='h-4 mb-1'>
                  {toTokenData && (
                    <span className='text-xs text-muted-foreground whitespace-nowrap'>
                      {formatBalance(toTokenData.amount, toToken)}
                    </span>
                  )}
                </div>
                <div className='text-xl sm:text-2xl font-semibold text-muted-foreground/50 transition-all duration-300'>
                  {loadingQuote ? (
                    <div className='flex items-center gap-2 animate-pulse'>
                      <RefreshCcw className='h-4 w-4 animate-spin' />
                      <span className='mobile-text-sm'>Loading...</span>
                    </div>
                  ) : estimatedReceive > 0 ? (
                    <span className='animate-fade-in'>{formatDisplayValue(estimatedReceive.toFixed(6))}</span>
                  ) : (
                    '0.00'
                  )}
                </div>
                <div className='text-xs text-muted-foreground mt-0.5'>
                  {formatCurrency(estimatedReceive * toPrice, 'USD')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className='mt-2.5 mb-2.5'>
          <div className='text-xs text-muted-foreground mb-1'>{t('swap.slippage')}</div>
          <div className='flex gap-1'>
            {[0.1, 0.5, 1, 2].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`flex-1 py-1 text-xs rounded transition-all ${
                  slippage === value
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted/10 hover:bg-muted/20 border border-border/30'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handlePreview}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
            !amount || !!error || amountNum <= 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
          }`}
          disabled={!amount || !!error || amountNum <= 0}
        >
          {error || (!amount ? t('swap.enterAmount') : t('swap.confirm'))}
        </Button>

        {/* Token Prices Footer - Individual borders */}
        <div className='flex items-center justify-between gap-2 mt-2.5'>
          <div className='flex items-center gap-2 p-2 border border-border/30 rounded-lg bg-muted/5 flex-1'>
            <div className='flex items-center'>{getTokenIcon(fromToken)}</div>
            <div className='flex-1'>
              <div className='text-xs font-medium'>{fromToken}</div>
              <div className='text-[10px] text-muted-foreground truncate'>
                {tokenData?.get(fromToken)?.id?.slice(0, 4) || 'EPJF'}...
                {tokenData?.get(fromToken)?.id?.slice(-4) || 'Dt1v'}
              </div>
            </div>
            <div className='text-right'>
              <div className='text-xs font-medium'>{formatCurrency(fromPrice, 'USD')}</div>
              <div className='text-[10px] text-destructive'>0%</div>
            </div>
          </div>

          <div className='flex items-center gap-2 p-2 border border-border/30 rounded-lg bg-muted/5 flex-1'>
            <div className='flex items-center'>{getTokenIcon(toToken)}</div>
            <div className='flex-1'>
              <div className='text-xs font-medium'>{toToken}</div>
              <div className='text-[10px] text-muted-foreground truncate'>
                {tokenData?.get(toToken)?.id?.slice(0, 4) || 'So11'}...
                {tokenData?.get(toToken)?.id?.slice(-4) || '1112'}
              </div>
            </div>
            <div className='text-right'>
              <div className='text-xs font-medium'>{formatCurrency(toPrice, 'USD')}</div>
              <div className='text-[10px] text-destructive'>-0.69%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Selection Modal */}
      {showTokenSelect && (
        <Dialog open={!!showTokenSelect} onOpenChange={() => setShowTokenSelect(null)}>
          <DialogContent className='sm:max-w-md max-h-[80vh] overflow-hidden'>
            <DialogHeader>
              <DialogTitle>{t('swap.selectToken')}</DialogTitle>
            </DialogHeader>
            <div className='overflow-y-auto max-h-[60vh] p-2'>
              {availableTokens.map((tokenSymbol) => {
                const token = tokens.find((t) => t.symbol === tokenSymbol);
                const jupiterToken = tokenData?.get(tokenSymbol);

                if (!token) return null;

                return (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      if (showTokenSelect === 'from') {
                        setFromToken(token.symbol);
                      } else {
                        setToToken(token.symbol);
                      }
                      setShowTokenSelect(null);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                      (showTokenSelect === 'from' &&
                        token.symbol === fromToken) ||
                      (showTokenSelect === 'to' && token.symbol === toToken)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className='flex items-center gap-2.5'>
                      <div className='flex items-center'>
                        {jupiterToken?.icon ? (
                          <img
                            src={jupiterToken.icon}
                            alt={token.symbol}
                            className='w-6 h-6 rounded-full'
                          />
                        ) : (
                          <span className='text-xl'>
                            {fallbackTokenIcons[token.symbol]}
                          </span>
                        )}
                      </div>
                      <div className='text-left'>
                        <div className='font-medium text-sm'>
                          {token.symbol}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {jupiterToken?.name || `${token.symbol} Token`}
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='text-xs'>
                        {formatTokenAmount(token.amount, token.symbol)}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {formatCurrency(token.amount * token.priceUsd, 'USD')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <SwapReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        fromToken={fromToken}
        toToken={toToken}
        amount={amountNum}
        estimatedReceive={estimatedReceive}
        fee={amountNum * 0.002}
        quote={quote}
        onConfirm={async () => {
          if (useRealSwap && swapReal) {
            const success = await swapReal(fromToken, toToken, amountNum);
            if (success) {
              toast({
                title: 'Real Swap confirmed',
                description: `${amountNum} ${fromToken} -> ${estimatedReceive.toFixed(
                  4
                )} ${toToken}`,
              });
            } else {
              toast({
                title: 'Swap failed',
                description: 'Failed to execute swap transaction',
                variant: 'destructive',
              });
            }
          } else {
            useWalletStore.getState().swapFake(fromToken, toToken, amountNum);
            toast({
              title: 'Demo Swap confirmed',
              description: `${amountNum} ${fromToken} -> ${estimatedReceive.toFixed(
                4
              )} ${toToken}`,
            });
          }
          setReviewOpen(false);
          setAmount('');
        }}
      />
    </>
  );
};
