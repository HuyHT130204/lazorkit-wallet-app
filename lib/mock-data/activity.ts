import { Activity } from './types';

// Sample activity data
export const sampleActivity: Activity[] = [
  {
    id: '1',
    kind: 'onramp',
    ts: '2024-01-15T10:30:00Z',
    summary: 'Bought 75 USDC with $75.00',
    amount: 75,
    token: 'USDC',
    orderId: 'ord_123456789',
  },
  {
    id: '2',
    kind: 'swap',
    ts: '2024-01-14T15:45:00Z',
    summary: 'Swapped 0.5 SOL for 47.5 USDC',
    amount: 0.5,
    token: 'SOL',
  },
  {
    id: '3',
    kind: 'send',
    ts: '2024-01-13T09:20:00Z',
    summary: 'Sent 10 USDC to 8x3A...kL9Z',
    amount: 10,
    token: 'USDC',
    counterparty: '8x3A...kL9Z',
  },
];
