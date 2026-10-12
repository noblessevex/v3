import React, { useEffect, useState, useRef } from 'react';
import { Language, SiteSettings } from '../types';
import { translations } from '../translations';

interface StatementFoldProps {
  currentLang: Language;
  settings?: SiteSettings;
}

export const StatementFold: React.FC<StatementFoldProps> = ({ currentLang, settings }) => {
  const t = translations[currentLang];
  const sectionRef = useRef<HTMLDivElement>(null);
  const [drift, setDrift] = useState({ y: 0, rotate: 0 });

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const offset = (window.innerHeight - rect.top) * 0.12;
      setDrift({
        y: offset,
        rotate: offset * 0.15,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute text
  const heading = currentLang === 'fr' 
    ? (settings?.aboutHeadingFr || `${t.statement.statementPrefix}${t.statement.statementAccent}${t.statement.statementSuffix}`)
    : (settings?.aboutHeadingEn || `${t.statement.statementPrefix}${t.statement.statementAccent}${t.statement.statementSuffix}`);
    
  const accent = currentLang === 'fr' 
    ? (settings?.aboutAccentPhraseFr || t.statement.statementAccent)
    : (settings?.aboutAccentPhraseEn || t.statement.statementAccent);

  // Render heading with accent phrase highlighted
  const renderHeading = () => {
    if (!accent || !heading.includes(accent)) {
      return <span>{heading}</span>;
    }
    const parts = heading.split(accent);
    return (
      <>
        {parts[0]}
        <span className="text-[#E8913C] font-bold">{accent}</span>
        {parts.slice(1).join(accent)}
      </>
    );
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative min-h-screen w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] flex items-center overflow-hidden px-4 sm:px-6 lg:px-16 py-16 sm:py-24"
    >
      {/* Floating circular image floating off the right edge, drifting and rotating on scroll */}
      <div
        className="absolute -right-24 sm:-right-20 md:-right-24 top-1/2 -translate-y-1/2 w-48 h-48 sm:w-72 sm:h-72 md:w-[440px] md:h-[440px] rounded-full overflow-hidden pointer-events-none opacity-20 sm:opacity-30 mix-blend-screen transition-transform duration-100 ease-out will-change-transform border border-[rgba(237,231,220,0.15)]"
        style={{
          transform: `translateY(calc(-50% + ${drift.y}px)) rotate(${drift.rotate}deg)`,
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=1200&q=80"
          alt="Close up of piano keys"
          className="w-full h-full object-cover scale-110"
        />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
        
        {/* Left Column: Outlined Numeral '01' + Small Label */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col justify-between items-center lg:items-start self-stretch space-y-0 lg:space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
            <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
              {t.statement.label}
            </span>
          </div>

          {/* Outlined index numeral using -webkit-text-stroke with transparent fill */}
          <div className="font-display font-extrabold text-5xl sm:text-7xl md:text-9xl text-stroke-outline select-none leading-none">
            01
          </div>

          <div className="hidden lg:block text-[11px] text-[#6C7378] tracking-[0.08em] uppercase max-w-[16ch]">
            Piano pedagogy · Musicology
          </div>
        </div>

        {/* Right Column: Statement text */}
        <div className="lg:col-span-9 space-y-6 sm:space-y-8">
          <p
            className="font-display font-semibold text-[#EDE7DC] leading-[1.3] text-xl sm:text-3xl md:text-4xl lg:text-[46px] max-w-none lg:max-w-[24ch] tracking-[-0.025em]"
          >
            {renderHeading()}
          </p>

          {/* Neutral metadata footnote */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-8 gap-y-2.5 pt-6 border-t border-[rgba(237,231,220,0.13)] text-[10.5px] sm:text-[11px] text-[#9EA5A8] font-medium tracking-[0.08em]">
            <div>
              <span className="text-[#EDE7DC] font-semibold">Location:</span> Ben Arous, Tunisia
            </div>
            <div>
              <span className="text-[#EDE7DC] font-semibold">Qualification:</span> Master of Music (M.Mus)
            </div>
            <div>
              <span className="text-[#EDE7DC] font-semibold">Focus:</span> Classical Piano & Theory
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
