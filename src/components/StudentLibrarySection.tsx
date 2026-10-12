import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, Lock, Unlock, FileText, Video, Music, ExternalLink, 
  Download, Eye, CheckCircle2, ChevronRight, X, Play
} from 'lucide-react';
import { LibraryCourse, CourseMaterial, StudentAccount, Language } from '../types';
import { subscribeToLibraryCourses } from '../firebase';
import { translations } from '../translations';

interface StudentLibrarySectionProps {
  student: StudentAccount;
  currentLang: Language;
}

export const StudentLibrarySection: React.FC<StudentLibrarySectionProps> = ({
  student,
  currentLang,
}) => {
  const t = translations[currentLang].studentSpace.courses;
  const [courses, setCourses] = useState<LibraryCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState<LibraryCourse | null>(null);

  useEffect(() => {
    const unsub = subscribeToLibraryCourses(
      (items) => {
        setCourses(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching library courses:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Determine if this student has access to a given course
  const checkAccess = (course: LibraryCourse): boolean => {
    if (course.status === 'coming_soon') return false;
    // If accessStudentIds is not set or empty, default to granted for all approved students,
    // or if it contains '*' or the student's ID
    if (!course.accessStudentIds || course.accessStudentIds.length === 0) return true;
    if (course.accessStudentIds.includes('*')) return true;
    return course.accessStudentIds.includes(student.id);
  };

  const getStatusBadge = (course: LibraryCourse) => {
    if (course.status === 'new') {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          {t.badgeNew}
        </span>
      );
    }
    if (course.status === 'coming_soon') {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
          {t.badgeComingSoon}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8913C]/15 text-[#E8913C] border border-[#E8913C]/30">
        {t.badgeIncluded}
      </span>
    );
  };

  const renderMaterialIcon = (type: CourseMaterial['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-[#E8913C]" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'sheet_music':
        return <Music className="w-4 h-4 text-emerald-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Info */}
      <div className="border-b border-[rgba(237,231,220,0.1)] pb-5">
        <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
          {t.title}
        </h2>
        <p className="text-xs text-[#9EA5A8] mt-1">
          {t.subtitle}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-[#9EA5A8]">
          <BookOpen className="w-8 h-8 animate-pulse mx-auto text-[#E8913C] mb-3" />
          <span>Loading course library...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-[#6C7378]" />
          <h4 className="font-display font-bold text-base text-[#EDE7DC]">{t.emptyCourses}</h4>
          <p className="text-xs text-[#9EA5A8] max-w-md mx-auto">
            Maestro Mimouni is preparing repertoire, scores, and masterclass videos for your curriculum. They will appear here shortly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const hasAccess = checkAccess(course);
            const isComingSoon = course.status === 'coming_soon';
            const courseTitle = (currentLang === 'fr' && course.titleFr) ? course.titleFr : course.title;
            const courseDesc = (currentLang === 'fr' && course.descriptionFr) ? course.descriptionFr : course.description;
            const materialsCount = course.materials?.length || 0;

            return (
              <div
                key={course.id}
                className={`bg-[#101317] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                  hasAccess 
                    ? 'border-[rgba(237,231,220,0.12)] hover:border-[#E8913C]/60 hover:shadow-xl hover:shadow-[#E8913C]/5' 
                    : 'border-[rgba(237,231,220,0.06)] opacity-75'
                }`}
              >
                <div>
                  {/* Cover Banner */}
                  <div className="relative h-44 bg-[#161B22] overflow-hidden">
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={courseTitle}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#161B22] to-[#0A0C0E]">
                        <BookOpen className="w-12 h-12 text-[rgba(237,231,220,0.15)]" />
                      </div>
                    )}

                    {/* Top status badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {getStatusBadge(course)}
                    </div>

                    {/* Access lock badge */}
                    <div className="absolute top-3 right-3">
                      {hasAccess ? (
                        <span className="p-1.5 rounded-lg bg-black/70 backdrop-blur-xs text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-mono">
                          <Unlock className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-black/70 backdrop-blur-xs text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[10px] font-mono">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Material count pill */}
                    <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10.5px] font-mono text-[#EDE7DC] border border-[rgba(237,231,220,0.15)]">
                      {materialsCount} {t.materialsCount}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-[#9EA5A8] font-mono">
                      <span>{course.instrument || 'Piano'}</span>
                      {course.level && <span>Level: {course.level}</span>}
                    </div>

                    <h3 className="font-display font-bold text-lg text-[#EDE7DC] line-clamp-1">
                      {courseTitle}
                    </h3>

                    <p className="text-xs text-[#9EA5A8] line-clamp-3 leading-relaxed">
                      {courseDesc}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  {hasAccess ? (
                    <button
                      type="button"
                      onClick={() => setActiveCourse(course)}
                      className="w-full cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{t.viewMaterials}</span>
                    </button>
                  ) : isComingSoon ? (
                    <div className="p-2.5 bg-[#161B22] rounded-xl text-center text-xs text-[#9EA5A8] border border-[rgba(237,231,220,0.08)]">
                      <p className="font-semibold text-amber-400">{t.badgeComingSoon}</p>
                      <p className="text-[10px] mt-0.5">Under preparation by Maestro Mimouni</p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-300">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{t.accessRestricted}</span>
                      </div>
                      <p className="text-[10.5px] text-[#9EA5A8] leading-tight">
                        {t.requestAccess}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COURSE MATERIALS MODAL */}
      {activeCourse && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[rgba(237,231,220,0.1)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#E8913C] tracking-widest block mb-1">
                  Studio Course Content
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-[#EDE7DC]">
                  {(currentLang === 'fr' && activeCourse.titleFr) ? activeCourse.titleFr : activeCourse.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="text-[#9EA5A8] hover:text-[#EDE7DC] cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#9EA5A8] leading-relaxed">
              {(currentLang === 'fr' && activeCourse.descriptionFr) ? activeCourse.descriptionFr : activeCourse.description}
            </p>

            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm text-[#EDE7DC] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8913C]" />
                <span>Included Lessons & Repertoire ({activeCourse.materials?.length || 0})</span>
              </h4>

              {(!activeCourse.materials || activeCourse.materials.length === 0) ? (
                <div className="p-6 bg-[#0A0C0E] rounded-xl text-center text-xs text-[#6C7378] italic">
                  Course curriculum materials are being prepared for you by Maestro Mimouni.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeCourse.materials.map((mat, idx) => (
                    <div
                      key={mat.id || idx}
                      className="p-4 bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] hover:border-[#E8913C]/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-[#161B22] rounded-lg shrink-0">
                          {renderMaterialIcon(mat.type)}
                        </div>
                        <div>
                          <p className="font-bold text-[#EDE7DC] text-sm">{mat.title}</p>
                          {mat.description && (
                            <p className="text-[#9EA5A8] text-[11px] mt-0.5">{mat.description}</p>
                          )}
                          <span className="text-[10px] font-mono text-[#E8913C] uppercase mt-1 inline-block">
                            {mat.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer bg-[#161B22] hover:bg-[#E8913C] text-[#EDE7DC] hover:text-[#0A0C0E] border border-[rgba(237,231,220,0.15)] font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {mat.type === 'video' ? <Play className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        <span>{mat.type === 'video' ? t.watchVideo : t.download}</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[rgba(237,231,220,0.08)]">
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="px-5 py-2.5 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC] hover:border-[#EDE7DC] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
