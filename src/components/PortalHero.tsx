import React, { useEffect, useState, useRef } from 'react';
import { Language, SiteSettings } from '../types';
import { translations } from '../translations';
import heroPhoto from '../assets/hero-piano.jpg';

interface PortalHeroProps {
  currentLang: Language;
  settings?: SiteSettings;
}

export const PortalHero: React.FC<PortalHeroProps> = ({ currentLang, settings }) => {
  const t = translations[currentLang];
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const p = Math.min(Math.max(scrolled / totalScrollable, 0), 1);
      setProgress(p);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  // Panel translations: from 0% (closed in middle) to -105% / +105% (cleared outward)
  const leftPanelTranslateX = -(progress * 105);
  const rightPanelTranslateX = progress * 105;

  // Image zoom settles from 1.15 down to 1.0
  const imageScale = 1.15 - progress * 0.15;

  // Duotone wash rises slightly
  const duotoneOpacity = progress * 0.28;

  // Title: grows, tightens tracking, and spans travel to opposite edges proportionally
  const titleScale = 1 + progress * (isMobile ? 0.15 : 0.25);
  const letterSpacingEm = -0.01 - progress * (isMobile ? 0.02 : 0.035);
  const maxSpanTranslate = isMobile ? 42 : isTablet ? 85 : 140;
  const spanTranslateX = progress * maxSpanTranslate;

  // Dots travel outward toward opposite corners proportionally
  const maxDotX = isMobile ? 100 : isTablet ? 175 : 260;
  const maxDotY = isMobile ? 65 : isTablet ? 95 : 140;
  const dot1X = -(progress * maxDotX);
  const dot1Y = -(progress * maxDotY);
  const dot2X = progress * maxDotX;
  const dot2Y = progress * maxDotY;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[250vh] bg-[#0A0C0E]"
    >
      {/* Sticky stage (h-screen overflow-hidden isolation-isolate) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden isolate select-none">
        
        {/* Layer 1: Full-bleed hero image */}
        <div
          className="absolute inset-0 w-full h-full will-change-transform"
          style={{ transform: `scale(${imageScale})`, transformOrigin: 'center center' }}
        >
          <img
            src={settings?.heroPhotoUrl || heroPhoto}
            alt="Mimouni - Master of Music · Piano"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://lh3.googleusercontent.com/pw/AP1GczM2mUKLSxUrLDrJdUnrs-QhFC1FETsHg6CpzlG4zEaHDAU8SBh8pzhrlHIVmqKe-WNuIZ8fL4eND5lIk6G7qJyf3UBt_LmL5SSN_fq7S6x-yxSahA=w2400';
            }}
          />
        </div>

        {/* Layer 2: Duotone wash blending amber (#E8913C) & teal (#2E6B72) */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity"
          style={{
            opacity: duotoneOpacity,
            background: 'linear-gradient(135deg, rgba(232,145,60,0.85) 0%, rgba(46,107,114,0.85) 100%)',
          }}
        />

        {/* Layer 3: Radial veil darkening the edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(10,12,14,0.15) 30%, rgba(10,12,14,0.88) 85%, #0A0C0E 100%)',
          }}
        />

        {/* Layer 4: TWO solid panels meeting in the middle, translating outward */}
        <div
          className="absolute top-0 bottom-0 left-0 w-[53%] bg-[#0A0C0E] border-r border-[rgba(237,231,220,0.08)] z-10 will-change-transform"
          style={{
            transform: `translateX(${leftPanelTranslateX}%)`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 w-[53%] bg-[#0A0C0E] border-l border-[rgba(237,231,220,0.08)] z-10 will-change-transform"
          style={{
            transform: `translateX(${rightPanelTranslateX}%)`,
          }}
        />

        {/* Layer 5: Two accent dots travelling out to opposite corners */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          {/* Amber dot */}
          <div
            className="w-2.5 h-2.5 rounded-full bg-[#E8913C] will-change-transform transition-opacity"
            style={{
              transform: `translate(${dot1X}px, ${dot1Y}px)`,
              opacity: progress > 0.02 ? 0.9 : 0.4,
              boxShadow: '0 0 10px rgba(232,145,60,0.6)',
            }}
          />
          {/* Teal dot */}
          <div
            className="w-2.5 h-2.5 rounded-full bg-[#2E6B72] will-change-transform transition-opacity"
            style={{
              transform: `translate(${dot2X}px, ${dot2Y}px)`,
              opacity: progress > 0.02 ? 0.9 : 0.4,
              boxShadow: '0 0 10px rgba(46,107,114,0.6)',
            }}
          />
        </div>

        {/* Layer 6: Wordmark on top, split into two spans that travel apart while scaling & tightening */}
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center px-4">
          <h1
            className="font-display font-extrabold text-[#EDE7DC] flex flex-nowrap items-center whitespace-nowrap will-change-transform"
            style={{
              fontSize: 'clamp(32px, 9.5vw, 160px)',
              letterSpacing: `${letterSpacingEm}em`,
              transform: `scale(${titleScale})`,
              lineHeight: 1,
            }}
          >
            <span
              className="inline-block transition-transform duration-75"
              style={{
                transform: `translateX(-${spanTranslateX}px)`,
              }}
            >
              MIM
            </span>
            <span
              className="inline-block transition-transform duration-75"
              style={{
                transform: `translateX(${spanTranslateX}px)`,
              }}
            >
              OUNI
            </span>
          </h1>
        </div>

        {/* Layer 7: Corner Metadata pinned to edges - safely below 58px navbar with proper mobile spacing */}
        <div className="absolute inset-0 z-40 pointer-events-none p-4 sm:p-6 lg:p-12 flex flex-col justify-between text-[#9EA5A8] text-[9px] sm:text-[10.5px] font-semibold tracking-[0.1em] sm:tracking-[0.14em] uppercase">
          {/* Top row */}
          <div className="flex justify-between items-center pt-16 sm:pt-4 gap-2">
            <span className="flex items-center gap-1.5 sm:gap-2 truncate max-w-[58%]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C] flex-shrink-0" />
              <span className="truncate">
                {currentLang === 'fr' 
                  ? (settings?.heroTaglineFr || t.hero.cornerTopLeft) 
                  : (settings?.heroTaglineEn || t.hero.cornerTopLeft)}
              </span>
            </span>
            <span className="truncate max-w-[40%] text-right">
              {currentLang === 'fr' 
                ? (settings?.heroLocationFr || t.hero.cornerTopRight) 
                : (settings?.heroLocationEn || t.hero.cornerTopRight)}
            </span>
          </div>

          {/* Bottom row */}
          <div className="flex justify-between items-end pb-3 sm:pb-2 gap-2">
            <span className="truncate max-w-[58%]">
              {currentLang === 'fr' 
                ? (settings?.heroDegreeFr || t.hero.cornerBottomLeft) 
                : (settings?.heroDegreeEn || t.hero.cornerBottomLeft)}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#EDE7DC] flex-shrink-0">
              <span className="text-[9px] sm:text-[10.5px]">{t.hero.cornerBottomRight}</span>
              <span className="inline-block animate-bounce text-[#E8913C]">↓</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
