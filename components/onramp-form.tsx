'use client';

import { useState } from 'react';
import { Settings2, ChevronDown, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { TokenLogo } from './ui/token-logo';
import { OnRampPreviewModal } from './onramp-preview-modal';
import { createWhateeOrder } from '@/lib/services/payment';
import { Payment_js_src } from '@/lib/config/payment';
import { useRouter } from 'next/navigation';
import {
  useWalletStore,
  Fiat,
  TokenSym,
} from '@/lib/store/wallet';
import {
  formatCurrency,
  convertCurrency,
  validateAmount,
  generateOrderId,
} from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { JupiterToken, TOKEN_ADDRESSES } from '@/lib/services/jupiter';
import { useWallet } from '@/hooks/use-lazorkit-wallet';

interface OnRampFormProps {
  onPreview?: (data: OnRampData) => void;
  tokenData?: Map<string, JupiterToken>;
  onSwitchToSwap?: (params: { fromToken: TokenSym; toToken?: TokenSym }) => void;
  initialFromCurrency?: Fiat;
}

interface OnRampData {
  fromCurrency: Fiat;
  toToken: TokenSym;
  amount: number;
}

const currencyIcons: Record<Fiat, string> = {
  USD: '$',
  VND: '₫',
};

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

export const OnRampForm = ({ onPreview, tokenData, onSwitchToSwap, initialFromCurrency }: OnRampFormProps) => {
  const { rateUsdToVnd } = useWalletStore();
  const wallet = useWallet() as any;
  const router = useRouter();
  
  const [fromCurrency, setFromCurrency] = useState<Fiat>(initialFromCurrency || 'USD');
  const [toToken, setToToken] = useState<TokenSym>('USDC');
  const [amount, setAmount] = useState('');
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showCurrencySelect, setShowCurrencySelect] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [passkeyDataRef, setPasskeyDataRef] = useState<any>(null);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const amountUsd =
    fromCurrency === 'USD'
      ? amountNum
      : convertCurrency(amountNum, 'VND', 'USD', 27000);

  // Mock BTC in buy flow (UI-only)
  const isMockBTC = true;
  const mockBtcPriceUsd = 110956; // mock BTC price in USD (updated)
  const tokenJupiterData = tokenData?.get(toToken);
  const tokenPrice = isMockBTC ? mockBtcPriceUsd : (tokenJupiterData?.usdPrice || 1);
  const estimatedReceive = amountUsd / tokenPrice;

  const quickAmounts = [50000, 100000, 200000, 500000];

  const ICON_OVERRIDES: Partial<Record<TokenSym, string>> = {
    // Use CoinGecko CDN (allows hotlinking) to avoid 403 from cryptologos
    USDC: 'https://assets.coingecko.com/coins/images/6319/standard/USD_Coin_icon.png',
    USDT: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
  };
  const ICON_FALLBACK_2: Partial<Record<TokenSym, string>> = {
    USDC: 'https://assets.coingecko.com/coins/images/6319/standard/USD_Coin_icon.png',
    USDT: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
  };

  const getTokenIcon = (symbol: string) => {
    // Override icon with bitcoin logo when mocking BTC
    if (isMockBTC && symbol === toToken) {
      return (
        <div className='relative w-5 h-5'>
          <img src='/bitcoin-btc-logo.png' alt='BTC' className='absolute inset-0 w-full h-full rounded-full object-cover' />
        </div>
      );
    }
    const token = tokenData?.get(symbol);
    const override = ICON_OVERRIDES[symbol as TokenSym];
    return (
      <div className='relative w-5 h-5'>
        <TokenLogo symbol={symbol} size={20} />
        {(token?.icon || override) && (
          <img
            src={(token?.icon as string) || override!}
            alt={symbol}
            className='absolute inset-0 w-full h-full rounded-full'
            data-fallback={ICON_FALLBACK_2[symbol as TokenSym] || ''}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              const next = img.getAttribute('data-fallback');
              if (next) {
                img.setAttribute('data-fallback', '');
                img.src = next;
              } else {
                img.style.display = 'none';
              }
            }}
          />
        )}
      </div>
    );
  };

  const validateForm = () => {
    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (!validateAmount(amountUsd)) {
      if (amountUsd < 20) {
        setError(t('onRamp.amountTooLow'));
      } else {
        setError(t('onRamp.amountTooHigh'));
      }
      return false;
    }

    setError('');
    return true;
  };

  const handlePreview = async () => {
    if (!validateForm()) return;

    try {
      setIsCreatingOrder(true);

      // Bước 1: Tạo passkey để xác thực (giữ nguyên để tạo order sau này)
      console.log('🔐 Requesting passkey authentication...');
      if (!wallet?.connectPasskey) {
        throw new Error('Passkey creation not available');
      }
      
      const passkeyData = await wallet.connectPasskey();
      console.log('✅ Passkey authenticated:', {
        credentialId: passkeyData?.credentialId,
        hasSmartWalletAddress: Boolean(passkeyData?.smartWalletAddress),
        smartWalletAddress: passkeyData?.smartWalletAddress
      });
      
      if (!passkeyData) {
        throw new Error('Failed to get passkey data');
      }
      
      // KHÔNG LƯU localStorage - sẽ gửi trực tiếp vào order
      setPasskeyDataRef(passkeyData);

      // Bước 2: Mở preview modal
      // Không tạo smart wallet tại đây nữa trong luồng mới (đã chuyển sang /auth)
      const data: OnRampData = {
        fromCurrency,
        toToken,
        amount: amountUsd,
      };

      console.log('✅ Opening preview with passkey data');
      onPreview?.(data);
      setPreviewOpen(true);
      
    } catch (error: any) {
      console.error('❌ Error in handlePreview:', error);
      setError(error.message || 'Failed to prepare wallet');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue && !/^\d*\.?\d*$/.test(cleanValue)) return;
    setAmount(cleanValue);
    setSelectedQuickAmount(null);
    setError('');
  };

  const handleQuickAmountClick = (usdAmount: number) => {
    const fiatAmount = fromCurrency === 'USD' ? usdAmount : usdAmount * 27000;
    setAmount(fiatAmount.toString());
    setSelectedQuickAmount(usdAmount);
    setError('');
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const allTokens: TokenSym[] = ['SOL','USDC','USDT','BONK','RAY','JUP','ORCA','mSOL','JitoSOL','PYTH'];
  const filteredTokens = allTokens.filter(token => 
    token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className='p-4 pt-3'>
        <div className='flex items-center justify-between mb-2'>
          <div className='text-sm font-medium'>{t('onRamp.title')}</div>
          <button className='p-1.5 rounded-lg hover:bg-muted/50 transition-colors'>
            <Settings2 className='h-3.5 w-3.5 text-muted-foreground' />
          </button>
        </div>

        <div className='space-y-0'>
          <div className='bg-muted/5 rounded-t-lg p-2.5 pb-3 border border-b-0 border-border/50'>
            <div className='flex items-start justify-between'>
              <div>
                <div className='text-xs text-muted-foreground mb-2'>{t('onRamp.paying')}</div>
                <button
                  onClick={() => setShowCurrencySelect(true)}
                  className='flex items-center gap-1.5 px-3 p-1 rounded-full bg-card hover:bg-muted/20 transition-colors border border-border/50'
                >
                  <span className='text-lg text-primary'>
                    {currencyIcons[fromCurrency]}
                  </span>
                  <span className='font-medium text-sm'>{fromCurrency}</span>
                  <ChevronDown className='h-3 w-3 text-muted-foreground' />
                </button>
              </div>

              <div className='flex-1 ml-3 text-right'>
                <div className='mb-1'>
                  <span className='text-xs text-muted-foreground'>
                    {fromCurrency === 'VND' ? t('onRamp.minAmount') + ' • ' + t('onRamp.maxAmount') : `${t('onRamp.minAmount')} • ${t('onRamp.maxAmount')}`}
                  </span>
                </div>
                <Input
                  type='text'
                  inputMode='decimal'
                  placeholder={fromCurrency === 'VND' ? '1,000,000' : '100.00'}
                  value={formatDisplayValue(amount)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className='text-2xl font-semibold bg-transparent border-0 p-0 h-auto text-right focus-visible:ring-0 placeholder:text-muted-foreground/30 text-foreground'
                />
                <div className='text-xs text-muted-foreground mt-0.5'>
                  {fromCurrency === 'VND'
                    ? `≈ ${amountUsd.toFixed(2)}`
                    : `≈ ${(amountNum * 27000).toLocaleString()} ₫`}
                </div>
              </div>
            </div>
          </div>

          <div className='bg-muted/5 rounded-b-lg p-2.5 pb-3 border border-border/50'>
            <div className='flex items-start justify-between'>
              <div>
                <div className='text-xs text-muted-foreground mb-2'>
                  {t('onRamp.receiving')}
                </div>
                <button
                  onClick={() => setShowTokenSelect(true)}
                  className='flex items-center gap-1.5 px-3 py-2 rounded-full bg-card hover:bg-muted/20 transition-colors border border-border/50'
                >
                  <div className='flex items-center'>
                    {getTokenIcon(toToken)}
                  </div>
                  <span className='font-medium text-sm'>{isMockBTC ? 'BTC' : toToken}</span>
                  <ChevronDown className='h-3 w-3 text-muted-foreground' />
                </button>
              </div>

              <div className='flex-1 ml-3 text-right'>
                <div className='mb-1'>
                  <span className='text-xs text-muted-foreground'>
                    {t('common.price')}: 1 {isMockBTC ? 'BTC' : toToken} = ${tokenPrice?.toFixed(2) || '1.00'}
                  </span>
                </div>
                <div className='text-2xl font-semibold text-muted-foreground/50'>
                  {estimatedReceive > 0
                    ? formatDisplayValue(estimatedReceive.toFixed(2))
                    : '0.00'}
                </div>
                <div className='text-xs text-muted-foreground mt-0.5'>
                  ≈ ${(estimatedReceive * tokenPrice).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-2.5 mb-2.5'>
          <div className='text-xs text-muted-foreground mb-1'>{t('onRamp.quickAmount')}</div>
          <div className='flex gap-1'>
            {quickAmounts.map((usdAmount) => {
              const isSelected =
                selectedQuickAmount === usdAmount &&
                (fromCurrency === 'USD'
                  ? amountNum === usdAmount
                  : Math.abs(amountNum - usdAmount * 27000) < 1);

              return (
                <button
                  key={usdAmount}
                  onClick={() => handleQuickAmountClick(usdAmount)}
                  className={`flex-1 py-1.5 px-1 text-xs font-medium rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/50 text-primary'
                      : 'bg-muted/5 border-border/50 hover:bg-muted/10'
                  }`}
                >
                  ${usdAmount}
                </button>
              );
            })}
          </div>
          {fromCurrency === 'VND' && (
            <div className='text-[10px] text-muted-foreground text-center mt-1'>
              {t('onRamp.usdConvertedHint')}
            </div>
          )}
        </div>

        <Button
          onClick={handlePreview}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm ${
            !amount || !!error || amountNum <= 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90'
          }`}
          disabled={!amount || !!error || amountNum <= 0 || isCreatingOrder}
        >
          {isCreatingOrder ? 'Preparing...' : (error || (!amount ? t('onRamp.enterAmount') : t('common.next')))}
        </Button>

        <div className='text-center mt-2.5'>
          <div className='text-[10px] text-muted-foreground'>
            {t('onRamp.exchangeRate')}: 1 USD = 27,000 VND
          </div>
        </div>
      </div>

      {showCurrencySelect && (
        <div
          className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center transition-all duration-300 ease-out'
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowCurrencySelect(false)}
        >
           <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to { 
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
             .custom-scrollbar::-webkit-scrollbar { width: 6px; }
             .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
             .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.3); border-radius: 3px; }
             .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
          `}</style>
          <Card
            className='w-full max-w-md mx-4 sm:mx-0 overflow-hidden shadow-2xl border-border/60'
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between p-4 border-b border-border/60 bg-card/50 backdrop-blur-sm'>
              <h3 className='font-semibold text-base'>{t('onRamp.selectCurrency')}</h3>
              <button 
                onClick={() => setShowCurrencySelect(false)}
                className='p-1 rounded-lg hover:bg-muted/50 transition-all duration-200'
              >
                <X className='h-4 w-4 text-muted-foreground' />
              </button>
            </div>

            <div className='px-3 pt-3 pb-2'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <input
                  type='text'
                  placeholder='Search tokens...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-9 pr-3 py-2 bg-muted/30 border border-border/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200'
                />
              </div>
            </div>

            <div className='p-3 space-y-1.5'>
              {(['VND', 'USD'] as Fiat[]).map((currency, index) => (
                <button
                  key={currency}
                  onClick={() => {
                    setFromCurrency(currency);
                    setShowCurrencySelect(false);
                    setAmount('');
                    setSelectedQuickAmount(null);
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    currency === fromCurrency
                      ? 'bg-primary/15 border-2 border-primary/40 shadow-sm'
                      : 'bg-muted/30 hover:bg-muted/50 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    currency === fromCurrency ? 'bg-primary/20' : 'bg-background/50'
                  }`}>
                    {currencyIcons[currency]}
                  </div>
                  <div className='flex-1 text-left'>
                    <div className='font-semibold text-sm'>{currency}</div>
                    <div className='text-xs text-muted-foreground'>
                      {currency === 'VND' ? 'Vietnamese Dong' : 'US Dollar'}
                    </div>
                  </div>
                  {currency === fromCurrency && (
                    <div className='w-5 h-5 rounded-full bg-primary flex items-center justify-center'>
                      <div className='w-2 h-2 rounded-full bg-primary-foreground' />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className='px-4 py-2'>
              <div className='border-t border-border/40 relative'>
                <div className='absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-card'>
                  <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-medium'>
                    {t('swap.selectToken')}
                  </span>
                </div>
              </div>
            </div>

            <div className='px-3 pb-3 max-h-[280px] overflow-y-auto custom-scrollbar'>
              <div className='space-y-1'>
                {filteredTokens.map((sym, index) => {
                  const jup = tokenData?.get(sym);
                  return (
                    <button
                      key={`fiat-to-token-${sym}`}
                      onClick={() => {
                        setShowCurrencySelect(false);
                        setSearchTerm('');
                        onSwitchToSwap?.({ fromToken: sym });
                      }}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className='w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 bg-muted/20 hover:bg-muted/40 hover:scale-[1.01] border border-transparent hover:border-border/40'
                    >
                      <div className='w-9 h-9 rounded-full bg-background/50 flex items-center justify-center relative overflow-hidden'>
                        <TokenLogo symbol={sym} size={22} />
                        {(jup?.icon || ICON_OVERRIDES[sym]) && (
                          <img
                            src={(jup?.icon as string) || ICON_OVERRIDES[sym]!}
                            alt={sym}
                            className='absolute inset-0 w-full h-full rounded-full object-cover'
                            data-fallback={ICON_FALLBACK_2[sym] || ''}
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              const next = img.getAttribute('data-fallback');
                              if (next) {
                                img.setAttribute('data-fallback', '');
                                img.src = next;
                              } else {
                                img.style.display = 'none';
                              }
                            }}
                          />
                        )}
                      </div>
                      <div className='flex-1 text-left'>
                        <div className='font-medium text-sm'>{sym}</div>
                        <div className='text-[10px] text-muted-foreground'>
                          {jup?.name || 'Token'}
                        </div>
                      </div>
                      <ChevronDown className='h-4 w-4 text-muted-foreground rotate-[-90deg]' />
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {showTokenSelect && (
        <div
          className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center transition-all duration-300 ease-out'
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowTokenSelect(false)}
        >
          <Card
            className='w-full max-w-md mx-4 sm:mx-0 overflow-hidden shadow-2xl border-border/60'
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between p-4 border-b border-border/60 bg-card/50 backdrop-blur-sm'>
              <h3 className='font-semibold text-base'>{t('onRamp.selectToken')}</h3>
              <button 
                onClick={() => setShowTokenSelect(false)}
                className='p-1 rounded-lg hover:bg-muted/50 transition-all duration-200'
              >
                <X className='h-4 w-4 text-muted-foreground' />
              </button>
            </div>

            <div className='p-3 space-y-1.5'>
              {(['USDC'] as TokenSym[]).map((token, index) => {
                const jupiterToken = tokenData?.get(token);
                return (
                  <button
                    key={token}
                    onClick={() => {
                      // keep state but mock UI as BTC
                      setToToken(token);
                      setShowTokenSelect(false);
                    }}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                      token === toToken
                        ? 'bg-primary/15 border-2 border-primary/40 shadow-sm'
                        : 'bg-muted/30 hover:bg-muted/50 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden relative ${
                      token === toToken ? 'bg-primary/20 ring-2 ring-primary/30' : 'bg-background/50'
                    }`}>
                      <img src='/bitcoin-btc-logo.png' alt='BTC' className='absolute inset-0 w-full h-full object-cover' />
                    </div>
                    <div className='flex-1 text-left'>
                      <div className='font-semibold text-sm'>BTC</div>
                      {(
                        jupiterToken?.id ||
                        (TOKEN_ADDRESSES as Record<string, string>)[token]
                      ) && (
                        <div className='text-[10px] text-muted-foreground font-mono'>
                          {(
                            (jupiterToken?.id || (TOKEN_ADDRESSES as Record<string, string>)[token]) as string
                          ).slice(0, 4)}...
                          {(
                            (jupiterToken?.id || (TOKEN_ADDRESSES as Record<string, string>)[token]) as string
                          ).slice(-4)}
                        </div>
                      )}
                    </div>
                    {token === toToken && (
                      <div className='w-5 h-5 rounded-full bg-primary flex items-center justify-center'>
                        <div className='w-2 h-2 rounded-full bg-primary-foreground' />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <OnRampPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={{ fromCurrency, toToken, amount: amountUsd }}
        onConfirm={async () => {
          try {
            setIsCreatingOrder(true);
            
            const passkeyData = passkeyDataRef;
            if (!passkeyData) throw new Error('No passkey data found. Please try again.');

            if (typeof window !== 'undefined' && !document.querySelector(`script[src="${Payment_js_src}"]`)) {
              const s = document.createElement('script');
              s.src = Payment_js_src;
              s.async = true;
              document.body.appendChild(s);
            }

            const subtotal = Number(amountUsd.toFixed(2));
            const fee = 1.00; // Fixed $1 fee for all transactions
            const network = 0.00; // No network fee
            const total = Number((subtotal + fee).toFixed(2));

            console.log('💳 Creating order with passkey data:', {
              credentialId: passkeyData.credentialId?.slice(0, 10) + '...',
              smartWalletAddress: passkeyData.smartWalletAddress
            });

            const res = await createWhateeOrder({
              amount: subtotal, // Send subtotal (original amount) instead of total
              currency: fromCurrency,
              description: `Buy ${toToken} via Lazorkit`,
              metadata: { 
                toToken, 
                subtotal: String(subtotal), 
                fee: String(fee),
                total: String(total), // Keep total in metadata for reference
                network: String(network) 
              },
              token: toToken,
              passkeyData,
              orderLines: [
                { key: 'subtotal', title: 'Subtotal', quantity: 1, unit_price: subtotal, amount: subtotal },
                { key: 'fee', title: 'Fee', quantity: 1, unit_price: fee, amount: fee },
                { key: 'network', title: 'Est. network fee', quantity: 1, unit_price: network, amount: network },
              ],
            });

            if (res.checkoutUrl) {
              console.log('✅ Redirecting to checkout:', res.checkoutUrl);
              window.location.href = res.checkoutUrl;
            } else {
              throw new Error('Missing checkoutUrl from provider');
            }
          } catch (e) {
            const raw = (e as Error)?.message || 'Unknown error';
            const message = raw.length > 160 ? raw.slice(0, 160) + '…' : raw;
            const url = `/callback/failed?reason=${encodeURIComponent(message)}&amount=${encodeURIComponent(
              amountUsd.toFixed(2)
            )}&token=${encodeURIComponent(toToken)}&currency=${encodeURIComponent(fromCurrency)}`;
            router.push(url);
          } finally {
            setIsCreatingOrder(false);
          }
        }}
      />
    </>
  );
};