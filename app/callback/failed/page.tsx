'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FailedCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const reason = search.get('reason') || search.get('message') || 'Payment failed or canceled.';
  const orderId = search.get('orderId') || search.get('id') || search.get('ref') || '';

  const details = useMemo(() => {
    const amount = search.get('amount');
    const token = search.get('token');
    const currency = search.get('currency');
    return { amount, token, currency };
  }, [search]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Payment Failed</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono">{orderId}</span>
              </div>
            )}
            {details.amount && details.currency && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span>
                  {details.amount} {details.currency}
                </span>
              </div>
            )}
            {details.token && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token</span>
                <span>{details.token}</span>
              </div>
            )}
            <div className="pt-2 text-sm text-red-600 break-words">{reason}</div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => router.push('/buy')}>Return to Buy</Button>
      </div>
    </div>
  );
}


