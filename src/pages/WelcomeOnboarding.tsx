import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { Users, Receipt, MapPin, MessageCircle, Plane, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressDots } from "@/components/welcome/ProgressDots";
import { Card } from "@/components/ui/card";
import { ExpensesAtGlanceSlide } from "@/components/welcome/ExpensesAtGlanceSlide";
import { UpfrontPaymentsSlide } from "@/components/welcome/UpfrontPaymentsSlide";
import { NetSettlementSlide } from "@/components/welcome/NetSettlementSlide";

export default function WelcomeOnboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    watchDrag: true,
  });

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleNext = () => {
    if (currentSlide < 5) {
      scrollTo(currentSlide + 1);
    }
  };

  const handleGetStarted = () => {
    localStorage.setItem("ketravelan_visited", "true");
    navigate("/explore");
  };

  const handleLogin = () => {
    localStorage.setItem("ketravelan_visited", "true");
    navigate("/auth?mode=login");
  };

  const handleSignUp = () => {
    localStorage.setItem("ketravelan_visited", "true");
    navigate("/auth?mode=signup");
  };

  return (
    <div className="fixed inset-0 flex flex-col h-dvh bg-background overflow-hidden">
      {/* Carousel Container */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {/* Screen 1: Intro */}
          <div className="flex-[0_0_100%] min-w-0 h-full">
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              {/* Illustration */}
              <div className="w-64 h-56 mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-3xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Central plane */}
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                      <Plane className="w-10 h-10 text-primary" />
                    </div>
                    {/* Orbiting elements */}
                    <div className="absolute -top-4 -right-8 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div className="absolute -bottom-4 -left-8 w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div className="absolute -bottom-6 right-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <h1 className="text-2xl font-bold mb-3 animate-fade-in">
                Travel Together. Split Costs.<br />No Awkward Math.
              </h1>
              <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
                Plan trips, find travel buddies, and track shared expenses all in one place.
              </p>

              {/* Buttons */}
              <div className="w-full max-w-xs space-y-3 animate-fade-in">
                <Button 
                  onClick={handleNext}
                  className="w-full h-12 text-base font-medium rounded-xl"
                >
                  Explore Features
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleLogin}
                    className="flex-1 h-12 text-base font-medium rounded-xl"
                  >
                    Log In
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleSignUp}
                    className="flex-1 h-12 text-base font-medium rounded-xl"
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Screen 2: Expense Tracker Value */}
          <div className="flex-[0_0_100%] min-w-0 h-full">
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              {/* Expense Mockup */}
              <div className="w-full max-w-xs mb-8">
                <Card className="p-4 space-y-4 bg-card/80 backdrop-blur border-border/50">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bali Trip Expenses</span>
                    <span className="text-xs text-muted-foreground">4 members</span>
                  </div>
                  
                  {/* Total */}
                  <div className="text-center py-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-primary">$2,480</p>
                  </div>

                  {/* Settlement Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">Y</div>
                        <span className="text-sm">You paid</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">$820</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">O</div>
                        <span className="text-sm">Others owe you</span>
                      </div>
                      <span className="text-sm font-medium text-orange-600">$200</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Content */}
              <h1 className="text-2xl font-bold mb-3 animate-fade-in">
                Track Group Expenses.<br />Fairly and Instantly
              </h1>
              <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
                Log shared costs, see who paid, who owes, and settle fairly in real time.
              </p>

              {/* Button */}
              <div className="w-full max-w-xs animate-fade-in">
                <Button 
                  onClick={handleNext}
                  className="w-full h-12 text-base font-medium rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Screen 3: Expenses at a Glance */}
          <ExpensesAtGlanceSlide onNext={handleNext} />

          {/* Screen 4: Upfront Payments, Tracked */}
          <UpfrontPaymentsSlide onNext={handleNext} />

          {/* Screen 5: Net Settlement, Simplified */}
          <NetSettlementSlide onNext={handleNext} />

          {/* Screen 6: Travel Buddies & Planning */}
          <div className="flex-[0_0_100%] min-w-0 h-full">
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              {/* Trip Cards Mockup */}
              <div className="w-full max-w-xs mb-8 space-y-3">
                {/* Public Trip Card */}
                <Card className="p-3 bg-card/80 backdrop-blur border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded-full font-medium">Public</span>
                        <span className="text-xs text-muted-foreground">2 spots left</span>
                      </div>
                      <p className="font-medium text-sm">Japan Cherry Blossom</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Tokyo, Kyoto • Apr 2025
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Private Trip Card */}
                <Card className="p-3 bg-card/80 backdrop-blur border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">Private</span>
                        <span className="text-xs text-muted-foreground">4 friends</span>
                      </div>
                      <p className="font-medium text-sm">Weekend Getaway</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> Group chat active
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Content */}
              <h1 className="text-2xl font-bold mb-3 animate-fade-in">
                Plan Trips or<br />Find Travel Buddies
              </h1>
              <p className="text-base text-muted-foreground mb-8 max-w-xs animate-fade-in">
                Go public to meet new travel buddies, or keep trips private with friends chat, plan, and track expenses together.
              </p>

              {/* Buttons */}
              <div className="w-full max-w-xs animate-fade-in">
                <div className="flex gap-3">
                  <Button 
                    onClick={handleLogin}
                    className="flex-1 h-12 text-base font-medium rounded-xl"
                  >
                    Log In
                  </Button>
                  <Button 
                    onClick={handleSignUp}
                    className="flex-1 h-12 text-base font-medium rounded-xl"
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Dots - Fixed at bottom */}
      <div className="flex-none pb-8 pt-4">
        <ProgressDots 
          total={6} 
          current={currentSlide} 
          onDotClick={scrollTo}
        />
      </div>
    </div>
  );
}
