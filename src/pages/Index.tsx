import Navbar from "@/components/Navbar";
import ParallaxHero from "@/components/ParallaxHero";
import FeaturesGrid from "@/components/FeaturesGrid";
import StickyServices from "@/components/StickyServices";
import TestimonialsSection from "@/components/TestimonialsSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <ParallaxHero />
      <FeaturesGrid />
      <StickyServices />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <WhyChooseUs />
      <Footer />
    </main>
  );
};

export default Index;
