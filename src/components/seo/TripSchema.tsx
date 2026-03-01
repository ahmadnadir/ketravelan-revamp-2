/* eslint-disable @typescript-eslint/no-explicit-any */
import { Helmet } from 'react-helmet-async';

interface TripSchemaProps {
  name: string;
  description: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  price?: number;
  currency?: string;
  image?: string;
  url: string;
  organizer?: {
    name: string;
    url?: string;
  };
  touristTypes?: string[];
  itinerary?: Array<{
    day: number;
    activities: string[];
  }>;
  visibility?: 'public' | 'private';
  geo?: { latitude: number; longitude: number };
}

export function TripSchema({
  name,
  description,
  destination,
  startDate,
  endDate,
  price,
  currency = 'MYR',
  image,
  url,
  organizer,
  touristTypes = [],
  itinerary = [],
  visibility = 'public',
  geo,
}: TripSchemaProps) {
  // Build destination Place object
  const placeObject: Record<string, any> = {
    '@type': 'Place',
    name: destination,
    address: {
      '@type': 'PostalAddress',
      addressLocality: destination,
    },
  };
  if (geo) {
    placeObject.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  // TouristTrip schema
  const tripSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name,
    description,
    touristType: touristTypes.length > 0 ? touristTypes : ['Traveler'],
    touristDestination: placeObject,
  };

  if (startDate) tripSchema.startDate = startDate;
  if (endDate) tripSchema.endDate = endDate;
  if (image) tripSchema.image = image;

  if (price) {
    tripSchema.offers = {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url,
    };
  }

  if (organizer) {
    tripSchema.organizer = {
      '@type': 'Person',
      name: organizer.name,
      ...(organizer.url && { url: organizer.url }),
    };
  }

  if (itinerary.length > 0) {
    tripSchema.subTrip = itinerary.map((day) => ({
      '@type': 'TouristTrip',
      name: `Day ${day.day}`,
      description: day.activities.join(', '),
    }));
  }

  // Conditional Event schema for public trips with confirmed dates
  const showEvent = visibility === 'public' && startDate && endDate;

  const eventSchema = showEvent ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate,
    location: placeObject,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(image && { image }),
    ...(organizer && {
      organizer: {
        '@type': 'Organization',
        name: 'Ketravelan',
        url: 'https://ketravelan.com',
      },
    }),
    ...(price && {
      offers: {
        '@type': 'Offer',
        price: price.toString(),
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        url,
      },
    }),
  } : null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(tripSchema)}
      </script>
      {eventSchema && (
        <script type="application/ld+json">
          {JSON.stringify(eventSchema)}
        </script>
      )}
    </Helmet>
  );
}
