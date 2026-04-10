import { useState } from 'react';
import {
  CheckCircle,
  Calendar,
  Users,
  Mail,
  Phone,
  CreditCard,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { CustomerBookingData } from './CustomerDetailsStep';
import { PaymentPlanSnapshot } from '../../types/guided-trip';
import { formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { createBooking } from '../../services/bookingService';
import { initiatePayment } from '../../services/paymentService';

interface BookingConfirmationStepProps {
  tripId: string;
  tripTitle: string;
  customerData: CustomerBookingData;
  paymentPlan: PaymentPlanSnapshot;
  onBack: () => void;
  onComplete: (bookingReference: string) => void;
}

export default function BookingConfirmationStep({
  tripId,
  tripTitle,
  customerData,
  paymentPlan,
  onBack,
  onComplete,
}: BookingConfirmationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const handleConfirmBooking = async () => {
    if (!consentChecked) {
      setError('Please agree to the terms and conditions to proceed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const bookingResult = await createBooking({
        tripId,
        departureId: customerData.selectedDeparture.id,
        customerName: customerData.customerName,
        customerEmail: customerData.customerEmail,
        customerPhone: customerData.customerPhone,
        numParticipants: customerData.numParticipants,
        totalAmount: customerData.totalAmount,
        paymentPlanSnapshot: paymentPlan,
      });

      if (!bookingResult.success || !bookingResult.booking || !bookingResult.firstPaymentScheduleId) {
        setError(bookingResult.error || 'Failed to create booking. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const paymentResult = await initiatePayment({
        bookingId: bookingResult.booking.id,
        paymentScheduleId: bookingResult.firstPaymentScheduleId,
        amount: paymentPlan.installments[0].amount,
        customerEmail: customerData.customerEmail,
        customerName: customerData.customerName,
        bookingReference: bookingResult.booking.booking_reference,
      });

      if (!paymentResult.success || !paymentResult.redirectUrl) {
        setError(paymentResult.error || 'Failed to initiate payment. Please try again.');
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem('pending_booking', JSON.stringify({
        bookingId: bookingResult.booking.id,
        bookingReference: bookingResult.booking.booking_reference,
        paymentIntentId: paymentResult.paymentIntentId,
        paymentScheduleId: bookingResult.firstPaymentScheduleId,
        departureId: customerData.selectedDeparture.id,
        numParticipants: customerData.numParticipants,
      }));

      window.location.href = paymentResult.redirectUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
      setIsSubmitting(false);
    }
  };

  const getPaymentModeLabel = () => {
    switch (paymentPlan.mode) {
      case 'full':
        return 'Full Payment';
      case 'deposit_installments':
        return 'Deposit + Installments';
      case 'deposit_final':
        return 'Deposit + Final Payment';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 sm:mb-8">
        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
          Review & Pay
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Please review your booking details and proceed to payment
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 sm:p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Trip Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Trip</p>
                <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{tripTitle}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Departure Date</p>
                <p className="font-bold text-sm sm:text-base text-gray-900">
                  {formatDate(customerData.selectedDeparture.start_date)} -{' '}
                  {formatDate(customerData.selectedDeparture.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Participants</p>
                <p className="font-bold text-sm sm:text-base text-gray-900">
                  {customerData.numParticipants} participant
                  {customerData.numParticipants > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 sm:p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            Contact Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Name</p>
                <p className="font-bold text-sm sm:text-base text-gray-900 break-words">
                  {customerData.customerName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Email</p>
                <p className="font-bold text-sm sm:text-base text-gray-900 break-all">
                  {customerData.customerEmail}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Phone</p>
                <p className="font-bold text-sm sm:text-base text-gray-900">
                  {customerData.customerPhone}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-5 sm:px-6 py-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <h3 className="font-bold text-lg">Payment Plan</h3>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 gap-4">
              <span className="text-sm sm:text-base text-gray-600">Payment Mode</span>
              <span className="font-bold text-sm sm:text-base text-gray-900 text-right">
                {getPaymentModeLabel()}
              </span>
            </div>

            <div className="space-y-3">
              {paymentPlan.installments.map((installment, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-4 rounded-lg gap-3 ${
                    index === 0 ? 'bg-gray-50 border-2 border-gray-900' : 'bg-gray-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-base text-gray-900">
                      Payment {installment.installmentNumber}
                      {index === 0 && ' - Due Today'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(installment.dueDate)}
                    </p>
                  </div>
                  <div className="text-xl font-bold text-gray-900 flex-shrink-0">
                    {formatCurrency(installment.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900 gap-4">
              <span className="font-bold text-base sm:text-lg text-gray-900">Total Amount</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatCurrency(paymentPlan.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 sm:p-5 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base text-red-900">Booking Failed</p>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="consent"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="consent" className="text-sm text-blue-900 cursor-pointer leading-relaxed">
              <p className="font-semibold mb-2">I agree to proceed with payment and understand that:</p>
              <ul className="space-y-1.5 list-disc list-inside ml-1">
                <li>I agree to the trip terms and conditions</li>
                <li>I will be redirected to a secure payment page</li>
                <li>My booking will be confirmed only after successful payment</li>
                <li>All payments must be completed before the trip starts</li>
              </ul>
            </label>
          </div>
          <div className="bg-blue-100 border border-blue-300 rounded-md p-3 sm:p-4">
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Next step:</strong> You will be redirected to a secure payment page to complete your first payment of{' '}
              <strong>{formatCurrency(paymentPlan.installments[0]?.amount || 0)}</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full sm:flex-1 py-4 px-6 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={isSubmitting || !consentChecked}
            className="w-full sm:flex-1 py-4 px-6 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Proceed to Pay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
