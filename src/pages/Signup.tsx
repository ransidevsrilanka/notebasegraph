import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Signup redirect page
 * Captures referral parameters and redirects to pricing page
 * 
 * UNIFIED IDENTITY: ref_creator AND discount_code are treated as the SAME thing
 * - ref_creator = creator's referral code (e.g., CRT93YHGB)
 * - discount_code = same creator's referral code
 * Both map to creator_profiles.referral_code
 */
const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get either ref_creator or discount_code - they are the SAME identity
    const refCreator = searchParams.get('ref_creator');
    const discountCode = searchParams.get('discount_code');
    
    // Unified code: prefer ref_creator, fallback to discount_code
    const creatorCode = (refCreator || discountCode || '').toUpperCase().trim();

    // Store in localStorage for attribution during checkout
    if (creatorCode) {
      localStorage.setItem('refCreator', creatorCode);
    }

    // Redirect to pricing page with unified param
    const params = new URLSearchParams();
    if (creatorCode) {
      params.set('ref_creator', creatorCode);
    }

    const queryString = params.toString();
    const redirectUrl = queryString ? `/pricing?${queryString}` : '/pricing';

    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  // Show brief loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to signup...</p>
      </div>
    </div>
  );
};

export default Signup;
