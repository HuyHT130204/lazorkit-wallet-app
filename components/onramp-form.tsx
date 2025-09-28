'use client';

import { useState } from 'react';
import { Settings2, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { TokenLogo } from './ui/token-logo';
import { OnRampPreviewModal } from './onramp-preview-modal';
import { useRouter } from 'next/navigation';
import {
  useWalletStore,
  Fiat,
  TokenSym,
  PaymentMethod,
} from '@/lib/store/wallet';
import {
  formatCurrency,
  convertCurrency,
  validateAmount,
  generateOrderId,
} from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { JupiterToken } from '@/lib/services/jupiter';

interface OnRampFormProps {
  onPreview?: (data: OnRampData) => void;
  tokenData?: Map<string, JupiterToken>;
}

interface OnRampData {
  fromCurrency: Fiat;
  toToken: TokenSym;
  amount: number;
  paymentMethod: PaymentMethod;
}

const currencyIcons: Record<Fiat, string> = {
  USD: '$',
  VND: '₫',
};

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

export const OnRampForm = ({ onPreview, tokenData }: OnRampFormProps) => {
  const { rateUsdToVnd } = useWalletStore();
  const router = useRouter();
  const [fromCurrency, setFromCurrency] = useState<Fiat>('VND'); // Default to VND
  const [toToken, setToToken] = useState<TokenSym>('USDC');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(
    null
  );
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showCurrencySelect, setShowCurrencySelect] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState(false);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const amountUsd =
    fromCurrency === 'USD'
      ? amountNum
      : convertCurrency(amountNum, 'VND', 'USD', 27000); // Fixed rate 27,000 VND = 1 USD

  // Get token price from Jupiter data
  const tokenJupiterData = tokenData?.get(toToken);
  const tokenPrice = tokenJupiterData?.usdPrice || 1;
  const estimatedReceive = amountUsd / tokenPrice;

  // Quick amount options in USD
  const quickAmounts = [50, 100, 200, 500];

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

  const handlePreview = () => {
    if (!validateForm()) return;

    const data: OnRampData = {
      fromCurrency,
      toToken,
      amount: amountUsd,
      paymentMethod,
    };

    console.log('onramp_preview_clicked', data);
    onPreview?.(data);
    setPreviewOpen(true);
  };

  const handleAmountChange = (value: string) => {
    // Remove commas for processing
    const cleanValue = value.replace(/,/g, '');
    // Only allow numbers and decimal point
    if (cleanValue && !/^\d*\.?\d*$/.test(cleanValue)) return;
    setAmount(cleanValue);
    setSelectedQuickAmount(null); // Clear selected quick amount when manually typing
    setError('');
  };

  const handleQuickAmountClick = (usdAmount: number) => {
    // Calculate the fiat amount based on selected currency
    const fiatAmount = fromCurrency === 'USD' ? usdAmount : usdAmount * 27000; // Convert to VND

    setAmount(fiatAmount.toString());
    setSelectedQuickAmount(usdAmount);
    setError('');
  };

  // Format display value with commas
  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const paymentMethods = [
    { value: 'card' as PaymentMethod, label: 'Card', icon: '/placeholder-logo.png' },
    { value: 'applepay' as PaymentMethod, label: 'Apple Pay', icon: '/apple_logo.png' },
    { value: 'vnpay' as PaymentMethod, label: 'VNPAY QR', icon: '/vietnam_logo.png' },
  ];

  return (
    <>
      <div className='p-4 pt-3'>
        {/* Header - Compact */}
        <div className='flex items-center justify-between mb-2'>
          <div className='text-sm font-medium'>{t('onRamp.title')}</div>
          <button className='p-1.5 rounded-lg hover:bg-muted/50 transition-colors'>
            <Settings2 className='h-3.5 w-3.5 text-muted-foreground' />
          </button>
        </div>

        {/* Two Adjacent Input Sections */}
        <div className='space-y-0'>
          {/* Paying Section */}
          <div className='bg-muted/5 rounded-t-lg p-2.5 pb-3 border border-b-0 border-border/50'>
            <div className='flex items-start justify-between'>
              {/* Left side - Label and selector */}
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

              {/* Right side - Min/Max and input */}
              <div className='flex-1 ml-3 text-right'>
                <div className='mb-1'>
                  <span className='text-xs text-muted-foreground'>
                    {fromCurrency === 'VND' ? 'Tối thiểu 540,000 ₫ • Tối đa 13,500,000 ₫' : `${t('onRamp.minAmount')} • ${t('onRamp.maxAmount')}`}
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
                    ? `≈ $${amountUsd.toFixed(2)}`
                    : `≈ ${(amountNum * 27000).toLocaleString()} ₫`}
                </div>
              </div>
            </div>
          </div>

          {/* Receiving Section */}
          <div className='bg-muted/5 rounded-b-lg p-2.5 pb-3 border border-border/50'>
            <div className='flex items-start justify-between'>
              {/* Left side - Label and selector */}
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
                  <span className='font-medium text-sm'>{toToken}</span>
                  <ChevronDown className='h-3 w-3 text-muted-foreground' />
                </button>
              </div>

              {/* Right side - Rate and output */}
              <div className='flex-1 ml-3 text-right'>
                <div className='mb-1'>
                  <span className='text-xs text-muted-foreground'>
                    {t('common.price')}: 1 {toToken} = ${tokenPrice?.toFixed(4) || '1.00'}
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

        {/* Quick Amount Selection */}
        <div className='mt-2.5 mb-2.5'>
          <div className='text-xs text-muted-foreground mb-1'>{t('onRamp.quickAmount')}</div>
          <div className='flex gap-1'>
            {quickAmounts.map((usdAmount) => {
              // Check if this quick amount is selected
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

        {/* Payment Method */}
        <div className='mb-2.5'>
          <div className='text-xs text-muted-foreground mb-1'>
            {t('onRamp.paymentMethod')}
          </div>
          <div className='flex gap-1'>
            {paymentMethods.map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={`flex-1 py-1.5 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                  paymentMethod === method.value
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-muted/5 border-border/50 hover:bg-muted/10'
                }`}
              >
                <span className='text-base'>
                  <img src={method.icon} alt={method.label} className='w-5 h-5 rounded-sm' />
                </span>
                <span className='text-xs font-medium'>{
                  method.value === 'card' ? t('onRamp.card') : method.value === 'applepay' ? t('onRamp.applePay') : t('onRamp.vnpay')
                }</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handlePreview}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm ${
            !amount || !!error || amountNum <= 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90'
          }`}
          disabled={!amount || !!error || amountNum <= 0}
        >
          {error || (!amount ? t('onRamp.enterAmount') : t('common.next'))}
        </Button>

        {/* Exchange Rate Info */}
        <div className='text-center mt-2.5'>
          <div className='text-[10px] text-muted-foreground'>
            {t('onRamp.exchangeRate')}: 1 USD = 27,000 VND
          </div>
        </div>
      </div>

      {/* Currency Selection Modal */}
      {showCurrencySelect && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'
          onClick={() => setShowCurrencySelect(false)}
        >
          <Card
            className='w-80 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='p-3 border-b'>
              <h3 className='font-semibold text-sm'>{t('onRamp.selectCurrency')}</h3>
            </div>
            <div className='p-2'>
              {(['VND', 'USD'] as Fiat[]).map((currency) => (
                <button
                  key={currency}
                  onClick={() => {
                    setFromCurrency(currency);
                    setShowCurrencySelect(false);
                    setAmount('');
                    setSelectedQuickAmount(null);
                  }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                    currency === fromCurrency
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <span className='text-xl text-primary'>
                    {currencyIcons[currency]}
                  </span>
                  <span className='font-medium text-sm'>{currency}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Token Selection Modal */}
      {showTokenSelect && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'
          onClick={() => setShowTokenSelect(false)}
        >
          <Card
            className='w-80 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='p-3 border-b'>
              <h3 className='font-semibold text-sm'>{t('onRamp.selectToken')}</h3>
            </div>
            <div className='p-2'>
              {(['USDC', 'USDT'] as TokenSym[]).map((token) => {
                const jupiterToken = tokenData?.get(token);
                return (
                  <button
                    key={token}
                    onClick={() => {
                      setToToken(token);
                      setShowTokenSelect(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
                      token === toToken
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className='flex items-center'>
                      {jupiterToken?.icon ? (
                        <img
                          src={jupiterToken.icon}
                          alt={token}
                          className='w-6 h-6 rounded-full'
                        />
                      ) : (
                        <span className='text-xl text-secondary'>
                          {fallbackTokenIcons[token]}
                        </span>
                      )}
                    </div>
                    <div className='flex-1 text-left'>
                      <div className='font-medium text-sm'>{token}</div>
                      {jupiterToken?.id && (
                        <div className='text-[10px] text-muted-foreground truncate'>
                          {jupiterToken.id.slice(0, 4)}...
                          {jupiterToken.id.slice(-4)}
                        </div>
                      )}
                    </div>
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
        data={{ fromCurrency, toToken, amount: amountUsd, paymentMethod }}
        onConfirm={async () => {
          const orderId = generateOrderId();
          console.log('checkout_success', orderId);
          const url = `/callback/success?orderId=${encodeURIComponent(
            orderId
          )}&amount=${encodeURIComponent(
            amountUsd.toFixed(2)
          )}&token=${encodeURIComponent(toToken)}&currency=${encodeURIComponent(
            fromCurrency
          )}`;
          // Simulate 600ms redirect delay
          await new Promise((r) => setTimeout(r, 600));
          router.push(url);
        }}
      />
    </>
  );
};
