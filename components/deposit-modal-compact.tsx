'use client';

import { useState } from 'react';
import { Copy, QrCode, Download, Share, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
import { SimpleSelect } from './ui/simple-select';
import { CopyButton } from './ui/copy-button';
import { QRCode } from '@/lib/utils/qr';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatAddress } from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface DepositModalCompactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DepositModalCompact = ({ open, onOpenChange }: DepositModalCompactProps) => {
  const { pubkey, tokens } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  const handleDownloadQR = () => {
    toast({
      title: t('deposit.qrDownloaded'),
      description: t('deposit.qrDownloadedDesc'),
    });
  };

  const handleShare = async () => {
    if (!pubkey) {
      console.warn('No pubkey available for sharing');
      return;
    }

    try {
      if (navigator.share && typeof navigator.share === 'function') {
        await navigator.share({
          title: t('deposit.shareTitle'),
          text: t('deposit.shareText'),
          url: `solana:${pubkey}`,
        });
      } else {
        // Fallback to copy
        handleCopyAddress();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copy
      handleCopyAddress();
    }
  };

  const handleCopyAddress = () => {
    if (!pubkey) {
      console.warn('No pubkey available for copying');
      return;
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(pubkey);
        toast({
          title: t('deposit.addressCopied'),
          description: t('deposit.addressCopiedDesc'),
        });
      } else {
        console.warn('Clipboard API not available');
        toast({
          title: 'Error',
          description: 'Clipboard not available',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error copying address:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy address',
        variant: 'destructive',
      });
    }
  };

  if (!pubkey) {
    return (
      <ViewportModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('deposit.title')}
        className="max-w-sm"
      >
        <div className="p-4 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
            <QrCode className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-medium mb-1">{t('deposit.noWallet')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('deposit.noWalletDesc')}
            </p>
          </div>
        </div>
      </ViewportModal>
    );
  }

  const tokenOptions = tokens.map((token) => ({
    value: token.symbol,
    label: `${token.symbol}`,
  }));

  return (
    <ViewportModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('deposit.title')}
      className="max-w-sm"
    >
      <div className="p-4 space-y-4">
        {/* Token Selection - Minimal */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {t('deposit.selectToken')}
            </span>
          </div>
          <SimpleSelect
            value={selectedToken}
            onValueChange={(value: TokenSym) => setSelectedToken(value)}
            options={tokenOptions}
            placeholder={t('deposit.selectToken')}
            className="h-8"
          />
        </div>

        {/* QR Code - Compact */}
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-sm font-medium">{t('deposit.scanQRCode')}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('deposit.scanQRDesc')}
            </p>
          </div>
          
          <div className="flex justify-center p-2 bg-white rounded-lg border">
            <QRCode value={pubkey} size={100} />
          </div>

          <div className="flex gap-1 justify-center">
            <Button variant="outline" size="sm" onClick={handleDownloadQR} className="h-7 px-2 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-7 px-2 text-xs">
              <Share className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>

        {/* Address - Minimal */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {t('deposit.depositAddress')}
            </span>
          </div>
          <div className="p-2 bg-muted/10 rounded border">
            <p className="font-mono text-xs break-all text-center">
              {formatAddress(pubkey, 6, 6)}
            </p>
          </div>
        </div>

        {/* Actions - Minimal */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-8 text-xs"
          >
            {t('common.close')}
          </Button>
          <Button 
            onClick={handleCopyAddress} 
            className="flex-1 h-8 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      </div>
    </ViewportModal>
  );
};
