export function ChatListLoading() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="h-12 w-12 rounded-full bg-muted" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="h-3 w-1/3 bg-muted rounded" />
      </div>
    </div>
  );
}
