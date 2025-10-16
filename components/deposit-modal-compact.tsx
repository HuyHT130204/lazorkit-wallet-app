'use client';

import { useState } from 'react';
import { Copy, QrCode, Download, Share, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
// Removed token select and extra chrome to match Phantom-style deposit
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
  const { pubkey, walletName } = useWalletStore();

  const handleDownloadQR = () => {
    toast({
      title: t('deposit.qrDownloaded'),
      description: t('deposit.qrDownloadedDesc'),
    });
  };

  const handleShare = async () => {
    if (!pubkey) {
      console.warn(t('notifications.noPubkeySharing'));
      return;
    }

    try {
      if (navigator.share && typeof navigator.share === 'function') {
        // Some browsers reject non-HTTP URLs; include scheme in text only
        await navigator.share({
          title: t('deposit.shareTitle'),
          text: `${t('deposit.shareText')}\n${pubkey}\nsolana:${pubkey}`,
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
      console.warn(t('notifications.noPubkeyCopying'));
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

  return (
    <ViewportModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('deposit.title')}
      className="max-w-sm"
    >
      <div className="p-4 space-y-4">
        {/* Big QR full-width */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="rounded-xl bg-white p-2 border border-primary/30 shadow-md inline-block">
            <div className="flex items-center justify-center">
              <QRCode 
                value={pubkey} 
                size={220}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={true}
                marginSize={2}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleDownloadQR} className="h-8 px-3">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8 px-3">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">{t('deposit.depositAddress')}</span>
          <div className="flex items-center gap-2 p-2 bg-muted/10 rounded border">
            <p className="text-sm break-all flex-1 text-center">
              {(walletName || 'MyWallet')} ({formatAddress(pubkey, 4, 4)})
            </p>
            <Button size="sm" onClick={handleCopyAddress} className="h-8 px-3">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Scan this QR to deposit supported tokens to your wallet address.
          </p>
        </div>

        {/* Removed bottom Close button; user can close with top-right X */}
      </div>
    </ViewportModal>
  );
};
