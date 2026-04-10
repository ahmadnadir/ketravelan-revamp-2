import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';
import { getPublishedTrips } from '../../services/tripDetailService';
import { TripCard } from './TripCard';

interface TripListProps {
  onViewTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  userRole?: 'agent' | 'customer';
}

export const TripList: React.FC<TripListProps> = ({
  onViewTrip,
  onCreateTrip,
  userRole = 'customer',
}) => {
  const [trips, setTrips] = useState<GuidedTripWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await getPublishedTrips();
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Discover Trips</h1>
            <p className="text-gray-600 mt-2">
              {trips.length} guided trip{trips.length !== 1 ? 's' : ''} available
            </p>
          </div>
          {userRole === 'agent' && (
            <button
              onClick={onCreateTrip}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create Trip
            </button>
          )}
        </div>

        {trips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No trips available yet.</p>
            {userRole === 'agent' && (
              <button
                onClick={onCreateTrip}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Your First Trip
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onViewTrip={onViewTrip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
