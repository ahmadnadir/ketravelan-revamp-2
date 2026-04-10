import React, { useState } from 'react';
import { Calendar, Users, MapPin } from 'lucide-react';
import { TripDepartureDate } from '../../types/guided-trip';

interface StickyPriceCardProps {
  tripTitle: string;
  location: string;
  basePrice: number;
  departures: TripDepartureDate[];
  maxParticipants: number;
  onBookNow: (departureId: string, participants: number) => void;
}

export const StickyPriceCard: React.FC<StickyPriceCardProps> = ({
  tripTitle,
  location,
  basePrice,
  departures,
  maxParticipants,
  onBookNow,
}) => {
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>(
    departures[0]?.id || ''
  );
  const [participants, setParticipants] = useState<number>(1);

  const selectedDeparture = departures.find((d) => d.id === selectedDepartureId);
  const availableSeats = selectedDeparture
    ? selectedDeparture.max_capacity - selectedDeparture.booked_pax
    : 0;
  const pricePerPerson = selectedDeparture?.price_per_person ?? basePrice;
  const totalPrice = pricePerPerson * participants;
  const isAvailable = selectedDeparture?.is_available ?? false;
  const canBook = isAvailable && availableSeats > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleBookNow = () => {
    if (selectedDepartureId) {
      onBookNow(selectedDepartureId, participants);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 sm:p-6">
        <div className="text-white">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl sm:text-4xl font-bold">
              RM {pricePerPerson.toLocaleString()}
            </span>
            <span className="text-gray-300 text-sm">/ person</span>
          </div>
          <p className="text-xs text-gray-400">Starting price</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">
            <Calendar className="inline w-4 h-4 mr-1.5 text-gray-600" />
            Select Departure Date
          </label>
          <select
            value={selectedDepartureId}
            onChange={(e) => setSelectedDepartureId(e.target.value)}
            className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
          >
            {departures.map((departure) => {
              const seats = departure.max_capacity - departure.booked_pax;
              return (
                <option key={departure.id} value={departure.id}>
                  {formatDate(departure.start_date)} - {formatDate(departure.end_date)}
                  {!departure.is_available
                    ? ' (Unavailable)'
                    : seats === 0
                    ? ' (Fully Booked)'
                    : ` (${seats} seats left)`}
                </option>
              );
            })}
          </select>
          {selectedDeparture && (
            <div className="mt-2.5 flex items-center gap-2">
              {availableSeats === 0 || !selectedDeparture.is_available ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Fully booked
                </span>
              ) : availableSeats <= 5 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                  Only {availableSeats} {availableSeats === 1 ? 'seat' : 'seats'} remaining — filling fast!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {availableSeats} seats remaining
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">
            <Users className="inline w-4 h-4 mr-1.5 text-gray-600" />
            Number of Travelers
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setParticipants(Math.max(1, participants - 1))}
              disabled={participants <= 1}
              className="w-11 h-11 flex items-center justify-center border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-bold text-lg"
            >
              −
            </button>
            <input
              type="number"
              value={participants}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                const maxAllowed = Math.min(availableSeats, maxParticipants);
                setParticipants(Math.max(1, Math.min(maxAllowed, val)));
              }}
              min={1}
              max={Math.min(availableSeats, maxParticipants)}
              className="flex-1 text-center px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
            />
            <button
              onClick={() => {
                const maxAllowed = Math.min(availableSeats, maxParticipants);
                setParticipants(Math.min(maxAllowed, participants + 1));
              }}
              disabled={participants >= Math.min(availableSeats, maxParticipants)}
              className="w-11 h-11 flex items-center justify-center border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white font-bold text-lg"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Max {Math.min(availableSeats, maxParticipants)} per booking
          </p>
        </div>

        <div className="pt-5 border-t-2 border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-medium">Total Price</span>
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              RM {totalPrice.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleBookNow}
            disabled={!selectedDepartureId || !canBook}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3.5 px-6 rounded-lg font-bold hover:from-gray-800 hover:to-gray-700 active:scale-95 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20 text-sm sm:text-base"
          >
            {!isAvailable ? 'Unavailable' : availableSeats === 0 ? 'Fully Booked' : 'Book Now'}
          </button>
        </div>

        <div className="pt-5 border-t border-gray-100 space-y-3">
          <div className="flex items-start gap-2.5 text-sm text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
            <span className="leading-relaxed">{location}</span>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-xs text-green-800 font-medium">
              Free cancellation up to 30 days before departure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
