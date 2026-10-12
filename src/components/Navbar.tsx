import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onBookClick: () => void;
  onStudentPortalClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onBookClick,
  onStudentPortalClick,
}) => {
  const t = translations[currentLang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMobileBook = () => {
    setMobileMenuOpen(false);
    onBookClick();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0C0E]/90 backdrop-blur-[16px] border-b border-[rgba(237,231,220,0.13)] text-[#EDE7DC]">
      <div className="h-[58px] px-4 sm:px-6 lg:px-12 flex items-center justify-between">
        {/* Wordmark at 15px with trailing period in amber - always visible and never clipped */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display font-bold text-[15px] tracking-[-0.02em] select-none hover:opacity-90 transition-opacity flex-shrink-0"
        >
          MIMOUNI<span className="text-[#E8913C]">.</span>
        </a>

        {/* Desktop nav links and actions (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-6 text-[10.5px] font-semibold tracking-[0.14em]">
            <button
              onClick={() => scrollTo('about')}
              className="text-[#9EA5A8] hover:text-[#E8913C] transition-colors cursor-pointer"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => scrollTo('lessons')}
              className="text-[#9EA5A8] hover:text-[#E8913C] transition-colors cursor-pointer"
            >
              {t.nav.lessons}
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="text-[#9EA5A8] hover:text-[#E8913C] transition-colors cursor-pointer"
            >
              {t.nav.pricing}
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-[#9EA5A8] hover:text-[#E8913C] transition-colors cursor-pointer"
            >
              {t.nav.contact}
            </button>
          </div>

          {/* Small EN / FR switch */}
          <div className="flex items-center text-[10.5px] tracking-[0.12em] text-[#9EA5A8]">
            <button
              onClick={() => onLanguageChange('en')}
              className={`cursor-pointer transition-colors ${
                currentLang === 'en' ? 'text-[#EDE7DC] font-semibold' : 'hover:text-[#EDE7DC]'
              }`}
            >
              EN
            </button>
            <span className="mx-1.5 opacity-30">/</span>
            <button
              onClick={() => onLanguageChange('fr')}
              className={`cursor-pointer transition-colors ${
                currentLang === 'fr' ? 'text-[#EDE7DC] font-semibold' : 'hover:text-[#EDE7DC]'
              }`}
            >
              FR
            </button>
          </div>

          {/* Student Portal trigger */}
          {onStudentPortalClick && (
            <button
              onClick={onStudentPortalClick}
              className="cursor-pointer text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#9EA5A8] hover:text-[#E8913C] transition-colors"
            >
              {currentLang === 'fr' ? 'Espace Élève' : 'Student Portal'}
            </button>
          )}

          {/* One pill button */}
          <button
            onClick={onBookClick}
            className="cursor-pointer border border-[rgba(237,231,220,0.18)] hover:border-[#E8913C] text-[10.5px] font-semibold tracking-[0.12em] uppercase px-4 py-1.5 rounded-full text-[#EDE7DC] hover:text-[#E8913C] transition-colors flex-shrink-0"
          >
            {t.nav.bookLesson}
          </button>
        </div>

        {/* Mobile: Compact hamburger trigger + Quick Language button */}
        <div className="flex md:hidden items-center gap-3">
          {/* Quick Language switch on header bar */}
          <div className="flex items-center text-[11px] tracking-[0.12em] text-[#9EA5A8] bg-[rgba(237,231,220,0.06)] px-2.5 py-1 rounded-full border border-[rgba(237,231,220,0.1)]">
            <button
              onClick={() => onLanguageChange('en')}
              className={`cursor-pointer transition-colors px-1 ${
                currentLang === 'en' ? 'text-[#EDE7DC] font-bold' : 'hover:text-[#EDE7DC]'
              }`}
            >
              EN
            </button>
            <span className="opacity-30">/</span>
            <button
              onClick={() => onLanguageChange('fr')}
              className={`cursor-pointer transition-colors px-1 ${
                currentLang === 'fr' ? 'text-[#EDE7DC] font-bold' : 'hover:text-[#EDE7DC]'
              }`}
            >
              FR
            </button>
          </div>

          {/* Hamburger toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer p-2 rounded-lg text-[#EDE7DC] hover:text-[#E8913C] hover:bg-[rgba(237,231,220,0.05)] transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(237,231,220,0.1)] bg-[#0A0C0E]/98 px-5 py-6 space-y-5 animate-scale-in shadow-2xl">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => scrollTo('about')}
              className="text-left py-3 text-xs font-semibold tracking-[0.15em] uppercase text-[#9EA5A8] hover:text-[#EDE7DC] border-b border-[rgba(237,231,220,0.06)] transition-colors"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => scrollTo('lessons')}
              className="text-left py-3 text-xs font-semibold tracking-[0.15em] uppercase text-[#9EA5A8] hover:text-[#EDE7DC] border-b border-[rgba(237,231,220,0.06)] transition-colors"
            >
              {t.nav.lessons}
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="text-left py-3 text-xs font-semibold tracking-[0.15em] uppercase text-[#9EA5A8] hover:text-[#EDE7DC] border-b border-[rgba(237,231,220,0.06)] transition-colors"
            >
              {t.nav.pricing}
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="text-left py-3 text-xs font-semibold tracking-[0.15em] uppercase text-[#9EA5A8] hover:text-[#EDE7DC] border-b border-[rgba(237,231,220,0.06)] transition-colors"
            >
              {t.nav.contact}
            </button>
          </div>

          <div className="pt-2 space-y-2.5">
            {onStudentPortalClick && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStudentPortalClick();
                }}
                className="w-full cursor-pointer border border-[rgba(237,231,220,0.18)] hover:border-[#E8913C] text-[#EDE7DC] text-[11px] font-semibold tracking-[0.14em] uppercase py-3 rounded-full transition-colors text-center block"
              >
                {currentLang === 'fr' ? 'Espace Élève (Connexion)' : 'Student Portal (Login)'}
              </button>
            )}
            <button
              onClick={handleMobileBook}
              className="w-full cursor-pointer border border-[#E8913C] bg-[#E8913C]/10 text-[#E8913C] active:bg-[#E8913C] active:text-[#0A0C0E] text-[11px] font-semibold tracking-[0.14em] uppercase py-3 rounded-full transition-colors text-center block"
            >
              {t.nav.bookLesson}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
