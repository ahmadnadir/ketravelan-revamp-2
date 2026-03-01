import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BottomCTASection() {
  return (
    <section className="rounded-2xl sm:rounded-3xl bg-primary p-6 sm:p-10 text-center space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground">
        Start Planning Together. Settle Fairly.
      </h2>
      <p className="text-sm sm:text-base text-primary-foreground/80 max-w-md mx-auto">
        Create or join a DIY trip, manage shared expenses, and keep money conversations simple — from day one to the final settlement.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-2">
        <Link to="/create" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-full sm:w-auto font-semibold"
          >
            Start a DIY Trip
          </Button>
        </Link>
        <Link to="/explore?type=diy" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-full sm:w-auto border-primary-foreground bg-primary-foreground/10 text-primary-foreground font-semibold hover:bg-primary-foreground/20"
          >
            Browse DIY Trips
          </Button>
        </Link>
      </div>
    </section>
  );
}
