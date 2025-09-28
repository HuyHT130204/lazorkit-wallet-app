'use client';

import { useState } from 'react';
import { Send, Clipboard, QrCode, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { SmoothModal } from './ui/smooth-modal';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatTokenAmount } from '@/lib/utils/format';
import { isValidSolanaAddress } from '@/lib/utils/address';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface SendModalSmoothProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendModalSmooth = ({ open, onOpenChange }: SendModalSmoothProps) => {
  const { tokens, sendFake } = useWalletStore();
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);
  const amountNum = parseFloat(amount) || 0;

  const validateForm = () => {
    if (!recipient.trim()) {
      setError('Please enter recipient address');
      return false;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError(t('send.invalidAddress'));
      return false;
    }

    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (!selectedTokenData || amountNum > selectedTokenData.amount) {
      setError(t('send.insufficientBalance'));
      return false;
    }

    setError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    sendFake(selectedToken, amountNum, recipient);
    console.log('send_confirm_success', {
      token: selectedToken,
      amount: amountNum,
      recipient,
    });

    toast({
      title: 'Transaction sent',
      description: `${amountNum} ${selectedToken} sent successfully`,
    });

    // Reset form
    setRecipient('');
    setAmount('');
    setError('');
    setIsProcessing(false);
    onOpenChange(false);
  };

  const handleMaxClick = () => {
    if (selectedTokenData) {
      setAmount(selectedTokenData.amount.toString());
      setError('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
      setError('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to paste from clipboard',
        variant: 'destructive',
      });
    }
  };

  const availableTokens = tokens.filter((t) => t.amount > 0);

  return (
    <SmoothModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('send.title')}
      className="sm:max-w-md"
    >
      <div className="p-6 space-y-6">
        {/* Token Selection */}
        <div className="space-y-2">
          <Label>{t('send.selectToken')}</Label>
          <Select
            value={selectedToken}
            onValueChange={(value: TokenSym) => setSelectedToken(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableTokens.map((token) => (
                <SelectItem key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTokenData && (
            <p className="text-sm text-muted-foreground">
              Balance:{' '}
              {formatTokenAmount(
                selectedTokenData.amount,
                selectedTokenData.symbol
              )}
            </p>
          )}
        </div>

        {/* Recipient Address */}
        <div className="space-y-2">
          <Label>{t('send.recipient')}</Label>
          <div className="flex space-x-2">
            <Input
              placeholder={t('send.enterAddress')}
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setError('');
              }}
              className={error ? 'border-destructive' : ''}
            />
            <Button variant="outline" size="sm" onClick={handlePaste}>
              <Clipboard className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label>{t('send.enterAmount')}</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              className={error ? 'border-destructive' : ''}
            />
            <Button variant="outline" size="sm" onClick={handleMaxClick}>
              {t('common.max')}
            </Button>
          </div>
        </div>

        {/* Estimated Fee */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('send.estimatedFee')}
            </span>
            <span>0.000005 SOL</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSend}
            className="flex-1"
            disabled={isProcessing || !!error}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>{t('send.confirm')}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </SmoothModal>
  );
};



