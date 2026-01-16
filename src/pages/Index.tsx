import {
  NavbarMinimal,
  HeroSection,
  ProblemsEliminated,
  Credibility,
  ContentPreview,
  PricingRedesign,
  ClosingPush,
  FooterMinimal
} from "@/components/landing";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <NavbarMinimal />
      <HeroSection />
      <ProblemsEliminated />
      <Credibility />
      <ContentPreview />
      <PricingRedesign />
      <ClosingPush />
      <FooterMinimal />
    </main>
  );
};

export default Index;
