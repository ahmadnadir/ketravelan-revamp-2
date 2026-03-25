/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { TripCard } from "@/components/shared/TripCard";
import { TripCardLoading } from "@/components/shared/TripCardLoading";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, History, FileEdit } from "lucide-react";
import { useUserTrips } from "@/hooks/useTrips";
import { TripCardSkeletonList } from "@/components/skeletons/TripCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { convertPrice, getCurrencySymbol } from "@/lib/currencyUtils";
import { deleteDraftTrip, cancelTrip } from "@/lib/trips";
import { toast } from "@/hooks/use-toast";

export default function MyTrips() {
  const isLoading = useSimulatedLoading(500);
  const [tab, setTab] = useState("upcoming");
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, homeCurrency } = useAuth();
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  // Use React Query to fetch user trips
  const { data: trips = [], isLoading: loading, refetch } = useUserTrips(user?.id);

  const handleDeleteDraft = async (tripId: string) => {
    try {
      await deleteDraftTrip(tripId);
      toast({
        title: "Draft deleted",
        description: "Your draft trip has been deleted successfully.",
      });
      refetch();
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast({
        title: "Error",
        description: "Failed to delete draft trip",
        variant: "destructive",
      });
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    try {
      await cancelTrip(tripId);
      toast({
        title: "Trip cancelled",
        description: "Participants have been notified.",
      });
      refetch();
    } catch (error) {
      console.error("Error cancelling trip:", error);
      toast({
        title: "Error",
        description: "Failed to cancel trip",
        variant: "destructive",
      });
    }
  };

  // Convert prices to home currency whenever trips or currency changes
  useEffect(() => {
    const convertPrices = async () => {
      const priceMap: Record<string, number> = {};
      for (const trip of trips) {
        if (typeof trip.price === "number") {
          priceMap[trip.id] = await convertPrice(trip.price, homeCurrency);
        }
      }
      setConvertedPrices(priceMap);
    };

    if (trips.length > 0) {
      convertPrices();
    }
  }, [trips, homeCurrency]);

  // Categorize trips
  const { upcomingTrips, previousTrips, draftTrips } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: any[] = [];
    const previous: any[] = [];
    const draft: any[] = [];
    trips.forEach((trip) => {
      if (trip.status === "draft") {
        draft.push(trip);
        return;
      }
      const endDate = trip.end_date ? new Date(trip.end_date) : null;
      // Include trips with null dates in upcoming, or trips with end date >= today
      if (!endDate || endDate >= today) {
        upcoming.push(trip);
      } else {
        previous.push(trip);
      }
    });
    return { upcomingTrips: upcoming, previousTrips: previous, draftTrips: draft };
  }, [trips]);

  const displayTrips = useMemo(() => {
    switch (tab) {
      case "upcoming":
        return upcomingTrips;
      case "previous":
        return previousTrips;
      case "draft":
        return draftTrips;
      default:
        return upcomingTrips;
    }
  }, [tab, upcomingTrips, previousTrips, draftTrips]);

  const getEmptyMessage = () => {
    switch (tab) {
      case "upcoming":
        return "No upcoming trips. Start exploring!";
      case "previous":
        return "No past trips yet";
      case "draft":
        return "No drafts. Create a trip to get started!";
      default:
        return "No trips found";
    }
  };

  const getEmptyIcon = () => {
    switch (tab) {
      case "upcoming":
        return <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
      case "previous":
        return <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
      case "draft":
        return <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "upcoming" || tabParam === "previous" || tabParam === "draft") {
      setTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setTab(value);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams, { replace: true });
  };

  if (isLoading) {
    return (
      <AppLayout wideLayout>
        <div className="py-6 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <TripCardSkeletonList count={3} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout wideLayout>
      <div className="py-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Trips</h1>

        <SegmentedControl
          options={[
            { label: "Upcoming", value: "upcoming" },
            { label: "Previous", value: "previous" },
            { label: "Draft", value: "draft" },
          ]}
          value={tab}
          onChange={handleTabChange}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <TripCardLoading key={i} />
            ))}
          </div>
        ) : displayTrips.length === 0 ? (
          <div className="text-center py-12">
            {getEmptyIcon()}
            <p className="text-muted-foreground">{getEmptyMessage()}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {displayTrips.map((trip) => {
              const isOwner = trip.creator?.id && user?.id && trip.creator.id === user.id;
              return (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  imageUrl={trip.cover_image || trip.images?.[0] || undefined}
                  startDate={trip.start_date}
                  endDate={trip.end_date}
                  {...trip}
                  status={trip.status}
                  price={typeof trip.price === "number" ? (convertedPrices[trip.id] ?? trip.price) : (trip.price as any)}
                  displayCurrency={getCurrencySymbol(homeCurrency || "MYR")}
                  slotsLeft={typeof trip.max_participants === 'number' && typeof trip.current_participants === 'number' ? trip.max_participants - trip.current_participants : 0}
                  totalSlots={trip.max_participants || 0}
                  tags={trip.tags || []}
                  onDelete={tab === "draft" ? handleDeleteDraft : undefined}
                  onCancel={tab !== "draft" && isOwner && trip.status === "published" ? handleCancelTrip : undefined}
                  returnTo="my-trips"
                  returnTab={tab}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
