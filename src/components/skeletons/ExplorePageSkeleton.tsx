import { Skeleton } from "@/components/ui/skeleton";
import { TripCardSkeletonList } from "./TripCardSkeleton";

export function ExplorePageSkeleton() {
  return (
    <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Title */}
      <Skeleton className="h-7 w-40" />

      {/* Search/Filter Bar */}
      <div className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Results count */}
      <Skeleton className="h-4 w-32" />

      {/* Trip cards */}
      <TripCardSkeletonList count={3} />
    </div>
  );
}
