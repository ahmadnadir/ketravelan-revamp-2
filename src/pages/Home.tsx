import { AppLayout } from "@/components/layout/AppLayout";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { UpcomingAdventuresSection } from "@/components/home/UpcomingAdventuresSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { GuidesSection } from "@/components/home/GuidesSection";
import { CommunitySection } from "@/components/home/CommunitySection";
import { ExpensesFeatureSection } from "@/components/home/ExpensesFeatureSection";
import { FAQSection } from "@/components/home/FAQSection";
import { BottomCTASection } from "@/components/home/BottomCTASection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";

export default function Home() {
  return (
    <AppLayout>
      <InstallBanner />
      <div className="py-4 sm:py-6 space-y-10 sm:space-y-14">
        <AnimatedSection>
          <HeroSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <UpcomingAdventuresSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <GuidesSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <CommunitySection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <ExpensesFeatureSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <HowItWorksSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <FAQSection />
        </AnimatedSection>
        <AnimatedSection delay={50}>
          <BottomCTASection />
        </AnimatedSection>
      </div>
    </AppLayout>
  );
}
