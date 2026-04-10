import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface TripHeroGalleryProps {
  images: string[];
  tripTitle: string;
}

export const TripHeroGallery: React.FC<TripHeroGalleryProps> = ({ images, tripTitle }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const galleryImages = images.length > 0 ? images : ['/placeholder-trip.jpg'];
  const hasMultipleImages = galleryImages.length > 1;

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    document.body.style.overflow = 'unset';
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const nextHeroImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeroImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const previousHeroImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeroImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToHeroImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHeroImageIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      e.stopPropagation();
      if (distance > 0) {
        setHeroImageIndex((prev) => (prev + 1) % galleryImages.length);
      } else {
        setHeroImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showLightbox) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        previousImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox]);

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg lg:rounded-xl overflow-hidden group">
          <button
            onClick={() => openLightbox(heroImageIndex)}
            className="relative w-full h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={galleryImages[heroImageIndex]}
              alt={`${tripTitle} - Image ${heroImageIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-300"
              loading="eager"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3">
                <Maximize2 className="w-6 h-6 text-gray-900" />
              </div>
            </div>
          </button>

          {hasMultipleImages && (
            <>
              <button
                onClick={previousHeroImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 sm:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
              </button>

              <button
                onClick={nextHeroImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 sm:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {galleryImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => goToHeroImage(index, e)}
                    className={`transition-all ${
                      index === heroImageIndex
                        ? 'w-8 h-2 bg-white'
                        : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                    } rounded-full`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showLightbox && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full transition-all"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={previousImage}
            className="absolute left-4 z-10 p-3 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full transition-all"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 z-10 p-3 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full transition-all"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
            <img
              src={galleryImages[currentImageIndex]}
              alt={`${tripTitle} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-4 py-2 rounded-full">
              <span className="text-white text-sm font-medium">
                {currentImageIndex + 1} / {galleryImages.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
