/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PortalHero } from './components/PortalHero';
import { StatementFold } from './components/StatementFold';
import { LessonsSection } from './components/LessonsSection';
import { TeachingSection } from './components/TeachingSection';
import { GallerySection } from './components/GallerySection';
import { PricingSection } from './components/PricingSection';
import { ContactSection } from './components/ContactSection';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal } from './components/StudentPortal';
import { PromoBannerBar } from './components/PromoBannerBar';
import { Language, BookingRequest, SiteSettings, TeachingRow, InstrumentCourse } from './types';
import { AlertCircle } from 'lucide-react';
import { 
  subscribeToSiteSettings, 
  subscribeToTeachingRows, 
  subscribeToCourses, 
  isAppConfigured,
  DEFAULT_SITE_SETTINGS, 
  DEFAULT_TEACHING_ROWS, 
  DEFAULT_COURSES 
} from './firebase';

export default function App() {
  const configStatus = isAppConfigured();

  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('mimouni_lang') || localStorage.getItem('mohamed_mimouni_lang');
      if (saved === 'fr' || saved === 'en') return saved;
      return navigator.language.startsWith('fr') ? 'fr' : 'en';
    } catch {
      return 'en';
    }
  });

  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    return window.location.hash === '#admin' || window.location.pathname === '/admin';
  });

  const [isStudentView, setIsStudentView] = useState<boolean>(() => {
    return window.location.hash === '#student' || window.location.pathname === '/student';
  });

  // Live site content from Firestore
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [teachingRows, setTeachingRows] = useState<TeachingRow[]>(DEFAULT_TEACHING_ROWS);
  const [courses, setCourses] = useState<InstrumentCourse[]>(DEFAULT_COURSES);
  const [showDemoNotice, setShowDemoNotice] = useState<boolean>(true);

  useEffect(() => {
    const unsub1 = subscribeToSiteSettings(setSiteSettings);
    const unsub2 = subscribeToTeachingRows(setTeachingRows);
    const unsub3 = subscribeToCourses(setCourses);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  // State shared between calculator, deck, and contact form
  const [calculatorPlan, setCalculatorPlan] = useState<{
    durationLabel: string;
    durationMinutes: number;
    blocks: number;
    frequencyLabel: string;
    weeklySessions: number;
    pricePerWeek: number;
    pricePerMonth: number;
  } | undefined>(undefined);

  const [selectedCourseFromDeck, setSelectedCourseFromDeck] = useState<string | undefined>(undefined);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem('mimouni_lang', lang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminView(true);
        setIsStudentView(false);
      } else if (window.location.hash === '#student') {
        setIsStudentView(true);
        setIsAdminView(false);
      } else if (!window.location.hash) {
        setIsAdminView(false);
        setIsStudentView(false);
      }
    };
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleToggleAdmin = (showAdmin: boolean) => {
    setIsAdminView(showAdmin);
    if (showAdmin) {
      setIsStudentView(false);
      window.location.hash = 'admin';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (window.location.hash === '#admin') {
        history.replaceState(null, '', window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleStudent = (showStudent: boolean) => {
    setIsStudentView(showStudent);
    if (showStudent) {
      setIsAdminView(false);
      window.location.hash = 'student';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (window.location.hash === '#student') {
        history.replaceState(null, '', window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookClick = () => {
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCalculateClick = () => {
    const pricingEl = document.getElementById('pricing');
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCourseRequestClick = (courseName?: string) => {
    if (courseName) {
      setSelectedCourseFromDeck(courseName);
    }
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyPricingPlan = (plan: {
    durationLabel: string;
    durationMinutes: number;
    blocks: number;
    frequencyLabel: string;
    weeklySessions: number;
    pricePerWeek: number;
    pricePerMonth: number;
  }) => {
    setCalculatorPlan(plan);
  };

  const handleBookingSubmitted = (req: BookingRequest) => {
    // Booking saved successfully
  };
  return (
    <div className="min-h-screen bg-[#0A0C0E] text-[#EDE7DC] flex flex-col font-['Sora',sans-serif] selection:bg-[#E8913C] selection:text-[#0A0C0E] overflow-x-clip">
      {!configStatus.configured && showDemoNotice && (
        <div className="bg-[#17120a] border-b border-[#E8913C]/30 px-4 py-2 text-xs text-[#EDE7DC] flex flex-wrap items-center justify-between gap-2 z-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#E8913C] shrink-0" />
            <span>
              <strong>Demo Mode:</strong> Firebase environment variables not detected. Running with local storage &amp; studio preview data.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#9EA5A8] font-mono">See .env.example to connect live Firebase</span>
            <button
              onClick={() => setShowDemoNotice(false)}
              className="text-[#9EA5A8] hover:text-[#EDE7DC] transition-colors cursor-pointer px-1.5 py-0.5 rounded border border-[rgba(237,231,220,0.15)] text-[10px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {isAdminView ? (
        <AdminDashboard
          currentLang={currentLang}
          onBackToSite={() => handleToggleAdmin(false)}
        />
      ) : isStudentView ? (
        <StudentPortal
          currentLang={currentLang}
          onBackToSite={() => handleToggleStudent(false)}
          prefillPlan={calculatorPlan}
        />
      ) : (
        <>
          {/* Top Promotional Announcement Banner (Part 2 Requirement E) */}
          <PromoBannerBar currentLang={currentLang} banner={siteSettings.promoBanner} />

          {/* Fixed 58px bar navigation with backdrop blur */}
          <Navbar
            currentLang={currentLang}
            onLanguageChange={handleLanguageChange}
            onBookClick={handleBookClick}
            onStudentPortalClick={() => handleToggleStudent(true)}
          />

          <main className="flex-1 overflow-x-clip">
            {/* 1. Portal Hero: 2.5 viewports, sticky stage, parting panels, travelling title */}
            <PortalHero currentLang={currentLang} settings={siteSettings} />

            {/* 2. Statement Fold: full-height, outlined '01', amber phrase, drifting circular keys */}
            <StatementFold currentLang={currentLang} settings={siteSettings} />

            {/* 3. Lessons: Two columns with physical throwable card deck */}
            <LessonsSection
              currentLang={currentLang}
              courses={courses}
              onCalculateClick={handleCalculateClick}
              onRequestClick={handleCourseRequestClick}
            />

            {/* 4. Teaching: Hairline-ruled rows */}
            <TeachingSection currentLang={currentLang} teachingRows={teachingRows} />

            {/* 5. Studio & Performance Gallery (Part 2 Requirement E) */}
            <GallerySection currentLang={currentLang} images={siteSettings.galleryImages} />

            {/* 6. Pricing: Dates-style table & live interactive calculator */}
            <PricingSection
              currentLang={currentLang}
              ratePer30Min={siteSettings.ratePer30Min}
              onApplyPlan={handleApplyPricingPlan}
            />

            {/* 7. Contact & Close: Hairline fields, footer strip, cropped oversized wordmark */}
            <ContactSection
              currentLang={currentLang}
              courses={courses}
              settings={siteSettings}
              prefillPlan={calculatorPlan}
              selectedCourse={selectedCourseFromDeck}
              onRequestSubmitted={handleBookingSubmitted}
              onAdminClick={() => handleToggleAdmin(true)}
              onStudentClick={() => handleToggleStudent(true)}
              onLanguageChange={handleLanguageChange}
            />
          </main>
        </>
      )}
    </div>
  );
}
