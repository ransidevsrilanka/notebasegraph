import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertCircle } from 'lucide-react';

interface OTPVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (code: string) => Promise<void>;
  title: string;
  description: string;
  actionLabel: string;
  isLoading?: boolean;
  variant?: 'default' | 'destructive';
}

export const OTPVerificationDialog = ({
  open,
  onOpenChange,
  onVerify,
  title,
  description,
  actionLabel,
  isLoading = false,
  variant = 'default',
}: OTPVerificationDialogProps) => {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (otpCode.length < 6) {
      setError('Please enter the complete verification code');
      return;
    }

    setError(null);
    try {
      await onVerify(otpCode);
      setOtpCode('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleClose = () => {
    setOtpCode('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-xs">
                2FA Verification Required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isLoading}
              className="otp-password-mask"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="[&>*]:text-security-disc" />
                <InputOTPSlot index={1} className="[&>*]:text-security-disc" />
                <InputOTPSlot index={2} className="[&>*]:text-security-disc" />
                <InputOTPSlot index={3} className="[&>*]:text-security-disc" />
                <InputOTPSlot index={4} className="[&>*]:text-security-disc" />
                <InputOTPSlot index={5} className="[&>*]:text-security-disc" />
              </InputOTPGroup>
            </InputOTP>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={handleVerify}
            disabled={isLoading || otpCode.length < 6}
            className={variant === 'default' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {isLoading ? 'Verifying...' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
