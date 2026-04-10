import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface ItineraryPreviewProps {
  content: string;
}

interface DayItem {
  day: string;
  title: string;
  description: string;
}

export const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({ content }) => {
  const parseItinerary = (text: string): DayItem[] => {
    if (!text.trim()) return [];

    const days: DayItem[] = [];
    const lines = text.split('\n');
    let currentDay: Partial<DayItem> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const dayMatch = line.match(/^Day\s+(\d+):?\s*(.*)$/i);
      if (dayMatch) {
        if (currentDay.day) {
          days.push(currentDay as DayItem);
        }
        currentDay = {
          day: dayMatch[1],
          title: dayMatch[2] || 'Untitled',
          description: '',
        };
      } else if (line.toLowerCase().startsWith('description:')) {
        if (currentDay.day) {
          currentDay.description = line.substring(12).trim();
        }
      } else if (currentDay.day && !currentDay.description) {
        currentDay.description = line;
      } else if (currentDay.day && currentDay.description) {
        currentDay.description += ' ' + line;
      }
    }

    if (currentDay.day) {
      days.push(currentDay as DayItem);
    }

    return days;
  };

  const days = parseItinerary(content);

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
        <Calendar className="w-12 h-12 mb-3" />
        <p className="text-sm">Start typing to see your itinerary preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gray-700 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Trip Itinerary</h3>
        <span className="text-sm text-gray-500">({days.length} {days.length === 1 ? 'day' : 'days'})</span>
      </div>

      <div className="relative space-y-6">
        {days.map((day, index) => (
          <div key={index} className="relative pl-8">
            <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {day.day}
            </div>

            {index < days.length - 1 && (
              <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 to-blue-300" />
            )}

            <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Day {day.day}</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">{day.title}</h4>
                </div>
              </div>

              {day.description && (
                <div className="flex gap-2 text-gray-600">
                  <Clock className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                  <p className="text-sm leading-relaxed">{day.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 mb-1">Journey Complete</h5>
            <p className="text-sm text-gray-600">
              This {days.length}-day adventure includes amazing experiences and unforgettable memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
