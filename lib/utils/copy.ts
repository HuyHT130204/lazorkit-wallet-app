import { toast } from '@/hooks/use-toast';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }

    toast({
      title: 'Copied!',
      description: 'Text copied to clipboard',
    });

    return true;
  } catch (error) {
    console.error('Failed to copy text: ', error);
    toast({
      title: 'Error',
      description: 'Failed to copy to clipboard',
      variant: 'destructive',
    });
    return false;
  }
};

export const copyAddress = async (address: string): Promise<boolean> => {
  return copyToClipboard(address);
};

export const copyPublicKey = async (pubkey: string): Promise<boolean> => {
  return copyToClipboard(pubkey);
};
