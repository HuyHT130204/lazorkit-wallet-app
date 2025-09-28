'use client';

import { useState } from 'react';
import { Send, Clipboard, QrCode, ArrowRight, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SimpleSelect } from './ui/simple-select';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { formatTokenAmount } from '@/lib/utils/format';
import { isValidSolanaAddress } from '@/lib/utils/address';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface SendModalViewportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendModalViewport = ({ open, onOpenChange }: SendModalViewportProps) => {
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
      setError(t('send.enterRecipient'));
      return false;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError(t('send.invalidAddress'));
      return false;
    }

    if (!amount || amountNum <= 0) {
      setError(t('send.enterAmount'));
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
      title: t('send.transactionSent'),
      description: `${amountNum} ${selectedToken} ${t('send.sentSuccessfully')}`,
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
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API not available');
      }
      
      const text = await navigator.clipboard.readText();
      
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid clipboard content');
      }
      
      setRecipient(text);
      setError('');
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      toast({
        title: t('common.error'),
        description: t('send.pasteFailed'),
        variant: 'destructive',
      });
    }
  };

  const availableTokens = tokens.filter((t) => t.amount > 0);

  const tokenOptions = availableTokens.map((token) => ({
    value: token.symbol,
    label: `${token.symbol} - ${formatTokenAmount(token.amount, token.symbol)}`,
  }));

  return (
    <ViewportModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('send.title')}
      className="max-w-lg"
    >
      <div className="p-6 space-y-6">
        {/* Token Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('send.selectToken')}
          </Label>
          <SimpleSelect
            value={selectedToken}
            onValueChange={(value: TokenSym) => setSelectedToken(value)}
            options={tokenOptions}
            placeholder={t('send.selectToken')}
          />
          {selectedTokenData && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t('send.availableBalance')}
                </span>
                <span className="font-medium">
                  {formatTokenAmount(selectedTokenData.amount, selectedTokenData.symbol)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recipient Address */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            {t('send.recipient')}
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('send.enterAddress')}
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setError('');
                }}
                className={`flex-1 ${error ? 'border-destructive' : ''}`}
              />
              <Button variant="outline" size="sm" onClick={handlePaste} title={t('send.paste')}>
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled title={t('send.scanQR')}>
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span className="w-1 h-1 bg-destructive rounded-full"></span>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            {t('send.enterAmount')}
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              className={`flex-1 ${error ? 'border-destructive' : ''}`}
            />
            <Button variant="outline" onClick={handleMaxClick}>
              {t('common.max')}
            </Button>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('send.transactionDetails')}
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('send.estimatedFee')}
              </span>
              <span className="text-sm font-medium">0.000005 SOL</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('send.totalAmount')}
              </span>
              <span className="text-sm font-medium">
                {amountNum > 0 ? `${amountNum} ${selectedToken}` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSend}
            className="flex-1 h-12"
            disabled={isProcessing || !!error}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{t('send.sending')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{t('send.confirm')}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </ViewportModal>
  );
};
