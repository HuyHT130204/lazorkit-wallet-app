'use client';

import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { t } from '@/lib/i18n';
import { useWalletStore } from '@/lib/store/wallet';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  title?: string;
  showBack?: boolean;
  onBackClick?: () => void;
}

export const AppHeader = ({
  onMenuClick,
  showMenu = false,
  title,
  showBack = false,
  onBackClick,
}: AppHeaderProps) => {
  const { hasWallet } = useWalletStore();
  const router = useRouter();
  const shouldShowMenu = showMenu && hasWallet;
  
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-16 max-w-screen-2xl items-center px-4'>
        <div className='flex items-center space-x-3'>
          {showBack && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleBackClick}
              className='h-8 w-8 p-0 hover:bg-primary/10'
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
          )}
          <div className='h-8 w-auto'>
            <img
              src='/logo.png'
              alt='RampFi'
              className='h-8 w-auto object-contain'
            />
          </div>
          <h1 className='text-xl font-bold'>
            <span className='text-white'>Ramp</span>
            <span className='text-[color:#16ffbb]'>Fi</span>
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
