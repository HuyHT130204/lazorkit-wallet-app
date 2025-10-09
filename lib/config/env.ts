// Environment configuration for testing
export const ENV_CONFIG = {
  // Set to true to enable demo mode (mock data + wallet functionality)
  // Set to false for new user experience (no mock data, no wallet)
  ENABLE_DEMO: process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true',
} as const;
