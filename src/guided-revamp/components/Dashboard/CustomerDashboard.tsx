import React, { useEffect, useState } from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';
import { getPublishedTrips } from '../../services/tripDetailService';
import { TripCard } from '../TripList/TripCard';

interface CustomerDashboardProps {
  onViewTrip: (tripId: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onViewTrip,
}) => {
  const [trips, setTrips] = useState<GuidedTripWithRelations[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<GuidedTripWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [searchQuery, selectedCountry, trips]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await getPublishedTrips();
      setTrips(data);
      setFilteredTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = trips;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.title?.toLowerCase().includes(query) ||
          trip.description?.toLowerCase().includes(query) ||
          trip.locations?.some((loc) =>
            loc.place_name.toLowerCase().includes(query) ||
            loc.country?.toLowerCase().includes(query)
          )
      );
    }

    if (selectedCountry && selectedCountry !== 'all') {
      filtered = filtered.filter((trip) =>
        trip.locations?.some((loc) => loc.country === selectedCountry)
      );
    }

    setFilteredTrips(filtered);
  };

  const countries = Array.from(
    new Set(
      trips.flatMap((trip) =>
        trip.locations?.map((loc) => loc.country).filter(Boolean) || []
      )
    )
  ).sort();

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
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">Discover Your Next Adventure</h1>
            <p className="text-xl text-gray-300">
              Explore {trips.length} guided trip{trips.length !== 1 ? 's' : ''} around the world
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search destinations, activities, or trip names..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 appearance-none cursor-pointer"
                    >
                      <option value="all">All Countries</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredTrips.length === trips.length
                ? 'All Trips'
                : `${filteredTrips.length} Trip${filteredTrips.length !== 1 ? 's' : ''} Found`}
            </h2>
            {(searchQuery || selectedCountry !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCountry('all');
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No trips found</p>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onViewTrip={onViewTrip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
