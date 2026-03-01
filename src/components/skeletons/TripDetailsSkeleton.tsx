import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";

export function TripDetailsSkeleton() {
  return (
    <AppLayout hideHeader>
      <div className="pb-36">
        {/* Image Gallery Skeleton */}
        <div className="relative -mx-4 sm:-mx-6">
          <Skeleton className="aspect-[4/3] sm:aspect-[16/10] w-full rounded-none" />
          
          {/* Back button placeholder */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
            <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
          </div>
          
          {/* Action buttons placeholder */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2">
            <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
            <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
          </div>
          
          {/* Thumbnails placeholder */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-14 sm:h-12 sm:w-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="pt-4 space-y-6">
          {/* Title and destination */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>

          {/* Organizer card */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>

          {/* Tabs */}
          <Skeleton className="h-10 w-full rounded-lg" />

          {/* Content area */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Budget breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
