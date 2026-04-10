import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, CreditCard, AlertTriangle } from 'lucide-react';
import { getPaymentRecord } from '../../services/paymentService';
import { getBookingByReference } from '../../services/bookingService';

export default function PaymentGateway() {
  const [loading, setLoading] = useState(true);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [bookingReference, setBookingReference] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const intentId = urlParams.get('payment_intent');
    const reference = urlParams.get('booking_reference');

    if (!intentId || !reference) {
      window.location.href = '/';
      return;
    }

    setPaymentIntentId(intentId);
    setBookingReference(reference);
    loadPaymentDetails(intentId);
  }, []);

  const loadPaymentDetails = async (intentId: string) => {
    try {
      const paymentRecord = await getPaymentRecord(intentId);
      if (paymentRecord) {
        setAmount(paymentRecord.amount);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading payment details:', error);
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setProcessing(true);
    setTimeout(() => {
      const transactionRef = `txn_${Date.now()}`;
      window.location.href = `/payment-result?status=success&payment_intent=${paymentIntentId}&transaction_reference=${transactionRef}&booking_reference=${bookingReference}`;
    }, 2000);
  };

  const handlePaymentFailure = () => {
    setProcessing(true);
    setTimeout(() => {
      window.location.href = `/payment-result?status=failed&payment_intent=${paymentIntentId}&booking_reference=${bookingReference}`;
    }, 1500);
  };

  const handlePaymentCancel = () => {
    window.location.href = `/payment-result?status=cancelled&payment_intent=${paymentIntentId}&booking_reference=${bookingReference}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <CreditCard className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Secure Payment Gateway</h1>
          <p className="text-center text-blue-100 text-sm">Demo Payment Processor</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Demo Mode</p>
              <p>This is a simulated payment gateway for demonstration purposes. No real transactions will be processed.</p>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3 pb-3 border-b">
              <span className="text-gray-600">Booking Reference</span>
              <span className="font-mono font-bold text-gray-900">{bookingReference}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount Due</span>
              <span className="text-2xl font-bold text-gray-900">
                RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePaymentSuccess}
              disabled={processing}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Simulate Successful Payment</span>
                </>
              )}
            </button>

            <button
              onClick={handlePaymentFailure}
              disabled={processing}
              className="w-full py-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              <span>Simulate Failed Payment</span>
            </button>

            <button
              onClick={handlePaymentCancel}
              disabled={processing}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Payment
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>Secured by Demo Payment Gateway</p>
            <p className="mt-1">Your payment information is safe and encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
