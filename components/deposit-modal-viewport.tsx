'use client';

import { useState } from 'react';
import { Copy, QrCode, Download, Share } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
import { SimpleSelect } from './ui/simple-select';
import { CopyButton } from './ui/copy-button';
import { QRCode } from '@/lib/utils/qr';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatAddress } from '@/lib/utils/format';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface DepositModalViewportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DepositModalViewport = ({ open, onOpenChange }: DepositModalViewportProps) => {
  const { pubkey, tokens } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  const handleDownloadQR = () => {
    // In a real app, you would generate and download the QR code
    toast({
      title: t('deposit.qrDownloaded'),
      description: t('deposit.qrDownloadedDesc'),
    });
  };

  const handleShare = async () => {
    if (navigator.share && pubkey) {
      try {
        await navigator.share({
          title: t('deposit.shareTitle'),
          text: t('deposit.shareText'),
          url: `solana:${pubkey}`,
        });
      } catch (error) {
        // Fallback to copy
        handleCopyAddress();
      }
    } else {
      handleCopyAddress();
    }
  };

  const handleCopyAddress = () => {
    if (pubkey) {
      navigator.clipboard.writeText(pubkey);
      toast({
        title: t('deposit.addressCopied'),
        description: t('deposit.addressCopiedDesc'),
      });
    }
  };

  if (!pubkey) {
    return (
      <ViewportModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('deposit.title')}
        className="max-w-lg"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
            <QrCode className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">{t('deposit.noWallet')}</h3>
            <p className="text-muted-foreground">
              {t('deposit.noWalletDesc')}
            </p>
          </div>
        </div>
      </ViewportModal>
    );
  }

  const tokenOptions = tokens.map((token) => ({
    value: token.symbol,
    label: `${token.symbol} - ${formatAddress(pubkey, 4, 4)}`,
  }));

  return (
    <ViewportModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('deposit.title')}
      className="max-w-md"
    >
      <div className="p-4 space-y-4">
        {/* Token Selection - Compact */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t('deposit.selectToken')}
          </label>
          <SimpleSelect
            value={selectedToken}
            onValueChange={(value: TokenSym) => setSelectedToken(value)}
            options={tokenOptions}
            placeholder={t('deposit.selectToken')}
            className="h-9"
          />
        </div>

        {/* QR Code Section - Compact */}
        <div className="space-y-3">
          <div className="text-center">
            <h3 className="text-base font-medium">{t('deposit.scanQRCode')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('deposit.scanQRDesc')}
            </p>
          </div>
          
          <div className="flex justify-center p-3 bg-white rounded-lg border">
            <QRCode value={pubkey} size={120} />
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleDownloadQR} className="h-8 px-3">
              <Download className="h-3 w-3 mr-1" />
              <span className="text-xs">Download</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 px-3">
              <Share className="h-3 w-3 mr-1" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </div>

        {/* Address Section - Compact */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t('deposit.depositAddress')}
          </label>
          <div className="p-2 bg-muted/20 rounded-lg border">
            <p className="font-mono text-xs break-all text-center">
              {formatAddress(pubkey, 8, 8)}
            </p>
          </div>
        </div>

        {/* Actions - Compact */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9"
          >
            {t('common.close')}
          </Button>
          <Button 
            onClick={handleCopyAddress} 
            className="flex-1 h-9"
          >
            <Copy className="h-3 w-3 mr-1" />
            <span className="text-sm">{t('deposit.copyAddress')}</span>
          </Button>
        </div>
      </div>
    </ViewportModal>
  );
};
