import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { GuidedTripWithRelations, PaymentPlanSnapshot } from '../../types/guided-trip';
import CustomerDetailsStep, { CustomerBookingData } from './CustomerDetailsStep';
import PaymentPlanStep from './PaymentPlanStep';
import BookingConfirmationStep from './BookingConfirmationStep';

interface BookingWizardProps {
  trip: GuidedTripWithRelations;
  initialDepartureId?: string;
  initialParticipants?: number;
  onClose: () => void;
}

type BookingStep = 'customer' | 'payment' | 'confirmation' | 'success';

export default function BookingWizard({ trip, initialDepartureId, initialParticipants, onClose }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('customer');
  const [customerData, setCustomerData] = useState<CustomerBookingData | null>(
    null
  );
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanSnapshot | null>(
    null
  );
  const [bookingReference, setBookingReference] = useState<string>('');

  const availableDepartures = trip.departures || [];
  const pricePerPerson = trip.base_price || 0;
  const maxParticipants = trip.max_participants || 10;
  const depositPercentage = trip.deposit_percentage || 30;
  const maxInstallments = trip.max_installments || 6;
  const minimumBookingDays = trip.minimum_booking_days || 14;

  const handleCustomerContinue = (data: CustomerBookingData) => {
    setCustomerData(data);
    setCurrentStep('payment');
  };

  const handlePaymentPlanSelect = (plan: PaymentPlanSnapshot) => {
    setPaymentPlan(plan);
    setCurrentStep('confirmation');
  };

  const handleBookingComplete = (reference: string) => {
    setBookingReference(reference);
    setCurrentStep('success');
  };

  const handleBackToCustomer = () => {
    setCurrentStep('customer');
  };

  const handleBackToPayment = () => {
    setCurrentStep('payment');
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'customer':
        return 1;
      case 'payment':
        return 2;
      case 'confirmation':
        return 3;
      case 'success':
        return 4;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-none sm:rounded-2xl max-w-5xl w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Book Your Trip</h1>
            {currentStep !== 'success' && (
              <div className="flex items-center gap-2">
                <div className="text-xs sm:text-sm font-bold text-gray-500 whitespace-nowrap">
                  {getStepNumber()}/3
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  {['customer', 'payment', 'confirmation'].map((step, index) => (
                    <div
                      key={step}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                        getStepNumber() > index + 1
                          ? 'bg-green-500'
                          : getStepNumber() === index + 1
                          ? 'bg-gray-900'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 active:scale-95"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+88px)] sm:pb-6">
          {currentStep === 'customer' && (
            <CustomerDetailsStep
              departures={availableDepartures}
              pricePerPerson={pricePerPerson}
              maxParticipants={maxParticipants}
              initialDepartureId={initialDepartureId}
              initialParticipants={initialParticipants}
              onContinue={handleCustomerContinue}
              onCancel={onClose}
            />
          )}

          {currentStep === 'payment' && customerData && (
            <PaymentPlanStep
              totalAmount={customerData.totalAmount}
              depositPercentage={depositPercentage}
              tripStartDate={customerData.selectedDeparture.start_date}
              maxInstallments={maxInstallments}
              minimumBookingDays={minimumBookingDays}
              onPaymentPlanSelect={handlePaymentPlanSelect}
              onBack={handleBackToCustomer}
            />
          )}

          {currentStep === 'confirmation' && customerData && paymentPlan && (
            <BookingConfirmationStep
              tripId={trip.id}
              tripTitle={trip.title || 'Guided Trip'}
              customerData={customerData}
              paymentPlan={paymentPlan}
              onBack={handleBackToPayment}
              onComplete={handleBookingComplete}
            />
          )}

          {currentStep === 'success' && (
            <div className="max-w-2xl mx-auto text-center py-4">
              <div className="bg-green-50 rounded-full w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3 px-4">
                Booking Confirmed!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
                Your booking has been successfully created. A confirmation email
                has been sent to{' '}
                <span className="font-bold break-all">{customerData?.customerEmail}</span>
              </p>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 sm:p-6 mb-6 mx-2">
                <p className="text-xs sm:text-sm text-gray-500 mb-3">Booking Reference</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wide break-all leading-tight">
                  {bookingReference}
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-8 px-4 leading-relaxed">
                Please save this reference number for your records. You can use it
                to track your booking and make payments.
              </p>
              <button
                onClick={onClose}
                className="w-full py-4 px-6 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all active:scale-[0.98] text-base"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
