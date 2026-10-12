import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Language, BookingRequest, InstrumentCourse, SiteSettings } from '../types';
import { translations } from '../translations';
import { addBookingRequest, DEFAULT_COURSES } from '../firebase';

interface ContactSectionProps {
  currentLang: Language;
  courses?: InstrumentCourse[];
  settings?: SiteSettings;
  prefillPlan?: {
    durationLabel: string;
    durationMinutes: number;
    blocks: number;
    frequencyLabel: string;
    weeklySessions: number;
    pricePerWeek: number;
    pricePerMonth: number;
  };
  selectedCourse?: string;
  onRequestSubmitted: (req: BookingRequest) => void;
  onAdminClick: () => void;
  onStudentClick?: () => void;
  onLanguageChange: (lang: Language) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  currentLang,
  courses = DEFAULT_COURSES,
  settings,
  prefillPlan,
  selectedCourse,
  onRequestSubmitted,
  onAdminClick,
  onStudentClick,
  onLanguageChange,
}) => {
  const t = translations[currentLang];
  const activeCourses = courses.filter(c => c.visible !== false);
  const baseRate = settings?.ratePer30Min || 12;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: activeCourses[0]?.nameEn || DEFAULT_COURSES[0].nameEn,
    location: "at the teacher's place",
    sessionLength: '60 min',
    sessionBlocks: 2,
    frequency: '2x per week',
    weeklySessions: 2,
    pricePerWeek: 2 * baseRate * 2,
    totalPrice: 2 * baseRate * 2 * 4,
    message: '',
  });

  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<BookingRequest | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; code?: string } | null>(null);

  // Sync when pricing calculator sends plan
  useEffect(() => {
    if (prefillPlan) {
      setFormData((prev) => ({
        ...prev,
        sessionLength: `${prefillPlan.durationMinutes} min`,
        sessionBlocks: prefillPlan.blocks,
        frequency: prefillPlan.frequencyLabel,
        weeklySessions: prefillPlan.weeklySessions,
        pricePerWeek: prefillPlan.pricePerWeek,
        totalPrice: prefillPlan.pricePerMonth,
      }));
    }
  }, [prefillPlan]);

  // Sync when course selected from deck
  useEffect(() => {
    if (selectedCourse) {
      setFormData((prev) => ({ ...prev, subject: selectedCourse }));
    }
  }, [selectedCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Spam honeypot detection
    if (honeypot) {
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted({
          id: 'REQ-SPAM-PREVENTED',
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          instrument: formData.subject,
          frequency: formData.frequency,
          sessionLength: formData.sessionLength,
          sessionBlocks: formData.sessionBlocks,
          pricePerWeek: formData.pricePerWeek,
          totalPrice: formData.totalPrice,
          preferredLocation: formData.location,
          message: formData.message,
          status: 'pending',
          paymentStatus: 'unpaid',
          createdAt: new Date().toISOString(),
        });
      }, 300);
      return;
    }

    try {
      const res = await addBookingRequest({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        instrument: formData.subject,
        frequency: formData.frequency,
        sessionLength: formData.sessionLength,
        sessionBlocks: formData.sessionBlocks,
        pricePerWeek: formData.pricePerWeek,
        totalPrice: formData.totalPrice,
        preferredLocation: formData.location,
        message: formData.message.trim(),
        status: 'pending',
        paymentStatus: 'unpaid',
        invoiceNotes: 'Created via website booking form.',
      });

      if (!res.success || !res.id) {
        const errorObj = {
          message: res.error || 'Failed to submit booking inquiry. Please verify your connection.',
          code: res.code || 'firestore/error',
        };
        console.error('Contact form submission failed:', errorObj.code, errorObj.message);
        setSubmitError(errorObj);
      } else {
        const created: BookingRequest = {
          id: res.id,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          instrument: formData.subject,
          frequency: formData.frequency,
          sessionLength: formData.sessionLength,
          sessionBlocks: formData.sessionBlocks,
          pricePerWeek: formData.pricePerWeek,
          totalPrice: formData.totalPrice,
          preferredLocation: formData.location,
          message: formData.message.trim(),
          status: 'pending',
          paymentStatus: 'unpaid',
          createdAt: new Date().toISOString(),
        };
        setSubmitted(created);
        onRequestSubmitted(created);
      }
    } catch (err: any) {
      console.error('Contact form unexpected exception:', err.code || 'unknown', err.message);
      setSubmitError({
        message: err.message || 'An unexpected error occurred while sending your request.',
        code: err.code || 'network/error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(null);
    setSubmitError(null);
    setHoneypot('');
    setFormData((prev) => ({
      ...prev,
      name: '',
      phone: '',
      email: '',
      message: '',
    }));
  };

  return (
    <section
      id="contact"
      className="relative w-full bg-[#0A0C0E] border-t border-[rgba(237,231,220,0.13)] pt-16 sm:pt-24 pb-0 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-16 mb-12 sm:mb-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-10 sm:mb-16">
          <div>
            <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
              <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
                {t.contact.eyebrow}
              </span>
            </div>
            <h2
              className="font-display font-extrabold text-[#EDE7DC] tracking-[-0.03em] leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-[56px]"
            >
              {t.contact.heading}
            </h2>
          </div>
          <p className="text-xs text-[#9EA5A8] max-w-sm tracking-[0.04em]">
            {t.contact.subheading}
          </p>
        </div>

        {/* Contact Form with Hairline Underline Fields & NO filled boxes */}
        {submitted ? (
          <div className="max-w-xl space-y-6 py-6">
            <div className="flex items-center gap-3 text-[#E8913C]">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              <h3 className="font-display font-bold text-2xl text-[#EDE7DC]">
                {t.contact.successTitle}
              </h3>
            </div>
            <p className="text-sm text-[#9EA5A8]">
              {t.contact.successDesc}
              <span className="text-[#EDE7DC] font-mono font-bold tracking-wider ml-1">
                {submitted.id}
              </span>
            </p>
            <div className="border-t border-b border-[rgba(237,231,220,0.13)] py-4 space-y-2 text-xs text-[#9EA5A8]">
              <div><strong className="text-[#EDE7DC]">Student:</strong> {submitted.name}</div>
              <div><strong className="text-[#EDE7DC]">Subject:</strong> {submitted.instrument}</div>
              <div><strong className="text-[#EDE7DC]">Plan:</strong> {submitted.frequency} ({submitted.sessionLength})</div>
              <div><strong className="text-[#EDE7DC]">Tuition:</strong> <span className="text-[#E8913C] font-mono font-bold">{submitted.totalPrice} TND / month</span></div>
              <div><strong className="text-[#EDE7DC]">Location:</strong> {submitted.preferredLocation}</div>
            </div>
            <p className="text-xs text-[#6C7378] italic">
              {t.contact.successNote}
            </p>
            <button
              onClick={handleReset}
              className="cursor-pointer border border-[rgba(237,231,220,0.18)] hover:border-[#EDE7DC] text-[#EDE7DC] text-[10.5px] font-semibold tracking-[0.14em] uppercase px-5 py-2.5 rounded-full transition-colors w-full sm:w-auto text-center"
            >
              {t.contact.sendAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-4xl space-y-8 sm:space-y-10">
            {/* Hidden honeypot field to stop automated spam bots */}
            <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
              <input
                type="text"
                name="user_website_trap"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7 sm:gap-y-10">
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.nameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.contact.namePlaceholder}
                  className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] placeholder-[#6C7378]/60 outline-none transition-colors"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.phoneLabel} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t.contact.phonePlaceholder}
                  className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] placeholder-[#6C7378]/60 outline-none transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.emailLabel} *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t.contact.emailPlaceholder}
                  className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] placeholder-[#6C7378]/60 outline-none transition-colors"
                />
              </div>

              {/* Subject / Course */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.subjectLabel}
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] outline-none transition-colors cursor-pointer"
                >
                  {activeCourses.map((c) => (
                    <option key={c.id} value={c.nameEn} className="bg-[#101317] text-[#EDE7DC]">
                      {currentLang === 'fr' ? c.nameFr : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Location: "at the teacher's place / at my home / to be discussed" */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.locationLabel}
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] outline-none transition-colors cursor-pointer"
                >
                  <option value="at the teacher's place" className="bg-[#101317] text-[#EDE7DC]">
                    {t.contact.locTeacher} (Ben Arous)
                  </option>
                  <option value="at my home" className="bg-[#101317] text-[#EDE7DC]">
                    {t.contact.locHome} (Grand Tunis / Ben Arous)
                  </option>
                  <option value="to be discussed" className="bg-[#101317] text-[#EDE7DC]">
                    {t.contact.locDiscuss}
                  </option>
                </select>
              </div>

              {/* Calculated Price Display */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                  {t.contact.calculatedRateLabel}
                </label>
                <div className="border-b border-[rgba(237,231,220,0.18)] pb-2.5 pt-1 flex items-baseline justify-between">
                  <span className="text-xs text-[#9EA5A8]">
                    {formData.sessionLength} · {formData.frequency}
                  </span>
                  <span className="font-mono font-bold text-lg text-[#E8913C]">
                    {formData.totalPrice} TND <span className="text-xs text-[#9EA5A8] font-normal">/ mo</span>
                  </span>
                </div>
              </div>

            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#6C7378] block">
                {t.contact.messageLabel}
              </label>
              <textarea
                rows={2}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.contact.messagePlaceholder}
                className="w-full bg-transparent border-b border-[rgba(237,231,220,0.18)] focus:border-[#E8913C] pb-2.5 pt-1 text-sm text-[#EDE7DC] placeholder-[#6C7378]/60 outline-none transition-colors resize-none"
              />
            </div>

            {submitError && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start justify-between gap-3 text-xs text-red-300 animate-fade-in">
                <div>
                  <p className="font-semibold">{submitError.message}</p>
                  {submitError.code && (
                    <p className="font-mono text-[10px] text-red-400/80 mt-0.5">Firebase error code: {submitError.code}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-red-400 hover:text-red-200 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Two buttons / actions */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-[10.5px] sm:text-[11px] text-[#6C7378] tracking-[0.04em]">
                Ben Arous, Tunisia · Government & Private Piano Instruction
              </p>
              
              <div className="w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer w-full sm:w-auto border border-[#E8913C] hover:bg-[#E8913C] active:bg-[#E8913C] text-[#E8913C] hover:text-[#0A0C0E] active:text-[#0A0C0E] text-[11px] font-semibold tracking-[0.14em] uppercase px-7 py-3 rounded-full transition-colors disabled:opacity-50 text-center"
                >
                  {isSubmitting ? t.contact.submitting : t.contact.submitBtn}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>

      {/* Hairline Footer Strip */}
      <div className="w-full border-t border-[rgba(237,231,220,0.13)] px-4 sm:px-6 lg:px-16 py-6 text-[10px] sm:text-[10.5px] text-[#6C7378] tracking-[0.08em] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="uppercase tracking-[0.12em]">
            <span>{t.footer.role}</span>
            <span className="mx-2 opacity-30">·</span>
            <span>{settings?.contactAddress || t.footer.location}</span>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] text-[#9EA5A8] flex-wrap">
            {settings?.contactPhone && (
              <a href={`tel:${settings.contactPhone}`} className="hover:text-[#E8913C] transition-colors">
                {settings.contactPhone}
              </a>
            )}
            {settings?.contactPhone && settings?.contactEmail && <span className="opacity-30">·</span>}
            {settings?.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-[#E8913C] transition-colors">
                {settings.contactEmail}
              </a>
            )}
            {(settings?.socialFacebook || settings?.socialInstagram || settings?.socialYoutube) && (
              <>
                <span className="opacity-30">·</span>
                <div className="inline-flex items-center gap-2 text-[#6C7378]">
                  {settings.socialFacebook && (
                    <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#EDE7DC]">
                      FB
                    </a>
                  )}
                  {settings.socialInstagram && (
                    <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#EDE7DC]">
                      IG
                    </a>
                  )}
                  {settings.socialYoutube && (
                    <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" className="hover:text-[#EDE7DC]">
                      YT
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Language Switch */}
          <div className="flex items-center text-[#9EA5A8]">
            <button
              onClick={() => onLanguageChange('en')}
              className={`cursor-pointer hover:text-[#EDE7DC] transition-colors ${
                currentLang === 'en' ? 'text-[#EDE7DC] font-bold' : ''
              }`}
            >
              EN
            </button>
            <span className="mx-1.5 opacity-30">/</span>
            <button
              onClick={() => onLanguageChange('fr')}
              className={`cursor-pointer hover:text-[#EDE7DC] transition-colors ${
                currentLang === 'fr' ? 'text-[#EDE7DC] font-bold' : ''
              }`}
            >
              FR
            </button>
          </div>

          {/* Student Portal Link */}
          {onStudentClick && (
            <button
              onClick={onStudentClick}
              className="cursor-pointer text-[#6C7378] hover:text-[#E8913C] transition-colors underline decoration-[rgba(237,231,220,0.2)] underline-offset-4"
            >
              {currentLang === 'fr' ? 'Espace Élève' : 'Student Portal'}
            </button>
          )}

          {/* Discreet Teacher Admin Link as required */}
          <button
            onClick={onAdminClick}
            className="cursor-pointer text-[#6C7378] hover:text-[#E8913C] transition-colors underline decoration-[rgba(237,231,220,0.2)] underline-offset-4"
          >
            {t.footer.adminLink}
          </button>
        </div>
      </div>

      {/* Oversized "MIMOUNI" wordmark full width, cropped by the page edge */}
      <div className="w-full select-none pointer-events-none overflow-hidden leading-none text-center">
        <span
          className="font-display font-extrabold text-[rgba(237,231,220,0.06)] block tracking-[-0.035em] whitespace-nowrap translate-y-[22%]"
          style={{
            fontSize: 'clamp(54px, 18vw, 300px)',
            lineHeight: 0.8,
          }}
        >
          MIMOUNI
        </span>
      </div>

    </section>
  );
};
