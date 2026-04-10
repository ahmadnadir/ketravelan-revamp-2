import { useState, useEffect } from 'react';
import { User, Mail, Phone, Users, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { TripDepartureDate } from '../../types/guided-trip';
import { validateCustomerDetails } from '../../services/bookingValidationService';
import { formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerDetailsStepProps {
  departures: TripDepartureDate[];
  pricePerPerson: number;
  maxParticipants: number;
  initialDepartureId?: string;
  initialParticipants?: number;
  onContinue: (data: CustomerBookingData) => void;
  onCancel: () => void;
}

export interface CustomerBookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numParticipants: number;
  selectedDeparture: TripDepartureDate;
  totalAmount: number;
}

export default function CustomerDetailsStep({
  departures,
  pricePerPerson,
  maxParticipants,
  initialDepartureId,
  initialParticipants = 1,
  onContinue,
  onCancel,
}: CustomerDetailsStepProps) {
  const { profile } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [numParticipants, setNumParticipants] = useState(initialParticipants);
  const [selectedDepartureId, setSelectedDepartureId] = useState(initialDepartureId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const selectedDeparture = departures.find((d) => d.id === selectedDepartureId);
  const totalAmount = numParticipants * pricePerPerson;

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || '');
      setCustomerEmail(profile.email || '');
      setCustomerPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!initialDepartureId && departures.length > 0 && !selectedDepartureId) {
      const firstAvailable = departures.find((d) => d.is_available);
      if (firstAvailable) {
        setSelectedDepartureId(firstAvailable.id);
      }
    }
  }, [departures, selectedDepartureId, initialDepartureId]);

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validateForm();
  };

  const validateForm = () => {
    const validation = validateCustomerDetails(
      customerName,
      customerEmail,
      customerPhone
    );

    const newErrors: Record<string, string> = { ...validation.errors };

    if (!selectedDepartureId) {
      newErrors.departure = 'Please select a departure date';
    }

    if (numParticipants < 1) {
      newErrors.participants = 'At least 1 participant is required';
    }

    if (selectedDeparture) {
      const availableSpots =
        selectedDeparture.max_capacity - selectedDeparture.booked_pax;
      if (numParticipants > availableSpots) {
        newErrors.participants = `Only ${availableSpots} spot${
          availableSpots === 1 ? '' : 's'
        } available`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      departure: true,
      participants: true,
    });

    if (validateForm() && selectedDeparture) {
      onContinue({
        customerName,
        customerEmail,
        customerPhone,
        numParticipants,
        selectedDeparture,
        totalAmount,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 sm:mb-8">
        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
          Booking Details
        </h2>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
          Please provide your information to continue with the booking
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 sm:p-6 space-y-5 sm:space-y-6">
          <h3 className="font-bold text-lg text-gray-900">Contact Information</h3>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-base ${
                  touched.name && errors.name
                    ? 'border-red-500'
                    : 'border-gray-200'
                }`}
                placeholder="Enter your full name"
              />
            </div>
            {touched.name && errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-base ${
                  touched.email && errors.email
                    ? 'border-red-500'
                    : 'border-gray-200'
                }`}
                placeholder="your.email@example.com"
              />
            </div>
            {touched.email && errors.email && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-base ${
                  touched.phone && errors.phone
                    ? 'border-red-500'
                    : 'border-gray-200'
                }`}
                placeholder="+60 12-345 6789"
              />
            </div>
            {touched.phone && errors.phone && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 sm:p-6 space-y-5 sm:space-y-6">
          <h3 className="font-bold text-lg text-gray-900">Trip Details</h3>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2.5">
              Select Departure Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <select
                value={selectedDepartureId}
                onChange={(e) => {
                  setSelectedDepartureId(e.target.value);
                  handleBlur('departure');
                }}
                className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none bg-white text-base ${
                  touched.departure && errors.departure
                    ? 'border-red-500'
                    : 'border-gray-200'
                }`}
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
              >
                <option value="">Choose a departure date</option>
                {departures.map((departure) => {
                  const availableSpots =
                    departure.max_capacity - departure.booked_pax;
                  return (
                    <option
                      key={departure.id}
                      value={departure.id}
                      disabled={!departure.is_available || availableSpots === 0}
                    >
                      {formatDate(departure.start_date)} - {formatDate(departure.end_date)}{' '}
                      ({availableSpots} spots left)
                    </option>
                  );
                })}
              </select>
            </div>
            {touched.departure && errors.departure && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.departure}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2.5">
              Number of Participants
            </label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                min="1"
                max={maxParticipants}
                value={numParticipants}
                onChange={(e) => {
                  setNumParticipants(Number(e.target.value));
                  handleBlur('participants');
                }}
                className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-base ${
                  touched.participants && errors.participants
                    ? 'border-red-500'
                    : 'border-gray-200'
                }`}
              />
            </div>
            {touched.participants && errors.participants && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errors.participants}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-xl p-5 sm:p-6">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-1">Total Price</p>
              <p className="text-xs text-gray-400">
                {formatCurrency(pricePerPerson)} × {numParticipants} participant
                {numParticipants > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalAmount)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-4 px-6 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-all active:scale-[0.98] text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:flex-1 py-4 px-6 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-base"
          >
            Continue to Payment
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
