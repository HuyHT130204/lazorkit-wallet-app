"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/lib/store/wallet';

export default function Home() {
  const router = useRouter();
  const hasWallet = useWalletStore((s) => s.hasWallet);

  useEffect(() => {
    if (!hasWallet) router.replace('/auth');
    else router.replace('/account');
  }, [hasWallet, router]);

  if (!hasWallet) return null;
  return null;
}
