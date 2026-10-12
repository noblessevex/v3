import React, { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Language, GalleryImage } from '../types';

interface GallerySectionProps {
  currentLang: Language;
  images?: GalleryImage[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ currentLang, images = [] }) => {
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!sortedImages || sortedImages.length === 0) {
    return null;
  }

  const handleOpenLightbox = (index: number) => {
    setActiveModalIndex(index);
  };

  const handleCloseLightbox = () => {
    setActiveModalIndex(null);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeModalIndex === null) return;
    setActiveModalIndex((activeModalIndex - 1 + sortedImages.length) % sortedImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeModalIndex === null) return;
    setActiveModalIndex((activeModalIndex + 1) % sortedImages.length);
  };

  return (
    <section
      id="gallery"
      className="relative w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] py-16 sm:py-24 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-16 space-y-10 sm:space-y-14">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
              <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
                {currentLang === 'fr' ? 'Atelier & Scène' : 'Studio & Performance'}
              </span>
            </div>
            <h2 className="font-display font-extrabold text-[#EDE7DC] tracking-[-0.03em] leading-tight text-3xl sm:text-4xl md:text-[46px]">
              {currentLang === 'fr' ? 'Instants au Clavier' : 'Moments at the Piano'}
            </h2>
          </div>
          <p className="text-[#9EA5A8] text-xs tracking-[0.05em] max-w-sm leading-relaxed">
            {currentLang === 'fr'
              ? 'L’art du toucher, l’étude des maîtres et l’éveil au son dans le studio de Ben Arous.'
              : 'The touch, classical mastery, and daily dedication inside the Ben Arous teaching studio.'}
          </p>
        </div>

        {/* Clean Architectural Photo Gallery (NO cards or boxes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedImages.map((img, idx) => {
            const caption = currentLang === 'fr' ? (img.captionFr || img.captionEn) : (img.captionEn || img.captionFr);
            return (
              <div
                key={img.id || idx}
                onClick={() => handleOpenLightbox(idx)}
                className="group relative cursor-pointer overflow-hidden aspect-[4/5] bg-[#101317] border border-[rgba(237,231,220,0.08)] hover:border-[#E8913C]/40 transition-colors"
              >
                <img
                  src={img.url}
                  alt={caption || 'Studio moment'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter grayscale-[25%] contrast-[105%] group-hover:grayscale-0"
                />

                {/* Subtle vignette & caption reveal */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity flex flex-col justify-end p-4 sm:p-5">
                  <div className="flex items-center justify-between text-[#E8913C] text-[10px] uppercase font-mono tracking-wider mb-1">
                    <span>0{idx + 1}</span>
                    <Maximize2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {caption && (
                    <p className="text-xs text-[#EDE7DC] font-medium leading-snug line-clamp-2">
                      {caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Lightbox Modal */}
      {activeModalIndex !== null && sortedImages[activeModalIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={handleCloseLightbox}
        >
          <button
            type="button"
            onClick={handleCloseLightbox}
            className="cursor-pointer absolute top-5 right-5 w-10 h-10 rounded-full border border-[rgba(237,231,220,0.2)] text-[#EDE7DC] hover:bg-white/10 flex items-center justify-center transition-colors z-50"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handlePrev}
            className="cursor-pointer absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[rgba(237,231,220,0.2)] text-[#EDE7DC] hover:bg-white/10 flex items-center justify-center transition-colors z-50"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="cursor-pointer absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[rgba(237,231,220,0.2)] text-[#EDE7DC] hover:bg-white/10 flex items-center justify-center transition-colors z-50"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={sortedImages[activeModalIndex].url}
              alt="Gallery Preview"
              className="max-h-[75vh] w-auto object-contain border border-[rgba(237,231,220,0.15)] shadow-2xl"
            />
            {(() => {
              const cap = currentLang === 'fr' 
                ? (sortedImages[activeModalIndex].captionFr || sortedImages[activeModalIndex].captionEn) 
                : (sortedImages[activeModalIndex].captionEn || sortedImages[activeModalIndex].captionFr);
              return cap ? (
                <p className="mt-4 text-xs sm:text-sm text-[#EDE7DC] font-medium text-center max-w-lg tracking-wide">
                  {cap}
                </p>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </section>
  );
};
