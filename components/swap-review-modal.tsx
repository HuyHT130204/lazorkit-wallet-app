'use client';

import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { t } from '@/lib/i18n';

interface SwapReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromToken: string;
  toToken: string;
  amount: number;
  estimatedReceive: number;
  fee: number;
  quote?: {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    priceImpactPct?: string;
    routePlan?: unknown[];
  };
  onConfirm: () => Promise<void> | void;
}

export function SwapReviewModal({ open, onOpenChange, fromToken, toToken, amount, estimatedReceive, fee, quote, onConfirm }: SwapReviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('swap.review')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>From</span><span>{amount.toFixed(4)} {fromToken}</span></div>
              <div className="flex justify-between"><span>To</span><span>{estimatedReceive.toFixed(4)} {toToken}</span></div>
              <div className="flex justify-between"><span>Est. fee</span><span>{fee.toFixed(4)} {fromToken}</span></div>
              {quote && (
                <>
                  <div className="flex justify-between"><span>Price Impact</span><span>{quote.priceImpactPct ? `${parseFloat(quote.priceImpactPct).toFixed(2)}%` : 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Route</span><span>{quote.routePlan?.length ? `${quote.routePlan.length} hops` : 'Direct'}</span></div>
                </>
              )}
            </CardContent>
          </Card>
          <div className="text-xs text-muted-foreground text-center">
            {quote ? 'Powered by Jupiter API' : 'This is a simulation'}
          </div>
          <Button className="w-full" onClick={onConfirm}>{t('swap.confirm')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


