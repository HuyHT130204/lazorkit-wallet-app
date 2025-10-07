'use client';

import { useState } from 'react';
import { Send, Clipboard, QrCode, ArrowRight, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SimpleSelect } from './ui/simple-select';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, defaultConnection } from '@/lib/services/jupiter';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { formatTokenAmount } from '@/lib/utils/format';
import { isValidSolanaAddress } from '@/lib/utils/address';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface SendModalViewportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendModalViewport = ({ open, onOpenChange }: SendModalViewportProps) => {
  const { tokens, pubkey, addActivity } = useWalletStore();
  const lz = useWallet() as any;
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
    if (!pubkey) {
      toast({ title: t('common.error'), description: t('send.noWallet'), variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const ownerPk = new PublicKey(pubkey);
      const recipientPk = new PublicKey(recipient);

      if (!lz?.signAndSendTransaction) throw new Error('signAndSendTransaction not available');

      let sig: string;
      if (selectedToken === 'SOL') {
        const lamports = Math.round(amountNum * 1e9);
        const transferIx = SystemProgram.transfer({ fromPubkey: ownerPk, toPubkey: recipientPk, lamports });
        sig = await lz.signAndSendTransaction([transferIx]);
      } else {
        const mintStr = (TOKEN_ADDRESSES as Record<string, string>)[selectedToken];
        if (!mintStr) throw new Error('Unknown token mint');
        const decimals = TOKEN_DECIMALS[selectedToken as keyof typeof TOKEN_DECIMALS] ?? 6;
        const rawAmount = Math.round(amountNum * Math.pow(10, decimals));
        const mintPk = new PublicKey(mintStr);

        const fromAta = await (splToken as any).getAssociatedTokenAddress(mintPk, ownerPk, true);
        let toAta;
        try {
          toAta = await (splToken as any).getAssociatedTokenAddress(mintPk, recipientPk, false);
        } catch (err: any) {
          if (err?.name === 'TokenOwnerOffCurveError' || /OffCurve/i.test(String(err?.message))) {
            toAta = await (splToken as any).getAssociatedTokenAddress(mintPk, recipientPk, true);
          } else {
            throw err;
          }
        }

        const toAtaInfo = await defaultConnection.getAccountInfo(toAta);
        if (!toAtaInfo) {
          // Split into two smaller transactions to avoid size limits
          const createAtaIx = (splToken as any).createAssociatedTokenAccountInstruction(
            ownerPk,
            toAta,
            recipientPk,
            mintPk
          );
          await lz.signAndSendTransaction([createAtaIx]);
        }

        const transferIx = typeof (splToken as any).createTransferInstruction === 'function'
          ? (splToken as any).createTransferInstruction(fromAta, toAta, ownerPk, rawAmount)
          : (splToken as any).createTransferCheckedInstruction(fromAta, mintPk, toAta, ownerPk, rawAmount, decimals);

        sig = await lz.signAndSendTransaction([transferIx]);
      }

      addActivity?.({
        id: Date.now().toString(),
        kind: 'send',
        ts: new Date().toISOString(),
        summary: `Sent ${amountNum} ${selectedToken} to ${recipient.slice(0, 4)}...${recipient.slice(-4)}`,
        amount: amountNum,
        token: selectedToken,
        counterparty: recipient,
        status: 'Success',
        tx: sig,
      } as any);

      toast({
        title: t('send.transactionSent'),
        description: `${amountNum} ${selectedToken} ${t('send.sentSuccessfully')}`,
      });

      setRecipient('');
      setAmount('');
      setError('');
      onOpenChange(false);
    } catch (e: any) {
      console.error('Send failed:', e);
      toast({ title: t('common.error'), description: e?.message || 'Send failed', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
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
      className="max-w-md"
    >
      <div className="p-4 space-y-4">
        {/* Token Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('send.selectToken')}
          </Label>
          <SimpleSelect
            value={selectedToken}
            onValueChange={(value: string) => setSelectedToken(value as TokenSym)}
            options={tokenOptions}
            placeholder={t('send.selectToken')}
            className="h-10"
          />
          {selectedTokenData && (
            <div className="p-2 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
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
        <div className="space-y-2">
          <Label className="text-sm font-medium">
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
                className={`flex-1 h-10 ${error ? 'border-destructive' : ''}`}
              />
              <Button variant="outline" size="sm" onClick={handlePaste} title={t('send.paste')} className="h-10 w-10 p-0">
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled title={t('send.scanQR')} className="h-10 w-10 p-0">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <span className="w-1 h-1 bg-destructive rounded-full"></span>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
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
              className={`flex-1 h-10 ${error ? 'border-destructive' : ''}`}
            />
            <Button variant="outline" onClick={handleMaxClick} className="h-10 px-3">
              {t('common.max')}
            </Button>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('send.transactionDetails')}
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">
                {t('send.estimatedFee')}
              </span>
              <span className="text-xs font-medium">0.000005 SOL</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">
                {t('send.totalAmount')}
              </span>
              <span className="text-xs font-medium">
                {amountNum > 0 ? `${amountNum} ${selectedToken}` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSend}
            className="flex-1 h-10"
            disabled={isProcessing || !!error}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span className="text-sm">{t('send.sending')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{t('send.confirm')}</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </ViewportModal>
  );
};
