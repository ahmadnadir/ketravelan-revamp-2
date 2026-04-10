import React, { useState } from 'react';
import { Plus, X, Upload, Calendar, AlertCircle } from 'lucide-react';
import { useTripForm } from '../../contexts/TripFormContext';
import { validateStep4, validateFile } from '../../utils/validation';
import { calculateCommission, formatCurrency, formatPercentage } from '../../utils/commission';
import { DateRange } from '../../types/guided-trip';

export const Step4DatesPricing: React.FC = () => {
  const { formData, updateFormData } = useTripForm();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newDateRange, setNewDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [dateRangeError, setDateRangeError] = useState<string>('');

  const handleBlur = () => {
    const validation = validateStep4(formData);
    setErrors(validation.errors);
  };

  const calculateEndDate = (startDate: string, tripDuration: number): string => {
    if (!startDate || !tripDuration) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + tripDuration - 1);
    return end.toISOString().split('T')[0];
  };

  const calculateDaysDifference = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleStartDateChange = (date: string) => {
    if (!formData.tripDuration) {
      setDateRangeError('Please set trip duration first');
      setNewDateRange({ startDate: date, endDate: '' });
      return;
    }
    const endDate = calculateEndDate(date, formData.tripDuration);
    setNewDateRange({ startDate: date, endDate });
    setDateRangeError('');
  };

  const handleQRCodesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let hasError = false;
    for (const file of files) {
      const error = validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      });
      if (error) {
        setErrors(prev => ({ ...prev, qrCodes: error }));
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      const newQRCodes = [...formData.qrCodes, ...files];
      updateFormData({ qrCodes: newQRCodes });
      setErrors(prev => ({ ...prev, qrCodes: '' }));
    }
  };

  const removeQRCode = (index: number) => {
    const updated = formData.qrCodes.filter((_, i) => i !== index);
    updateFormData({ qrCodes: updated });
  };

  const removeExistingQRCode = (index: number) => {
    const updated = formData.qrCodeUrls.filter((_, i) => i !== index);
    updateFormData({ qrCodeUrls: updated });
  };

  const addDateRange = () => {
    if (!formData.tripDuration) {
      setDateRangeError('Please set trip duration first');
      return;
    }

    if (!newDateRange.startDate) {
      setDateRangeError('Please select a start date');
      return;
    }

    if (newDateRange.startDate && newDateRange.endDate) {
      if (new Date(newDateRange.endDate) < new Date(newDateRange.startDate)) {
        setDateRangeError('End date must be after start date');
        return;
      }

      const daysDiff = calculateDaysDifference(newDateRange.startDate, newDateRange.endDate);
      if (daysDiff !== formData.tripDuration) {
        setDateRangeError(
          `Date range must match trip duration of ${formData.tripDuration} days. Selected range is ${daysDiff} days.`
        );
        return;
      }

      updateFormData({
        departureDateRanges: [...formData.departureDateRanges, newDateRange],
      });
      setNewDateRange({ startDate: '', endDate: '' });
      setDateRangeError('');
      setErrors(prev => ({ ...prev, departureDateRanges: '' }));
    }
  };

  const removeDateRange = (index: number) => {
    const updated = formData.departureDateRanges.filter((_, i) => i !== index);
    updateFormData({ departureDateRanges: updated });
  };

  const commission = calculateCommission(formData.basePrice || 0, formData.depositPercentage || 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Step 4: Dates, Availability & Pricing</h2>
        <p className="text-sm sm:text-base text-gray-600">Set departure dates, duration, payment schedule, and upload your Agent QR codes.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Agent QR Code(s) <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload one or more QR codes for agent payment. JPG, PNG, or PDF. At least one is required.
          </p>
          {(formData.qrCodeUrls.length > 0 || formData.qrCodes.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
              {formData.qrCodeUrls.map((url, index) => (
                <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-300 bg-gray-50">
                  {url.endsWith('.pdf') ? (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <span className="text-xs text-gray-600 text-center break-words">PDF File</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Existing QR Code ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-600 bg-opacity-90 py-0.5">
                    <span className="text-xs text-white text-center block">Existing</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingQRCode(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.qrCodes.map((qr, index) => (
                <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-300 bg-gray-50">
                  {qr.type === 'image/jpeg' || qr.type === 'image/png' ? (
                    <img
                      src={URL.createObjectURL(qr)}
                      alt={`QR Code ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <span className="text-xs text-gray-600 text-center break-words">{qr.name}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-green-600 bg-opacity-90 py-0.5">
                    <span className="text-xs text-white text-center block">New</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQRCode(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Click to upload QR code(s)</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG or PDF (Max 5MB each)</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              onChange={handleQRCodesChange}
              className="hidden"
            />
          </label>
          {errors.qrCodes && <p className="mt-1 text-sm text-red-600">{errors.qrCodes}</p>}
        </div>

        <div>
          <label htmlFor="tripDuration" className="block text-sm font-medium text-gray-700 mb-2">
            Trip Duration (days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="tripDuration"
            value={formData.tripDuration}
            onChange={e => updateFormData({ tripDuration: parseInt(e.target.value) || 0 })}
            onBlur={handleBlur}
            min="1"
            max="365"
            placeholder="7"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.tripDuration ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.tripDuration && <p className="mt-1 text-sm text-red-600">{errors.tripDuration}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Departure Dates <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select departure dates. End date will be auto-calculated based on trip duration.
            {formData.tripDuration > 0 && (
              <span className="ml-1 font-medium text-blue-600">
                ({formData.tripDuration} days)
              </span>
            )}
          </p>

          {!formData.tripDuration && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Please set trip duration first before adding departure dates.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={newDateRange.startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  disabled={!formData.tripDuration}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Return Date (Auto-calculated)
                </label>
                <input
                  type="date"
                  value={newDateRange.endDate}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {newDateRange.startDate && newDateRange.endDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900">
                    <span className="font-medium">{calculateDaysDifference(newDateRange.startDate, newDateRange.endDate)}-day trip</span>
                    {' '}from {new Date(newDateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' '}to {new Date(newDateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={addDateRange}
              disabled={!newDateRange.startDate || !newDateRange.endDate}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Departure Date
            </button>

            {dateRangeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{dateRangeError}</p>
              </div>
            )}
          </div>

          {formData.departureDateRanges.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Selected Departure Dates</p>
              {formData.departureDateRanges.map((range, index) => {
                const days = calculateDaysDifference(range.startDate, range.endDate);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          {new Date(range.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' '}- {new Date(range.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-gray-600">{days} days</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDateRange(index)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {formData.departureDateRanges.length === 0 && formData.tripDuration > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-lg text-center">
                No departure dates added yet. Add at least one departure date.
              </p>
            </div>
          )}

          {errors.departureDateRanges && <p className="mt-2 text-sm text-red-600">{errors.departureDateRanges}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
              Base Price (MYR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="basePrice"
              value={formData.basePrice}
              onChange={e => updateFormData({ basePrice: parseFloat(e.target.value) || 0 })}
              onBlur={handleBlur}
              min="0"
              step="0.01"
              placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.basePrice ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>}
          </div>

          <div>
            <label htmlFor="depositPercentage" className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Percentage (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="depositPercentage"
              value={formData.depositPercentage}
              onChange={e => updateFormData({ depositPercentage: parseInt(e.target.value) || 0 })}
              onBlur={handleBlur}
              min="0"
              max="100"
              placeholder="20"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.depositPercentage ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.depositPercentage && <p className="mt-1 text-sm text-red-600">{errors.depositPercentage}</p>}
          </div>

          <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Participants <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="maxParticipants"
              value={formData.maxParticipants}
              onChange={e => updateFormData({ maxParticipants: parseInt(e.target.value) || 0 })}
              onBlur={handleBlur}
              min="1"
              placeholder="10"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.maxParticipants ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="paymentSchedule" className="block text-sm font-medium text-gray-700 mb-2">
            Payment Schedule <span className="text-red-500">*</span>
          </label>
          <select
            id="paymentSchedule"
            value={formData.paymentSchedule}
            onChange={e => updateFormData({ paymentSchedule: e.target.value as any })}
            onBlur={handleBlur}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.paymentSchedule ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="deposit_full_payment">Deposit + Full payment before trip</option>
            <option value="deposit_installments">Deposit + Installments</option>
            <option value="full_payment_upfront">Full payment upfront</option>
          </select>
          {errors.paymentSchedule && <p className="mt-1 text-sm text-red-600">{errors.paymentSchedule}</p>}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Commission Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Deposit by Travel Agent:</span>
              <div className="text-right">
                <span className="font-medium text-gray-900">{formatPercentage(formData.depositPercentage || 0)}</span>
                <span className="text-gray-500 ml-2">({formatCurrency(commission.depositByAgent)})</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Platform Fee:</span>
              <div className="text-right">
                <span className="font-medium text-gray-900">{formatPercentage(10)}</span>
                <span className="text-gray-500 ml-2">({formatCurrency(commission.platformFee)})</span>
              </div>
            </div>
            <div className="h-px bg-gray-300 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Deposit Required by Customer:</span>
              <div className="text-right">
                <span className="font-semibold text-gray-900">{formatPercentage((formData.depositPercentage || 0) + 10)}</span>
                <span className="text-gray-700 ml-2 font-medium">({formatCurrency(commission.totalDepositRequired)})</span>
              </div>
            </div>
            <div className="h-px bg-gray-300 my-2"></div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue:</span>
              <span className="font-medium text-gray-900">{formatCurrency(commission.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue to Travel Agent:</span>
              <span className="font-medium text-gray-900">{formatCurrency(commission.revenueToAgent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit to Travel Agent:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(commission.totalDepositToAgent)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
