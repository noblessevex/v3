import React, { useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface PricingSectionProps {
  currentLang: Language;
  ratePer30Min?: number;
  onApplyPlan: (plan: {
    durationLabel: string;
    durationMinutes: number;
    blocks: number;
    frequencyLabel: string;
    weeklySessions: number;
    pricePerWeek: number;
    pricePerMonth: number;
  }) => void;
}

const DURATION_CHOICES = [
  { minutes: 30, labelEn: '30 min', labelFr: '30 min', blocks: 1 },
  { minutes: 45, labelEn: '45 min', labelFr: '45 min', blocks: 1.5 },
  { minutes: 60, labelEn: '1 hour', labelFr: '1 heure', blocks: 2 },
  { minutes: 90, labelEn: '1h 30m', labelFr: '1h 30m', blocks: 3 },
];

const FREQ_CHOICES = [
  { sessions: 1, labelEn: '1x / week', labelFr: '1x / semaine' },
  { sessions: 2, labelEn: '2x / week', labelFr: '2x / semaine' },
  { sessions: 3, labelEn: '3x / week', labelFr: '3x / semaine' },
  { sessions: 5, labelEn: 'Daily (5x)', labelFr: 'Quotidien (5x)' },
];

export const PricingSection: React.FC<PricingSectionProps> = ({
  currentLang,
  ratePer30Min = 12,
  onApplyPlan,
}) => {
  const t = translations[currentLang];

  const [selectedDuration, setSelectedDuration] = useState(DURATION_CHOICES[2]); // 1 hour
  const [selectedFreq, setSelectedFreq] = useState(FREQ_CHOICES[1]); // 2x / week
  const [copied, setCopied] = useState(false);

  const BASE_RATE = ratePer30Min; // TND per 30 minutes
  const pricePerLesson = selectedDuration.blocks * BASE_RATE;
  const pricePerWeek = pricePerLesson * selectedFreq.sessions;
  const pricePerMonth = pricePerWeek * 4;

  const tableRows = [
    { durationEn: '30 min', durationFr: '30 min', freqEn: 'once a week', freqFr: '1 fois par semaine', week: 1 * BASE_RATE, month: 4 * BASE_RATE },
    { durationEn: '30 min', durationFr: '30 min', freqEn: 'twice a week', freqFr: '2 fois par semaine', week: 2 * BASE_RATE, month: 8 * BASE_RATE },
    { durationEn: '1 hour', durationFr: '1 heure', freqEn: 'once a week', freqFr: '1 fois par semaine', week: 2 * BASE_RATE, month: 8 * BASE_RATE },
    { durationEn: '1 hour', durationFr: '1 heure', freqEn: 'twice a week', freqFr: '2 fois par semaine', week: 4 * BASE_RATE, month: 16 * BASE_RATE },
  ];

  const handleApply = () => {
    onApplyPlan({
      durationLabel: currentLang === 'fr' ? selectedDuration.labelFr : selectedDuration.labelEn,
      durationMinutes: selectedDuration.minutes,
      blocks: selectedDuration.blocks,
      frequencyLabel: currentLang === 'fr' ? selectedFreq.labelFr : selectedFreq.labelEn,
      weeklySessions: selectedFreq.sessions,
      pricePerWeek,
      pricePerMonth,
    });

    setCopied(true);
    setTimeout(() => setCopied(false), 2400);

    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="pricing"
      className="relative w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] px-4 sm:px-6 lg:px-16 py-16 sm:py-24"
    >
      <div className="max-w-6xl mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* Section Header */}
        <div>
          <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
            <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
              {t.pricing.eyebrow}
            </span>
          </div>
          <h2
            className="font-display font-extrabold text-[#EDE7DC] tracking-[-0.03em] leading-tight text-3xl sm:text-4xl md:text-[46px]"
          >
            {t.pricing.heading}
          </h2>
          <p className="text-[#9EA5A8] text-xs tracking-[0.06em] mt-2">
            {t.pricing.subheading}
          </p>
        </div>

        {/* Pricing Table with Uppercase Headers over Hairline */}
        <div className="w-full">
          {/* Table Header (desktop) */}
          <div className="hidden sm:grid sm:grid-cols-12 py-3.5 border-b border-[rgba(237,231,220,0.13)] text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378]">
            <div className="sm:col-span-3">{t.pricing.colDuration}</div>
            <div className="sm:col-span-4">{t.pricing.colFrequency}</div>
            <div className="sm:col-span-2 text-right">{t.pricing.colWeek}</div>
            <div className="sm:col-span-3 text-right">{t.pricing.colMonth}</div>
          </div>

          {/* Table Rows (mobile card-rows + desktop 12-col grid) */}
          <div className="divide-y divide-[rgba(237,231,220,0.13)]">
            {tableRows.map((row, index) => (
              <div
                key={index}
                className="py-4 sm:py-5 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 items-stretch sm:items-baseline hover:bg-[#101317]/40 transition-colors"
              >
                {/* Mobile top row: duration and frequency */}
                <div className="flex sm:contents items-baseline justify-between">
                  {/* Display-face first column */}
                  <div className="sm:col-span-3 font-display font-bold text-lg sm:text-xl text-[#EDE7DC] tracking-[-0.02em]">
                    {currentLang === 'fr' ? row.durationFr : row.durationEn}
                  </div>

                  {/* Neutral metadata column */}
                  <div className="sm:col-span-4 text-xs text-[#9EA5A8] tracking-[0.05em] capitalize">
                    {currentLang === 'fr' ? row.freqFr : row.freqEn}
                  </div>
                </div>

                {/* Mobile bottom row: rates */}
                <div className="flex sm:contents items-baseline justify-between pt-1 sm:pt-0 border-t border-[rgba(237,231,220,0.06)] sm:border-0">
                  <div className="sm:col-span-2 text-left sm:text-right text-xs font-mono text-[#9EA5A8]">
                    <span className="sm:hidden text-[10px] text-[#6C7378] mr-1.5 uppercase font-sans">Per week:</span>
                    {row.week} <span className="text-[10px]">TND</span>
                  </div>

                  <div className="sm:col-span-3 text-right font-mono font-bold text-sm sm:text-base text-[#EDE7DC]">
                    <span className="sm:hidden text-[10px] text-[#6C7378] mr-1.5 uppercase font-sans font-normal">Per month:</span>
                    {row.month} <span className="text-xs text-[#E8913C] font-normal">TND</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Interactive Pricing Calculator in Dark Hairline Style */}
        <div className="pt-8 sm:pt-10 border-t border-[rgba(237,231,220,0.13)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Calculator Controls */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7">
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-[#EDE7DC] tracking-[-0.02em]">
                  {t.pricing.calculatorTitle}
                </h3>
                <p className="text-xs text-[#9EA5A8] tracking-[0.04em] mt-1">
                  {t.pricing.calculatorSub}
                </p>
              </div>

              {/* Session Duration Choice */}
              <div className="space-y-2.5 sm:space-y-3">
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.pricing.colDuration}
                </span>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {DURATION_CHOICES.map((opt) => {
                    const isSelected = selectedDuration.minutes === opt.minutes;
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setSelectedDuration(opt)}
                        className={`cursor-pointer px-3.5 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-medium tracking-[0.06em] transition-colors border ${
                          isSelected
                            ? 'border-[#E8913C] text-[#E8913C] bg-[#E8913C]/10'
                            : 'border-[rgba(237,231,220,0.14)] text-[#9EA5A8] hover:border-[rgba(237,231,220,0.3)] hover:text-[#EDE7DC]'
                        }`}
                      >
                        {currentLang === 'fr' ? opt.labelFr : opt.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency Choice */}
              <div className="space-y-2.5 sm:space-y-3">
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.pricing.colFrequency}
                </span>
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {FREQ_CHOICES.map((opt) => {
                    const isSelected = selectedFreq.sessions === opt.sessions;
                    return (
                      <button
                        key={opt.sessions}
                        type="button"
                        onClick={() => setSelectedFreq(opt)}
                        className={`cursor-pointer px-3.5 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-medium tracking-[0.06em] transition-colors border ${
                          isSelected
                            ? 'border-[#E8913C] text-[#E8913C] bg-[#E8913C]/10'
                            : 'border-[rgba(237,231,220,0.14)] text-[#9EA5A8] hover:border-[rgba(237,231,220,0.3)] hover:text-[#EDE7DC]'
                        }`}
                      >
                        {currentLang === 'fr' ? opt.labelFr : opt.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Computed Summary & Action */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[rgba(237,231,220,0.13)] pt-6 lg:pt-0 pl-0 lg:pl-10 space-y-5 sm:space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.pricing.colMonth}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#EDE7DC] tracking-[-0.03em] font-mono">
                    {pricePerMonth}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#E8913C]">
                    TND
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#9EA5A8] border-t border-[rgba(237,231,220,0.1)] pt-4">
                <div className="flex justify-between">
                  <span>Weekly equivalent:</span>
                  <span className="font-mono text-[#EDE7DC]">{pricePerWeek} TND</span>
                </div>
                <div className="flex justify-between">
                  <span>Single session ({selectedDuration.minutes}m):</span>
                  <span className="font-mono text-[#EDE7DC]">{pricePerLesson} TND</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="cursor-pointer w-full border border-[#E8913C] hover:bg-[#E8913C] active:bg-[#E8913C] text-[#E8913C] hover:text-[#0A0C0E] active:text-[#0A0C0E] text-[11px] font-semibold tracking-[0.14em] uppercase py-3.5 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>{t.pricing.applyBtn}</span>
                </button>

                {copied && (
                  <p className="text-center text-xs text-[#E8913C] mt-2 font-medium flex items-center justify-center gap-1.5 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.pricing.applied}</span>
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
