import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Users, DollarSign, Clock, Edit2, Eye, Trash2, AlertTriangle, X } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';
import { supabase } from '../../lib/supabase';
import { deleteTrip } from '../../services/tripService';

interface AgentDashboardProps {
  onViewTrip: (tripId: string) => void;
  onCreateTrip: () => void;
}

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  num_participants: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  payment_mode: string;
  created_at: string;
  confirmed_at?: string;
  trip?: {
    title: string;
    cover_photo_url?: string;
  };
  departure?: {
    start_date: string;
    end_date: string;
  };
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  onViewTrip,
  onCreateTrip,
}) => {
  const [trips, setTrips] = useState<GuidedTripWithRelations[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeView, setActiveView] = useState<'trips' | 'bookings'>('trips');
  const [stats, setStats] = useState({
    totalTrips: 0,
    publishedTrips: 0,
    draftTrips: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    tripId: string | null;
    tripTitle: string | null;
  }>({
    isOpen: false,
    tripId: null,
    tripTitle: null,
  });

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleDeleteClick = (tripId: string, tripTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      tripId,
      tripTitle,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.tripId) return;

    const success = await deleteTrip(deleteConfirmation.tripId);

    if (success) {
      setDeleteConfirmation({ isOpen: false, tripId: null, tripTitle: null });
      loadAgentData();
    } else {
      alert('Failed to delete trip. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, tripId: null, tripTitle: null });
  };

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: tripsData } = await supabase
        .from('guided_trips')
        .select(`
          *,
          locations:guided_trip_locations (*),
          departures:guided_trip_departure_dates (*),
          inclusions:guided_trip_inclusions (*),
          exclusions:guided_trip_exclusions (*),
          gallery:guided_trip_gallery (*),
          qr_codes:guided_trip_qr_codes (*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      const agentTrips = tripsData || [];
      setTrips(agentTrips);

      const publishedCount = agentTrips.filter(t => t.status === 'published').length;
      const draftCount = agentTrips.filter(t => t.status === 'draft').length;

      const { data: bookingsData } = await supabase
        .from('guided_bookings')
        .select(`
          *,
          trip:guided_trips(title, cover_photo_url),
          departure:guided_trip_departure_dates(start_date, end_date)
        `)
        .in('trip_id', agentTrips.map(t => t.id))
        .order('created_at', { ascending: false });

      const totalRevenue = bookingsData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalBookings = bookingsData?.length || 0;

      setBookings(bookingsData || []);
      setStats({
        totalTrips: agentTrips.length,
        publishedTrips: publishedCount,
        draftTrips: draftCount,
        totalBookings,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-end gap-3 mb-8">
          <button
            onClick={onCreateTrip}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-bold"
          >
            <Plus className="w-5 h-5" />
            Create Guided Trip
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Total Trips</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalTrips}</p>
            <div className="mt-2 text-sm text-gray-500">
              {stats.publishedTrips} published, {stats.draftTrips} draft
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
            <div className="mt-2 text-sm text-gray-500">Across all trips</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              RM {stats.totalRevenue.toLocaleString()}
            </p>
            <div className="mt-2 text-sm text-gray-500">All-time earnings</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Draft Trips</p>
            <p className="text-3xl font-bold text-gray-900">{stats.draftTrips}</p>
            <div className="mt-2 text-sm text-gray-500">Ready to publish</div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveView('trips')}
            className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
              activeView === 'trips'
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Your Trips ({trips.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('bookings')}
            className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
              activeView === 'bookings'
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              <span>Bookings ({bookings.length})</span>
            </div>
          </button>
        </div>

        {activeView === 'trips' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">Your Trips</h2>
              <p className="text-gray-600 mt-1">Manage and edit your guided trips</p>
            </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">No trips created yet</p>
              <button
                onClick={onCreateTrip}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Your First Trip
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {trips.map((trip) => {
                const location = trip.locations?.[0];
                const departures = trip.departures || [];

                const coverPhoto = trip.cover_photo_url || trip.cover_image_url;

                return (
                  <div
                    key={trip.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="flex-shrink-0 w-full sm:w-32 h-44 sm:h-32 rounded-lg overflow-hidden bg-gray-200">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto}
                            alt={trip.title || 'Trip'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {trip.title || 'Untitled Trip'}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  trip.status === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {trip.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            {location && (
                              <p className="text-gray-600 mb-2">
                                {location.place_name}
                                {location.country && `, ${location.country}`}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {trip.trip_duration_days} days
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                Up to {trip.max_participants} people
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {departures.length} departure{departures.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <p className="text-2xl font-bold text-gray-900">
                              RM {(trip.base_price || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">per person</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                          <button
                            onClick={() => onViewTrip(trip.id)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Trip
                          </button>
                          <button
                            onClick={() => onViewTrip(trip.id)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id, trip.title || 'Untitled Trip')}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {activeView === 'bookings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">Trip Bookings</h2>
              <p className="text-gray-600 mt-1">Monitor and manage customer bookings</p>
            </div>

            {bookings.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No bookings yet</p>
                <p className="text-gray-500 text-sm">Bookings from customers will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <div className="flex-shrink-0 w-full sm:w-24 h-40 sm:h-24 rounded-lg overflow-hidden bg-gray-200">
                        {booking.trip?.cover_photo_url ? (
                          <img
                            src={booking.trip.cover_photo_url}
                            alt={booking.trip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {booking.trip?.title || 'Trip'}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Ref: <span className="font-bold">{booking.booking_reference}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              RM {booking.total_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {booking.payment_mode === 'full' ? 'Full Payment' :
                               booking.payment_mode === 'deposit_installments' ? 'Deposit + Installments' :
                               'Deposit + Final'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Customer</p>
                            <p className="font-medium text-gray-900">{booking.customer_name}</p>
                            <p className="text-xs text-gray-500">{booking.customer_email}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Trip Dates</p>
                            <p className="font-medium text-gray-900">
                              {booking.departure ? new Date(booking.departure.start_date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {booking.departure ? `${Math.ceil((new Date(booking.departure.end_date).getTime() - new Date(booking.departure.start_date).getTime()) / (1000 * 60 * 60 * 24))} days` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Participants</p>
                            <p className="font-medium text-gray-900">{booking.num_participants} pax</p>
                            <p className="text-xs text-gray-500">RM {(booking.total_amount / booking.num_participants).toLocaleString()} / person</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Booked On</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.created_at).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(booking.created_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.booking_status === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-800' :
                            booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            booking.booking_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.booking_status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            booking.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            booking.payment_status === 'unpaid' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Payment: {booking.payment_status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Trip</h3>
              </div>
              <button
                onClick={handleDeleteCancel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this trip?
              </p>
              <p className="text-gray-900 font-semibold bg-gray-50 p-3 rounded-lg">
                {deleteConfirmation.tripTitle}
              </p>
              <p className="text-red-600 text-sm mt-3">
                This action cannot be undone. All trip data, including bookings and departure dates, will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
