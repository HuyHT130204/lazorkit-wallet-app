/**
 * Service to get wallet balances from backend instead of on-chain
 */

export interface BackendBalanceResponse {
  walletAddress: string;
  balances: Record<string, number>;
  totalOrders: number;
}

/**
 * Get wallet balance from backend API
 * @param walletAddress - The wallet address to get balance for
 * @returns Promise<BackendBalanceResponse>
 */
export async function getBackendBalance(walletAddress: string): Promise<BackendBalanceResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  
  try {
    // Encode wallet address to handle special characters
    const encodedWalletAddress = encodeURIComponent(walletAddress);
    const url = `${apiBaseUrl}/api/orders/balance/${encodedWalletAddress}`;
    
    console.log('🔍 Fetching backend balance from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend balance API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Backend balance response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching backend balance:', error);
    throw error;
  }
}
