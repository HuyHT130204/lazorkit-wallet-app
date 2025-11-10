"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Homepage is /buy for all users (including new users)
    // New users will see wallet banner with no address and balance = 0
    router.replace('/buy');
  }, [router]);

  return null;
}
