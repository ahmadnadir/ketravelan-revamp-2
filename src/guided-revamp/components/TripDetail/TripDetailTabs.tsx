import React, { useState } from 'react';
import { Info, Map, CheckCircle, FileText } from 'lucide-react';
import { GuidedTripWithRelations } from '../../types/guided-trip';

interface TripDetailTabsProps {
  trip: GuidedTripWithRelations;
}

type TabId = 'details' | 'itinerary' | 'inclusions' | 'policies';

export const TripDetailTabs: React.FC<TripDetailTabsProps> = ({ trip }) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const tabs = [
    { id: 'details' as TabId, label: 'Trip Details', icon: Info },
    { id: 'itinerary' as TabId, label: 'Itinerary', icon: Map },
    { id: 'inclusions' as TabId, label: 'Inclusions', icon: CheckCircle },
    { id: 'policies' as TabId, label: 'Policies', icon: FileText },
  ];

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {activeTab === 'details' && <TripDetailsContent trip={trip} />}
        {activeTab === 'itinerary' && <ItineraryContent trip={trip} />}
        {activeTab === 'inclusions' && <InclusionsContent trip={trip} />}
        {activeTab === 'policies' && <PoliciesContent trip={trip} />}
      </div>
    </div>
  );
};

const TripDetailsContent: React.FC<{ trip: GuidedTripWithRelations }> = ({ trip }) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">About This Trip</h3>
        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
          {trip.description || 'No description available.'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-4 text-base sm:text-lg">Trip Highlights</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-gray-700 text-sm sm:text-base">{trip.trip_duration_days || 0} days of adventure</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-gray-700 text-sm sm:text-base">Maximum {trip.max_participants || 0} participants</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-gray-700 text-sm sm:text-base">Professional guide included</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-4 text-base sm:text-lg">Important Information</h4>
          <ul className="space-y-3 text-gray-700 text-sm sm:text-base">
            <li className="flex justify-between">
              <span className="font-medium text-gray-500">Duration:</span>
              <span className="font-semibold">{trip.trip_duration_days || 0} days</span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium text-gray-500">Group Size:</span>
              <span className="font-semibold">Up to {trip.max_participants || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium text-gray-500">Base Price:</span>
              <span className="font-semibold">RM {(trip.base_price || 0).toLocaleString()}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const ItineraryContent: React.FC<{ trip: GuidedTripWithRelations }> = ({ trip }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Trip Itinerary</h3>
      {!trip.itinerary_summary ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">No itinerary available.</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
            {trip.itinerary_summary}
          </div>
        </div>
      )}

      {trip.itinerary_document_url && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="font-bold text-gray-900 mb-4 text-base sm:text-lg">Downloadable Itinerary</h4>
          <a
            href={trip.itinerary_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:scale-95 transition-all font-medium text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
            <span>Download Detailed Itinerary</span>
          </a>
        </div>
      )}
    </div>
  );
};

const InclusionsContent: React.FC<{ trip: GuidedTripWithRelations }> = ({ trip }) => {
  const inclusions = trip.inclusions || [];
  const exclusions = trip.exclusions || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">What's Included</h3>
        {inclusions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600">No inclusions listed.</p>
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {inclusions.map((item) => (
              <li key={item.id} className="flex items-start gap-3 group">
                <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-green-100 transition-colors">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{item.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">What's Not Included</h3>
        {exclusions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600">No exclusions listed.</p>
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {exclusions.map((item) => (
              <li key={item.id} className="flex items-start gap-3 group">
                <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-red-100 transition-colors">
                  <div className="w-3 h-3 rounded-full border-2 border-red-600"></div>
                </div>
                <span className="text-gray-700 text-sm sm:text-base leading-relaxed">{item.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const PoliciesContent: React.FC<{ trip: GuidedTripWithRelations }> = ({ trip }) => {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Booking & Payment Terms</h3>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200 space-y-5">
          {trip.deposit_percentage && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                Deposit Required
              </h4>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed pl-4">
                A deposit of {trip.deposit_percentage}% is required to secure your booking.
              </p>
            </div>
          )}
          {trip.payment_schedule && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                Payment Schedule
              </h4>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed pl-4">{trip.payment_schedule}</p>
            </div>
          )}
          {trip.minimum_booking_days && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                Booking Notice
              </h4>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed pl-4">
                Book at least {trip.minimum_booking_days} days in advance
              </p>
            </div>
          )}
        </div>
      </div>

      {trip.refund_policy && (
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Cancellation Policy</h3>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200">
            <div className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
              {trip.refund_policy}
            </div>
          </div>
        </div>
      )}

      {trip.booking_terms && (
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Terms & Conditions</h3>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200">
            <div className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
              {trip.booking_terms}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
