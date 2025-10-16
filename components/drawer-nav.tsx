'use client';

import { useRouter, usePathname } from 'next/navigation';
import { CreditCard, Grid3X3, User, X } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { t } from '@/lib/i18n';

interface DrawerNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DrawerNav = ({ open, onOpenChange }: DrawerNavProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      icon: CreditCard,
      label: t('navigation.buyCoin'),
      href: '/buy',
    },
    {
      icon: Grid3X3,
      label: t('navigation.listApps'),
      href: '/apps',
    },
    {
      icon: User,
      label: t('navigation.account'),
      href: '/account',
    },
  ];

  const handleNavigation = (href: string) => {
    // Ensure viewport scrolls to top after navigating from deep scroll
    router.push(href, { scroll: true });
    onOpenChange(false);
    try {
      const scroller = document.scrollingElement || document.documentElement;
      // Use a microtask to scroll after sheet starts closing
      setTimeout(() => scroller?.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='left' className='w-80'>
        <SheetHeader>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 rounded-lg border border-border/50 overflow-hidden'>
              <img
                src='/logo.png'
                alt='RampFi'
                className='w-full h-full object-cover'
              />
            </div>
            <SheetTitle className='text-left text-xl font-bold'>
              <span className='text-white'>Ramp</span>
              <span className='text-[color:#16ffbb]'>Fi</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className='mt-8 space-y-2'>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                variant='ghost'
                className={`w-full justify-start h-12 px-4 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : ''}`}
                />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className='absolute bottom-4 left-4 right-4'>
          <p className='text-xs text-muted-foreground text-center'>
            {t('app.prototype')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
