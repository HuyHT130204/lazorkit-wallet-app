export const Payment_js_src = process.env.NEXT_PUBLIC_WHATEE_JS_SRC || 'https://checkout.sandbox.whatee.store/sdk.js';
export const Payment_merchant_id = process.env.NEXT_PUBLIC_WHATEE_MERCHANT_ID || '';
export const Payment_api_url = process.env.NEXT_PUBLIC_WHATEE_API_URL || 'https://onecheckout.sandbox.whatee.io/api/v1.0/orders';
export const Payment_api_key = process.env.NEXT_PUBLIC_WHATEE_API_KEY || '';

export const Payment_return_url_success = process.env.NEXT_PUBLIC_WHATEE_RETURN_SUCCESS || '/callback/success';
export const Payment_return_url_failed = process.env.NEXT_PUBLIC_WHATEE_RETURN_FAILED || '/callback/failed';


