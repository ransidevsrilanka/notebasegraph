import { useRef, useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I get started with Notebase?",
    answer: "Simply purchase an access code from one of our authorized creators, enter it on our platform, and you'll instantly get access to all premium study materials for your grade and stream.",
  },
  {
    category: "Getting Started",
    question: "What grades and streams are supported?",
    answer: "We support O/L students (Grade 10 & 11) and A/L students across all streams including Science, Maths, Commerce, Arts, and Technology. Materials are available in both English and Sinhala medium.",
  },
  {
    category: "Getting Started",
    question: "Can I access Notebase on my phone?",
    answer: "Yes! Our platform is fully responsive and works beautifully on phones, tablets, and desktops. Study anywhere, anytime.",
  },
  {
    category: "Payments & Pricing",
    question: "What payment methods do you accept?",
    answer: "We accept all major debit/credit cards through PayHere, bank transfers, and Cash on Delivery for printed materials. All transactions are secure and encrypted.",
  },
  {
    category: "Payments & Pricing",
    question: "Is there a free trial available?",
    answer: "Yes! Some of our creators offer trial access codes. Contact them directly or check our pricing page for current offers.",
  },
  {
    category: "Payments & Pricing",
    question: "What's included in the subscription?",
    answer: "Your subscription includes access to comprehensive notes, model papers with answers, flashcards, quizzes, and our AI tutor for your selected subjects. You also get access to our print-on-demand service.",
  },
  {
    category: "Content Access",
    question: "How often is content updated?",
    answer: "Our content team updates materials regularly to align with the latest syllabus changes. New model papers are added after each major exam session.",
  },
  {
    category: "Content Access",
    question: "Can I download notes for offline study?",
    answer: "Currently, all materials are accessed online for security. However, you can order printed copies through our print service for a small additional fee.",
  },
  {
    category: "Content Access",
    question: "What is the AI Tutor feature?",
    answer: "Our AI Tutor is an intelligent study assistant that can explain concepts, solve problems step-by-step, and answer your subject-related questions instantly. It's like having a personal tutor available 24/7.",
  },
  {
    category: "Technical Support",
    question: "I forgot my password. How do I reset it?",
    answer: "Click on 'Forgot Password' on the sign-in page and enter your email. You'll receive a reset link within minutes. Check your spam folder if you don't see it.",
  },
  {
    category: "Technical Support",
    question: "My access code isn't working. What should I do?",
    answer: "First, double-check for typos. If it still doesn't work, the code may have already been used or expired. Contact the creator who sold you the code, or reach out to our support team.",
  },
  {
    category: "Technical Support",
    question: "How do I contact support?",
    answer: "You can reach our support team through the inbox feature in your dashboard, or contact us via our official Telegram channel. We typically respond within 24 hours.",
  },
];

const categories = [...new Set(faqData.map((item) => item.category))];

const FAQSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const filteredFAQs = activeCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.category === activeCategory);

  return (
    <section 
      id="faq" 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-vault-dark" />
      
      {/* Floating orb */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[150px] -translate-y-1/2" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div 
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-medium tracking-wide uppercase mb-6">
            FAQ
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 tracking-tight">
            Frequently Asked <span className="text-brand-gradient">Questions</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-body">
            Everything you need to know about Notebase. Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* Category filters */}
        <div 
          className={`flex flex-wrap justify-center gap-2 mb-12 transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeCategory === "all"
                ? "bg-brand text-primary-foreground"
                : "bg-glass/50 text-muted-foreground hover:text-foreground hover:bg-glass border border-glass-border"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? "bg-brand text-primary-foreground"
                  : "bg-glass/50 text-muted-foreground hover:text-foreground hover:bg-glass border border-glass-border"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div 
          className={`max-w-3xl mx-auto transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-glass-border rounded-xl bg-glass/30 backdrop-blur-sm px-6 overflow-hidden data-[state=open]:border-brand/30 transition-colors duration-300"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground py-5 hover:no-underline group">
                  <span className="group-hover:text-brand transition-colors duration-300">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Bottom CTA */}
        <div 
          className={`text-center mt-16 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <a 
            href="/about" 
            className="inline-flex items-center gap-2 text-brand hover:text-brand-light transition-colors font-medium"
          >
            Contact our support team
            <span className="text-lg">→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
