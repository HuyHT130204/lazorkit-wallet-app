'use client';

import { useState } from 'react';
import {
  Settings,
  Globe,
  Trash2,
  ChevronRight,
  Info,
  Download,
  Wallet,
  Check,
  X as XIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SimpleSelect } from './ui/simple-select';
import { Switch } from '@/components/ui/switch';
import { useWalletStore } from '@/lib/store/wallet';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { toast } from '@/hooks/use-toast';
import { ENV_CONFIG } from '@/lib/config/env';
// WalletManager removed per requirement

export const SettingsTab = () => {
  const { fiat, setFiat, resetDemoData, setHasPasskey, logout, walletName, setWalletName } = useWalletStore();

  const { language, setLanguage } = useLanguage();
  const [passkeyEnabled, setPasskeyEnabled] = useState(true);
  const [minimalDemo, setMinimalDemo] = useState(false);
  const [pendingName, setPendingName] = useState<string>(walletName || '');

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'vi');
    console.log('settings_language_changed', { language: newLanguage });
  };

  // Theme functionality removed

  const handleCurrencyChange = (newCurrency: string) => {
    setFiat(newCurrency as 'USD' | 'VND');
  };

  // Removed mock passkey/airdrop handlers along with their UI

  const handleLogout = () => {
    try {
      logout();
      toast({
        title: t('notifications.logoutSuccess'),
        description: t('notifications.logoutSuccessDesc'),
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: t('notifications.logoutFailed'),
        description: t('notifications.logoutFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleResetDemoData = () => {
    resetDemoData();
    toast({
      title: 'Demo data reset',
      description: 'Demo data has been reset to initial state.',
    });
  };

  return (
    <div className='space-y-6 pb-6'>
      {/* Wallet Manager removed */}

      {/* Wallet Settings */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Wallet className='h-4 w-4 text-primary' />
          <h3 className='text-sm font-semibold text-foreground'>Wallet Configuration</h3>
        </div>
        
        <Card className='border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-4'>
            <div className='space-y-2.5'>
              <Label htmlFor='walletName' className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                {t('settings.walletName')}
              </Label>
              <div className='relative'>
                <Input
                  id='walletName'
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  className='h-11 bg-background/50 border-border/50 focus:border-primary/50 pr-20 transition-all'
                  placeholder='Enter wallet name'
                />
                <div className='absolute inset-y-0 right-2 flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={() => setWalletName(pendingName.trim())}
                    className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/50 hover:bg-muted/20'
                    aria-label='Save wallet name'
                  >
                    <Check className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => { setPendingName(''); setWalletName(''); }}
                    className='h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/50 hover:bg-muted/20'
                    aria-label='Clear wallet name'
                  >
                    <XIcon className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Globe className='h-4 w-4 text-primary' />
          <h3 className='text-sm font-semibold text-foreground'>Preferences</h3>
        </div>
        
        <Card className='border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-0'>
            <div className='divide-y divide-border/30'>
              {/* Language */}
              <div className='p-4 hover:bg-accent/5 transition-colors'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex-1 space-y-1'>
                    <Label className='text-sm font-medium'>{t('settings.language')}</Label>
                    <p className='text-xs text-muted-foreground'>Choose your display language</p>
                  </div>
                  <div className='w-32'>
                    <SimpleSelect
                      value={language}
                      onValueChange={handleLanguageChange}
                      options={[
                        { value: 'en', label: t('settings.languages.en') },
                        { value: 'vi', label: t('settings.languages.vi') },
                      ]}
                      className='h-10 bg-background/50 border-border/50'
                    />
                  </div>
                </div>
              </div>

              {/* Theme section removed */}

              {/* Currency */}
              <div className='p-4 hover:bg-accent/5 transition-colors'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex-1 space-y-1'>
                    <Label className='text-sm font-medium'>{t('settings.currency')}</Label>
                    <p className='text-xs text-muted-foreground'>Default fiat currency display</p>
                  </div>
                  <div className='w-32'>
                    <SimpleSelect
                      value={fiat}
                      onValueChange={handleCurrencyChange}
                      options={[
                        { value: 'USD', label: t('settings.currencies.usd') },
                        { value: 'VND', label: t('settings.currencies.vnd') },
                      ]}
                      className='h-10 bg-background/50 border-border/50'
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Backup and Advanced sections removed (mock features) */}

      {/* Danger Zone */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Trash2 className='h-4 w-4 text-destructive' />
          <h3 className='text-sm font-semibold text-destructive'>Danger Zone</h3>
        </div>
        
        <Card className='border border-destructive/20 bg-destructive/5 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-4'>
            <div className='space-y-2'>
              <Button
                variant='destructive'
                size='sm'
                onClick={handleLogout}
                className='w-full h-10 gap-2 font-medium'
              >
                <Trash2 className='h-4 w-4' />
                {t('common.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};