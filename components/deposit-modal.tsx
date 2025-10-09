'use client';

import { useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { CopyButton } from './ui/copy-button';
import { QRCode } from '@/lib/utils/qr';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatAddress } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DepositModal = ({ open, onOpenChange }: DepositModalProps) => {
  const { pubkey, tokens } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  if (!pubkey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('deposit.title')}</DialogTitle>
          </DialogHeader>
          <div className='p-6 text-center'>
            <p className='text-muted-foreground'>
              No wallet available for deposits.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('deposit.title')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Token Selection */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              {t('deposit.selectToken')}
            </label>
            <Select
              value={selectedToken}
              onValueChange={(value: TokenSym) => setSelectedToken(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Public Key */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              {t('deposit.publicKey')}
            </label>
            <div className='flex items-center space-x-2'>
              <div className='flex-1 p-3 bg-muted/50 rounded-lg'>
                <p className='font-mono text-sm break-all'>
                  {formatAddress(pubkey, 8, 8)}
                </p>
              </div>
              <CopyButton text={pubkey} />
            </div>
          </div>

          {/* QR Code */}
          <div className='space-y-3'>
            <label className='text-sm font-medium'>{t('deposit.qrCode')}</label>
            <div className='flex justify-center p-6 bg-white rounded-xl border-2 border-primary/20 shadow-lg'>
              <div className="relative">
                <QRCode 
                  value={pubkey} 
                  size={200} 
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                  marginSize={3}
                />
                {/* Decorative corner elements */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br-lg"></div>
              </div>
            </div>
            <p className='text-sm text-muted-foreground text-center'>
              {t('deposit.scanToDeposit')}
            </p>
          </div>

          {/* Deposit Note */}
          <div className='p-3 bg-muted/50 rounded-lg'>
            <p className='text-sm text-muted-foreground'>
              {t('deposit.depositNote')}
            </p>
          </div>

          {/* Actions */}
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='flex-1'
            >
              {t('common.close')}
            </Button>
            <Button onClick={() => onOpenChange(false)} className='flex-1'>
              {t('deposit.copyAddress')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
