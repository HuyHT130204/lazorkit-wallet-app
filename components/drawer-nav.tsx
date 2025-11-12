'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { CreditCard, Grid3X3, User, LogOut, Hand, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { t } from '@/lib/i18n';
import { useWalletStore } from '@/lib/store/wallet';

interface DrawerNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} 

export const DrawerNav = ({ open, onOpenChange }: DrawerNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useWalletStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    {
      icon: CreditCard,
      label: t('navigation.buyCoin'),
      href: '/buy',
      description: 'Purchase crypto',
    },
    {
      icon: Grid3X3,
      label: t('navigation.listApps'),
      href: '/apps',
      description: 'Explore apps',
    },
    {
      icon: User,
      label: t('navigation.account'),
      href: '/account',
      description: 'Manage account',
    },
  ];

  const handleNavigation = (href: string) => {
    router.push(href, { scroll: true });
    onOpenChange(false);
    try {
      const scroller = document.scrollingElement || document.documentElement;
      setTimeout(() => scroller?.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    } catch {}
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logout();
      onOpenChange(false);
    }, 3000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-77 p-0 overflow-hidden flex flex-col sidebar-panel h-screen max-h-screen'>
        <div className='sidebar-panel__inner h-full flex flex-col'>
          <SheetHeader className='sidebar-header px-5 py-4 border-b border-sidebar-border flex-shrink-0 relative overflow-hidden'>
            <div className='sidebar-header__glow'></div>
            <div className='flex items-center justify-between relative z-10'>
              <div className='flex items-center space-x-3 sidebar-brand'>
                <div className='w-10 h-10 overflow-hidden bg-transparent sidebar-brand__logo relative'>
                  <div className='sidebar-logo__glow'></div>
                  <img
                    src='/logo.png'
                    alt='RampFi'
                    className='w-full h-full object-cover sidebar-logo relative z-10'
                  />
                </div>
                <SheetTitle className='text-left text-xl font-bold sidebar-brand__title'>
                  <span className='text-white'>Ramp</span>
                  <span className='text-[color:#16ffbb]'>Fi</span>
                </SheetTitle>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className='sidebar-close'
                aria-label='Close menu'
              >
                <X className='sidebar-close-icon' />
              </button>
            </div>
          </SheetHeader>

          <div className='sidebar-scroll flex-1 min-h-0 flex flex-col relative overflow-hidden'>
            <div className='sidebar-ambient'>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--1'></div>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--2'></div>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--3'></div>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--4'></div>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--5'></div>
              <div className='sidebar-ambient__particle sidebar-ambient__particle--6'></div>
            </div>
            <nav className='sidebar-menu flex-shrink-0 relative z-10'>
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={`sidebar-menu__item w-full relative ${
                      isActive ? 'sidebar-menu__item--active' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Icon className={`sidebar-menu__icon ${isActive ? 'is-active' : ''}`} />
                    <div className='sidebar-menu__content'>
                      <span className='sidebar-menu__label'>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className='sidebar-footer px-4 pb-4 mt-auto relative'>
            <div className='sidebar-logout__outer relative'>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`sidebar-logout w-full flex items-center relative ${
                  isLoggingOut ? 'sidebar-logout--logging' : ''
                }`}
              >
                {isLoggingOut ? (
                  <>
                    <Hand className='sidebar-logout__hand sidebar-logout__hand--active sidebar-logout__icon' />
                    <span className='sidebar-logout__label'>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className='sidebar-logout__icon' />
                    <span className='sidebar-logout__label'>{t('common.logout')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
