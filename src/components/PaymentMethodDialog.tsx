import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string;
  tierName: string;
  amount: number;
  originalAmount?: number; // Original price before discount
  discountCode?: string; // Applied discount code
  refCreator?: string; // Referral creator code from URL
  userEmail?: string;
  userName?: string;
  enrollmentId?: string; // For upgrades
  isNewUser?: boolean; // For non-logged-in users buying from pricing page
  onBankTransfer: () => void;
}

declare global {
  interface Window {
    payhere: {
      startPayment: (payment: PayHerePayment) => void;
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
    };
  }
}

interface PayHerePayment {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1: string;
  custom_2: string;
}

const PaymentMethodDialog = ({
  open,
  onOpenChange,
  tier,
  tierName,
  amount,
  originalAmount,
  discountCode,
  refCreator,
  userEmail,
  userName,
  enrollmentId,
  isNewUser = false,
  onBankTransfer,
}: PaymentMethodDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loadPayHereScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.payhere) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.payhere.lk/lib/payhere.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PayHere SDK"));
      document.body.appendChild(script);
    });
  };

  const handleCardPayment = async () => {
    setIsLoading(true);

    try {
      await loadPayHereScript();

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const nameParts = (userName || "Customer").split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "User";

      // Get hash from edge function
      const { data, error } = await supabase.functions.invoke(
        "payhere-checkout/generate-hash",
        {
          body: {
            order_id: orderId,
            items: `${tierName} Access`,
            amount: amount,
            currency: "LKR",
            first_name: firstName,
            last_name: lastName,
            email: userEmail || "customer@example.com",
            phone: "0000000000",
            address: "Sri Lanka",
            city: "Colombo",
            country: "Sri Lanka",
            custom_1: tier,
            custom_2: enrollmentId || "new",
          },
        }
      );

      if (error) throw error;

      const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payhere-checkout/notify`;
      const returnUrl = isNewUser 
        ? `${window.location.origin}/paid-signup`
        : `${window.location.origin}/dashboard?payment=success`;
      const cancelUrl = `${window.location.origin}/pricing?payment=cancelled`;

      // Setup PayHere callbacks
      window.payhere.onCompleted = (completedOrderId: string) => {
        console.log("Payment completed. OrderID:", completedOrderId);
        
        if (isNewUser) {
          // Store payment data for the signup flow including referral info
          localStorage.setItem('pending_payment', JSON.stringify({
            tier,
            amount,
            originalAmount: originalAmount || amount,
            orderId: completedOrderId,
            timestamp: Date.now(),
            refCreator: refCreator || undefined,
            discountCode: discountCode || undefined,
          }));
          toast.success("Payment successful! Complete your signup.");
          onOpenChange(false);
          navigate('/paid-signup');
        } else {
          toast.success("Payment successful! Your access has been activated.");
          onOpenChange(false);
          window.location.href = returnUrl;
        }
      };

      window.payhere.onDismissed = () => {
        console.log("Payment dismissed");
        toast.info("Payment cancelled");
        setIsLoading(false);
      };

      window.payhere.onError = (error: string) => {
        console.error("Payment error:", error);
        toast.error("Payment failed. Please try again.");
        setIsLoading(false);
      };

      const payment: PayHerePayment = {
        sandbox: data.sandbox || false,
        merchant_id: data.merchant_id,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        order_id: orderId,
        items: `${tierName} Access`,
        amount: amount.toFixed(2),
        currency: "LKR",
        hash: data.hash,
        first_name: firstName,
        last_name: lastName,
        email: userEmail,
        phone: "0000000000",
        address: "Sri Lanka",
        city: "Colombo",
        country: "Sri Lanka",
        custom_1: tier,
        custom_2: enrollmentId || "new",
      };

      window.payhere.startPayment(payment);
    } catch (error) {
      console.error("Card payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setIsLoading(false);
    }
  };

  const handleBankTransfer = () => {
    onOpenChange(false);
    onBankTransfer();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Choose Payment Method
          </DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for{" "}
            <span className="font-semibold text-foreground">{tierName}</span> -
            Rs. {amount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Button
            onClick={handleCardPayment}
            disabled={isLoading}
            className="h-auto py-4 px-6 justify-start gap-4"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-brand" />
              </div>
            )}
            <div className="text-left">
              <p className="font-semibold text-foreground">Card Payment</p>
              <p className="text-sm text-muted-foreground">
                Pay instantly with Visa, Mastercard, or Amex
              </p>
            </div>
          </Button>

          <Button
            onClick={handleBankTransfer}
            disabled={isLoading}
            className="h-auto py-4 px-6 justify-start gap-4"
            variant="outline"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Bank Transfer</p>
              <p className="text-sm text-muted-foreground">
                Manual transfer with receipt upload
              </p>
            </div>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Card payments are processed securely via PayHere
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;
