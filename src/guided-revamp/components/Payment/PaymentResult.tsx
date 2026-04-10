import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, AlertCircle, Home } from 'lucide-react';
import { confirmPayment, handlePaymentFailure, handlePaymentCancellation } from '../../services/paymentService';
import { confirmBookingAfterPayment } from '../../services/bookingService';

type PaymentStatus = 'success' | 'failed' | 'cancelled';

export default function PaymentResult() {
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState<PaymentStatus>('success');
  const [bookingReference, setBookingReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processPaymentResult();
  }, []);

  const processPaymentResult = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status') as PaymentStatus;
      const paymentIntentId = urlParams.get('payment_intent');
      const transactionReference = urlParams.get('transaction_reference');
      const reference = urlParams.get('booking_reference');

      if (!statusParam || !paymentIntentId || !reference) {
        setError('Invalid payment result parameters');
        setProcessing(false);
        return;
      }

      setStatus(statusParam);
      setBookingReference(reference);

      const pendingBookingStr = localStorage.getItem('pending_booking');
      if (!pendingBookingStr) {
        setError('Booking information not found');
        setProcessing(false);
        return;
      }

      const pendingBooking = JSON.parse(pendingBookingStr);

      if (statusParam === 'success' && transactionReference) {
        const confirmResult = await confirmPayment({
          paymentIntentId,
          bookingId: pendingBooking.bookingId,
          paymentScheduleId: pendingBooking.paymentScheduleId,
          transactionReference,
        });

        if (!confirmResult.success) {
          setError(confirmResult.error || 'Failed to confirm payment');
          setProcessing(false);
          return;
        }

        const bookingData = JSON.parse(pendingBookingStr);
        const confirmBookingResult = await confirmBookingAfterPayment(
          bookingData.bookingId,
          pendingBooking.departureId || '',
          pendingBooking.numParticipants || 1
        );

        if (!confirmBookingResult.success) {
          console.error('Failed to confirm booking:', confirmBookingResult.error);
        }

        localStorage.removeItem('pending_booking');
      } else if (statusParam === 'failed') {
        await handlePaymentFailure(paymentIntentId);
      } else if (statusParam === 'cancelled') {
        await handlePaymentCancellation(paymentIntentId);
      }

      setProcessing(false);
    } catch (err) {
      console.error('Error processing payment result:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    const pendingBookingStr = localStorage.getItem('pending_booking');
    if (pendingBookingStr) {
      const pendingBooking = JSON.parse(pendingBookingStr);
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentId = urlParams.get('payment_intent');
      window.location.href = `/payment-gateway?payment_intent=${paymentIntentId}&booking_reference=${pendingBooking.bookingReference}`;
    }
  };

  const handleGoHome = () => {
    localStorage.removeItem('pending_booking');
    window.location.href = '/';
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Error Processing Payment
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={handleGoHome}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Payment Successful!
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Your booking has been confirmed. A confirmation email has been sent to you.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 mb-2">
              <strong>Booking Reference:</strong>
            </p>
            <p className="text-xl font-mono font-bold text-blue-900">{bookingReference}</p>
          </div>
          <button
            onClick={handleGoHome}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Payment Failed
          </h2>
          <p className="text-gray-600 text-center mb-6">
            We were unable to process your payment. Your booking is still reserved and you can try again.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-900 mb-2">
              <strong>Booking Reference:</strong>
            </p>
            <p className="text-xl font-mono font-bold text-yellow-900">{bookingReference}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
            >
              Retry Payment
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Payment Cancelled
        </h2>
        <p className="text-gray-600 text-center mb-6">
          You cancelled the payment. Your booking is still reserved and you can complete the payment later.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 mb-2">
            <strong>Booking Reference:</strong>
          </p>
          <p className="text-xl font-mono font-bold text-blue-900">{bookingReference}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
          >
            Resume Payment
          </button>
          <button
            onClick={handleGoHome}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
