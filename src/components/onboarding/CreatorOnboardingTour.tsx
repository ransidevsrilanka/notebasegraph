import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Link as LinkIcon,
  DollarSign,
  Tag,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Award,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommissionTier {
  id: string;
  tier_level: number;
  tier_name: string;
  commission_rate: number;
  monthly_user_threshold: number;
}

interface CreatorOnboardingTourProps {
  referralCode: string;
  onComplete: () => void;
}

const CreatorOnboardingTour = ({ referralCode, onComplete }: CreatorOnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [minimumPayout, setMinimumPayout] = useState(10000);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Fetch commission tiers
    const { data: tiersData } = await supabase
      .from('commission_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    if (tiersData) {
      setCommissionTiers(tiersData);
    }

    // Fetch minimum payout
    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'minimum_payout_lkr')
      .maybeSingle();

    if (settingsData?.setting_value) {
      const value = typeof settingsData.setting_value === 'number' 
        ? settingsData.setting_value 
        : Number(settingsData.setting_value);
      setMinimumPayout(value);
    }

    setIsLoading(false);
  };

  const referralLink = `${window.location.origin}/signup?ref_creator=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const steps = [
    {
      title: 'Welcome to the Creator Program! 🎉',
      icon: Award,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Congratulations on becoming a creator! You're now part of our referral program where you can 
            earn commissions by bringing new students to the platform.
          </p>
          <div className="bg-brand/10 border border-brand/30 rounded-lg p-4">
            <p className="text-sm text-foreground">
              This quick tour will show you everything you need to know to start earning. It only takes 2 minutes!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'How Referrals Work',
      icon: Users,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When someone signs up using your unique referral link, they become <strong>permanently</strong> assigned to you.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-400">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Share your link</p>
                <p className="text-xs text-muted-foreground">Send your unique referral link to potential students</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-green-400">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">They sign up</p>
                <p className="text-xs text-muted-foreground">User creates an account through your link</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-brand">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">You earn commission</p>
                <p className="text-xs text-muted-foreground">When they purchase, you get a percentage</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Commission Tiers',
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The more users you bring <strong>each month</strong>, the higher your commission rate!
          </p>
          <div className="space-y-2">
            {commissionTiers.map((tier, idx) => (
              <div 
                key={tier.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  idx === 0 ? 'border-brand/50 bg-brand/5' : 'border-border bg-secondary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    idx === 0 ? 'bg-brand/20' : 
                    idx === 1 ? 'bg-blue-500/20' : 
                    idx === 2 ? 'bg-purple-500/20' : 'bg-green-500/20'
                  }`}>
                    <DollarSign className={`w-5 h-5 ${
                      idx === 0 ? 'text-brand' : 
                      idx === 1 ? 'text-blue-400' : 
                      idx === 2 ? 'text-purple-400' : 'text-green-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tier.tier_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.monthly_user_threshold === 0 
                        ? 'Starting tier' 
                        : `${tier.monthly_user_threshold}+ users/month`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{tier.commission_rate}%</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Commission rates are based on your monthly paid user conversions
          </p>
        </div>
      ),
    },
    {
      title: 'Your Referral Link',
      icon: LinkIcon,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is your unique referral link. Share it with students to track their signups!
          </p>
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-foreground bg-background rounded px-3 py-2 overflow-x-auto">
                {referralLink}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(referralLink)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              💡 <strong>Pro tip:</strong> You can also share your referral code: <strong>{referralCode}</strong>
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Discount Codes',
      icon: Tag,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            You also have discount codes that give students a special offer. When they use your code, the sale is attributed to you!
          </p>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Discount codes offer:</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                10% off for the student
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Commission for you on each sale
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Track usage & conversions
              </li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            You'll find your discount codes in your dashboard
          </p>
        </div>
      ),
    },
    {
      title: 'Withdrawals',
      icon: Wallet,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When you've earned enough, you can withdraw your earnings to your bank account or crypto wallet.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm text-amber-300">
              <strong>Minimum Payout:</strong> LKR {minimumPayout.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You need to accumulate at least this amount before withdrawing
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <Wallet className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Bank Transfer</p>
              <p className="text-xs text-muted-foreground">Sri Lankan banks</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Crypto</p>
              <p className="text-xs text-muted-foreground">USDT, BTC, etc.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set! 🚀",
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            You're ready to start earning! Your dashboard has everything you need to track your progress.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-foreground">Share your referral link</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-foreground">Track conversions in real-time</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-foreground">Withdraw when you hit minimum</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-foreground">Grow your tier for higher rates</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              Good luck! Start sharing and watch your earnings grow! 💰
            </p>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentIcon = steps[currentStep].icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tour...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          {/* Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-4">
              <CurrentIcon className="w-7 h-7 text-brand" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {steps[currentStep].title}
            </h2>
          </div>

          {/* Content */}
          <div className="mb-8">
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              variant="brand"
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Go to Dashboard
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip button */}
        {currentStep < steps.length - 1 && (
          <div className="text-center mt-4">
            <button
              onClick={onComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour (not recommended)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorOnboardingTour;
