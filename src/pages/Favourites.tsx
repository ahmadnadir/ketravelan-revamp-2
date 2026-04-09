import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TripCard } from "@/components/shared/TripCard";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TripCardSkeletonList } from "@/components/skeletons/TripCardSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSavedTrips } from "@/lib/trips";

interface SavedTrip {
  id: string;
  title: string;
  destination: string;
  cover_image?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  currency?: string | null;
  visibility?: 'public' | 'private';
  max_participants?: number | null;
  current_participants?: number | null;
  tags?: string[] | null;
  type?: string | null;
  slug?: string | null;
}

export default function Favourites() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setSavedTrips([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const trips = await fetchSavedTrips(user.id);
        setSavedTrips(trips);
      } catch (err) {
        console.error("Failed to load favourites", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (!user?.id) {
    return (
      <AppLayout wideLayout>
        <div className="py-6 space-y-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-5 w-5" />
            <span>Sign in to see your saved trips.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout wideLayout>
        <div className="py-6 space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <TripCardSkeletonList count={6} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout wideLayout>
      <div className="py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Favourites</h1>
          <p className="text-sm text-muted-foreground">{savedTrips.length} saved trip{savedTrips.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {savedTrips.length === 0 ? (
            <div className="col-span-full text-muted-foreground">No saved trips yet</div>
          ) : (
            savedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                title={trip.title}
                destination={trip.destination}
                imageUrl={trip.cover_image}
                startDate={trip.start_date}
                endDate={trip.end_date}
                price={trip.price}
                displayCurrency={trip.currency}
                slotsLeft={trip.max_participants - (trip.current_participants || 0)}
                totalSlots={trip.max_participants}
                tags={trip.tags || []}
                requirements={Array.isArray(trip.requirements) ? trip.requirements : []}
                isAlmostFull={(trip.current_participants || 0) >= Math.max(1, Math.floor((trip.max_participants || 0) * 0.8))}
                slug={trip.slug}
                isPrivate={trip.visibility === 'private'}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
