import React from 'react';
import { MapPin, FileText, Calendar, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useTripForm } from '../../contexts/TripFormContext';
import { validateAllSteps } from '../../utils/validation';
import { calculateCommission, formatCurrency } from '../../utils/commission';
import { ItineraryPreview } from './ItineraryPreview';

export const Step5Preview: React.FC = () => {
  const { formData } = useTripForm();
  const validation = validateAllSteps(formData);

  const commission = calculateCommission(formData.basePrice || 0, formData.depositPercentage || 0);

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'deposit_full_payment':
        return 'Deposit + Full payment before trip';
      case 'deposit_installments':
        return 'Deposit + Installments';
      case 'full_payment_upfront':
        return 'Full payment upfront';
      default:
        return schedule;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Step 5: Preview & Confirm</h2>
        <p className="text-sm sm:text-base text-gray-600">Review all trip details before submission.</p>
      </div>

      {!validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
              {Object.values(validation.errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validation.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            Please confirm that all details are correct before submitting.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Trip Overview</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Title:</p>
                  <p className="font-medium text-gray-900">{formData.title || <span className="text-red-500">Not provided</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location(s):</p>
                  {formData.locations.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {formData.locations.map((location, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">{location.place_name}</p>
                            {location.country && (
                              <p className="text-sm text-gray-600">{location.country}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium text-red-500">Not provided</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{formData.description || <span className="text-red-500">Not provided</span>}</p>
                </div>
              </div>
            </div>
          </div>

          {(formData.coverPhotoUrl || formData.coverPhoto) && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Cover Photo:</p>
              <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={formData.coverPhotoUrl || (formData.coverPhoto && formData.coverPhoto instanceof File ? URL.createObjectURL(formData.coverPhoto) : '')}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {(formData.galleryPhotos.length > 0 || formData.galleryPhotoUrls.length > 0) && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Photo Gallery:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {formData.galleryPhotoUrls.map((url, index) => (
                  <div key={`url-${index}`} className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {formData.galleryPhotos.map((photo, index) => (
                  <div key={`file-${index}`} className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={photo instanceof File ? URL.createObjectURL(photo) : ''}
                      alt={`Gallery ${formData.galleryPhotoUrls.length + index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Booking Terms & Policies</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Booking Terms</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {formData.bookingTerms || <span className="text-red-500">No booking terms provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Refund & Cancellation Policy</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {formData.refundPolicy || <span className="text-red-500">No refund policy provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Minimum Booking Period</p>
                  <p className="text-sm text-gray-600">
                    {formData.minimumBookingDays ? `${formData.minimumBookingDays} days before trip` : <span className="text-red-500">Not specified</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Inclusions & Exclusions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Included</p>
                  {formData.inclusions.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {formData.inclusions.map((inc, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-500">No inclusions added</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Excluded</p>
                  {formData.exclusions.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {formData.exclusions.map((exc, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500">✗</span>
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-500">No exclusions added</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="flex items-start gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Itinerary Summary</h3>
          </div>
          {formData.itinerarySummary ? (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <ItineraryPreview content={formData.itinerarySummary} />
            </div>
          ) : (
            <p className="text-sm text-red-500">No itinerary summary provided</p>
          )}
          {(formData.itineraryDocument || formData.itineraryDocumentUrl) && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Attached Itinerary Document:</p>
              {formData.itineraryDocumentUrl ? (
                <div className="p-3 bg-white rounded border border-gray-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <a href={formData.itineraryDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Document
                  </a>
                </div>
              ) : formData.itineraryDocument instanceof File ? (
                formData.itineraryDocument.type.startsWith('image/') ? (
                  <div className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <img
                      src={URL.createObjectURL(formData.itineraryDocument)}
                      alt="Itinerary document"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded border border-gray-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{formData.itineraryDocument.name}</span>
                    </p>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Dates & Duration</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Trip Duration:</p>
                  <p className="font-medium text-gray-900">
                    {formData.tripDuration ? `${formData.tripDuration} days` : <span className="text-red-500">Not specified</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Available Departure Dates:</p>
                  {formData.departureDateRanges.length > 0 ? (
                    <div className="space-y-2">
                      {formData.departureDateRanges.map((range, index) => (
                        <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-500">No selected dates</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Schedule:</p>
                  <p className="font-medium text-gray-900">{getPaymentScheduleLabel(formData.paymentSchedule)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Pricing & Payment</h3>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Base Price</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(formData.basePrice || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deposit</p>
                  <p className="text-lg font-semibold text-gray-900">{formData.depositPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Max Participants</p>
                  <p className="text-lg font-semibold text-gray-900">{formData.maxParticipants}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Commission Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-medium">{formatCurrency(commission.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue to Agent:</span>
                    <span className="font-medium">{formatCurrency(commission.revenueToAgent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Deposit to Agent:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(commission.totalDepositToAgent)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(formData.qrCodes.length > 0 || formData.qrCodeUrls.length > 0) && (
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Agent Payment QR Codes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {formData.qrCodeUrls.map((url, index) => (
                <div key={`url-${index}`} className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <div className="aspect-square">
                    <img
                      src={url}
                      alt={`QR Code ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
              {formData.qrCodes.map((qr, index) => (
                <div key={`file-${index}`} className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                  {qr instanceof File && qr.type.startsWith('image/') ? (
                    <div className="aspect-square">
                      <img
                        src={URL.createObjectURL(qr)}
                        alt={`QR Code ${formData.qrCodeUrls.length + index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : qr instanceof File ? (
                    <div className="aspect-square flex items-center justify-center p-3">
                      <p className="text-xs text-gray-600 text-center break-words">{qr.name}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {formData.tripDuration && formData.maxParticipants && formData.paymentSchedule && formData.depositPercentage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Summary Overview</h3>
          <p className="text-xs sm:text-sm text-gray-700">
            This Guided Trip is a <span className="font-semibold">{formData.tripDuration}-day experience</span> designed for up to{' '}
            <span className="font-semibold">{formData.maxParticipants} participants</span>. Payment will follow a{' '}
            <span className="font-semibold">{getPaymentScheduleLabel(formData.paymentSchedule).toLowerCase()}</span> schedule with a total deposit of{' '}
            <span className="font-semibold">{formData.depositPercentage}%</span>.
          </p>
        </div>
      )}
    </div>
  );
};
