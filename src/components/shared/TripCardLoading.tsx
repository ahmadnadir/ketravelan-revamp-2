export function TripCardLoading() {
  return (
    <div className="animate-pulse rounded-xl bg-secondary/60 border border-border shadow p-4 flex flex-col gap-3 min-h-[320px]">
      <div className="h-40 w-full bg-muted rounded-lg mb-3" />
      <div className="h-5 w-2/3 bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 bg-muted rounded mb-1" />
      <div className="h-4 w-1/3 bg-muted rounded mb-1" />
      <div className="flex gap-2 mt-auto">
        <div className="h-8 w-20 bg-muted rounded-full" />
        <div className="h-8 w-16 bg-muted rounded-full" />
      </div>
    </div>
  );
}
