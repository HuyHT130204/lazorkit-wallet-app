// components/onramp-screen.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useWalletStore, Fiat, TokenSym } from '@/lib/store/wallet';
import {
  formatCurrency,
  generateOrderId,
} from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { getSplTokenBalance } from '@/lib/solana/getTokenBalance';

interface OnRampData {
  fromCurrency: Fiat;
  toToken: TokenSym;
  amount: number;
}

export const OnRampScreen = () => {
  const router = useRouter();
  const { hasPasskey, hasWallet, pubkey, setTokenAmount, rateUsdToVnd } = useWalletStore();
  const [showPreview, setShowPreview] = useState(false);
  const [onrampData, setOnrampData] = useState<OnRampData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg] = useState<string>('');
  // Removed home pending banner: pending is handled on success page only

  const handlePreview = (data: OnRampData) => {
    setOnrampData(data);
    setShowPreview(true);
  };

  const handleConfirm = async () => {
    if (!onrampData) return;
    setIsProcessing(true);
    setShowPreview(false);
    
    {
      // Luồng A & B: Chưa có ví thật, chỉ mua fiat
      console.log('Luồng A/B: Mua fiat không qua blockchain');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const orderId = generateOrderId();
      console.log('onramp_confirm_clicked (fiat only)', { ...onrampData, orderId });
      router.replace(
        `/callback/success?orderId=${orderId}&amount=${onrampData.amount}&token=${onrampData.toToken}&currency=${onrampData.fromCurrency}&type=fiat`
      );
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setOnrampData(null);
  };

  // Đã gỡ bỏ luồng ví giả và SDK

  // Các logic SDK đã được gỡ bỏ

  // No pending polling here

  // Removed mint-based override; balances will be fetched centrally via refreshBalances

  return (
    <div className='container mx-auto px-4 py-6 max-w-md min-h-[80vh] flex items-center justify-center'>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('onRamp.preview')}</DialogTitle>
          </DialogHeader>

          {onrampData && (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('onRamp.from')}</span>
                  <span>{formatCurrency(onrampData.amount, onrampData.fromCurrency)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('onRamp.to')}</span>
                  <span>{onrampData.amount.toFixed(2)} {onrampData.toToken}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('common.fees')}</span>
                  <span>$2.50</span>
                </div>
                <div className='flex justify-between font-semibold border-t pt-2'>
                  <span>{t('common.total')}</span>
                  <span>
                    {formatCurrency(onrampData.amount + 2.5, onrampData.fromCurrency)}
                  </span>
                </div>
              </div>

              <div className='flex space-x-2'>
                <Button variant='outline' onClick={handleCancel} className='flex-1'>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleConfirm} className='flex-1'>
                  {t('onRamp.confirmPay')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Processing Modal */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('onRamp.redirecting')}</DialogTitle>
          </DialogHeader>
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnRampScreen;
