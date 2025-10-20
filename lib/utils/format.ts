import { Fiat, TokenSym } from '@/lib/store/wallet';

export const formatCurrency = (
  amount: number,
  currency: Fiat = 'USD'
): string => {
  if (!isFinite(amount)) return currency === 'USD' ? '$0.00' : '0 đ';
  if (currency === 'VND') {
    // Format VND with proper grouping (1,200,000 đ)
    const formatted = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${formatted} đ`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Compact currency for UI chips (e.g., $1.2K, $3.4M)
export const formatCurrencyCompact = (amount: number, currency: Fiat = 'USD'): string => {
  if (!isFinite(amount)) return currency === 'USD' ? '$0' : '0 đ';
  if (currency === 'VND') {
    const formatter = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
    return `${formatter.format(amount)} đ`;
  }
  const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  return `$${formatter.format(amount)}$`[0] === '$' ? `$${formatter.format(amount)}` : formatter.format(amount);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatTokenAmount = (amount: number, symbol: TokenSym): string => {
  const decimals = symbol === 'BONK' ? 0 : amount < 1 ? 4 : 2;
  return `${formatNumber(amount, decimals)} ${symbol}`;
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || !isFinite(value as number)) {
    return '0.00%';
  }
  const num = Number(value);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

// Represents very small values without showing 0.00
export const formatTiny = (value: number, threshold: number = 0.0001): string => {
  if (!isFinite(value) || value === 0) return '0';
  if (Math.abs(value) < threshold) return `<${threshold}`;
  return value.toString();
};

export const formatAddress = (
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return formatDate(d);
  }
};

export const convertCurrency = (
  amount: number,
  from: Fiat,
  to: Fiat,
  rate: number = 27000
): number => {
  if (from === to) return amount;

  if (from === 'USD' && to === 'VND') {
    return amount * rate;
  } else if (from === 'VND' && to === 'USD') {
    return amount / rate;
  }

  return amount;
};

export const validateAmount = (
  amount: number,
  min: number = 20,
  max: number = 500000
): boolean => {
  return amount >= min && amount <= max;
};

export const generateOrderId = (): string => {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generatePublicKey = (): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
