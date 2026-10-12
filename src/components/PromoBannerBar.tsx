import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Language, PromoBanner } from '../types';

interface PromoBannerBarProps {
  currentLang: Language;
  banner?: PromoBanner;
}

export const PromoBannerBar: React.FC<PromoBannerBarProps> = ({ currentLang, banner }) => {
  if (!banner || !banner.active) return null;

  // Check date range if specified
  const todayStr = new Date().toISOString().split('T')[0];
  if (banner.startDate && todayStr < banner.startDate) return null;
  if (banner.endDate && todayStr > banner.endDate) return null;

  const text = currentLang === 'fr' 
    ? (banner.textFr || banner.textEn) 
    : (banner.textEn || banner.textFr);

  if (!text) return null;

  const content = (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2.5 text-center truncate">
      <Sparkles className="w-3.5 h-3.5 text-[#E8913C] shrink-0" />
      <span className="text-[11px] sm:text-xs font-medium text-[#EDE7DC] tracking-wide truncate">
        {text}
      </span>
      {banner.link && (
        <span className="inline-flex items-center gap-1 text-[10.5px] uppercase font-mono tracking-wider text-[#E8913C] font-semibold hover:underline shrink-0 ml-1">
          <span>{currentLang === 'fr' ? 'Découvrir' : 'Details'}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  return (
    <aside
      aria-label="Promotional Announcement"
      className="w-full bg-[#12161B] border-b border-[#E8913C]/30 py-2 sm:py-2.5 z-40 relative selection:bg-[#E8913C] selection:text-[#0A0C0E]"
    >
      {banner.link ? (
        <a
          href={banner.link}
          className="block hover:opacity-95 transition-opacity"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </aside>
  );
};
