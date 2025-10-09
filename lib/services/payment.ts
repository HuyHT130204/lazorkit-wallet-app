import {
  Payment_api_key,
  Payment_api_url,
  Payment_merchant_id,
  Payment_return_url_failed,
  Payment_return_url_success,
} from '@/lib/config/payment';

export type CreateOrderInput = {
  amount: number; // decimal amount in selected currency
  currency: 'USD' | 'VND';
  description?: string;
  metadata?: Record<string, string>;
  token?: string;
  passkeyData?: unknown;
  orderLines?: Array<{
    key: string;
    title: string;
    quantity: number;
    unit_price: number; // decimal with 2 fraction digits
    amount: number; // decimal with 2 fraction digits
  }>;
};

export type CreateOrderResponse = {
  orderId: string;
  checkoutUrl: string;
  status?: string;
};

export async function createWhateeOrder(
  input: CreateOrderInput
): Promise<CreateOrderResponse> {
  // Route through our backend so the order is persisted and marked pending
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const res = await fetch(`${apiBase}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      token: input.token,
      metadata: input.metadata,
      passkeyData: input.passkeyData,
      orderLines: input.orderLines ?? [
        {
          key: 'onramp',
          title: input.description || `Buy ${input.token || ''}`,
          quantity: 1,
          unit_price: Number(input.amount.toFixed(2)),
          amount: Number(input.amount.toFixed(2)),
        },
      ],
    }),
  });
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch {}
    // Avoid returning full HTML/error bodies in the message
    const plain = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const short = plain.slice(0, 180);
    throw new Error(`Create order failed: ${res.status} ${short}`);
  }
  const data = await res.json();
  return { orderId: data.orderId || data.reference, checkoutUrl: data.checkoutUrl, status: data.status };
}


