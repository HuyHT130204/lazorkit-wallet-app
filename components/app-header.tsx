'use client';

import { Menu } from 'lucide-react';
import { Button } from './ui/button';
import { t } from '@/lib/i18n';
import { useWalletStore } from '@/lib/store/wallet';

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  title?: string;
}

export const AppHeader = ({
  onMenuClick,
  showMenu = false,
  title,
}: AppHeaderProps) => {
  const { hasWallet } = useWalletStore();
  const shouldShowMenu = showMenu && hasWallet;

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-16 max-w-screen-2xl items-center px-4'>
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 rounded-lg border border-border/50 overflow-hidden'>
            <img
              src='/lazorkit-logo.jpg'
              alt='LazorKit'
              className='w-full h-full object-cover'
            />
          </div>
          <h1 className='text-xl font-bold text-foreground'>
            {title || 'LazorKit'}
          </h1>
        </div>

        <div className='flex flex-1 items-center justify-end space-x-2'>
          {shouldShowMenu && (
            <Button
              variant='ghost'
              size='lg'
              onClick={onMenuClick}
              className='h-14 w-14 p-0 hover:bg-primary/10 transition-all duration-200 rounded-xl'
            >
              <Menu className='size-6' />
              <span className='sr-only'>Open menu</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
