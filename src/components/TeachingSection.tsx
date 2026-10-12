import React from 'react';
import { Language, TeachingRow } from '../types';
import { translations } from '../translations';

interface TeachingSectionProps {
  currentLang: Language;
  teachingRows?: TeachingRow[];
}

export const TeachingSection: React.FC<TeachingSectionProps> = ({ currentLang, teachingRows }) => {
  const t = translations[currentLang];

  const rows = (teachingRows && teachingRows.length > 0)
    ? teachingRows.map(r => ({
        label: currentLang === 'fr' ? (r.labelFr || r.labelEn) : (r.labelEn || r.labelFr),
        name: currentLang === 'fr' ? (r.nameFr || r.nameEn) : (r.nameEn || r.nameFr),
        note: currentLang === 'fr' ? (r.noteFr || r.noteEn) : (r.noteEn || r.noteFr),
      }))
    : t.teaching.rows;

  return (
    <section className="relative w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] px-4 sm:px-6 lg:px-16 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-16">
          <div>
            <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
              <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
                {t.teaching.eyebrow}
              </span>
            </div>
            <h2
              className="font-display font-extrabold text-[#EDE7DC] tracking-[-0.03em] leading-tight text-3xl sm:text-4xl md:text-[46px]"
            >
              {t.teaching.heading}
            </h2>
          </div>
          <p className="text-[#9EA5A8] text-xs max-w-sm tracking-[0.04em]">
            {t.teaching.subheading}
          </p>
        </div>

        {/* Hairline-ruled Rows */}
        <div className="border-t border-[rgba(237,231,220,0.13)] divide-y divide-[rgba(237,231,220,0.13)]">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="py-5 sm:py-8 grid grid-cols-1 md:grid-cols-12 gap-1 sm:gap-4 items-baseline group hover:bg-[#101317]/50 transition-colors px-1 sm:px-2 rounded-lg"
            >
              {/* Amber small uppercase accent label */}
              <div className="md:col-span-3">
                <span className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.15em] uppercase text-[#E8913C]">
                  {row.label}
                </span>
              </div>

              {/* Display-face name in Syne */}
              <div className="md:col-span-6 mt-1 md:mt-0">
                <h3 className="font-display font-bold text-lg sm:text-xl md:text-2xl text-[#EDE7DC] tracking-[-0.02em] group-hover:text-white transition-colors">
                  {row.name}
                </h3>
              </div>

              {/* Right-aligned note */}
              <div className="md:col-span-3 text-left md:text-right mt-1 md:mt-0">
                <span className="text-[11px] sm:text-xs text-[#9EA5A8] tracking-[0.06em]">
                  {row.note}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
