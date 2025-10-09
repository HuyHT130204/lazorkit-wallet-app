'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { copyToClipboard } from '@/lib/utils/copy';

interface CopyButtonProps {
  text: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const CopyButton = ({
  text,
  variant = 'outline',
  size = 'sm',
  className,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
    </Button>
  );
};
