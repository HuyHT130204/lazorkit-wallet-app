'use client';

import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Fiat, TokenSym } from '@/lib/store/wallet';
import { formatCurrency } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

export interface OnRampPreviewData {
  fromCurrency: Fiat;
  toToken: TokenSym;
  amount: number; // USD-equivalent
}

interface OnRampPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OnRampPreviewData;
  onConfirm: () => Promise<void> | void;
}

export function OnRampPreviewModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: OnRampPreviewModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const breakdown = useMemo(() => {
    const subtotal = data.amount;
    const fee = Math.max(0.3, subtotal * 0.029); // 2.9% + $0.30 minimum
    const network = 0.01; // demo network fee
    const total = subtotal + fee + network;
    return { subtotal, fee, network, total };
  }, [data.amount]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    console.log('onramp_confirm_clicked', data);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('onRamp.preview')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <Card>
            <CardContent className='p-4 space-y-3'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span>{formatCurrency(breakdown.subtotal, 'USD')}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Fee</span>
                <span>{formatCurrency(breakdown.fee, 'USD')}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Est. network fee</span>
                <span>{formatCurrency(breakdown.network, 'USD')}</span>
              </div>
              <div className='h-px bg-border' />
              <div className='flex justify-between font-semibold'>
                <span>{t('common.total')}</span>
                <span>{formatCurrency(breakdown.total, 'USD')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Đã bỏ hiển thị phương thức thanh toán – chỉ giữ chú thích nhà cung cấp */}
          <div className='text-xs text-muted-foreground'>
            {t('onRamp.trustStripe')}
          </div>

          <Button
            className='w-full'
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? t('common.loading') : t('onRamp.confirmPay')}
          </Button>

          <div className='text-center'>
            <p className='text-xs text-muted-foreground'>
              Rates are simulated for demo.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
