import React, { useState } from 'react';
import { MapPin, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';

interface TripCardProps {
  trip: GuidedTripWithRelations;
  onViewTrip: (tripId: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onViewTrip }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const getLocation = () => {
    if (trip.locations && trip.locations.length > 0) {
      return trip.locations.map(loc => loc.place_name).join(', ');
    }
    return 'Location TBA';
  };

  const getMinPrice = () => {
    return trip.base_price || 0;
  };

  const getSlotsLeft = () => {
    if (typeof trip.max_participants === 'number') {
      if (typeof trip.current_participants === 'number') {
        return Math.max(trip.max_participants - trip.current_participants, 0);
      }

      if (trip.departures && trip.departures.length > 0) {
        const earliestDeparture = trip.departures[0];
        return Math.max(earliestDeparture.max_capacity - earliestDeparture.booked_pax, 0);
      }
    }

    return null;
  };

  const slotsLeft = getSlotsLeft();

  const images: string[] = [];
  const coverPhoto = trip.cover_photo_url || trip.cover_image_url;
  if (coverPhoto) {
    images.push(coverPhoto);
  }
  if (trip.gallery && trip.gallery.length > 0) {
    images.push(...trip.gallery.map(g => g.image_url));
  }

  const hasMultipleImages = images.length > 1;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      e.stopPropagation();
      if (distance > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div
      onClick={() => onViewTrip(trip.id)}
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="relative h-48 overflow-hidden group">
        {images.length > 0 ? (
          <>
            <div
              className="relative w-full h-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={images[currentImageIndex]}
                alt={trip.title || 'Trip'}
                className="w-full h-full object-cover transition-transform duration-300"
              />
            </div>

            {hasMultipleImages && (
              <>
                <button
                  onClick={previousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-900" />
                </button>

                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4 text-gray-900" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => goToImage(index, e)}
                      className={`transition-all ${
                        index === currentImageIndex
                          ? 'w-6 h-1.5 bg-white'
                          : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'
                      } rounded-full`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
        )}

        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold shadow-md z-10">
          RM {getMinPrice().toLocaleString()}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {trip.title || 'Untitled Trip'}
        </h3>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{getLocation()}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{trip.trip_duration_days || 0} days</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Up to {trip.max_participants || 0} pax</span>
            </div>
          </div>
        </div>

        {slotsLeft !== null && (
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {slotsLeft} slot{slotsLeft === 1 ? '' : 's'} left
          </div>
        )}

        {trip.departures && trip.departures.length > 0 && (
          <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
            Next departure:{' '}
            {new Date(trip.departures[0].start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        )}
      </div>
    </div>
  );
};
