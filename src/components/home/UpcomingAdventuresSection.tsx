/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TripCard } from "@/components/shared/TripCard";
import { fetchTrips } from "@/lib/trips";

export function UpcomingAdventuresSection() {
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setIsLoading(true);
      const data = await fetchTrips({});
      const mappedTrips = (data || []).slice(0, 6).map((trip: any) => {
        const maxParticipants = trip.max_participants ?? 0;
        const currentParticipants = trip.current_participants ?? 0;
        let slotsLeft = maxParticipants - currentParticipants;
        if (isNaN(slotsLeft)) slotsLeft = 0;
        return {
          id: trip.id ?? '',
          title: trip.title ?? 'Untitled',
          destination: trip.destination ?? 'Unknown',
          imageUrl: trip.cover_image || '/placeholder.svg',
          startDate: trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
          endDate: trip.end_date ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
          price: trip.price ?? 0,
          slotsLeft,
          totalSlots: maxParticipants,
          tags: Array.isArray(trip.tags) ? trip.tags : [],
          requirements: Array.isArray(trip.requirements) ? trip.requirements : [],
          isAlmostFull: slotsLeft <= 2,
          tripType: trip.type ?? undefined,
          slug: trip.slug ?? undefined,
        };
      });
      setTrips(mappedTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Join the Adventure
          </h2>
          <Link to="/explore" className="text-xs sm:text-sm text-primary font-medium">
            See all
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Discover open trips happening soon.
        </p>
      </div>

      {/* Trip Cards - Horizontal Scroll */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
        {isLoading ? (
          <div className="w-full py-8 text-center text-muted-foreground text-sm">
            Loading trips...
          </div>
        ) : trips.length > 0 ? (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              {...trip}
              creatorId={trip.creator_id ?? trip.creator?.id}
              className="w-[280px] sm:w-[320px] shrink-0 snap-start"
            />
          ))
        ) : (
          <div className="w-full py-8 text-center text-muted-foreground text-sm">
            No trips available yet.
          </div>
        )}
      </div>
    </section>
  );
}
