import { useEffect, useState } from "react";
import { Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/contexts/AuthContext";
import PaymentMethodDialog from "@/components/PaymentMethodDialog";
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

const defaultTiers: TierDisplay[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: 1500,
    period: 'year',
    description: 'Core access',
    features: ['Access to core subjects', 'PDF notes', 'Basic support'],
    highlighted: false,
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 2500,
    period: 'year',
    description: 'Full access',
    features: ['All Starter features', 'Past papers', 'Priority support', 'All subjects'],
    highlighted: true,
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: 5000,
    period: 'lifetime',
    description: 'Permanent access',
    features: ['All Standard features', 'Lifetime access', 'Future updates', 'Premium support'],
    highlighted: false,
  },
];

const CREATOR_DISCOUNT_PERCENT = 10;

const PricingRedesign = () => {
  const [tiers, setTiers] = useState<TierDisplay[]>(defaultTiers);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { branding } = useBranding();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [dialogTier, setDialogTier] = useState<TierDisplay | null>(null);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedCreatorCode, setAppliedCreatorCode] = useState<{ code: string; creatorName: string } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  const refCreatorFromUrl = searchParams.get("ref_creator") || "";

  useEffect(() => {
    fetchPricing();
    const storedCode = localStorage.getItem('refCreator');
    const codeToValidate = refCreatorFromUrl || storedCode;
    if (codeToValidate) {
      validateCreatorCode(codeToValidate, true);
    }
  }, [refCreatorFromUrl]);

  const validateCreatorCode = async (code: string, isAutoApply: boolean = false) => {
    if (!code.trim()) return;
    const normalizedCode = code.trim();
    setIsValidatingCode(true);
    
    try {
      const { data, error } = await supabase.rpc('resolve_referral_code', {
        p_code: normalizedCode
      });

      if (error) {
        if (!isAutoApply) toast.error("Failed to validate discount code");
        setAppliedCreatorCode(null);
        return;
      }

      if (!data || data.length === 0) {
        if (!isAutoApply) toast.error("Invalid discount code");
        setAppliedCreatorCode(null);
        return;
      }

      const result = data[0];
      setDiscountCodeInput(result.referral_code);
      setAppliedCreatorCode({ 
        code: result.referral_code, 
        creatorName: result.creator_name || 'Creator'
      });
      localStorage.setItem('refCreator', result.referral_code);
      toast.success(`${result.creator_name}'s ${CREATOR_DISCOUNT_PERCENT}% discount applied!`);
    } catch (err) {
      if (!isAutoApply) toast.error("Failed to validate discount code");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const fetchPricing = async () => {
    setLoadingError(null);
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle();

    if (error) {
      setLoadingError(`Database error: ${error.message}`);
      return;
    }

    if (!data) {
      setLoadingError('Pricing not configured.');
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

  const handleApplyDiscount = () => validateCreatorCode(discountCodeInput);
  const handleRemoveDiscount = () => {
    setAppliedCreatorCode(null);
    setDiscountCodeInput("");
    localStorage.removeItem('refCreator');
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedCreatorCode) return price;
    return Math.round(price * (1 - CREATOR_DISCOUNT_PERCENT / 100));
  };

  const handleGetTier = (tier: TierDisplay) => setDialogTier(tier);

  const handleBankTransfer = () => {
    const tier = dialogTier;
    if (!tier) return;
    
    localStorage.setItem('bank_transfer_pending', JSON.stringify({
      tier: tier.key,
      tierName: tier.name,
      amount: getDiscountedPrice(tier.price),
      originalAmount: tier.price,
      creatorCode: appliedCreatorCode?.code || null,
      timestamp: Date.now(),
    }));
    
    setDialogTier(null);
    navigate('/bank-signup');
  };

  if (loadingError) {
    return (
      <section className="py-32 bg-background">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm">{loadingError}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-32 md:py-40 bg-background border-t border-border/30">
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center font-accent">
            Choose your access
          </p>

          {/* Filter Statement */}
          <div className="max-w-xl mx-auto text-center mb-16">
            <p className="text-muted-foreground text-sm italic">
              This is for students who are done wasting time.
              <br />
              If you're looking for free shortcuts, this isn't for you.
            </p>
          </div>

          {/* Discount Code */}
          <div className="max-w-sm mx-auto mb-16">
            {appliedCreatorCode ? (
              <div className="flex items-center justify-center gap-3 py-3 border-b border-border/30">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  <span className="font-medium">{appliedCreatorCode.code}</span> — {CREATOR_DISCOUNT_PERCENT}% off
                </span>
                <button onClick={handleRemoveDiscount} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Input
                  placeholder="Discount code"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                  className="text-center bg-transparent border-border/30 h-12"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyDiscount}
                  disabled={isValidatingCode || !discountCodeInput.trim()}
                  className="h-12 px-6 border-border/30"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div 
                key={tier.key}
                className={`bg-background p-8 md:p-10 flex flex-col ${
                  tier.highlighted ? "ring-1 ring-foreground/20" : ""
                }`}
              >
                <div className="mb-8">
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-muted-foreground text-xs mb-4">{tier.description}</p>
                  
                  <div className="flex items-baseline gap-1">
                    {appliedCreatorCode ? (
                      <>
                        <span className="text-muted-foreground line-through text-lg">
                          Rs. {tier.price.toLocaleString()}
                        </span>
                        <span className="font-display text-3xl font-bold text-foreground ml-2">
                          Rs. {getDiscountedPrice(tier.price).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="font-display text-3xl font-bold text-foreground">
                        Rs. {tier.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">/{tier.period}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={tier.highlighted ? "default" : "outline"}
                  className={`w-full h-12 font-medium ${
                    tier.highlighted 
                      ? "bg-foreground text-background hover:bg-foreground/90" 
                      : "border-border/30 hover:bg-foreground hover:text-background"
                  }`}
                  onClick={() => handleGetTier(tier)}
                >
                  Get {tier.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Post-pricing note */}
          <p className="text-center text-muted-foreground text-xs mt-12">
            One purchase. No subscriptions. No renewals.
          </p>
        </div>
      </section>

      {dialogTier && (
        <PaymentMethodDialog
          key={dialogTier.key}
          open={!!dialogTier}
          onOpenChange={(open) => { if (!open) setDialogTier(null); }}
          tier={dialogTier.key}
          tierName={dialogTier.name}
          amount={getDiscountedPrice(dialogTier.price)}
          originalAmount={dialogTier.price}
          creatorCode={appliedCreatorCode?.code}
          userEmail={user?.email}
          userName={profile?.full_name || user?.email?.split("@")[0]}
          isNewUser={!user}
          onBankTransfer={handleBankTransfer}
        />
      )}
    </>
  );
};

export default PricingRedesign;
