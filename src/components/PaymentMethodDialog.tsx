import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, Loader2, X, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string;
  tierName: string;
  amount: number;
  originalAmount?: number;
  // UNIFIED: Single creator code for both referral attribution AND discount
  creatorCode?: string;
  userEmail?: string;
  userName?: string;
  enrollmentId?: string;
  isNewUser?: boolean;
  isUpgrade?: boolean; // When true, skip the "already enrolled" check
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
  creatorCode,
  userEmail,
  userName,
  enrollmentId,
  isNewUser = false,
  isUpgrade = false,
  onBankTransfer,
}: PaymentMethodDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { enrollment } = useAuth();

  // Check if user already has an active enrollment
  // Skip this check if we're in upgrade mode (user NEEDS enrollment to upgrade)
  const hasActiveEnrollment = !isUpgrade && !!enrollment && enrollment.is_active;

  // Defensive rendering: avoid runtime crashes that would leave only the overlay visible
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeTierName = tierName || "Selected tier";

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
    // Keep dialog open to show loading state
    setIsLoading(true);
    const notifyPaymentFailure = async (reason: string) => {
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            type: 'payhere_popup_failed',
            message: `PayHere payment failed to initiate`,
            data: {
              user: userEmail || 'Unknown',
              tier: tierName,
              amount: amount,
              reason: reason,
            }
          }
        });
      } catch (e) {
        console.error('Failed to send Telegram notification:', e);
      }
    };

    try {
      try {
        await loadPayHereScript();
      } catch (loadError) {
        console.log('First PayHere load attempt failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await loadPayHereScript();
        } catch (retryError) {
          await notifyPaymentFailure('PayHere SDK failed to load after retry');
          toast.error("Payment system unavailable. Please refresh the page and try again.");
          setIsLoading(false);
          return;
        }
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const nameParts = (userName || "Customer").split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "User";

      // UNIFIED: Get creator code from prop or localStorage
      const effectiveCreatorCode = creatorCode || localStorage.getItem('refCreator') || undefined;

      // Get hash from edge function
      // UNIFIED: Pass creatorCode as both ref_creator (for attribution) and discount_code (legacy compatibility)
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
            // UNIFIED: Single identity for both referral and discount
            ref_creator: effectiveCreatorCode,
            discount_code: effectiveCreatorCode, // Legacy compatibility
          },
        }
      );

      if (error) {
        await notifyPaymentFailure(`Hash generation failed: ${error.message}`);
        throw error;
      }

      const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payhere-checkout/notify`;
      const returnUrl = isNewUser 
        ? `${window.location.origin}/paid-signup`
        : `${window.location.origin}/dashboard?payment=success`;
      const cancelUrl = `${window.location.origin}/pricing?payment=cancelled`;

      window.payhere.onCompleted = (completedOrderId: string) => {
        console.log("PayHere popup closed. OrderID:", completedOrderId);
        
        if (isNewUser) {
          localStorage.setItem('pending_payment', JSON.stringify({
            tier,
            amount,
            originalAmount: originalAmount || amount,
            orderId: completedOrderId,
            timestamp: Date.now(),
            refCreator: effectiveCreatorCode || undefined,
            status: 'pending',
          }));
          
          toast.info("Processing payment... Please wait while we verify.");
          navigate('/paid-signup');
        } else {
          // UPGRADE FLOW: Store pending payment for dashboard to finalize
          localStorage.setItem('pending_upgrade_payment', JSON.stringify({
            orderId: completedOrderId,
            enrollmentId: enrollmentId,
            tier,
            amount,
            originalAmount: originalAmount || amount,
            refCreator: effectiveCreatorCode || undefined,
            timestamp: Date.now(),
          }));
          toast.info("Processing payment... Please wait while we verify.");
          window.location.href = `${returnUrl}&orderId=${completedOrderId}`;
        }
      };

      window.payhere.onDismissed = () => {
        console.log("Payment dismissed by user");
        toast.info("Payment cancelled");
        setIsLoading(false);
        onOpenChange(false);
      };

      window.payhere.onError = async (error: string) => {
        console.error("PayHere SDK error:", error);
        await notifyPaymentFailure(`PayHere SDK error: ${error}`);
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
      
      // Close dialog after PayHere popup opens
      setTimeout(() => {
        setIsLoading(false);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error("Card payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleBankTransfer = () => {
    onOpenChange(false);
    onBankTransfer();
  };

  // Ensure loading state doesn't persist if parent closes the dialog
  useEffect(() => {
    if (!open) setIsLoading(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => {
          if (!isLoading) onOpenChange(false);
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose payment method"
        className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
      >
        {/* Close */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => {
            if (!isLoading) onOpenChange(false);
          }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center z-50 rounded-lg">
            <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
            <p className="text-foreground font-medium">Connecting to PayHere...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait, payment gateway loading
            </p>
          </div>
        )}

        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="font-display text-xl font-semibold leading-none tracking-tight">
            {hasActiveEnrollment ? "You're Already Enrolled!" : "Choose Payment Method"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasActiveEnrollment ? (
              `You have an active subscription. Visit your dashboard to continue learning.`
            ) : (
              <>
                Select how you'd like to pay for{" "}
                <span className="font-semibold text-foreground">{safeTierName}</span> -
                Rs. {safeAmount.toLocaleString()}
              </>
            )}
          </p>
        </div>

        {hasActiveEnrollment ? (
          <div className="py-6 flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate('/dashboard');
              }}
              variant="brand"
              className="w-full"
            >
              Back to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 py-4">
              <Button
                onClick={handleCardPayment}
                disabled={isLoading}
                className="h-auto py-3 sm:py-4 px-3 sm:px-6 justify-start gap-3 sm:gap-4 flex-row items-center"
                variant="outline"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand/10 flex-shrink-0 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Card Payment</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    Pay with Visa, Mastercard, or Amex
                  </p>
                </div>
              </Button>

              <Button
                onClick={handleBankTransfer}
                disabled={isLoading}
                className="h-auto py-3 sm:py-4 px-3 sm:px-6 justify-start gap-3 sm:gap-4 flex-row items-center"
                variant="outline"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Bank Transfer</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    Manual transfer with receipt
                  </p>
                </div>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Card payments are processed securely via PayHere
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodDialog;
