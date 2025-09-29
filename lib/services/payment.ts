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
  const url = Payment_api_url;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const reference = `lz_${Date.now()}`;
  const returnUrl = origin
    ? `${new URL(Payment_return_url_success, origin).toString()}?status=success&ref=${encodeURIComponent(reference)}`
    : `${Payment_return_url_success}?status=success&ref=${encodeURIComponent(reference)}`;
  const cancelUrl = origin
    ? `${new URL(Payment_return_url_failed, origin).toString()}?status=cancelled&ref=${encodeURIComponent(reference)}`
    : `${Payment_return_url_failed}?status=cancelled&ref=${encodeURIComponent(reference)}`;

  // Use decimal amounts; the sandbox expects decimal values, not minor units
  const amountDecimal = Number(input.amount.toFixed(2));

  const metadataArray = Object.entries({
    ...(input.metadata || {}),
    token: input.token || '',
    app: 'lazorkit-wallet',
  }).map(([key, value]) => ({ key, value: String(value) }));

  const body: any = {
    merchantId: Payment_merchant_id,
    amount: amountDecimal,
    currency: input.currency,
    reference,
    description: input.description || 'Lazorkit Wallet On-ramp',
    metadata: metadataArray,
    payment: {
      provider: 'stripe',
      method: 'card',
      flow: 'direct',
      success_url: returnUrl,
      cancel_url: cancelUrl,
    },
    channel: 'provider',
    redirectUrls: {
      success: returnUrl,
      cancel: cancelUrl,
    },
    success_url: returnUrl,
    cancel_url: cancelUrl,
    returnUrl,
    cancelUrl,
    order_lines: input.orderLines && input.orderLines.length > 0 ? input.orderLines : [
      {
        key: 'onramp',
        title: input.description || `Buy ${input.token || ''}`,
        quantity: 1,
        unit_price: amountDecimal,
        amount: amountDecimal,
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${Payment_api_key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create order failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // eslint-disable-next-line no-console
  console.debug('createWhateeOrder response:', data);
  const orderId = data?.id || data?.orderId || data?.data?.id || data?.data?.orderId || data?.reference || '';
  let checkoutUrl =
    data?.checkoutUrl ||
    data?.checkout_url ||
    data?.payment?.url ||
    data?.payment?.checkoutUrl ||
    data?.payment?.checkout_url ||
    data?.payment?.session?.url ||
    data?.payment?.session_url ||
    data?.payment?.stripe?.url ||
    data?.payment?.stripe?.checkoutUrl ||
    data?.payment?.stripe?.checkout_url ||
    data?.data?.checkoutUrl ||
    data?.data?.checkout_url ||
    data?.data?.payment?.url ||
    data?.data?.payment?.session?.url ||
    data?.links?.checkout ||
    data?.links?.payment ||
    data?.links?.redirect ||
    data?.hosted_url ||
    data?.hosted?.url ||
    data?.url || '';

  if (!checkoutUrl) {
    // Prefer arrays of URLs if provided, especially index 1 or 2 → often stripe direct
    const preferFromArray = (arr: unknown): string | undefined => {
      if (!Array.isArray(arr)) return undefined;
      const urls = arr.filter((v) => typeof v === 'string' && String(v).startsWith('http')) as string[];
      // Prefer ones containing stripe/checkout
      const prioritized = urls.filter((u) => /stripe|checkout|hosted|pay/i.test(u));
      if (prioritized[1]) return prioritized[1];
      if (prioritized[2]) return prioritized[2];
      return prioritized[0] || urls[1] || urls[2] || urls[0];
    };
    checkoutUrl =
      preferFromArray((data as any)?.urls) ||
      preferFromArray((data as any)?.links) ||
      preferFromArray((data as any)?.payment?.urls) ||
      preferFromArray((data as any)?.data?.urls) ||
      '';

    if (!checkoutUrl) {
      // Deep scan for any http URLs; then choose 2nd/3rd candidate when available
      const candidates: string[] = [];
      const walk = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'string') {
          if (obj.startsWith('http')) candidates.push(obj);
          return;
        }
        if (Array.isArray(obj)) {
          obj.forEach(walk);
          return;
        }
        if (typeof obj === 'object') {
          Object.values(obj).forEach(walk);
        }
      };
      walk(data);
      const filtered = candidates.filter((u) => /stripe|checkout|hosted|pay|whatee|onecheckout/i.test(u));
      checkoutUrl = filtered[1] || filtered[2] || filtered[0] || candidates[1] || candidates[2] || candidates[0] || '';
    }
  }
  return { orderId, checkoutUrl, status: data?.status };
}


