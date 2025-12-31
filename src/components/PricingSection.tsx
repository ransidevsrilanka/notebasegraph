import { useEffect, useState } from "react";
import { Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import PaymentMethodDialog from "./PaymentMethodDialog";
import { toast } from "sonner";

interface TierPricing {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

interface TierDisplay extends TierPricing {
  key: string;
  highlighted: boolean;
}

const PricingSection = () => {
  const [tiers, setTiers] = useState<TierDisplay[]>([]);
  const { branding } = useBranding();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierDisplay | null>(null);
  
  // Discount code state
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Referral params from URL
  const refCreator = searchParams.get("ref_creator") || "";
  const discountFromUrl = searchParams.get("discount_code") || "";

  useEffect(() => {
    fetchPricing();
    // Auto-apply discount code from URL
    if (discountFromUrl) {
      setDiscountCodeInput(discountFromUrl);
      validateDiscountCode(discountFromUrl);
    }
  }, [discountFromUrl]);

  const fetchPricing = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to load pricing:', error);
      return;
    }

    const pricing = data.value as unknown as Record<string, TierPricing>;
    const tierOrder = ['starter', 'standard', 'lifetime'];
    const displayTiers: TierDisplay[] = tierOrder.map((key) => ({
      key,
      ...pricing[key],
      features: pricing[key]?.features || [],
      highlighted: key === 'standard',
    }));
    setTiers(displayTiers);
  };

  const validateDiscountCode = async (code: string) => {
    if (!code.trim()) return;
    
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('code, discount_percent')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Invalid or expired discount code");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({ code: data.code, percent: data.discount_percent || 10 });
        toast.success(`Discount code applied! ${data.discount_percent || 10}% off`);
      }
    } catch (err) {
      console.error("Error validating discount code:", err);
      toast.error("Failed to validate discount code");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleApplyDiscount = () => {
    validateDiscountCode(discountCodeInput);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCodeInput("");
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedDiscount) return price;
    return Math.round(price * (1 - appliedDiscount.percent / 100));
  };

  const handleGetTier = (tier: TierDisplay) => {
    // Allow both logged-in and non-logged-in users to open payment dialog
    setSelectedTier(tier);
    setPaymentDialogOpen(true);
  };

  const handleBankTransfer = () => {
    // Redirect to access page for bank transfer flow
    navigate('/access');
  };

  if (tiers.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-20 bg-background relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Choose Your <span className="text-brand">Access Tier</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              One-time purchase. No subscriptions. Access your entire stream's curriculum.
            </p>
          </div>

          {/* Discount Code Input */}
          <div className="max-w-md mx-auto mb-8">
            {appliedDiscount ? (
              <div className="flex items-center justify-center gap-2 p-3 bg-brand/10 border border-brand/30 rounded-lg">
                <Tag className="w-4 h-4 text-brand" />
                <span className="text-sm text-foreground">
                  Code <span className="font-semibold">{appliedDiscount.code}</span> applied - {appliedDiscount.percent}% off!
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDiscount}
                  className="h-6 w-6 p-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Have a discount code?"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyDiscount}
                  disabled={isValidatingCode || !discountCodeInput.trim()}
                >
                  {isValidatingCode ? "..." : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div 
                key={tier.key}
                className={`relative rounded-xl p-6 transition-all ${
                  tier.highlighted 
                    ? "bg-brand/10 border-2 border-brand/50" 
                    : "glass-card"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand text-primary-foreground text-xs font-medium rounded-full">
                    Popular
                  </div>
                )}

                <div className="text-center mb-5">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    {appliedDiscount ? (
                      <>
                        <span className="font-display text-lg text-muted-foreground line-through">Rs. {tier.price.toLocaleString()}</span>
                        <span className="font-display text-3xl font-bold text-brand">Rs. {getDiscountedPrice(tier.price).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="font-display text-3xl font-bold text-brand">Rs. {tier.price.toLocaleString()}</span>
                    )}
                    <span className="text-muted-foreground text-xs">/{tier.period}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{tier.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-brand" />
                      </div>
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={tier.highlighted ? "brand" : "brand-outline"} 
                  className="w-full"
                  size="sm"
                  onClick={() => handleGetTier(tier)}
                >
                  Get {tier.name}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-muted-foreground text-xs mt-8">
            Purchase your access card and use the code to unlock your {branding.siteName}.
          </p>
        </div>
      </section>

      {selectedTier && (
        <PaymentMethodDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          tier={selectedTier.key}
          tierName={selectedTier.name}
          amount={getDiscountedPrice(selectedTier.price)}
          originalAmount={selectedTier.price}
          discountCode={appliedDiscount?.code}
          refCreator={refCreator}
          userEmail={user?.email}
          userName={profile?.full_name || user?.email?.split("@")[0]}
          isNewUser={!user}
          onBankTransfer={handleBankTransfer}
        />
      )}
    </>
  );
};

export default PricingSection;