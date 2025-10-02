'use client';

import { useState } from 'react';
import {
  Settings,
  Globe,
  Palette,
  DollarSign,
  Shield,
  Zap,
  Trash2,
  ChevronRight,
  Info,
  Key,
  Download,
  RotateCcw,
  Wallet,
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
import { WalletManager } from './wallet-manager';

export const SettingsTab = () => {
  const { fiat, setFiat, resetDemoData, setHasPasskey, logout } = useWalletStore();

  const [walletName, setWalletName] = useState('My Wallet');
  const { language, setLanguage } = useLanguage();
  const [theme, setTheme] = useState('dark');
  const [passkeyEnabled, setPasskeyEnabled] = useState(true);
  const [minimalDemo, setMinimalDemo] = useState(false);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'vi');
    console.log('settings_language_changed', { language: newLanguage });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    console.log('settings_theme_changed', { theme: newTheme });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setFiat(newCurrency as 'USD' | 'VND');
  };

  const handleRegeneratePasskey = () => {
    if (!ENV_CONFIG.ENABLE_DEMO) {
      toast({
        title: 'Demo mode disabled',
        description: 'Passkey functionality is disabled in demo mode.',
      });
      return;
    }

    setHasPasskey(false);
    setTimeout(() => {
      setHasPasskey(true);
      toast({
        title: 'Passkey regenerated',
        description: 'Your passkey has been successfully regenerated.',
      });
    }, 1000);
  };

  const handleRequestAirdrop = () => {
    toast({
      title: 'Testnet airdrop requested',
      description: 'This is a demo - no real tokens will be received.',
    });
  };

  const handleLogout = () => {
    try {
      logout();
      toast({
        title: 'Đăng xuất thành công',
        description: 'Bạn đã đăng xuất khỏi ví.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Lỗi đăng xuất',
        description: 'Không thể đăng xuất. Vui lòng thử lại.',
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
      {/* Wallet Manager */}
      <WalletManager />

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
              <Input
                id='walletName'
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className='h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all'
                placeholder='Enter wallet name'
              />
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

              {/* Theme */}
              <div className='p-4 hover:bg-accent/5 transition-colors'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex-1 space-y-1'>
                    <Label className='text-sm font-medium'>{t('settings.theme')}</Label>
                    <p className='text-xs text-muted-foreground'>Switch between dark and light mode</p>
                  </div>
                  <div className='w-32'>
                    <SimpleSelect
                      value={theme}
                      onValueChange={handleThemeChange}
                      options={[
                        { value: 'dark', label: t('settings.themes.dark') },
                        { value: 'light', label: t('settings.themes.light') },
                      ]}
                      className='h-10 bg-background/50 border-border/50'
                    />
                  </div>
                </div>
              </div>

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

      {/* Security & Backup */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Shield className='h-4 w-4 text-primary' />
          <h3 className='text-sm font-semibold text-foreground'>{t('settings.backupSecurity')}</h3>
        </div>
        
        <Card className='border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-0'>
            <div className='divide-y divide-border/30'>
              {/* Passkey Status */}
              <div className='p-4 hover:bg-accent/5 transition-colors'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-lg bg-primary/10'>
                      <Key className='h-4 w-4 text-primary' />
                    </div>
                    <div className='space-y-0.5'>
                      <div className='text-sm font-medium'>{t('settings.passkeyStatus')}</div>
                      <div className='text-xs text-muted-foreground'>
                        {t('settings.created')}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={passkeyEnabled}
                    onCheckedChange={setPasskeyEnabled}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className='p-4 space-y-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleRegeneratePasskey}
                  className='w-full h-10 justify-start gap-2 hover:bg-accent/10 transition-colors'
                >
                  <RotateCcw className='h-4 w-4' />
                  <span className='flex-1 text-left'>{t('settings.regeneratePasskey')}</span>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Button>
                
                <Button 
                  variant='outline' 
                  size='sm' 
                  className='w-full h-10 justify-start gap-2 hover:bg-accent/10 transition-colors'
                >
                  <Download className='h-4 w-4' />
                  <span className='flex-1 text-left'>{t('settings.exportPublicKey')}</span>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Options */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Zap className='h-4 w-4 text-primary' />
          <h3 className='text-sm font-semibold text-foreground'>{t('settings.advanced')}</h3>
        </div>
        
        <Card className='border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-0'>
            <div className='divide-y divide-border/30'>
              {/* Demo Mode Toggle */}
              <div className='p-4 hover:bg-accent/5 transition-colors'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <div className='text-sm font-medium'>Rich Demo Mode</div>
                    <div className='text-xs text-muted-foreground'>
                      Toggle Minimal Data Mode
                    </div>
                  </div>
                  <Switch checked={minimalDemo} onCheckedChange={setMinimalDemo} />
                </div>
              </div>

              {/* Testnet Airdrop */}
              <div className='p-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleRequestAirdrop}
                  className='w-full h-10 justify-start gap-2 hover:bg-accent/10 transition-colors'
                >
                  <DollarSign className='h-4 w-4' />
                  <span className='flex-1 text-left'>{t('settings.requestTestnetAirdrop')}</span>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 px-1'>
          <Trash2 className='h-4 w-4 text-destructive' />
          <h3 className='text-sm font-semibold text-destructive'>Danger Zone</h3>
        </div>
        
        <Card className='border border-destructive/20 bg-destructive/5 backdrop-blur-sm shadow-sm'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-start gap-2'>
                <Info className='h-4 w-4 text-destructive mt-0.5 flex-shrink-0' />
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {t('settings.confirmReset')}
                </p>
              </div>
              
              <div className='space-y-2'>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleLogout}
                  className='w-full h-10 gap-2 font-medium'
                >
                  <Trash2 className='h-4 w-4' />
                  Đăng xuất
                </Button>
                
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleResetDemoData}
                  className='w-full h-10 gap-2 font-medium'
                >
                  <Trash2 className='h-4 w-4' />
                  {t('settings.resetDemoData')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};