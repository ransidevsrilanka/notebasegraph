import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";

const FAQ = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24" />
      <FAQSection />
      <Footer />
    </main>
  );
};

export default FAQ;
