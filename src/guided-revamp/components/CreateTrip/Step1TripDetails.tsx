import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useTripForm } from '../../contexts/TripFormContext';
import { validateStep1, validateFile } from '../../utils/validation';
import { Location } from '../../types/guided-trip';
import { LocationAutocomplete } from './LocationAutocomplete';

export const Step1TripDetails: React.FC = () => {
  const { formData, updateFormData } = useTripForm();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (formData.coverPhotoUrl) {
      setCoverPreview(formData.coverPhotoUrl);
    }
    if (formData.galleryPhotoUrls.length > 0) {
      setGalleryPreviews(formData.galleryPhotoUrls);
    }
  }, [formData.coverPhotoUrl, formData.galleryPhotoUrls]);

  const handleBlur = () => {
    const validation = validateStep1(formData);
    setErrors(validation.errors);
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
      });

      if (error) {
        setErrors(prev => ({ ...prev, coverPhoto: error }));
        return;
      }

      updateFormData({ coverPhoto: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, coverPhoto: '' }));
    }
  };

  const handleGalleryPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let hasError = false;
    for (const file of files) {
      const error = validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
      });
      if (error) {
        setErrors(prev => ({ ...prev, galleryPhotos: error }));
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      const newGalleryPhotos = [...formData.galleryPhotos, ...files];
      updateFormData({ galleryPhotos: newGalleryPhotos });

      const newPreviews: string[] = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === files.length) {
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
      setErrors(prev => ({ ...prev, galleryPhotos: '' }));
    }
  };

  const removeGalleryPhoto = (index: number) => {
    const newPhotos = formData.galleryPhotos.filter((_, i) => i !== index);
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    updateFormData({ galleryPhotos: newPhotos });
    setGalleryPreviews(newPreviews);
  };

  const handleAddLocation = (location: Location) => {
    const updated = [...formData.locations, location];
    updateFormData({ locations: updated });
    setErrors(prev => ({ ...prev, locations: '' }));
  };

  const handleRemoveLocation = (index: number) => {
    const updated = formData.locations.filter((_, i) => i !== index);
    updateFormData({ locations: updated });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Step 1: Trip Details</h2>
        <p className="text-sm sm:text-base text-gray-600">Provide the basic information about your guided trip.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Trip Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={e => updateFormData({ title: e.target.value })}
            onBlur={handleBlur}
            placeholder="e.g. Ancient Temples of Bali Tour"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location(s) <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Search and add multiple locations for this trip. Start typing to see suggestions.
          </p>
          <LocationAutocomplete
            selectedLocations={formData.locations}
            onAddLocation={handleAddLocation}
            onRemoveLocation={handleRemoveLocation}
            error={errors.locations}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => updateFormData({ description: e.target.value })}
            onBlur={handleBlur}
            placeholder="Describe the experience travelers can expect..."
            rows={6}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="flex justify-between mt-1">
            <div>
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>
            <p className="text-sm text-gray-500">{formData.description.length} / 5000</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Photo <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload a beautiful image that represents this trip (JPG, PNG up to 5 MB).
          </p>
          <div className="space-y-3">
            {coverPreview ? (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    updateFormData({ coverPhoto: null, coverPhotoUrl: null });
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span>
                  </p>
                  <p className="text-xs text-gray-500">JPG or PNG (Max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleCoverPhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {errors.coverPhoto && <p className="mt-1 text-sm text-red-600">{errors.coverPhoto}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo Gallery <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload multiple photos to showcase the trip (JPG, PNG up to 5 MB each).
          </p>
          <div className="space-y-3">
            {galleryPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={preview}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
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
                  <span className="font-semibold">Click to upload multiple photos</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">JPG or PNG (Max 5MB each)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={handleGalleryPhotosChange}
                className="hidden"
              />
            </label>
          </div>
          {errors.galleryPhotos && <p className="mt-1 text-sm text-red-600">{errors.galleryPhotos}</p>}
          {galleryPreviews.length === 0 && (
            <p className="text-sm text-gray-400 italic mt-2">No gallery images uploaded</p>
          )}
        </div>
      </div>
    </div>
  );
};
