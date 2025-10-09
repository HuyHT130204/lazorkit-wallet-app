'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { Clock } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useWalletStore } from '@/lib/store/wallet';
import { formatDate } from '@/lib/utils/format';

export function AssetsActivity() {
  const { activity } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const delay = 400 + Math.floor(Math.random() * 400);
    const id = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(id);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className='p-4 space-y-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-4 w-full bg-muted/40 rounded animate-pulse' />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className='p-0'>
        {activity.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('wallet.noActivity')}
            description={t('assets.emptySubtitle')}
            className='py-8'
          />
        ) : (
          <ul className='divide-y divide-border'>
            {activity.slice(0, 15).map((a, index) => (
              <li key={`${a.id}-${index}`} className='p-4 flex items-center justify-between'>
                <div className='min-w-0'>
                  <div className='text-sm font-medium truncate'>{a.summary}</div>
                  <div className='text-xs text-muted-foreground'>{formatDate(a.ts)}</div>
                </div>
                {a.token && (
                  <div className='text-xs text-muted-foreground'>{a.token}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


