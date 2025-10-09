'use client';

import { TrendingUp, TrendingDown, Send, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { CopyButton } from './ui/copy-button';
import { TokenHolding } from '@/lib/store/wallet';
import {
  formatCurrency,
  formatTokenAmount,
  formatPercentage,
} from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { generateSparkline } from '@/lib/utils/price';
import { Sparkline } from './ui/sparkline';

interface TokenDetailModalProps {
  token: TokenHolding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TokenDetailModal = ({
  token,
  open,
  onOpenChange,
}: TokenDetailModalProps) => {
  const value = token.amount * token.priceUsd;
  const ChangeIcon = token.change24hPct >= 0 ? TrendingUp : TrendingDown;
  const changeColor =
    token.change24hPct >= 0 ? 'text-green-500' : 'text-red-500';
  const spark = generateSparkline(token.symbol + token.mint, 14, token.priceUsd, 0.04);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-muted rounded-full flex items-center justify-center'>
              <span className='text-sm font-semibold'>
                {token.symbol.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className='font-semibold'>{token.symbol}</div>
              <div className='text-sm text-muted-foreground'>{t('token.solanaToken')}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Balance */}
          <Card>
            <CardContent className='p-4'>
              <div className='text-center space-y-2'>
                <div className='text-2xl font-bold'>
                  {formatTokenAmount(token.amount, token.symbol)}
                </div>
                <div className='text-lg text-muted-foreground'>
                  {formatCurrency(value)}
                </div>
                <div
                  className={`text-sm flex items-center justify-center ${changeColor}`}
                >
                  <ChangeIcon className='h-3 w-3 mr-1' />
                  {formatPercentage(token.change24hPct)} (24h)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Info */}
          <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground'>{t('common.price')}</span>
              <span className='font-semibold'>
                {formatCurrency(token.priceUsd)}
              </span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground'>{t('token.marketCap')}</span>
              <span className='font-semibold'>$2.1B</span>
            </div>

            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground'>{t('token.totalSupply')}</span>
              <span className='font-semibold'>{token.totalSupply ? token.totalSupply.toLocaleString() : '—'}</span>
            </div>

            {/* Sparkline */}
            <div className='pt-2'>
              <Sparkline data={spark} />
              <div className='text-[10px] text-muted-foreground mt-1 text-right'>7d trend (demo)</div>
            </div>
          </div>

          {/* Mint Address */}
          <div className='space-y-2'>
            <span className='text-sm font-medium'>{t('token.mintAddress')}</span>
            <div className='flex items-center space-x-2'>
              <div className='flex-1 p-2 bg-muted/50 rounded text-sm font-mono break-all'>
                {token.mint}
              </div>
              <CopyButton text={token.mint} />
            </div>
          </div>

          {/* Actions */}
          <div className='grid grid-cols-2 gap-3'>
            <Button variant='outline' className='h-12'>
              <Send className='mr-2 h-4 w-4' />
              {t('wallet.send')}
            </Button>
            <Button variant='outline' className='h-12'>
              <Plus className='mr-2 h-4 w-4' />
              {t('wallet.deposit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
