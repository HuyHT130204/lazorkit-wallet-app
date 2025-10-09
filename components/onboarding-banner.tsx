'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useWalletStore } from '@/lib/store/wallet';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { t } from '@/lib/i18n';
import { generatePublicKey } from '@/lib/utils/format';

interface OnboardingBannerProps {
  className?: string;
}

export const OnboardingBanner = ({ className }: OnboardingBannerProps) => {
  const { hasPasskey, hasWallet } = useWalletStore();
  const { isConnecting } = useWallet();
  const [isBusy, setIsBusy] = useState(false);

  const handleCreatePasskey = async () => {
    // Removed in new flow: passkey creation is backend-driven
  };

  const handleCreateWallet = async () => {
    // Removed in new flow: wallet creation is backend-driven
  };

  if (hasPasskey && hasWallet) return null;

  return (
    <Card className={`glass-card border-dashed border-border/60 ${className || ''}`}>
      <CardContent className='p-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='space-y-1'>
            {!hasPasskey && (
              <>
                <div className='text-sm font-medium'>{t('onRamp.createPasskey')}</div>
                <div className='text-xs text-muted-foreground'>{t('settings.passkeyStatus')}: {t('common.notAvailable')}</div>
              </>
            )}

            {hasPasskey && !hasWallet && (
              <>
                <div className='text-sm font-medium'>{t('onRamp.createWallet')}</div>
                <div className='text-xs text-muted-foreground'>{t('wallet.publicKey')}: {t('common.notAvailable')}</div>
              </>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {/* Removed buttons for creating passkey/wallet on FE per new flow */}
            {/* SDK disabled: ẩn nút tạo ví */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


