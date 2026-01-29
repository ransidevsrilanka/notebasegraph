import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Users, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useBranding } from '@/hooks/useBranding';

const ApplyAffiliate = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const benefits = [
    {
      icon: DollarSign,
      title: '12-20% Commission',
      description: 'Start at 12% and unlock higher tiers as you grow your referrals',
      color: 'text-brand',
      bgColor: 'bg-brand/10',
    },
    {
      icon: Users,
      title: 'Lifetime Attribution',
      description: 'Earn commission from all purchases made by your referrals forever',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Wallet,
      title: 'Easy Withdrawals',
      description: 'Request payouts anytime with our low minimum threshold',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Analytics',
      description: 'Track your referrals, conversions, and earnings in real-time',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Shield,
      title: 'Tier Protection',
      description: '30-day protection period when you reach a new tier level',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: Sparkles,
      title: 'Exclusive Tools',
      description: 'Custom discount codes, QR codes, and marketing materials',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  const tiers = [
    { name: 'Starter', rate: '8%', threshold: '0-49 users', color: 'border-muted-foreground' },
    { name: 'Bronze', rate: '12%', threshold: '50-99 users', color: 'border-brand' },
    { name: 'Silver', rate: '15%', threshold: '100-249 users', color: 'border-gray-400' },
    { name: 'Gold', rate: '20%', threshold: '250+ users', color: 'border-gold' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Wait a moment for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set creator role without CMO (cmo_id = null)
      const { error: roleError } = await supabase.rpc('set_creator_role', {
        _user_id: authData.user.id,
        _cmo_id: null,
        _display_name: name,
      });

      if (roleError) {
        console.error('Error setting creator role:', roleError);
        toast.error('Account created but role setup failed. Please contact support.');
        navigate('/auth');
        return;
      }

      toast.success('Account created! Redirecting to onboarding...');
      navigate('/creator/onboarding');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-brand/10 text-brand border-brand/20 mb-6 px-4 py-1.5">
              <Sparkles className="w-4 h-4 mr-2" />
              Affiliate Program
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Earn Money Sharing{' '}
              <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
                {branding.siteName}
              </span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Join our affiliate program and earn up to 20% commission on every sale you refer. 
              No upfront costs, no inventory – just share and earn.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                size="lg"
                variant="brand"
                onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="gap-2 px-8"
              >
                Apply Now
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
              >
                <Link to="/auth">Already an affiliate? Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Why Become an Affiliate?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Join hundreds of creators earning passive income by sharing quality educational resources
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="glass-card p-6 hover:border-brand/30 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl ${benefit.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Commission Tiers
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The more users you refer, the higher your commission rate. Earn up to 20% on every sale!
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {tiers.map((tier, index) => (
              <div
                key={tier.name}
                className={`glass-card p-5 text-center border-2 ${tier.color} hover:scale-105 transition-transform`}
              >
                <p className="text-sm text-muted-foreground mb-1">{tier.name}</p>
                <p className="text-3xl font-bold text-foreground mb-2">{tier.rate}</p>
                <p className="text-xs text-muted-foreground">{tier.threshold}</p>
                {index === 1 && (
                  <Badge className="mt-3 bg-brand/10 text-brand border-0 text-[10px]">
                    You start here
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section id="signup-form" className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-brand" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Apply Now
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create your affiliate account and start earning today
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Affiliate Account'}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  By signing up, you agree to our{' '}
                  <Link to="/terms" className="text-brand hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
                </p>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/auth" className="text-brand hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  1
                </div>
                <h3 className="font-semibold text-foreground mb-2">Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create your free affiliate account in under 2 minutes
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  2
                </div>
                <h3 className="font-semibold text-foreground mb-2">Share</h3>
                <p className="text-sm text-muted-foreground">
                  Share your unique link and discount codes with friends
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-foreground mb-2">Earn</h3>
                <p className="text-sm text-muted-foreground">
                  Earn commission every time someone signs up using your link
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ApplyAffiliate;
