import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, Loader } from 'lucide-react';
import { getTripRoomSummary, TripRoomSummary } from '../../services/tripRoomService';
import { formatCurrency } from '../../utils/paymentCalculations';
import { supabase } from '../../lib/supabase';

interface SummaryTabProps {
  roomId: string;
  tripId: string;
  departureId: string;
}

export default function SummaryTab({ roomId, tripId, departureId }: SummaryTabProps) {
  const [summary, setSummary] = useState<TripRoomSummary | null>(null);
  const [keyDates, setKeyDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [roomId]);

  const loadData = async () => {
    setLoading(true);

    const [summaryData, departureData, tripData] = await Promise.all([
      getTripRoomSummary(roomId),
      supabase.from('guided_trip_departure_dates').select('*').eq('id', departureId).maybeSingle(),
      supabase.from('guided_trips').select('*').eq('id', tripId).maybeSingle(),
    ]);

    setSummary(summaryData);

    const dates = [];

    if (departureData.data) {
      const startDate = new Date(departureData.data.start_date);
      const endDate = new Date(departureData.data.end_date);

      dates.push({
        date: startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        label: 'Trip Departure',
        isPast: startDate < new Date(),
      });

      const prebriefDate = new Date(startDate);
      prebriefDate.setDate(prebriefDate.getDate() - 7);
      dates.push({
        date: prebriefDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        label: 'Pre-trip Briefing Call',
        isPast: prebriefDate < new Date(),
      });

      const paymentDueDate = new Date(startDate);
      paymentDueDate.setDate(paymentDueDate.getDate() - 30);
      dates.push({
        date: paymentDueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        label: 'Final Payment Due',
        isPast: paymentDueDate < new Date(),
      });
    }

    dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setKeyDates(dates);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p>Unable to load trip summary</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-600">Total Participants</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.totalParticipants}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-600">Total Collected</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrency(summary.totalCollected)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-600">Total Trip Value</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(summary.totalTripValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-900">Payment Compliance</h3>
          <span className="text-xl sm:text-2xl font-bold text-orange-600">{summary.paymentCompliance}%</span>
        </div>
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-orange-500 transition-all rounded-full"
            style={{ width: `${summary.paymentCompliance}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Key Dates</h3>
        </div>

        <div className="space-y-4">
          {keyDates.map((item, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${item.isPast ? 'bg-gray-400' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${item.isPast ? 'text-gray-500' : 'text-blue-600'}`}>
                  {item.date}
                </p>
                <p className="text-gray-900 font-medium">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
