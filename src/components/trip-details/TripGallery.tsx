import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripGalleryProps {
  images: string[];
  title: string;
  activeIndex: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onOpenImage: () => void;
  onSelectImage: (index: number) => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  topOverlay?: React.ReactNode;
}

export function TripGallery({
  images,
  title,
  activeIndex,
  containerRef,
  onOpenImage,
  onSelectImage,
  onPrevImage,
  onNextImage,
  onTouchStart,
  onTouchEnd,
  topOverlay,
}: TripGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div ref={containerRef} className="-mx-5 overflow-hidden md:hidden sm:-mx-6">
      <div
        className="relative isolate"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={onOpenImage}
          className="group relative block h-[42vh] min-h-[18rem] max-h-[25rem] w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open trip photo"
        >
          <img
            src={images[activeIndex]}
            alt={`${title} photo`}
            className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.02]"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

        {topOverlay}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={onPrevImage}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 rounded-full border border-white/40 bg-black/30 shadow-lg backdrop-blur-md flex items-center justify-center"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              type="button"
              onClick={onNextImage}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 rounded-full border border-white/40 bg-black/30 shadow-lg backdrop-blur-md flex items-center justify-center"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {activeIndex + 1} / {images.length}
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 w-[84%] overflow-x-auto">
            <div className="mx-auto flex w-max items-center gap-1.5 rounded-2xl border border-white/35 bg-black/30 px-1.5 py-1.5 shadow-2xl backdrop-blur-md">
              {images.map((img, index) => (
                <button
                  key={`mobile-trip-thumb-${index}`}
                  type="button"
                  onClick={() => onSelectImage(index)}
                  className={cn(
                    "relative h-10 w-[4.3rem] overflow-hidden rounded-lg border transition-all",
                    activeIndex === index
                      ? "border-white ring-2 ring-white/90"
                      : "border-white/35 opacity-90"
                  )}
                  aria-label={`View photo ${index + 1}`}
                >
                  <img
                    src={img}
                    alt={`${title} thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
