export const isValidSolanaAddress = (address: string): boolean => {
  // Basic Solana address validation (44 characters, base58)
  if (!address || typeof address !== 'string') return false;

  // Solana addresses are typically 32-44 characters
  if (address.length < 32 || address.length > 44) return false;

  // Check if it contains only valid base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
};

export const truncateAddress = (
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string => {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const formatAddress = (
  address: string,
  type: 'short' | 'medium' | 'long' = 'short'
): string => {
  switch (type) {
    case 'short':
      return truncateAddress(address, 4, 4);
    case 'medium':
      return truncateAddress(address, 8, 8);
    case 'long':
      return truncateAddress(address, 12, 12);
    default:
      return truncateAddress(address, 4, 4);
  }
};

export const generateDemoAddress = (): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
