import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Download, ExternalLink, FileText, Music, 
  Book, Link as LinkIcon, Lock, Unlock, Eye, Filter, CheckCircle2 
} from 'lucide-react';
import { LibraryItem, LibraryCategory, StudentAccount, Language } from '../types';
import { subscribeToLibraryItems } from '../firebase';
import { translations } from '../translations';

interface StudentLibraryItemsSectionProps {
  student: StudentAccount;
  currentLang: Language;
}

export const StudentLibraryItemsSection: React.FC<StudentLibraryItemsSectionProps> = ({
  student,
  currentLang,
}) => {
  const t = translations[currentLang].studentSpace.library;
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory | 'all'>('all');

  useEffect(() => {
    const unsub = subscribeToLibraryItems(
      (list) => {
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching library items:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Filter items:
  // 1. Must be published (students never see drafts)
  // 2. Must be granted to student (empty, '*' or student.id)
  // 3. Search query match
  // 4. Category filter
  const visibleItems = items.filter((item) => {
    if (item.status === 'draft') return false;

    // Check student access
    const isGranted = 
      !item.accessStudentIds || 
      item.accessStudentIds.length === 0 || 
      item.accessStudentIds.includes('*') || 
      item.accessStudentIds.includes(student.id);

    if (!isGranted) return false;

    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title && item.title.toLowerCase().includes(q)) ||
        (item.titleFr && item.titleFr.toLowerCase().includes(q));
      const matchDesc = (item.description && item.description.toLowerCase().includes(q)) ||
        (item.descriptionFr && item.descriptionFr.toLowerCase().includes(q));
      const matchAuthor = item.author && item.author.toLowerCase().includes(q);
      const matchInstrument = item.instrument && item.instrument.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor && !matchInstrument) return false;
    }

    return true;
  });

  const getCategoryIcon = (category: LibraryCategory) => {
    switch (category) {
      case 'book':
        return <Book className="w-4 h-4 text-[#E8913C]" />;
      case 'score':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'link':
        return <LinkIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-[#9EA5A8]" />;
    }
  };

  const getCategoryLabel = (category: LibraryCategory) => {
    switch (category) {
      case 'book': return t.categories.book;
      case 'score': return t.categories.score;
      case 'pdf': return t.categories.pdf;
      case 'link': return t.categories.link;
      default: return t.categories.other;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[rgba(237,231,220,0.1)] pb-5">
        <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
          {t.title}
        </h2>
        <p className="text-xs text-[#9EA5A8] mt-1">
          {t.subtitle}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9EA5A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.12)] focus:border-[#E8913C] rounded-xl pl-9 pr-3 py-2 text-xs text-[#EDE7DC] outline-none"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0A0C0E] p-1 rounded-xl border border-[rgba(237,231,220,0.08)]">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
            }`}
          >
            {t.categoryAll}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('score')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'score'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
            }`}
          >
            {t.categories.score}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('book')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'book'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
            }`}
          >
            {t.categories.book}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('pdf')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'pdf'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
            }`}
          >
            {t.categories.pdf}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('link')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'link'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
            }`}
          >
            {t.categories.link}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-[#9EA5A8]">
          <BookOpen className="w-8 h-8 animate-pulse mx-auto text-[#E8913C] mb-3" />
          <span>{currentLang === 'fr' ? 'Chargement des documents de la médiathèque...' : 'Loading library materials...'}</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-[#6C7378]" />
          <h4 className="font-display font-bold text-base text-[#EDE7DC]">{t.empty}</h4>
          <p className="text-xs text-[#9EA5A8] max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? (currentLang === 'fr' ? 'Modifiez vos filtres ou vos termes de recherche pour voir plus de documents.' : 'Try adjusting your search query or category filters.')
              : (currentLang === 'fr' ? 'Maestro Mimouni mettra à disposition des partitions et recueils de référence prochainement.' : 'Scores, reference books, and PDF materials will appear here as curated by Maestro Mimouni.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleItems.map((item) => {
            const title = currentLang === 'fr' && item.titleFr ? item.titleFr : item.title;
            const desc = currentLang === 'fr' && item.descriptionFr ? item.descriptionFr : item.description;
            const targetUrl = item.fileUrl || item.externalUrl || '#';

            return (
              <div
                key={item.id}
                className="bg-[#101317] border border-[rgba(237,231,220,0.12)] hover:border-[#E8913C]/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Cover or Header Graphic */}
                  <div className="relative h-44 bg-[#161B22] overflow-hidden">
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#161B22] to-[#0A0C0E] gap-2 p-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] flex items-center justify-center">
                          {getCategoryIcon(item.category)}
                        </div>
                        <span className="text-[11px] font-mono text-[#9EA5A8] uppercase tracking-wider">
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>
                    )}

                    {/* Category pill top left */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-[#EDE7DC] border border-[rgba(237,231,220,0.15)]">
                      {getCategoryIcon(item.category)}
                      <span className="capitalize">{getCategoryLabel(item.category)}</span>
                    </div>

                    {/* Access unlock badge top right */}
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      <span>{t.accessGranted}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="font-display font-bold text-base text-[#EDE7DC] group-hover:text-[#E8913C] transition-colors line-clamp-1">
                        {title}
                      </h4>
                      {item.author && (
                        <p className="text-xs text-[#E8913C] font-semibold mt-0.5">
                          {t.authorBy} {item.author}
                        </p>
                      )}
                    </div>

                    {desc && (
                      <p className="text-xs text-[#9EA5A8] line-clamp-2 leading-relaxed">
                        {desc}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-[10.5px] font-mono text-[#7E858A]">
                      {item.instrument && (
                        <span className="bg-[#0A0C0E] px-2 py-0.5 rounded border border-[rgba(237,231,220,0.08)]">
                          {item.instrument}
                        </span>
                      )}
                      {item.level && (
                        <span className="bg-[#0A0C0E] px-2 py-0.5 rounded border border-[rgba(237,231,220,0.08)]">
                          {item.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full cursor-pointer bg-[#0A0C0E] hover:bg-[#E8913C] text-[#EDE7DC] hover:text-[#0A0C0E] border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {item.fileUrl ? (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>{t.downloadFile}</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.openLink}</span>
                      </>
                    )}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
