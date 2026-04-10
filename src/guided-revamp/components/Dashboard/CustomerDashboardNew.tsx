import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Package, CreditCard, MessageCircle, SlidersHorizontal, MapPin, Search, X, Check, CalendarDays } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';
import { getPublishedTrips } from '../../services/tripDetailService';
import { TripCard } from '../TripList/TripCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { getFirstPendingPayment } from '../../services/bookingService';
import { initiatePayment } from '../../services/paymentService';
import TripRoom from '../TripRoom/TripRoom';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { TripFilterDrawer, type FilterState } from '@/components/explore/TripFilterDrawer';
import { BudgetRangeSelector } from '@/components/explore/BudgetTierSelector';
import { formatBudgetRange, isDefaultBudgetRange } from '@/components/explore/BudgetTierSelector';
import { AppliedFiltersBar } from '@/components/explore/AppliedFiltersBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tripCategories } from '@/data/categories';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Switch } from '@/components/ui/switch';

interface Booking {
  id: string;
  booking_reference: string;
  trip_id: string;
  departure_id: string;
  customer_name: string;
  customer_email: string;
  num_participants: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  created_at: string;
  trip: {
    title: string;
    cover_photo_url: string;
  };
  departure: {
    start_date: string;
    end_date: string;
  };
}

interface CustomerDashboardProps {
  onViewTrip: (tripId: string) => void;
}

const defaultFilters: FilterState = {
  destination: '',
  dates: undefined,
  flexibleDates: false,
  budgetRange: [0, 10000],
  categories: [],
  currency: 'MYR',
};

export const CustomerDashboardNew: React.FC<CustomerDashboardProps> = ({
  onViewTrip,
}) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'bookings'>('discover');
  const [discoverTab, setDiscoverTab] = useState<'upcoming' | 'past'>('upcoming');
  const [activePanel, setActivePanel] = useState<'where' | 'when' | 'budget' | 'styles' | null>(null);
  const [destQuery, setDestQuery] = useState('');
  const [trips, setTrips] = useState<GuidedTripWithRelations[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const desktopBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, user?.email, profile?.email]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'discover') {
        const data = await getPublishedTrips();
        setTrips(data);
      } else {
        await loadBookings();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    const customerEmail = user?.email || profile?.email;
    if (!customerEmail) {
      setBookings([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('guided_bookings')
        .select(`
          *,
          trip:guided_trips(title, cover_photo_url),
          departure:guided_trip_departure_dates(start_date, end_date)
        `)
        .ilike('customer_email', customerEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.destination) count++;
    if (appliedFilters.flexibleDates || appliedFilters.dates?.from) count++;
    if (!isDefaultBudgetRange(appliedFilters.budgetRange)) count++;
    count += appliedFilters.categories.length;
    return count;
  }, [appliedFilters]);

  const hasActiveFilters = activeFilterCount > 0;
  const searchDisplayText = appliedFilters.destination || 'Where do you want to go?';

  const destinationOptions = useMemo(() => {
    return Array.from(
      new Set(
        trips.flatMap((trip) =>
          (trip.locations || [])
            .map((loc) => [loc.place_name, loc.country].filter(Boolean).join(', '))
            .filter(Boolean)
        )
      )
    );
  }, [trips]);

  const filteredDestinationOptions = useMemo(() => {
    if (!destQuery.trim()) {
      return destinationOptions.slice(0, 16);
    }
    const query = destQuery.toLowerCase();
    return destinationOptions
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 16);
  }, [destQuery, destinationOptions]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (desktopBarRef.current && !desktopBarRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredTrips = useMemo(() => {
    const [minBudget, maxBudget] = appliedFilters.budgetRange;
    const selectedStyleLabels = appliedFilters.categories
      .map((id) => tripCategories.find((c) => c.id === id)?.label.toLowerCase())
      .filter((label): label is string => Boolean(label));

    return trips.filter((trip) => {
      const textBlob = [trip.title, trip.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const destinationQuery = appliedFilters.destination.toLowerCase();
      const destinationMatch =
        !destinationQuery ||
        textBlob.includes(destinationQuery) ||
        (trip.locations || []).some((loc) =>
          [loc.place_name, loc.country]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(destinationQuery)
        );

      const budgetMatch =
        trip.base_price == null ||
        (trip.base_price >= minBudget && trip.base_price <= maxBudget);

      const styleMatch =
        selectedStyleLabels.length === 0 ||
        selectedStyleLabels.some((label) => textBlob.includes(label));

      let dateMatch = true;
      if (!appliedFilters.flexibleDates && appliedFilters.dates?.from) {
        const from = appliedFilters.dates.from;
        const to = appliedFilters.dates.to ?? appliedFilters.dates.from;
        dateMatch = (trip.departures || []).some((dep) => {
          const start = new Date(dep.start_date);
          const end = new Date(dep.end_date);
          return start <= to && end >= from;
        });
      }

      return destinationMatch && budgetMatch && styleMatch && dateMatch;
    });
  }, [trips, appliedFilters]);

  const displayedTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = filteredTrips.filter((trip) => {
      const departures = trip.departures || [];
      if (departures.length === 0) return true;
      return departures.some((dep) => new Date(dep.end_date) >= today);
    });

    const past = filteredTrips.filter((trip) => {
      const departures = trip.departures || [];
      if (departures.length === 0) return false;
      return departures.every((dep) => new Date(dep.end_date) < today);
    });

    return discoverTab === 'upcoming' ? upcoming : past;
  }, [filteredTrips, discoverTab]);

  const handleRetryPayment = async (booking: Booking) => {
    try {
      const firstPendingPayment = await getFirstPendingPayment(booking.id);

      if (!firstPendingPayment) {
        alert('No pending payments found for this booking.');
        return;
      }

      const paymentResult = await initiatePayment({
        bookingId: booking.id,
        paymentScheduleId: firstPendingPayment.id,
        amount: firstPendingPayment.amount,
        customerEmail: booking.customer_email || profile?.email || '',
        customerName: booking.customer_name,
        bookingReference: booking.booking_reference,
      });

      if (!paymentResult.success || !paymentResult.redirectUrl) {
        alert(paymentResult.error || 'Failed to initiate payment');
        return;
      }

      localStorage.setItem('pending_booking', JSON.stringify({
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        paymentIntentId: paymentResult.paymentIntentId,
        paymentScheduleId: firstPendingPayment.id,
        departureId: booking.departure_id,
        numParticipants: booking.num_participants,
      }));

      window.location.href = paymentResult.redirectUrl;
    } catch (error) {
      console.error('Error initiating retry payment:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: 'bg-green-100 text-green-800 border border-green-200', label: 'Confirmed' };
      case 'awaiting_payment':
        return { color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', label: 'Awaiting Payment' };
      case 'partially_paid':
        return { color: 'bg-orange-100 text-orange-800 border border-orange-200', label: 'Partially Paid' };
      case 'payment_failed':
        return { color: 'bg-red-100 text-red-800 border border-red-200', label: 'Payment Failed' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Cancelled' };
      case 'completed':
        return { color: 'bg-blue-100 text-blue-800 border border-blue-200', label: 'Completed' };
      case 'pending':
        return { color: 'bg-blue-50 text-blue-700 border border-blue-200', label: 'Pending' };
      default:
        return { color: 'bg-gray-100 text-gray-600 border border-gray-200', label: status };
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { color: 'bg-green-100 text-green-800 border border-green-200', label: 'Paid' };
      case 'partial':
        return { color: 'bg-orange-100 text-orange-800 border border-orange-200', label: 'Partially Paid' };
      case 'unpaid':
        return { color: 'bg-red-100 text-red-700 border border-red-200', label: 'Unpaid' };
      case 'refunded':
        return { color: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Refunded' };
      default:
        return { color: 'bg-gray-100 text-gray-600 border border-gray-200', label: status };
    }
  };

  const canRetryPayment = (booking: Booking) => {
    if (booking.booking_status === 'cancelled' || booking.booking_status === 'completed') {
      return false;
    }

    return booking.payment_status !== 'paid' && booking.payment_status !== 'refunded';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discover Guided Trip</h1>
        <SegmentedControl
          options={[
            { label: 'Explore', value: 'discover' },
            { label: 'My Booking', value: 'bookings' },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as 'discover' | 'bookings')}
        />
      </div>

      {activeTab === 'discover' && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
            <div ref={desktopBarRef} className="hidden lg:block relative">
            <div className="flex items-stretch bg-card rounded-2xl shadow-sm border border-border overflow-visible">
              <button
                onClick={() => setActivePanel(activePanel === 'where' ? null : 'where')}
                className="flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border hover:bg-secondary/60"
              >
                <span className="text-xs font-semibold text-foreground mb-0.5">Where</span>
                <span className={cn(
                  'text-sm truncate max-w-[160px]',
                  appliedFilters.destination ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {appliedFilters.destination || 'Search destinations'}
                </span>
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'when' ? null : 'when')}
                className="flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border hover:bg-secondary/60"
              >
                <span className="text-xs font-semibold text-foreground mb-0.5">When</span>
                <span className={cn(
                  'text-sm',
                  (appliedFilters.flexibleDates || appliedFilters.dates?.from) ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {appliedFilters.flexibleDates
                    ? 'Flexible'
                    : appliedFilters.dates?.from
                      ? 'Selected dates'
                      : 'Add dates'}
                </span>
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'budget' ? null : 'budget')}
                className="flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border hover:bg-secondary/60"
              >
                <span className="text-xs font-semibold text-foreground mb-0.5">Budget</span>
                <span className={cn(
                  'text-sm',
                  !isDefaultBudgetRange(appliedFilters.budgetRange) ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {isDefaultBudgetRange(appliedFilters.budgetRange)
                    ? 'Any budget'
                    : formatBudgetRange(appliedFilters.budgetRange, 'MYR')}
                </span>
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'styles' ? null : 'styles')}
                className="flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border hover:bg-secondary/60"
              >
                <span className="text-xs font-semibold text-foreground mb-0.5">Travel Styles</span>
                <span className={cn(
                  'text-sm truncate max-w-[160px]',
                  appliedFilters.categories.length > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {appliedFilters.categories.length > 0 ? 'Selected styles' : 'Any style'}
                </span>
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="relative flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors rounded-r-2xl"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 w-5 h-5 bg-white/25 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {activePanel && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-2xl shadow-xl z-50 p-5">
                {activePanel === 'where' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        autoFocus
                        value={destQuery}
                        onChange={(e) => setDestQuery(e.target.value)}
                        placeholder="Search city, country, or region..."
                        className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {destQuery && (
                        <button onClick={() => setDestQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {appliedFilters.destination && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium flex-1">{appliedFilters.destination}</span>
                        <button onClick={() => setAppliedFilters((f) => ({ ...f, destination: '' }))}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {filteredDestinationOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No locations found</p>
                      ) : (
                        filteredDestinationOptions.map((item) => (
                          <button
                            key={item}
                            onClick={() => {
                              setAppliedFilters((f) => ({ ...f, destination: item }));
                              setDestQuery('');
                              setActivePanel(null);
                            }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-sm font-medium">{item}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activePanel === 'when' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Flexible dates</p>
                          <p className="text-xs text-muted-foreground">I'm open to any dates</p>
                        </div>
                      </div>
                      <Switch
                        checked={appliedFilters.flexibleDates}
                        onCheckedChange={(checked) =>
                          setAppliedFilters((f) => ({ ...f, flexibleDates: checked, dates: checked ? undefined : f.dates }))
                        }
                      />
                    </div>

                    {!appliedFilters.flexibleDates && (
                      <div className="flex flex-col items-center gap-3">
                        <DateCalendar
                          mode="range"
                          selected={appliedFilters.dates}
                          onSelect={(range: DateRange | undefined) => {
                            setAppliedFilters((f) => ({ ...f, dates: range }));
                            if (range?.from && range?.to) {
                              setActivePanel(null);
                            }
                          }}
                          numberOfMonths={2}
                          className="rounded-xl"
                        />
                        {appliedFilters.dates?.from && (
                          <button
                            onClick={() => setAppliedFilters((f) => ({ ...f, dates: undefined }))}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Clear dates
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activePanel === 'budget' && (
                  <div className="max-w-md mx-auto py-2">
                    <BudgetRangeSelector
                      value={appliedFilters.budgetRange}
                      onChange={(range) => setAppliedFilters((f) => ({ ...f, budgetRange: range }))}
                      currency="MYR"
                    />
                  </div>
                )}

                {activePanel === 'styles' && (
                  <div className="flex flex-wrap gap-2">
                    {tripCategories.map((cat) => {
                      const isSelected = appliedFilters.categories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setAppliedFilters((f) => ({
                              ...f,
                              categories: isSelected
                                ? f.categories.filter((c) => c !== cat.id)
                                : [...f.categories, cat.id],
                            }));
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all border',
                            isSelected
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-secondary text-foreground hover:bg-secondary/80 border-transparent'
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>

            <div className="lg:hidden bg-card rounded-xl p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="flex-1 flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors text-left"
                >
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className={cn(
                    'text-sm truncate',
                    appliedFilters.destination ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {searchDisplayText}
                  </span>
                </button>
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="relative p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  <SlidersHorizontal className="h-5 w-5 text-foreground" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {hasActiveFilters && (
                <AppliedFiltersBar
                  destination={appliedFilters.destination}
                  dates={appliedFilters.dates}
                  flexibleDates={appliedFilters.flexibleDates}
                  budgetRange={appliedFilters.budgetRange}
                  categories={appliedFilters.categories}
                  currency={appliedFilters.currency}
                  onClear={() => setAppliedFilters(defaultFilters)}
                  onEdit={() => setIsFilterDrawerOpen(true)}
                />
              )}

              <Button
                className="w-full rounded-xl h-14"
                onClick={() => setIsFilterDrawerOpen(true)}
                variant={hasActiveFilters ? 'default' : 'secondary'}
              >
                {hasActiveFilters ? `View ${displayedTrips.length} Trips` : 'Search Trips'}
              </Button>
            </div>

            <div className="mt-5">
              <SegmentedControl
                options={[
                  { label: 'Upcoming', value: 'upcoming' },
                  { label: 'Past', value: 'past' },
                ]}
                value={discoverTab}
                onChange={(value) => setDiscoverTab(value as 'upcoming' | 'past')}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Found {displayedTrips.length} {discoverTab} trips</span>
              <span className="text-muted-foreground hidden sm:block">Showing prices in Malaysian Ringgit (RM)</span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {displayedTrips.length === trips.length
                    ? 'All Trips'
                    : `${displayedTrips.length} Trip${displayedTrips.length !== 1 ? 's' : ''} Found`}
                </h2>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setAppliedFilters(defaultFilters)}
                    className="text-gray-900 hover:text-gray-700 text-sm font-medium mt-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {displayedTrips.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No trips found</p>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onViewTrip={onViewTrip} />
                ))}
              </div>
            )}
          </div>

          <TripFilterDrawer
            open={isFilterDrawerOpen}
            onOpenChange={setIsFilterDrawerOpen}
            filters={appliedFilters}
            onApply={(filters) => setAppliedFilters(filters)}
            onReset={() => setAppliedFilters(defaultFilters)}
            matchingCount={filteredTrips.length}
          />
        </>
      )}

      {activeTab === 'bookings' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h2>

          {bookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No bookings yet</p>
              <p className="text-gray-500 mb-6">Start exploring trips and book your adventure!</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
              >
                Discover Trips
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <div className="flex-shrink-0 w-full sm:w-32 h-44 sm:h-32 rounded-lg overflow-hidden bg-gray-200">
                        {booking.trip?.cover_photo_url ? (
                          <img
                            src={booking.trip.cover_photo_url}
                            alt={booking.trip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {booking.trip?.title || 'Trip'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Booking Reference: <span className="font-bold">{booking.booking_reference}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(booking.total_amount)}
                            </p>
                            <p className="text-sm text-gray-500">Total</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Trip Dates</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(booking.departure?.start_date)} - {formatDate(booking.departure?.end_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Participants</p>
                            <p className="font-medium text-gray-900">{booking.num_participants} person(s)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {(() => {
                            const b = getBookingStatusBadge(booking.booking_status);
                            return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${b.color}`}>{b.label}</span>;
                          })()}
                          {(() => {
                            const p = getPaymentStatusBadge(booking.payment_status);
                            return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${p.color}`}><CreditCard className="w-3 h-3" />{p.label}</span>;
                          })()}
                          {canRetryPayment(booking) && (
                            <button
                              onClick={() => handleRetryPayment(booking)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                              {booking.booking_status === 'awaiting_payment' ? 'Pay Now' : 'Continue Payment'}
                            </button>
                          )}
                          {booking.booking_status === 'confirmed' && (
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Open Trip Room
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedBooking && (
        <TripRoom
          bookingId={selectedBooking.id}
          bookingReference={selectedBooking.booking_reference}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};
