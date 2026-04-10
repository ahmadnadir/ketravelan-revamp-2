import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Users, Edit, Share2, Heart, X, Trash2, AlertTriangle } from 'lucide-react';
import { TripHeroGallery } from './TripHeroGallery';
import { StickyPriceCard } from './StickyPriceCard';
import { TripDetailTabs } from './TripDetailTabs';
import { GuidedTripWithRelations } from '../../types/guided-trip';
import { getTripById } from '../../services/tripDetailService';
import { deleteTrip } from '../../services/tripService';
import BookingWizard from '../Booking/BookingWizard';
import { CreateTripWizard } from '../CreateTrip/CreateTripWizard';
import { convertTripToFormData } from '../../utils/tripDataConverter';

interface GuidedTripDetailProps {
  tripId: string;
  userRole?: 'agent' | 'customer';
  onEditTrip?: () => void;
  onBookNow?: (departureId: string, participants: number) => void;
  onTripDeleted?: () => void;
}

export const GuidedTripDetail: React.FC<GuidedTripDetailProps> = ({
  tripId,
  userRole = 'customer',
  onEditTrip,
  onBookNow,
  onTripDeleted,
}) => {
  const [trip, setTrip] = useState<GuidedTripWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | undefined>(undefined);
  const [selectedParticipants, setSelectedParticipants] = useState<number>(1);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await getTripById(tripId);
      setTrip(data);
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: trip?.title,
        text: trip?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleBookNow = (departureId: string, participants: number) => {
    if (onBookNow) {
      onBookNow(departureId, participants);
    } else {
      setSelectedDepartureId(departureId);
      setSelectedParticipants(participants);
      setShowBookingWizard(true);
    }
  };

  const handleEditTrip = () => {
    if (onEditTrip) {
      onEditTrip();
    } else {
      setShowEditWizard(true);
    }
  };

  const handleEditComplete = () => {
    setShowEditWizard(false);
    loadTrip();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    const success = await deleteTrip(tripId);
    if (success) {
      setShowDeleteConfirmation(false);
      if (onTripDeleted) {
        onTripDeleted();
      } else {
        window.history.back();
      }
    } else {
      alert('Failed to delete trip. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-gray-300 h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg lg:rounded-xl mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="h-10 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl p-6 h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Trip not found</p>
        </div>
      </div>
    );
  }

  const location = trip.locations && trip.locations.length > 0
    ? trip.locations.map(loc => loc.place_name).join(' • ')
    : 'Location TBA';

  const galleryImages: string[] = [
    ...(trip.cover_photo_url ? [trip.cover_photo_url] : []),
    ...(trip.gallery && trip.gallery.length > 0 ? trip.gallery.map(g => g.image_url) : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <TripHeroGallery images={galleryImages} tripTitle={trip.title || 'Trip'} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                    {trip.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-500" />
                      <span className="line-clamp-1">{location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-500" />
                      <span>{trip.trip_duration_days || 0} days</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-500" />
                      <span>Up to {trip.max_participants || 0} people</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2.5 rounded-full border transition-all ${
                      isFavorite
                        ? 'bg-red-50 border-red-300 text-red-600 scale-100'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 active:scale-95'
                    }`}
                    aria-label="Add to favorites"
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''} transition-transform`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all"
                    aria-label="Share trip"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  {userRole === 'agent' && (
                    <>
                      <button
                        onClick={handleEditTrip}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit Trip</span>
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {trip.status === 'draft' && userRole === 'agent' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    This trip is in draft mode and not visible to customers yet.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <TripDetailTabs trip={trip} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <StickyPriceCard
                tripTitle={trip.title || 'Trip'}
                location={location}
                basePrice={trip.base_price || 0}
                departures={trip.departures || []}
                maxParticipants={trip.max_participants || 1}
                onBookNow={handleBookNow}
              />
            </div>
          </div>
        </div>
      </div>

      {!showBookingWizard && (
      <div className="lg:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 z-[70]">
        <div className="px-4 pb-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-shrink-0">
                <div className="text-xs text-gray-600 font-medium mb-0.5">From</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  RM {(trip.base_price || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">per person</div>
              </div>
              <button
                onClick={() => handleBookNow(trip.departures?.[0]?.id || '', 1)}
                disabled={!trip.departures || trip.departures.length === 0}
                className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3.5 sm:py-4 px-5 sm:px-6 rounded-xl font-semibold hover:from-gray-800 hover:to-gray-700 active:scale-95 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {showBookingWizard && trip && (
        <BookingWizard
          trip={trip}
          initialDepartureId={selectedDepartureId}
          initialParticipants={selectedParticipants}
          onClose={() => setShowBookingWizard(false)}
        />
      )}

      {showEditWizard && trip && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
              <button
                onClick={() => setShowEditWizard(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="font-medium">Close Editor</span>
              </button>
            </div>
          </div>
          <CreateTripWizard
            tripId={trip.id}
            initialData={convertTripToFormData(trip)}
            onComplete={handleEditComplete}
          />
        </div>
      )}

      {showDeleteConfirmation && trip && (
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
                {trip.title || 'Untitled Trip'}
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
