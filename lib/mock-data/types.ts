// Mock data types
export type Fiat = 'USD' | 'VND';
export type TokenSym =
  | 'SOL'
  | 'USDC'
  | 'USDT'
  | 'BONK'
  | 'RAY'
  | 'JUP'
  | 'ORCA'
  | 'mSOL'
  | 'JitoSOL'
  | 'PYTH'
  | 'XYZ';
export type PaymentMethod = 'card' | 'applepay' | 'vnpay';
export type ActivityKind = 'onramp' | 'swap' | 'send' | 'deposit';

export interface TokenHolding {
  symbol: TokenSym;
  amount: number;
  priceUsd: number;
  change24hPct: number;
  mint: string;
  totalSupply?: number;
}

export interface Device {
  id: string;
  name: string;
  platform: 'iOS' | 'Android' | 'Web';
  lastActive: string;
  location?: string;
}

export interface AppCard {
  id: string;
  name: string;
  intro: string;
  category: 'DeFi' | 'Social' | 'Games' | 'Tools';
  tags: string[];
  image: string;
  website: string;
  verified?: boolean;
  rating?: number;
  installs?: string;
  updatedAt?: string;
  version?: string;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  ts: string;
  summary: string;
  amount?: number;
  token?: TokenSym;
  counterparty?: string;
  orderId?: string;
  status?: 'Success' | 'Failed' | 'Pending';
}
