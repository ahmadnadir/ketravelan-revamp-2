import { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  DollarSign,
  Info,
  ChevronRight,
} from 'lucide-react';
import { PaymentMode, PaymentInstallment } from '../../types/guided-trip';
import {
  calculatePaymentPlan,
  createPaymentPlanSnapshot,
  formatCurrency,
  formatDate,
  getMaxAllowedInstallments,
  PaymentPlanInput,
  PaymentPlanCalculation,
} from '../../utils/paymentCalculations';

interface PaymentPlanStepProps {
  totalAmount: number;
  depositPercentage: number;
  tripStartDate: string;
  maxInstallments: number;
  minimumBookingDays?: number;
  onPaymentPlanSelect: (snapshot: any) => void;
  onBack: () => void;
}

export default function PaymentPlanStep({
  totalAmount,
  depositPercentage,
  tripStartDate,
  maxInstallments,
  minimumBookingDays = 14,
  onPaymentPlanSelect,
  onBack,
}: PaymentPlanStepProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full');
  const [numInstallments, setNumInstallments] = useState(
    Math.min(3, maxInstallments)
  );
  const [customDepositAmount, setCustomDepositAmount] = useState<number | null>(
    null
  );
  const [calculation, setCalculation] = useState<PaymentPlanCalculation | null>(
    null
  );

  const minDeposit = Math.ceil((totalAmount * depositPercentage) / 100);
  const timeBasedMaxInstallments = getMaxAllowedInstallments(tripStartDate);
  const effectiveMaxInstallments = Math.min(maxInstallments, timeBasedMaxInstallments);

  const requiresFullPayment = calculation?.requiresFullPayment || false;

  useEffect(() => {
    const input: PaymentPlanInput = {
      totalAmount,
      depositPercentage,
      paymentMode,
      tripStartDate,
      numInstallments: paymentMode === 'deposit_installments' ? numInstallments : 0,
      customDepositAmount: customDepositAmount ?? undefined,
      minimumBookingDays,
    };

    const result = calculatePaymentPlan(input);
    setCalculation(result);

    if (result.requiresFullPayment && paymentMode !== 'full') {
      setPaymentMode('full');
    }
  }, [
    totalAmount,
    depositPercentage,
    paymentMode,
    tripStartDate,
    numInstallments,
    customDepositAmount,
    minimumBookingDays,
  ]);

  const handleContinue = () => {
    if (!calculation) return;

    const input: PaymentPlanInput = {
      totalAmount,
      depositPercentage,
      paymentMode,
      tripStartDate,
      numInstallments: paymentMode === 'deposit_installments' ? numInstallments : 0,
      customDepositAmount: customDepositAmount ?? undefined,
    };

    const snapshot = createPaymentPlanSnapshot(input, calculation);
    onPaymentPlanSelect(snapshot);
  };

  const handleDepositChange = (value: number) => {
    if (value >= minDeposit && value <= totalAmount) {
      setCustomDepositAmount(value);
    }
  };

  const currentDeposit = customDepositAmount ?? minDeposit;
  const depositPercentageDisplay = ((currentDeposit / totalAmount) * 100).toFixed(
    1
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Choose Payment Plan</h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Select how you'd like to pay for your trip
        </p>
      </div>

      {requiresFullPayment && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 sm:p-5 flex gap-3">
          <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900 leading-relaxed">
            <p className="font-bold mb-2">Full Payment Required</p>
            <p>
              This trip departs within {minimumBookingDays} days. Full payment of{' '}
              <span className="font-bold">{formatCurrency(totalAmount)}</span> is required
              immediately. All payments must be completed before{' '}
              <span className="font-bold">{formatDate(calculation?.cutoffDate || '')}</span>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3.5 sm:gap-4">
        <button
          onClick={() => setPaymentMode('full')}
          disabled={requiresFullPayment}
          className={`p-5 sm:p-6 rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
            paymentMode === 'full'
              ? 'border-gray-900 bg-gray-50'
              : requiresFullPayment
              ? 'border-gray-300 bg-gray-100 opacity-75'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                paymentMode === 'full'
                  ? 'border-gray-900'
                  : 'border-gray-300'
              }`}
            >
              {paymentMode === 'full' && (
                <div className="w-3 h-3 rounded-full bg-gray-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-lg">Full Payment</h3>
              </div>
              <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                Pay the entire amount upfront and secure your booking immediately
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Due today</div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setPaymentMode('deposit_installments')}
          disabled={requiresFullPayment}
          className={`p-5 sm:p-6 rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
            paymentMode === 'deposit_installments'
              ? 'border-gray-900 bg-gray-50'
              : requiresFullPayment
              ? 'border-gray-300 bg-gray-100 opacity-75 cursor-not-allowed'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                paymentMode === 'deposit_installments'
                  ? 'border-gray-900'
                  : 'border-gray-300'
              }`}
            >
              {paymentMode === 'deposit_installments' && (
                <div className="w-3 h-3 rounded-full bg-gray-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-lg">Deposit + Installments</h3>
              </div>
              <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                Pay a deposit now and spread the rest over monthly installments
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation?.depositAmount ?? 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Deposit due today</div>
                </div>
                <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900">
                    {numInstallments}x payments
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Monthly installments</div>
                </div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setPaymentMode('deposit_final')}
          disabled={requiresFullPayment}
          className={`p-5 sm:p-6 rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
            paymentMode === 'deposit_final'
              ? 'border-gray-900 bg-gray-50'
              : requiresFullPayment
              ? 'border-gray-300 bg-gray-100 opacity-75 cursor-not-allowed'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                paymentMode === 'deposit_final'
                  ? 'border-gray-900'
                  : 'border-gray-300'
              }`}
            >
              {paymentMode === 'deposit_final' && (
                <div className="w-3 h-3 rounded-full bg-gray-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-lg">Deposit + Final Payment</h3>
              </div>
              <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                Pay a deposit now and the rest before your trip starts
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation?.depositAmount ?? 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Deposit due today</div>
                </div>
                <div className="bg-white rounded-lg p-3.5 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculation?.remainingBalance ?? 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Due before trip</div>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {paymentMode !== 'full' && !requiresFullPayment && (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block font-bold text-gray-900 mb-3 text-sm sm:text-base">
              Adjust Initial Payment
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={minDeposit}
                max={totalAmount}
                step={10}
                value={currentDeposit}
                onChange={(e) => handleDepositChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 gap-2">
                <span className="whitespace-nowrap">Min: {formatCurrency(minDeposit)}</span>
                <span className="font-bold text-gray-900 text-center">
                  {formatCurrency(currentDeposit)} ({depositPercentageDisplay}%)
                </span>
                <span className="whitespace-nowrap">Max: {formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {paymentMode === 'deposit_installments' && (
            <div>
              <label className="block font-bold text-gray-900 mb-3 text-sm sm:text-base">
                Number of Installments
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:flex gap-2">
                  {[2, 3, 4, 6].filter((n) => n <= effectiveMaxInstallments).map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumInstallments(num)}
                      className={`flex-1 py-3 px-2 sm:px-4 rounded-lg font-bold transition-all text-sm sm:text-base ${
                        numInstallments === num
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 whitespace-nowrap">
                    Or choose custom:
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={effectiveMaxInstallments}
                    value={numInstallments}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 2 && value <= effectiveMaxInstallments) {
                        setNumInstallments(value);
                      }
                    }}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none text-center font-bold"
                  />
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    months (max {effectiveMaxInstallments})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {calculation && (
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-900 text-white px-5 sm:px-6 py-4">
            <h3 className="font-bold text-lg">Payment Schedule</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {paymentMode === 'full' ? (
              <div className="p-5 sm:p-6 flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base">Full Payment</div>
                  <div className="text-sm text-gray-500 mt-0.5">Due today</div>
                </div>
                <div className="text-2xl font-bold text-gray-900 flex-shrink-0">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 sm:p-6 flex justify-between items-center bg-gray-50 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-base">
                      Payment 1 - Deposit
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">Due today</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 flex-shrink-0">
                    {formatCurrency(calculation.depositAmount)}
                  </div>
                </div>
                {calculation.installments.map((installment, index) => (
                  <div
                    key={index}
                    className="p-5 sm:p-6 flex justify-between items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-base">
                        Payment {installment.installmentNumber}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        Due {formatDate(installment.dueDate)}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 flex-shrink-0">
                      {formatCurrency(installment.amount)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="bg-gray-900 text-white px-5 sm:px-6 py-4 flex justify-between items-center">
            <div className="font-bold text-base">Total Amount</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>
      )}

{!requiresFullPayment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-blue-900">
            <p className="font-semibold mb-1">Important:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>All payments must be completed by {formatDate(calculation?.cutoffDate || '')}</li>
              <li>Your booking is confirmed once the first payment is received</li>
              <li>Payment schedule cannot be modified after booking</li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onBack}
          className="w-full sm:flex-1 py-4 px-6 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-all active:scale-[0.98] text-base"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="w-full sm:flex-1 py-4 px-6 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-base"
        >
          Continue to Review
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
