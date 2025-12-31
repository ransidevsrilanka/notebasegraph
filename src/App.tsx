import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Access from "./pages/Access";
import Dashboard from "./pages/Dashboard";
import Subject from "./pages/Subject";
import Upgrade from "./pages/Upgrade";
import Activate from "./pages/Activate";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Library from "./pages/Library";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import SubjectSelection from "./pages/SubjectSelection";
import PaidSignup from "./pages/PaidSignup";
import CreatorSignup from "./pages/CreatorSignup";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CMODashboard from "./pages/cmo/CMODashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccessCodes from "./pages/admin/AccessCodes";
import Enrollments from "./pages/admin/Enrollments";
import ContentManagement from "./pages/admin/ContentManagement";
import UpgradeRequests from "./pages/admin/UpgradeRequests";
import PricingSettings from "./pages/admin/PricingSettings";
import BrandingSettings from "./pages/admin/BrandingSettings";
import Analytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent "internal refresh" flicker when users switch tabs (window refocus)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/access" element={<Access />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/activate" element={<Activate />} />
            <Route path="/library" element={<Library />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/paid-signup" element={<PaidSignup />} />
            <Route path="/creator_signup" element={<CreatorSignup />} />
            
            {/* Subject Selection (after enrollment, before dashboard) */}
            <Route path="/select-subjects" element={
              <ProtectedRoute requireEnrollment>
                <SubjectSelection />
              </ProtectedRoute>
            } />
            
            {/* Protected Student Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireEnrollment requireSubjects>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/subject/:subjectId" element={
              <ProtectedRoute requireEnrollment requireSubjects>
                <Subject />
              </ProtectedRoute>
            } />
            <Route path="/upgrade" element={
              <ProtectedRoute requireEnrollment>
                <Upgrade />
              </ProtectedRoute>
            } />
            
            {/* CMO Routes */}
            <Route path="/cmo/dashboard" element={
              <ProtectedRoute requireCMO>
                <CMODashboard />
              </ProtectedRoute>
            } />
            
            {/* Creator Routes */}
            <Route path="/creator/dashboard" element={
              <ProtectedRoute requireCreator>
                <CreatorDashboard />
              </ProtectedRoute>
            } />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/codes" element={
              <ProtectedRoute requireAdmin>
                <AccessCodes />
              </ProtectedRoute>
            } />
            <Route path="/admin/enrollments" element={
              <ProtectedRoute requireAdmin>
                <Enrollments />
              </ProtectedRoute>
            } />
            <Route path="/admin/content" element={
              <ProtectedRoute requireAdmin>
                <ContentManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/upgrades" element={
              <ProtectedRoute requireAdmin>
                <UpgradeRequests />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing" element={
              <ProtectedRoute requireAdmin>
                <PricingSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/branding" element={
              <ProtectedRoute requireAdmin>
                <BrandingSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute requireAdmin>
                <Analytics />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
