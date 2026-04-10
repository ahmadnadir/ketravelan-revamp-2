import { useState, useEffect } from 'react';
import { Eye, Loader } from 'lucide-react';
import { getPaymentSchedule } from '../../services/bookingService';
import { formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { getTripRoomSummary, TripRoomSummary } from '../../services/tripRoomService';

interface PaymentsTabProps {
  roomId: string;
  bookingId: string;
}

export default function PaymentsTab({ roomId, bookingId }: PaymentsTabProps) {
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [summary, setSummary] = useState<TripRoomSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [roomId, bookingId]);

  const loadData = async () => {
    setLoading(true);
    const [schedules, summaryData] = await Promise.all([
      getPaymentSchedule(bookingId),
      getTripRoomSummary(roomId),
    ]);
    setPaymentSchedules(schedules);
    setSummary(summaryData);
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
        <p>Unable to load payment information</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'completed';
      case 'pending':
        return 'pending';
      case 'overdue':
        return 'overdue';
      default:
        return 'pending';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">TRIP PAYMENT PROGRESS</h3>
          <div className="bg-white px-3 py-1 rounded-lg border border-red-200">
            <span className="text-xs font-medium text-gray-600">Outstanding</span>
            <p className="text-red-600 font-bold text-sm">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.paymentCompliance}% Collected</h2>
        </div>

        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${summary.paymentCompliance}%` }}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">COLLECTED</p>
            <p className="text-green-600 font-bold text-lg">{formatCurrency(summary.totalCollected)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">TOTAL</p>
            <p className="text-gray-900 font-bold text-lg">{formatCurrency(summary.totalTripValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">REMAINING</p>
            <p className="text-red-600 font-bold text-lg">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">PARTICIPANT</p>
            <p className="text-gray-900 font-bold text-lg">{summary.totalParticipants}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">PARTICIPANTS</h3>

        {paymentSchedules.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-gray-200">
            <p>No payment schedule found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentSchedules.map((schedule, index) => (
              <div
                key={schedule.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                    #{index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">
                        Next: {schedule.payment_status === 'paid' ? 'N/A' : formatDate(schedule.due_date)}
                      </p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(schedule.payment_status)}`}>
                        {schedule.payment_status}
                      </span>
                    </div>

                    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute top-0 left-0 h-full bg-gray-800 transition-all"
                        style={{
                          width: schedule.payment_status === 'paid' ? '100%' : '0%',
                        }}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm text-gray-700">
                        {formatCurrency(schedule.amount)} / {formatCurrency(schedule.amount)}
                      </p>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        View Payment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
