import React, { useState } from 'react';
import { Plus, X, Upload, FileText, Eye, Edit3 } from 'lucide-react';
import { useTripForm } from '../../contexts/TripFormContext';
import { validateStep3, validateFile } from '../../utils/validation';
import { ItineraryPreview } from './ItineraryPreview';

export const Step3InclusionsExclusions: React.FC = () => {
  const { formData, updateFormData } = useTripForm();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [itineraryViewMode, setItineraryViewMode] = useState<'edit' | 'preview'>('edit');

  const handleBlur = () => {
    const validation = validateStep3(formData);
    setErrors(validation.errors);
  };

  const parseItems = (text: string): string[] => {
    const items: string[] = [];

    const lines = text.split('\n');

    for (const line of lines) {
      const commaSeparated = line.split(',');
      for (const item of commaSeparated) {
        const trimmed = item.trim();
        if (trimmed) {
          items.push(trimmed);
        }
      }
    }

    return items.filter((item, index, self) => self.indexOf(item) === index);
  };

  const addInclusion = () => {
    if (newInclusion.trim()) {
      const newItems = parseItems(newInclusion);
      const existingItems = formData.inclusions;
      const uniqueItems = newItems.filter(item => !existingItems.includes(item));

      if (uniqueItems.length > 0) {
        updateFormData({ inclusions: [...existingItems, ...uniqueItems] });
        setNewInclusion('');
        setErrors(prev => ({ ...prev, inclusions: '' }));
      } else {
        setNewInclusion('');
      }
    }
  };

  const removeInclusion = (index: number) => {
    const updated = formData.inclusions.filter((_, i) => i !== index);
    updateFormData({ inclusions: updated });
  };

  const addExclusion = () => {
    if (newExclusion.trim()) {
      const newItems = parseItems(newExclusion);
      const existingItems = formData.exclusions;
      const uniqueItems = newItems.filter(item => !existingItems.includes(item));

      if (uniqueItems.length > 0) {
        updateFormData({ exclusions: [...existingItems, ...uniqueItems] });
        setNewExclusion('');
        setErrors(prev => ({ ...prev, exclusions: '' }));
      } else {
        setNewExclusion('');
      }
    }
  };

  const removeExclusion = (index: number) => {
    const updated = formData.exclusions.filter((_, i) => i !== index);
    updateFormData({ exclusions: updated });
  };

  const handleItineraryDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      });

      if (error) {
        setErrors(prev => ({ ...prev, itineraryDocument: error }));
        return;
      }

      updateFormData({ itineraryDocument: file });
      setErrors(prev => ({ ...prev, itineraryDocument: '' }));
    }
  };

  const useTemplate = () => {
    const template = `Day 1: Title
Description: Activities for the day.

Day 2: Title
Description: Activities for the day.

Day 3: Title
Description: Activities for the day.`;
    updateFormData({ itinerarySummary: template });
    setShowTemplate(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Step 3: Inclusions, Exclusions & Itinerary</h2>
        <p className="text-sm sm:text-base text-gray-600">Add inclusions, exclusions, and your trip itinerary details.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inclusions <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Add multiple items at once - separate with commas or press Enter for new lines. Paste lists directly!
            </p>
            <div className="space-y-2 mb-3">
              <textarea
                value={newInclusion}
                onChange={e => setNewInclusion(e.target.value)}
                placeholder="e.g. Airport transfers, Hotel accommodation&#10;Daily breakfast and dinner&#10;Professional tour guide, Entrance tickets"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="button"
                onClick={addInclusion}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add All Items
              </button>
            </div>
            {formData.inclusions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.inclusions.map((inclusion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm text-gray-700">{inclusion}</span>
                    <button
                      type="button"
                      onClick={() => removeInclusion(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-lg">No inclusions added yet</p>
            )}
            {errors.inclusions && <p className="mt-2 text-sm text-red-600">{errors.inclusions}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exclusions <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Add multiple items at once - separate with commas or press Enter for new lines. Paste lists directly!
            </p>
            <div className="space-y-2 mb-3">
              <textarea
                value={newExclusion}
                onChange={e => setNewExclusion(e.target.value)}
                placeholder="e.g. Personal expenses, Travel insurance&#10;International airfare&#10;Visa fees, Optional activities, Tips for guides"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="button"
                onClick={addExclusion}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add All Items
              </button>
            </div>
            {formData.exclusions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.exclusions.map((exclusion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm text-gray-700">{exclusion}</span>
                    <button
                      type="button"
                      onClick={() => removeExclusion(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-lg">No exclusions added yet</p>
            )}
            {errors.exclusions && <p className="mt-2 text-sm text-red-600">{errors.exclusions}</p>}
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <label htmlFor="itinerarySummary" className="block text-sm font-medium text-gray-700">
              Itinerary Summary <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {itineraryViewMode === 'edit' && (
                <button
                  type="button"
                  onClick={useTemplate}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Use Template
                </button>
              )}
              <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setItineraryViewMode('edit')}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 ${
                    itineraryViewMode === 'edit'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItineraryViewMode('preview')}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5 ${
                    itineraryViewMode === 'preview'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Preview</span>
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Provide a brief day-by-day itinerary overview. Use the preview to see how it will look.
          </p>
          {showTemplate && itineraryViewMode === 'edit' && (
            <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2 font-medium">Template Format:</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-blue-100">
                Day 1: Arrival Day{'\n'}
                Description: Airport pickup, hotel check-in, welcome dinner at beachfront restaurant.{'\n\n'}
                Day 2: City Exploration{'\n'}
                Description: Guided city tour, visit historical landmarks, local cuisine tasting.{'\n\n'}
                Day 3: Adventure Activities{'\n'}
                Description: Hiking, water sports, and outdoor adventures with professional guides.
              </pre>
            </div>
          )}

          {itineraryViewMode === 'edit' ? (
            <textarea
              id="itinerarySummary"
              value={formData.itinerarySummary}
              onChange={e => updateFormData({ itinerarySummary: e.target.value })}
              onBlur={handleBlur}
              placeholder="Example format:&#10;Day 1: Arrival in Bali&#10;Description: Airport pickup, hotel check-in, welcome dinner.&#10;&#10;Day 2: Temple Tour&#10;Description: Visit ancient temples, traditional lunch."
              rows={12}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm ${
                errors.itinerarySummary ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          ) : (
            <div className="border border-gray-200 rounded-lg p-6 bg-white min-h-[300px]">
              <ItineraryPreview content={formData.itinerarySummary} />
            </div>
          )}
          {errors.itinerarySummary && <p className="mt-1 text-sm text-red-600">{errors.itinerarySummary}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Itinerary Document
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Optional: Upload a detailed itinerary document (PDF / JPG / PNG).
          </p>
          {formData.itineraryDocument || formData.itineraryDocumentUrl ? (
            <div className="space-y-3">
              {formData.itineraryDocument && (formData.itineraryDocument.type === 'image/jpeg' || formData.itineraryDocument.type === 'image/png') ? (
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <img
                    src={URL.createObjectURL(formData.itineraryDocument)}
                    alt="Itinerary document preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => updateFormData({ itineraryDocument: null, itineraryDocumentUrl: null })}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {formData.itineraryDocument?.name || 'Uploaded document'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFormData({ itineraryDocument: null, itineraryDocumentUrl: null })}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Click to upload file</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG or PNG (Max 10MB)</p>
              </div>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleItineraryDocumentChange}
                className="hidden"
              />
            </label>
          )}
          {errors.itineraryDocument && <p className="mt-1 text-sm text-red-600">{errors.itineraryDocument}</p>}
        </div>
      </div>
    </div>
  );
};
