import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Star, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, Badge as StatusBadgeComponent } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAdminAccess, hasPermission } from '@/admin/lib/adminAccess';
import { getAdminTrip, setAdminTripFeatured, setAdminTripStatus, setAdminTripVisibility, type AdminTripDetails, type TripStatus, type TripVisibility } from '@/admin/lib/adminTrips';

const DEFAULT_TRIP_PHOTO = '/default-trip-photo.jpeg';

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function displayLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function DataDisplay({ value }: { value: unknown }) {
  if (value == null || value === '') return <span className="text-sm text-muted-foreground">Not provided</span>;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span className="break-words text-sm">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm text-muted-foreground">None</span>;
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <Badge key={`${String(item)}-${index}`} variant="outline" className="max-w-full truncate font-normal">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }
    return (
      <ol className="space-y-2">
        {value.map((item, index) => (
          <li key={index} className="rounded-md border bg-background p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Item {index + 1}</p>
            <DataDisplay value={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry != null && entry !== '');
    if (entries.length === 0) return <span className="text-sm text-muted-foreground">Not provided</span>;

    return (
      <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {entries.map(([key, entry]) => (
          <div key={key} className="min-w-0">
            <dt className="mb-1 text-xs text-muted-foreground">{displayLabel(key)}</dt>
            <dd><DataDisplay value={entry} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-sm text-muted-foreground">Not provided</span>;
}

function hasDisplayValue(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasDisplayValue);
  return true;
}

function DetailField({ label, value, className = '' }: { label: string; value: unknown; className?: string }) {
  if (!hasDisplayValue(value)) return null;
  return (
    <div className={`min-w-0 border-b border-border/50 pb-3 last:border-b-0 ${className}`}>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <DataDisplay value={value} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function TripImageCollage({ images, title, onOpen }: { images: string[]; title: string; onOpen: (index: number) => void }) {
  const visibleImages = images.slice(0, 5);
  const extraCount = Math.max(0, images.length - visibleImages.length);
  const frameClass = 'h-[clamp(15rem,38vw,28rem)]';
  const tileClass = 'group relative block h-full w-full min-h-0 min-w-0 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary';

  const renderTile = (index: number) => (
    <button key={`${index}-${visibleImages[index]}`} type="button" aria-label={`Expand trip photo ${index + 1}`} onClick={() => onOpen(index)} className={tileClass}>
      <img src={visibleImages[index]} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_TRIP_PHOTO; }} alt={`${title || 'Trip'} photo ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      {index === visibleImages.length - 1 && extraCount > 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">+{extraCount}</span>}
    </button>
  );

  if (visibleImages.length === 1) {
    return <div className={frameClass}>{renderTile(0)}</div>;
  }
  if (visibleImages.length === 2) {
    return <div className={`${frameClass} grid grid-cols-2 gap-1.5 sm:gap-2`}>{visibleImages.map((_, index) => renderTile(index))}</div>;
  }
  if (visibleImages.length === 3) {
    return <div className={`${frameClass} grid grid-cols-2 grid-rows-[2fr_1fr] gap-1.5 sm:gap-2 md:grid-cols-3 md:grid-rows-2`}>
      <div className="col-span-2 row-span-1 min-h-0 md:row-span-2">{renderTile(0)}</div>
      <div className="col-span-1 row-span-1 min-h-0 md:col-span-1">{renderTile(1)}</div>
      <div className="col-span-1 row-span-1 min-h-0 md:col-span-1">{renderTile(2)}</div>
    </div>;
  }
  if (visibleImages.length === 4) {
    return <div className={`${frameClass} grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2`}>{visibleImages.map((_, index) => renderTile(index))}</div>;
  }
  return <div className={`${frameClass} grid grid-cols-2 grid-rows-[1.2fr_1fr_1fr] gap-1.5 sm:gap-2 md:grid-cols-4 md:grid-rows-2`}>
    <div className="col-span-2 row-span-1 min-h-0 md:row-span-2">{renderTile(0)}</div>
    {visibleImages.slice(1).map((_, index) => <div key={index + 1} className="min-h-0">{renderTile(index + 1)}</div>)}
  </div>;
}

export default function AdminTripDetail() {
  const { tripId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const fromPageValue = Number.parseInt(searchParams.get('fromPage') || '0', 10);
  const backToTripsPath = fromPageValue > 0 ? `/admin/trips?page=${fromPageValue}` : '/admin/trips';
  const { toast } = useToast();
  const [trip, setTrip] = useState<AdminTripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pending, setPending] = useState<null | { kind: 'featured'; featured: boolean } | { kind: 'visibility'; visibility: Exclude<TripVisibility, 'all'> } | { kind: 'status'; status: Exclude<TripStatus, 'all'> }>(null);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const record = await getAdminTrip(tripId);
      setTrip(record);
      if (!record) setErrorMessage('Trip not found.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load trip.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { void load(); }, [load, refreshTick]);
  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => { if (active) setCanManage(hasPermission(access, 'trips.manage')); });
    return () => { active = false; };
  }, []);

  const allowedTransitions = useMemo((): Array<Exclude<TripStatus, 'all'>> => {
    if (!trip) return [];
    if (trip.status === 'draft') return ['published'];
    if (trip.status === 'published') return ['draft', 'in_progress', 'cancelled'];
    if (trip.status === 'in_progress') return ['completed', 'cancelled'];
    return [];
  }, [trip]);

  const tripPhotos = useMemo(() => {
    if (!trip) return [DEFAULT_TRIP_PHOTO];
    const photos = [trip.cover_image, ...(trip.images ?? [])]
      .filter((image): image is string => Boolean(image?.trim()));
    const uniquePhotos = [...new Set(photos)];
    return uniquePhotos.length ? uniquePhotos : [DEFAULT_TRIP_PHOTO];
  }, [trip]);

  const openPhotoPreview = (index: number) => {
    setPhotoPreviewIndex(index);
    setPhotoPreviewOpen(true);
  };

  const performAction = async () => {
    if (!trip || !pending) return;
    setSaving(true);
    try {
      if (pending.kind === 'featured') await setAdminTripFeatured(trip.id, pending.featured);
      if (pending.kind === 'visibility') await setAdminTripVisibility(trip.id, pending.visibility, reason);
      if (pending.kind === 'status') await setAdminTripStatus(trip.id, pending.status, reason);
      toast({ title: 'Trip updated', description: 'The change was recorded in the admin audit log.' });
      setPending(null);
      setReason('');
      setRefreshTick((value) => value + 1);
    } catch (error) {
      toast({ title: 'Trip action failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-36 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!trip) return <div className="space-y-4"><Button asChild variant="ghost"><Link to={backToTripsPath}><ArrowLeft className="mr-2 h-4 w-4" />Back to trips</Link></Button><Card className="p-8 text-center"><p>{errorMessage || 'Trip not found.'}</p></Card></div>;

  return (
    <section className="space-y-5">
      <Button asChild variant="ghost" className="-ml-3"><Link to={backToTripsPath}><ArrowLeft className="mr-2 h-4 w-4" />Back to trips</Link></Button>
      {errorMessage && <Card role="alert" className="border-destructive/30 p-4 text-sm text-destructive">{errorMessage}</Card>}

      <Card className="overflow-hidden border-border/60">
        <div className="relative bg-muted p-1.5 sm:p-2">
          <TripImageCollage images={tripPhotos} title={trip.title || 'Trip'} onOpen={openPhotoPreview} />
          {trip.is_featured && <StatusBadgeComponent className="absolute left-4 top-4 bg-amber-400 text-amber-950"><Star className="mr-1 h-3 w-3 fill-current" />Featured</StatusBadgeComponent>}
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{trip.title || 'Untitled trip'}</h1><StatusBadgeComponent variant="outline" className="capitalize">{trip.status.replace(/_/g, ' ')}</StatusBadgeComponent><StatusBadgeComponent variant="secondary" className="capitalize">{trip.visibility || 'public'}</StatusBadgeComponent></div>
              <p className="mt-2 break-all text-sm text-muted-foreground">{trip.destination || 'No destination'} · {trip.slug || trip.id}</p>
              <Link to={`/user/${trip.creator_id}`} className="mt-4 inline-flex items-center gap-3 rounded-md hover:bg-muted/60">
                <Avatar className="h-10 w-10"><AvatarImage src={trip.creator_avatar || undefined} /><AvatarFallback>{(trip.creator_name || trip.creator_username || 'U').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="text-left"><span className="block text-sm font-medium">{trip.creator_name || 'Unknown creator'}</span><span className="block text-xs text-muted-foreground">@{trip.creator_username || 'unknown'}</span><span className="block font-mono text-[10px] text-muted-foreground">{trip.creator_id}</span></span>
              </Link>
            </div>
            {canManage && <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPending({ kind: 'featured', featured: !trip.is_featured })}>{trip.is_featured ? 'Unfeature' : 'Feature'}</Button>
              {allowedTransitions.map((status) => <Button key={status} variant={status === 'cancelled' ? 'destructive' : 'outline'} onClick={() => setPending({ kind: 'status', status })}>{status === 'draft' ? 'Unpublish' : status === 'in_progress' ? 'Start trip' : status === 'completed' ? 'Complete' : status === 'cancelled' ? 'Cancel trip' : 'Publish'}</Button>)}
              <select aria-label="Change trip visibility" value={trip.visibility || 'public'} onChange={(event) => setPending({ kind: 'visibility', visibility: event.target.value as Exclude<TripVisibility, 'all'> })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="public">Public</option><option value="private">Private</option></select>
            </div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Type" value={trip.trip_type || '-'} /><Stat label="Participants" value={`${trip.current_participants ?? 0}${trip.max_participants ? ` / ${trip.max_participants}` : ''}`} /><Stat label="Price" value={trip.price == null ? '-' : `${trip.currency || ''} ${trip.price}`} /><Stat label="Rating" value={trip.rating_average == null ? '-' : `${Number(trip.rating_average).toFixed(1)} (${trip.rating_count ?? 0})`} /><Stat label="Views" value={trip.view_count ?? 0} />
          </div>
          <p className="text-xs text-muted-foreground">Created {new Date(trip.created_at).toLocaleString()} · Updated {new Date(trip.updated_at).toLocaleString()}</p>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5"><h2 className="font-semibold">Overview</h2><div className="text-sm"><p className="mb-2 text-xs font-medium text-muted-foreground">Description</p><p className="whitespace-pre-wrap leading-relaxed">{trip.description || 'No description.'}</p></div><div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-medium text-muted-foreground">Tags</p><DataDisplay value={trip.tags} /></div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Travel styles</p><DataDisplay value={trip.travel_styles} /></div></div></Card>
        <Card className="space-y-4 p-5"><h2 className="font-semibold">Schedule & itinerary</h2><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Start</dt><dd>{formatDate(trip.start_date)}</dd></div><div><dt className="text-xs text-muted-foreground">End</dt><dd>{formatDate(trip.end_date)}</dd></div><div><dt className="text-xs text-muted-foreground">Meeting point</dt><dd>{trip.meeting_point || '-'}</dd></div><div><dt className="text-xs text-muted-foreground">Duration</dt><dd>{trip.start_date && trip.end_date ? `${Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1)} days` : '-'}</dd></div></dl><div><p className="mb-2 text-xs font-medium text-muted-foreground">Itinerary</p><DataDisplay value={trip.itinerary} /></div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Stops</p><DataDisplay value={trip.stops} /></div></Card>
        <Card className={`p-5 ${trip.trip_type === 'community' ? 'xl:col-span-2' : ''}`}>
          <div className="mb-4">
            <h2 className="font-semibold">Commercial & policies</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pricing, payment, and trip requirements</p>
          </div>
          {[
            trip.budget_mode,
            trip.trip_settings && typeof trip.trip_settings === 'object' ? (trip.trip_settings as Record<string, unknown>).payment_terms : null,
            trip.budget_breakdown,
            trip.requirements,
            trip.currency_settings,
            trip.bookings,
            trip.payments,
          ].some(hasDisplayValue) ? (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <DetailField label="Budget mode" value={trip.budget_mode} />
              <DetailField label="Payment terms" value={trip.trip_settings && typeof trip.trip_settings === 'object' ? (trip.trip_settings as Record<string, unknown>).payment_terms : null} />
              <DetailField label="Budget breakdown" value={trip.budget_breakdown} />
              <DetailField label="Requirements" value={trip.requirements} />
              <DetailField label="Currency settings" value={trip.currency_settings} className="sm:col-span-2" />
              <DetailField label="Bookings" value={trip.bookings} />
              <DetailField label="Payments summary" value={trip.payments} />
            </div>
          ) : (
            <p className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">No commercial or policy details provided.</p>
          )}
        </Card>
        {trip.trip_type !== 'community' && (
          <Card className="space-y-4 p-5"><h2 className="font-semibold">Engagement & reviews</h2><DataDisplay value={trip.analytics} /><div className="flex flex-wrap gap-2"><Badge variant="outline">{trip.rating_count ?? 0} ratings</Badge><Badge variant="outline">{trip.reviews.length} reviews</Badge></div>{trip.reviews.length ? <div className="max-h-96 space-y-3 overflow-y-auto">{trip.reviews.map((review) => <article key={review.id} className="rounded-md border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{review.full_name || review.username || 'Traveler'}</span><Badge variant="outline">{review.rating}/5</Badge></div>{review.title && <h3 className="mt-2 text-sm font-medium">{review.title}</h3>}<p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{review.comment}</p><time className="mt-2 block text-xs text-muted-foreground">{formatDate(review.created_at)}</time></article>)}</div> : <p className="text-sm text-muted-foreground">No reviews.</p>}</Card>
        )}
      </div>

      <Card className="p-5"><h2 className="font-semibold">Members ({trip.members.length})</h2>{trip.members.length ? <div className="mt-3 max-h-[28rem] divide-y overflow-y-auto">{trip.members.map((member) => <Link key={member.user_id} to={`/admin/users/${member.user_id}`} aria-label={`View admin details for ${member.full_name || member.username || 'trip member'}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><Avatar className="h-9 w-9"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback>{(member.full_name || member.username || 'U').slice(0,2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.full_name || member.username || 'User'}</p><p className="truncate text-xs text-muted-foreground">@{member.username || 'unknown'}</p></div><Badge variant="outline" className="capitalize">{member.role || 'member'}{member.is_admin ? ' · admin' : ''}</Badge><Badge variant={member.status === 'active' ? 'secondary' : 'outline'}>{member.status}</Badge><span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(member.joined_at)}</span></Link>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No members.</p>}</Card>

      <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Related reports</h2><Link to="/admin/moderation" className="text-sm text-primary hover:underline">Open Moderation</Link></div>{trip.reports.length ? <div className="mt-3 divide-y">{trip.reports.map((report) => <div key={report.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p className="capitalize">{report.reason.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{formatDate(report.created_at)} · {report.resolution || 'No resolution notes'}</p></div><Badge variant="outline" className="capitalize">{report.status.replace(/_/g, ' ')}</Badge></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No trip reports.</p>}</Card>

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) { setPending(null); setReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm trip change</AlertDialogTitle><AlertDialogDescription>{pending?.kind === 'featured' ? `Are you sure you want to ${pending.featured ? 'feature' : 'unfeature'} this trip?` : pending?.kind === 'visibility' ? `Change trip visibility to ${pending.visibility}?` : `Change trip status from ${trip.status.replace(/_/g, ' ')} to ${pending?.status.replace(/_/g, ' ')}? This may trigger existing trip lifecycle behavior.`}</AlertDialogDescription></AlertDialogHeader>
          {(pending?.kind === 'status' && ['cancelled','draft'].includes(pending.status) || pending?.kind === 'visibility') && <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" rows={3} />}
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>Keep current</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void performAction(); }} className={pending?.kind === 'status' && pending.status === 'cancelled' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}>{saving ? 'Saving…' : 'Confirm change'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className="w-fit max-h-[92dvh] max-w-[94vw] overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:right-3 [&>button]:top-3 [&>button]:h-10 [&>button]:w-10 [&>button]:bg-background [&>button]:text-foreground [&>button]:shadow-md">
          <DialogTitle className="sr-only">{trip.title || 'Trip'} photos</DialogTitle>
          <DialogDescription className="sr-only">Trip photo gallery. Use the previous and next controls to browse photos.</DialogDescription>
          <div className="relative flex h-[min(88dvh,56rem)] w-[min(94vw,80rem)] items-center justify-center bg-black/95">
            <img src={tripPhotos[photoPreviewIndex]} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_TRIP_PHOTO; }} alt={`${trip.title || 'Trip'} photo ${photoPreviewIndex + 1}`} className="max-h-full max-w-full object-contain" />
            {tripPhotos.length > 1 && <>
              <Button type="button" variant="secondary" size="icon" aria-label="Previous trip photo" onClick={() => setPhotoPreviewIndex((index) => (index - 1 + tripPhotos.length) % tripPhotos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg"><ChevronLeft /></Button>
              <Button type="button" variant="secondary" size="icon" aria-label="Next trip photo" onClick={() => setPhotoPreviewIndex((index) => (index + 1) % tripPhotos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg"><ChevronRight /></Button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">{photoPreviewIndex + 1} / {tripPhotos.length}</span>
            </>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
