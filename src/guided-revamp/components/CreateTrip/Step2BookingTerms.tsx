import React, { useState } from 'react';
import { useTripForm } from '../../contexts/TripFormContext';
import { validateStep2 } from '../../utils/validation';

export const Step2BookingTerms: React.FC = () => {
  const { formData, updateFormData } = useTripForm();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBlur = () => {
    const validation = validateStep2(formData);
    setErrors(validation.errors);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Step 2: Booking Terms & Policies</h2>
        <p className="text-sm sm:text-base text-gray-600">Define booking conditions, refund & cancellation policy, and minimum booking period.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="bookingTerms" className="block text-sm font-medium text-gray-700 mb-2">
            Booking Terms <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Describe the general booking terms and payment expectations for travelers.
          </p>
          <textarea
            id="bookingTerms"
            value={formData.bookingTerms}
            onChange={e => updateFormData({ bookingTerms: e.target.value })}
            onBlur={handleBlur}
            placeholder="e.g. A 30% deposit is required to secure your spot. Full payment due 14 days before departure."
            rows={6}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.bookingTerms ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.bookingTerms && <p className="mt-1 text-sm text-red-600">{errors.bookingTerms}</p>}
        </div>

        <div>
          <label htmlFor="refundPolicy" className="block text-sm font-medium text-gray-700 mb-2">
            Refund & Cancellation Policy <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Outline refund conditions, cancellation deadlines, or non-refundable deposits.
          </p>
          <textarea
            id="refundPolicy"
            value={formData.refundPolicy}
            onChange={e => updateFormData({ refundPolicy: e.target.value })}
            onBlur={handleBlur}
            placeholder="e.g. 50% refund for cancellations made more than 30 days before departure. No refund within 14 days."
            rows={6}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.refundPolicy ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.refundPolicy && <p className="mt-1 text-sm text-red-600">{errors.refundPolicy}</p>}
        </div>

        <div>
          <label htmlFor="minimumBookingDays" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Booking Period (days before trip) <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Specify how many days before departure bookings must be completed.
          </p>
          <input
            type="number"
            id="minimumBookingDays"
            value={formData.minimumBookingDays}
            onChange={e => updateFormData({ minimumBookingDays: parseInt(e.target.value) || 0 })}
            onBlur={handleBlur}
            min="1"
            max="365"
            placeholder="14"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.minimumBookingDays ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.minimumBookingDays && <p className="mt-1 text-sm text-red-600">{errors.minimumBookingDays}</p>}
        </div>
      </div>
    </div>
  );
};
