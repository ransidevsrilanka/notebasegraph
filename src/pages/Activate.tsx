import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle } from 'lucide-react';

const Activate = () => {
  const { user, enrollment, signOut } = useAuth();
  const navigate = useNavigate();

  // If user has enrollment, redirect to dashboard
  if (enrollment) {
    navigate('/dashboard');
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-28 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-dark via-background to-vault-surface" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-md mx-auto">
            <div className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-orange-500" />
              </div>
              
              <h1 className="font-display text-xl font-bold text-foreground mb-3">
                No Active Enrollment
              </h1>
              
              <p className="text-muted-foreground text-sm mb-5">
                Your account ({user?.email}) doesn't have an active enrollment. 
                You need to purchase an access code to unlock your study materials.
              </p>

              <div className="space-y-2">
                <Button variant="brand" className="w-full" onClick={() => navigate('/pricing')}>
                  <Key className="w-4 h-4 mr-2" />
                  Get Access Code
                </Button>
                
                <Button variant="ghost" className="w-full" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Activate;
