import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/storageClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Crown,
  ChevronRight,
  Clock,
  Shield,
  LogOut,
  Sparkles,
  ArrowUpRight,
  Share2,
  Copy,
  Check,
  Languages,
} from 'lucide-react';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS } from '@/types/database';
import type { Subject } from '@/types/database';
import { useBranding } from '@/hooks/useBranding';
import ReferralProgress from '@/components/dashboard/ReferralProgress';
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus';
import MediumChangeRequestDialog from '@/components/dashboard/MediumChangeRequestDialog';
import { useAICredits } from '@/hooks/useAICredits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { user, enrollment, profile, userSubjects, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branding } = useBranding();
  const { isEligible: isAIEligible, remainingCredits, isLoading: creditsLoading } = useAICredits();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showMediumDialog, setShowMediumDialog] = useState(false);

  // Fetch user's referral code
  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      if (data?.referral_code) {
        setReferralCode(data.referral_code);
      }
    };
    fetchReferralCode();
  }, [user]);

  const copyReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle pending upgrade payments (card payments that need finalization)
  useEffect(() => {
    const handlePendingUpgradePayment = async () => {
      const paymentStatus = searchParams.get('payment');
      if (paymentStatus !== 'success' || !user || !enrollment) return;
      
      const pendingDataStr = localStorage.getItem('pending_upgrade_payment');
      if (!pendingDataStr) {
        // Clean URL and return
        window.history.replaceState({}, '', '/dashboard');
        return;
      }

      try {
        const pendingData = JSON.parse(pendingDataStr);
        console.log('Finalizing upgrade payment:', pendingData);
        
        // Call finalize-payment-user to create attribution
        const { data: finalizeResult, error: finalizeError } = await supabase.functions.invoke(
          'admin-finance/finalize-payment-user',
          {
            body: {
              order_id: pendingData.orderId,
              enrollment_id: pendingData.enrollmentId || enrollment.id,
              tier: pendingData.tier,
              final_amount: pendingData.amount,
              original_amount: pendingData.originalAmount,
              ref_creator: pendingData.refCreator,
              payment_type: 'upgrade',
            },
          }
        );

        if (finalizeError) {
          console.error('Failed to finalize upgrade payment:', finalizeError);
          toast.error('Payment recorded but attribution failed. Please contact support.');
        } else {
          console.log('Upgrade payment finalized:', finalizeResult);
          toast.success('Upgrade completed successfully!');
        }
      } catch (error) {
        console.error('Error processing pending upgrade payment:', error);
        toast.error('Error processing payment. Please contact support.');
      } finally {
        localStorage.removeItem('pending_upgrade_payment');
        window.history.replaceState({}, '', '/dashboard');
      }
    };

    handlePendingUpgradePayment();
  }, [searchParams, user, enrollment]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!enrollment) return;

      const isALevel = enrollment.grade?.startsWith('al_');
      const isOLevel = enrollment.grade?.startsWith('ol_');
      
      // For A/L students, filter by selected subjects using subject_code
      // For O/L students, show all subjects for their grade/medium
      if (isALevel && userSubjects) {
        // Get the user's selected subject codes (filter out nulls)
        // Try codes first, fallback to names for backwards compatibility
        const userSubjectsAny = userSubjects as any;
        const selectedSubjectCodes = [
          userSubjectsAny.subject_1_code,
          userSubjectsAny.subject_2_code,
          userSubjectsAny.subject_3_code,
        ].filter(Boolean) as string[];
        
        const selectedSubjectNames = [
          userSubjects.subject_1,
          userSubjects.subject_2,
          userSubjects.subject_3,
        ].filter(Boolean) as string[];

        if (selectedSubjectCodes.length === 0 && selectedSubjectNames.length === 0) {
          setSubjects([]);
          setIsLoading(false);
          return;
        }

        // FIXED: Query subjects by subject_code matching
        // This ensures we find content even if the subject name differs
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('grade', enrollment.grade)
          .eq('is_active', true)
          .eq('medium', enrollment.medium || 'english')
          .in('subject_code', selectedSubjectCodes.length > 0 ? selectedSubjectCodes : selectedSubjectNames)
          .order('sort_order');

        if (error) {
          console.error('Error fetching subjects:', error);
        }

        if (!error && data && data.length > 0) {
          setSubjects(data as Subject[]);
        } else {
          // Fallback: if no subjects found by code, try by name as last resort
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('subjects')
            .select('*')
            .eq('grade', enrollment.grade)
            .eq('is_active', true)
            .eq('medium', enrollment.medium || 'english')
            .order('sort_order');

          if (!fallbackError && fallbackData) {
            // Filter by subject_code OR name matching user's selection
            const filtered = fallbackData.filter(s => 
              selectedSubjectCodes.includes(s.subject_code || '') ||
              selectedSubjectNames.includes(s.name)
            );
            setSubjects(filtered as Subject[]);
          }
        }
      } else {
        // O/L students - show all subjects for their grade/medium
        let query = supabase
          .from('subjects')
          .select('*')
          .eq('grade', enrollment.grade)
          .eq('is_active', true)
          .order('sort_order');
        
        // Only filter by medium if it exists
        if (enrollment.medium) {
          query = query.eq('medium', enrollment.medium);
        }

        const { data, error } = await query;
        if (!error && data) setSubjects(data as Subject[]);
      }
      
      setIsLoading(false);
    };

    fetchSubjects();
  }, [enrollment, userSubjects]);

  if (!enrollment) return null;

  const expiresAt = enrollment.expires_at ? new Date(enrollment.expires_at) : null;
  const daysRemaining = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const tierColors = {
    starter: 'bg-secondary',
    standard: 'bg-brand/10',
    lifetime: 'bg-gold/10',
  };

  const tierTextColors = {
    starter: 'text-muted-foreground',
    standard: 'text-brand',
    lifetime: 'text-gold',
  };

  const tierBorder = {
    starter: 'border border-border',
    standard: 'border border-brand/40',
    lifetime: 'border border-gold/50',
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Minimal Header with Logo + Logout */}
      <header className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              {branding.logoImage ? (
                <img src={branding.logoImage} alt={branding.siteName} className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand" />
                </div>
              )}
              <span className="font-display font-bold text-foreground text-lg">
                {branding.siteName || 'Dashboard'}
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              {/* Tier Badge */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${tierColors[enrollment.tier]} ${tierBorder[enrollment.tier]}`}
              >
                <Crown className={`w-4 h-4 ${tierTextColors[enrollment.tier]}`} />
                <span className={`text-sm font-medium ${tierTextColors[enrollment.tier]}`}>
                  {TIER_LABELS[enrollment.tier]}
                </span>
              </div>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-8 pb-8">
        <div className="container mx-auto px-4">
          {/* Welcome Header */}
          <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 py-6 mb-8">
            <div>
              <span className="text-brand text-sm font-medium uppercase tracking-wider">Dashboard</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-1 tracking-tight">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0]}
              </h1>
            </div>
          </header>

          {/* Stats Row */}
          <section aria-label="Account overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{subjects.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Subjects</p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                {enrollment.grade?.startsWith('ol_') 
                  ? GRADE_LABELS[enrollment.grade] 
                  : STREAM_LABELS[enrollment.stream]}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {enrollment.grade?.startsWith('ol_') ? 'Grade' : 'Stream'}
              </p>
            </div>

            <div 
              className={cn(
                "glass-card p-5 cursor-pointer transition-all duration-300",
                isAIEligible 
                  ? "rotating-border-glow" 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => isAIEligible ? navigate('/ai-assistant') : navigate('/upgrade')}
            >
              {isAIEligible ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {creditsLoading ? '...' : remainingCredits.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    AI Credits
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-display font-bold text-foreground">Get AI</p>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Upgrade
                  </p>
                </>
              )}
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{MEDIUM_LABELS[enrollment.medium] || 'English'}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Medium</p>
            </div>
          </section>

          {/* Subscription Status */}
          {enrollment.tier !== 'lifetime' && (
            <div className="mb-6">
              <SubscriptionStatus 
                expiresAt={enrollment.expires_at || null} 
                tier={enrollment.tier} 
                type="user"
                createdAt={enrollment.created_at}
              />
            </div>
          )}

          {/* User Referral Link - Hide for Premium (lifetime) users */}
          {referralCode && enrollment?.tier !== 'lifetime' && (
            <div className="glass-card p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Share & Earn</h3>
                  <p className="text-xs text-muted-foreground">Refer 5 friends to unlock Premium tier free!</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={`${window.location.origin}/signup?ref=${referralCode}`}
                  readOnly
                  className="font-mono text-xs bg-secondary/50"
                />
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Referral Progress */}
          <ReferralProgress />

          {/* Section Header */}
          <section aria-label="Subjects" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Your Subjects</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {GRADE_LABELS[enrollment.grade]}
                  {!enrollment.grade?.startsWith('ol_') && enrollment.stream && ` • ${STREAM_LABELS[enrollment.stream]}`}
                </p>
              </div>
              {userSubjects && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMediumDialog(true)}
                  className="gap-2"
                >
                  <Languages className="w-4 h-4" />
                  <span className="hidden sm:inline">Change Medium</span>
                </Button>
              )}
            </div>
          </section>

          {/* Subjects Grid */}
          {isLoading ? (
            <div className="glass-card p-16 text-center">
              <p className="text-muted-foreground">Loading subjects…</p>
            </div>
          ) : subjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/subject/${subject.id}`)}
                  className="glass-card p-6 text-left hover:border-brand/30 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                      <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1 group-hover:text-brand transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">{subject.description || 'View topics and notes'}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="glass-card p-16 text-center">
              <Clock className="w-10 h-10 text-brand mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Content Coming Soon</h3>
              <p className="text-muted-foreground text-sm">
                Your {enrollment.grade?.startsWith('ol_') ? GRADE_LABELS[enrollment.grade] : STREAM_LABELS[enrollment.stream]} subjects are being prepared.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <p className="text-muted-foreground text-xs">© {new Date().getFullYear()} {branding.siteName}</p>
          </div>
        </div>
      </footer>

      {/* Medium Change Request Dialog */}
      <MediumChangeRequestDialog 
        open={showMediumDialog} 
        onOpenChange={setShowMediumDialog} 
      />
    </main>
  );
};

export default Dashboard;
