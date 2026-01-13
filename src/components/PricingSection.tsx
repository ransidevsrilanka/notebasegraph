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

// Default pricing to show immediately while fetching
const defaultTiers: TierDisplay[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: 1500,
    period: 'year',
    description: 'Perfect for getting started',
    features: ['Access to core subjects', 'PDF notes', 'Basic support'],
    highlighted: false,
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 2500,
    period: 'year',
    description: 'Most popular choice',
    features: ['All Starter features', 'Past papers', 'Priority support', 'All subjects'],
    highlighted: true,
  },
  {
    key: 'lifetime',
    name: 'Lifetime',
    price: 5000,
    period: 'lifetime',
    description: 'One-time purchase',
    features: ['All Standard features', 'Lifetime access', 'Future updates', 'Premium support'],
    highlighted: false,
  },
];

// Fixed discount percentage for all creator codes
const CREATOR_DISCOUNT_PERCENT = 10;

const PricingSection = () => {
  const [tiers, setTiers] = useState<TierDisplay[]>(defaultTiers);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { branding } = useBranding();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierDisplay | null>(null);
  
  // Discount code state - UNIFIED: creator code = discount code
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedCreatorCode, setAppliedCreatorCode] = useState<{ code: string; creatorName: string } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Get ref_creator from URL (unified identity)
  const refCreatorFromUrl = searchParams.get("ref_creator") || "";

  useEffect(() => {
    fetchPricing();
    
    // Auto-apply creator code from URL
    const storedCode = localStorage.getItem('refCreator');
    const codeToValidate = refCreatorFromUrl || storedCode;
    
    if (codeToValidate) {
      validateCreatorCode(codeToValidate, true);
    }
  }, [refCreatorFromUrl]);

  /**
   * UNIFIED VALIDATION: Validates a code against creator_profiles.referral_code
   * This is the SINGLE SOURCE of truth for discount/referral codes
   */
  const validateCreatorCode = async (code: string, isAutoApply: boolean = false) => {
    if (!code.trim()) return;
    
    const normalizedCode = code.toUpperCase().trim();
    setIsValidatingCode(true);
    
    try {
      // Validate against creator_profiles.referral_code (the single source of truth)
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('id, referral_code, display_name')
        .eq('referral_code', normalizedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        // Fallback: check legacy discount_codes table
        const { data: legacyCode, error: legacyError } = await supabase
          .from('discount_codes')
          .select('code, creator_id')
          .eq('code', normalizedCode)
          .eq('is_active', true)
          .maybeSingle();
        
        if (legacyError || !legacyCode) {
          if (!isAutoApply) {
            toast.error("Invalid discount code");
          }
          setAppliedCreatorCode(null);
          return;
        }
        
        // Get creator info from legacy code
        if (legacyCode.creator_id) {
          const { data: creatorData } = await supabase
            .from('creator_profiles')
            .select('referral_code, display_name')
            .eq('id', legacyCode.creator_id)
            .maybeSingle();
          
          if (creatorData) {
            // Use the creator's referral_code as the unified identity
            const creatorCode = creatorData.referral_code;
            setDiscountCodeInput(creatorCode);
            setAppliedCreatorCode({ 
              code: creatorCode, 
              creatorName: creatorData.display_name || 'Creator'
            });
            localStorage.setItem('refCreator', creatorCode);
            toast.success(`${creatorData.display_name}'s ${CREATOR_DISCOUNT_PERCENT}% discount applied!`);
            return;
          }
        }
        
        if (!isAutoApply) {
          toast.error("Invalid discount code");
        }
        setAppliedCreatorCode(null);
        return;
      }

      // Success: Apply the creator's referral code
      setDiscountCodeInput(data.referral_code);
      setAppliedCreatorCode({ 
        code: data.referral_code, 
        creatorName: data.display_name || 'Creator'
      });
      localStorage.setItem('refCreator', data.referral_code);
      
      if (!isAutoApply) {
        toast.success(`${data.display_name}'s ${CREATOR_DISCOUNT_PERCENT}% discount applied!`);
      } else {
        toast.success(`${data.display_name}'s ${CREATOR_DISCOUNT_PERCENT}% discount applied!`);
      }
    } catch (err) {
      console.error("Error validating creator code:", err);
      if (!isAutoApply) {
        toast.error("Failed to validate discount code");
      }
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
      console.error('Failed to load pricing:', error);
      setLoadingError(`Database error: ${error.message}`);
      return;
    }

    if (!data) {
      console.error('No pricing data found in site_settings');
      setLoadingError('Pricing not configured. Please add pricing data in admin settings.');
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

  const handleApplyDiscount = () => {
    validateCreatorCode(discountCodeInput);
  };

  const handleRemoveDiscount = () => {
    setAppliedCreatorCode(null);
    setDiscountCodeInput("");
    localStorage.removeItem('refCreator');
  };

  const getDiscountedPrice = (price: number) => {
    if (!appliedCreatorCode) return price;
    return Math.round(price * (1 - CREATOR_DISCOUNT_PERCENT / 100));
  };

  const handleGetTier = (tier: TierDisplay) => {
    setSelectedTier(tier);
    setPaymentDialogOpen(true);
  };

  const handleBankTransfer = () => {
    const tier = selectedTier;
    if (!tier) return;
    
    // Store payment info with UNIFIED creator code
    localStorage.setItem('bank_transfer_pending', JSON.stringify({
      tier: tier.key,
      tierName: tier.name,
      amount: getDiscountedPrice(tier.price),
      originalAmount: tier.price,
      // UNIFIED: Use creator code as both ref_creator and discount_code
      creatorCode: appliedCreatorCode?.code || null,
      timestamp: Date.now(),
    }));
    
    setPaymentDialogOpen(false);
    navigate('/bank-signup');
  };

  if (loadingError) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-lg max-w-md mx-auto">
            <p className="text-destructive font-medium">Failed to load pricing</p>
            <p className="text-muted-foreground text-sm mt-2">{loadingError}</p>
          </div>
        </div>
      </section>
    );
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
            {appliedCreatorCode ? (
              <div className="flex items-center justify-center gap-2 p-3 bg-brand/10 border border-brand/30 rounded-lg">
                <Tag className="w-4 h-4 text-brand" />
                <span className="text-sm text-foreground">
                  Code <span className="font-semibold">{appliedCreatorCode.code}</span> applied - {CREATOR_DISCOUNT_PERCENT}% off!
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
                    {appliedCreatorCode ? (
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
          // UNIFIED: Pass creator code as single identity
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

export default PricingSection;
