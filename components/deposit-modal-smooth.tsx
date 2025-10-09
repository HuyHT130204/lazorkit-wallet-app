'use client';

import { useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { SmoothModal } from './ui/smooth-modal';
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

interface DepositModalSmoothProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DepositModalSmooth = ({ open, onOpenChange }: DepositModalSmoothProps) => {
  const { pubkey, tokens } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  if (!pubkey) {
    return (
      <SmoothModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('deposit.title')}
        className="sm:max-w-md"
      >
        <div className="p-6 text-center">
          <p className="text-muted-foreground">
            No wallet available for deposits.
          </p>
        </div>
      </SmoothModal>
    );
  }

  return (
    <SmoothModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('deposit.title')}
      className="sm:max-w-md"
    >
      <div className="p-6 space-y-6">
        {/* Token Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
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
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('deposit.publicKey')}
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg">
              <p className="font-mono text-sm break-all">
                {formatAddress(pubkey, 8, 8)}
              </p>
            </div>
            <CopyButton text={pubkey} />
          </div>
        </div>

        {/* QR Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('deposit.qrCode')}</label>
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode value={pubkey} size={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t('deposit.scanToDeposit')}
          </p>
        </div>

        {/* Deposit Note */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {t('deposit.depositNote')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('common.close')}
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            {t('deposit.copyAddress')}
          </Button>
        </div>
      </div>
    </SmoothModal>
  );
};



