import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, InstrumentCourse } from '../types';
import { translations } from '../translations';
import { DEFAULT_COURSES } from '../firebase';

interface LessonsSectionProps {
  currentLang: Language;
  courses?: InstrumentCourse[];
  onCalculateClick: () => void;
  onRequestClick: (courseName?: string) => void;
}

export const LessonsSection: React.FC<LessonsSectionProps> = ({
  currentLang,
  courses = DEFAULT_COURSES,
  onCalculateClick,
  onRequestClick,
}) => {
  const t = translations[currentLang];
  const activeCourses = (courses && courses.length > 0 ? courses : DEFAULT_COURSES).filter(c => c.visible !== false);
  const [deck, setDeck] = useState<InstrumentCourse[]>(activeCourses);

  useEffect(() => {
    setDeck(activeCourses);
  }, [courses]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [thrownCardId, setThrownCardId] = useState<string | null>(null);
  const [throwDirection, setThrowDirection] = useState<'left' | 'right'>('right');
  const deckRef = useRef<HTMLDivElement>(null);

  // Active top card
  const topCard = deck[0];

  // Throw top card and rotate deck
  const throwTopCard = (direction: 'left' | 'right') => {
    if (deck.length <= 1) return;
    setThrowDirection(direction);
    setThrownCardId(deck[0].id);

    setTimeout(() => {
      setDeck((prev) => {
        const [first, ...rest] = prev;
        return [...rest, first];
      });
      setThrownCardId(null);
    }, 280);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      throwTopCard('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      throwTopCard('left');
    }
  };

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    setDragState((prev) => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    const deltaX = dragState.currentX - dragState.startX;
    setDragState((prev) => ({ ...prev, isDragging: false }));

    // Threshold of roughly 40px (1/10th of deck width)
    if (deltaX > 45) {
      throwTopCard('right');
    } else if (deltaX < -45) {
      throwTopCard('left');
    }
  };

  // Active card offset while dragging
  const dragDeltaX = dragState.isDragging ? dragState.currentX - dragState.startX : 0;
  const dragDeltaY = dragState.isDragging ? dragState.currentY - dragState.startY : 0;
  const dragRotation = dragDeltaX * 0.08;

  return (
    <section
      id="lessons"
      className="relative min-h-screen w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] px-4 sm:px-6 lg:px-16 py-16 sm:py-24 flex items-center overflow-hidden"
    >
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        
        {/* Left Column: Headline, lede, two buttons */}
        <div className="lg:col-span-6 space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
            <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
              {t.lessons.eyebrow}
            </span>
          </div>

          <h2
            className="font-display font-extrabold text-[#EDE7DC] tracking-[-0.03em] leading-[1.08] text-3xl sm:text-4xl md:text-5xl lg:text-[56px]"
          >
            {t.lessons.heading}
          </h2>

          <p className="text-[#9EA5A8] text-sm sm:text-base leading-relaxed max-w-lg">
            {t.lessons.lede}
          </p>

          {/* Two buttons (Calculate my price & Request a lesson) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
            <button
              onClick={onCalculateClick}
              className="cursor-pointer border border-[#E8913C] text-[#E8913C] hover:bg-[#E8913C] hover:text-[#0A0C0E] active:bg-[#E8913C] active:text-[#0A0C0E] text-[11px] font-semibold tracking-[0.14em] uppercase px-5 py-3 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              <span>{t.lessons.calcBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onRequestClick(topCard?.nameEn)}
              className="cursor-pointer border border-[rgba(237,231,220,0.18)] hover:border-[#EDE7DC] text-[#EDE7DC] text-[11px] font-semibold tracking-[0.14em] uppercase px-5 py-3 rounded-full transition-colors text-center"
            >
              {t.lessons.requestBtn}
            </button>
          </div>
        </div>

        {/* Right Column: Physical Throwable Deck */}
        <div className="lg:col-span-6 flex flex-col items-center w-full">
          
          {/* Deck Container */}
          <div
            ref={deckRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ touchAction: 'pan-y' }}
            aria-label="Interactive course catalogue deck. Use arrows or drag to cycle cards."
            className="relative w-full max-w-[310px] sm:max-w-[390px] md:max-w-[420px] aspect-square select-none focus:outline-none focus:ring-1 focus:ring-[#E8913C]/40 rounded-3xl"
          >
            {deck.map((course, index) => {
              // Visible top 4 cards in physical stacked order
              if (index > 3) return null;

              const isTop = index === 0;
              const isBeingThrown = isTop && thrownCardId === course.id;

              // Physical offsets for stacked effect
              const offsetAngle = index === 0 ? 0 : index === 1 ? -2.5 : index === 2 ? 3 : -1.5;
              const offsetX = index === 0 ? 0 : index === 1 ? -6 : index === 2 ? 6 : -3;
              const offsetY = index * -6;
              const scale = 1 - index * 0.04;
              const zIndex = 30 - index;

              // Style when top card is being dragged or thrown
              let transformStyle = `translate(${offsetX}px, ${offsetY}px) rotate(${offsetAngle}deg) scale(${scale})`;
              let transitionStyle = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';

              if (isTop) {
                if (isBeingThrown) {
                  const throwX = throwDirection === 'right' ? 480 : -480;
                  const throwRot = throwDirection === 'right' ? 26 : -26;
                  transformStyle = `translate(${throwX}px, -40px) rotate(${throwRot}deg) scale(0.9)`;
                  transitionStyle = 'transform 0.28s ease-in, opacity 0.28s ease-in';
                } else if (dragState.isDragging) {
                  transformStyle = `translate(${dragDeltaX}px, ${dragDeltaY * 0.3}px) rotate(${dragRotation}deg) scale(1.02)`;
                  transitionStyle = 'none'; // Drop transition while tracking pointer
                }
              }

              return (
                <div
                  key={course.id}
                  onPointerDown={isTop ? handlePointerDown : undefined}
                  onPointerMove={isTop ? handlePointerMove : undefined}
                  onPointerUp={isTop ? handlePointerUp : undefined}
                  className={`absolute inset-0 rounded-2xl bg-[#101317] border border-[rgba(237,231,220,0.14)] p-5 sm:p-7 md:p-9 flex flex-col justify-between shadow-[0_22px_45px_rgba(0,0,0,0.75)] ${
                    isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                  }`}
                  style={{
                    transform: transformStyle,
                    transition: transitionStyle,
                    zIndex,
                    opacity: isBeingThrown ? 0.3 : 1 - index * 0.12,
                  }}
                >
                  {/* Card Header: Catalog code & Accent label */}
                  <div className="flex justify-between items-start border-b border-[rgba(237,231,220,0.1)] pb-3 sm:pb-4">
                    <div>
                      <span className="font-display font-bold text-xs tracking-wider text-[#E8913C]">
                        MM-0{index + 1}
                      </span>
                      <p className="text-[9.5px] sm:text-[10px] tracking-[0.12em] sm:tracking-[0.14em] uppercase text-[#6C7378] mt-0.5">
                        {currentLang === 'fr' ? course.levelFr : course.levelEn}
                      </p>
                    </div>
                    <span className="text-[9.5px] sm:text-[10px] tracking-[0.12em] sm:tracking-[0.14em] uppercase text-[#2E6B72] font-semibold">
                      {currentLang === 'fr' ? course.ageFr : course.ageEn}
                    </span>
                  </div>

                  {/* Card Center: Display Course Title & Tagline */}
                  <div className="my-auto py-1 sm:py-2">
                    <h3 className="font-display font-bold text-lg sm:text-2xl md:text-3xl text-[#EDE7DC] leading-tight tracking-[-0.02em]">
                      {currentLang === 'fr' ? course.nameFr : course.nameEn}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#E8913C] italic mt-1.5 sm:mt-2 font-medium">
                      "{currentLang === 'fr' ? course.taglineFr : course.taglineEn}"
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#9EA5A8] leading-relaxed mt-2 sm:mt-3 line-clamp-3 sm:line-clamp-none">
                      {currentLang === 'fr' ? course.descriptionFr : course.descriptionEn}
                    </p>
                  </div>

                  {/* Card Bottom: Footnote & Select trigger */}
                  <div className="pt-3 sm:pt-4 border-t border-[rgba(237,231,220,0.1)] flex items-center justify-between text-[10px] sm:text-[10.5px]">
                    <span className="text-[#6C7378] tracking-[0.08em] sm:tracking-[0.1em] uppercase">
                      Piano Specialty
                    </span>
                    <span className="text-[#EDE7DC] font-semibold flex items-center gap-1">
                      Swipe card →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hint line and progress dots beneath the deck */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-[10.5px] tracking-[0.14em] uppercase text-[#6C7378]">
              <button
                onClick={() => throwTopCard('left')}
                className="hover:text-[#EDE7DC] cursor-pointer p-1"
                aria-label="Previous card"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{t.lessons.deckHint}</span>
              <button
                onClick={() => throwTopCard('right')}
                className="hover:text-[#EDE7DC] cursor-pointer p-1"
                aria-label="Next card"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {activeCourses.map((c) => (
                <div
                  key={c.id}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    topCard?.id === c.id ? 'bg-[#E8913C] w-4' : 'bg-[rgba(237,231,220,0.2)]'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
