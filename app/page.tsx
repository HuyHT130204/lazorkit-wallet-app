"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/lib/store/wallet';
import { OnRampScreen } from '@/components/onramp-screen';

export default function Home() {
  const router = useRouter();
  const hasWallet = useWalletStore((s) => s.hasWallet);

  useEffect(() => {
    if (!hasWallet) {
      router.replace('/buy');
    }
  }, [hasWallet, router]);

  if (!hasWallet) return null;

  return <OnRampScreen />;
}
