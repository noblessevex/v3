import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, CheckCircle2, Clock, DollarSign, Search, 
  Download, Plus, Calendar, FileText, Trash2, Edit3, 
  Phone, ArrowLeft, BarChart2, Check, X, LogOut, Lock,
  Mail, Image as ImageIcon, Sliders, BookOpen, Layers,
  ChevronUp, ChevronDown, Eye, EyeOff, Star, Sparkles,
  Upload, Save, AlertCircle, RefreshCw, Printer,
  Copy, ExternalLink, CalendarDays, Ban, UserCheck, ShieldCheck, ChevronRight, MapPin,
  Send, XCircle, CheckCircle, Camera, ArrowRight, Move, CreditCard,
  MessageSquare, Video, Music, Link as LinkIcon, Volume2, VolumeX, FolderPlus, Unlock
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  BookingRequest, LessonStatus, PaymentStatus, Language, SiteSettings, 
  TeachingRow, InstrumentCourse, StudentAccount, CalendarSettings, DayOfWeek,
  PaymentRecord, GalleryImage, PromoBanner, LessonAttendanceStatus,
  LibraryCourse, CourseMaterial, CommunityMessage
} from '../types';
import { translations } from '../translations';
import { 
  loginAdminUser, 
  logoutAdminUser, 
  subscribeToAuth, 
  subscribeToBookingRequests,
  updateBookingRequest,
  deleteBookingRequest,
  addBookingRequest,
  subscribeToSiteSettings,
  updateSiteSettings,
  subscribeToTeachingRows,
  updateTeachingRows,
  subscribeToCourses,
  updateCourses,
  uploadImageFile,
  setStudentApproval,
  purgeLegacyTempPassword,
  runConnectionDiagnostics,
  DiagnosticResult,
  subscribeToAllStudents,
  subscribeToCalendarSettings,
  updateCalendarSettings,
  updateStudentProfile,
  toggleBlockCalendarDate,
  logStudentLessonAttendance,
  adminCancelLesson,
  adminMoveLesson,
  recordStudentPayment,
  deleteStudentPayment,
  updateStudentAdminNotes,
  computeStudentPaymentSummary,
  subscribeToLibraryCourses,
  addLibraryCourse,
  updateLibraryCourse,
  deleteLibraryCourse,
  subscribeToCommunityMessages,
  postCommunityMessage,
  deleteCommunityMessage,
  toggleStudentMute,
  DEFAULT_COURSES,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_TEACHING_ROWS,
  DEFAULT_CALENDAR_SETTINGS,
  isFirebaseConfigured
} from '../firebase';
import { exportRequestsToCSV } from '../utils/storage';
import { InvoiceModal } from './InvoiceModal';

interface AdminDashboardProps {
  currentLang: Language;
  onBackToSite: () => void;
}

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentLang, onBackToSite }) => {
  const t = translations[currentLang];

  // ==========================================
  // AUTH STATE
  // ==========================================
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setAdminUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await loginAdminUser(loginEmail, loginPass);
      if (!res.success) {
        setLoginError(res.error || 'Login failed. Please verify credentials.');
      } else {
        setLoginEmail('');
        setLoginPass('');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Error occurred while logging in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdminUser();
  };

  // ==========================================
  // DASHBOARD MAIN TABS
  // ==========================================
  const [activeMainTab, setActiveMainTab] = useState<'requests' | 'calendar' | 'students' | 'library' | 'community' | 'content' | 'settings'>('requests');
  const [contentSection, setContentSection] = useState<'hero' | 'about' | 'courses' | 'pricing' | 'gallery' | 'promo' | 'contact'>('hero');
  const [contentLangTab, setContentLangTab] = useState<'en' | 'fr'>('en');
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const showSavedToast = (msg: string = 'Changes saved successfully to Firestore') => {
    setSavedNotification(msg);
    setTimeout(() => {
      setSavedNotification(null);
    }, 3200);
  };

  // ==========================================
  // LIBRARY MANAGER STATE
  // ==========================================
  const [libraryCourses, setLibraryCourses] = useState<LibraryCourse[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>('all');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Course Form Fields
  const [courseFormTitle, setCourseFormTitle] = useState('');
  const [courseFormTitleFr, setCourseFormTitleFr] = useState('');
  const [courseFormDesc, setCourseFormDesc] = useState('');
  const [courseFormDescFr, setCourseFormDescFr] = useState('');
  const [courseFormCover, setCourseFormCover] = useState('');
  const [courseFormPrice, setCourseFormPrice] = useState<number>(0);
  const [courseFormLevel, setCourseFormLevel] = useState('All Levels');
  const [courseFormInstrument, setCourseFormInstrument] = useState('Piano');
  const [courseFormStatus, setCourseFormStatus] = useState<'published' | 'new' | 'coming_soon' | 'draft'>('published');
  const [courseFormAccessAll, setCourseFormAccessAll] = useState(true);
  const [courseFormAccessStudentIds, setCourseFormAccessStudentIds] = useState<string[]>([]);
  const [courseFormMaterials, setCourseFormMaterials] = useState<CourseMaterial[]>([]);
  const [studentAccessSearch, setStudentAccessSearch] = useState('');

  // Course Material Inline Form
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatType, setNewMatType] = useState<CourseMaterial['type']>('video');
  const [newMatUrl, setNewMatUrl] = useState('');
  const [uploadingMaterialFile, setUploadingMaterialFile] = useState(false);
  const materialFileInputRef = useRef<HTMLInputElement>(null);
  const courseCoverInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // COMMUNITY MODERATION STATE
  // ==========================================
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [teacherChatText, setTeacherChatText] = useState('');
  const [teacherChatImage, setTeacherChatImage] = useState<File | null>(null);
  const [teacherChatImagePreview, setTeacherChatImagePreview] = useState<string | null>(null);
  const [postingTeacherMsg, setPostingTeacherMsg] = useState(false);
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [communityFilterRole, setCommunityFilterRole] = useState<'all' | 'student' | 'teacher'>('all');
  const [mutingStudentId, setMutingStudentId] = useState<string | null>(null);
  const teacherImageInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 1. REAL-TIME REQUESTS & STUDENTS & CALENDAR
  // ==========================================
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR_SETTINGS);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Enrolled Students Directory Search & Filter (Requirement C)
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'approved' | 'pending' | 'paid' | 'unpaid'>('all');

  // Modals state for requests
  const [selectedInvoiceRequest, setSelectedInvoiceRequest] = useState<BookingRequest | null>(null);
  const [selectedInvoiceStudent, setSelectedInvoiceStudent] = useState<StudentAccount | null>(null);
  const [editingScheduleRequest, setEditingScheduleRequest] = useState<BookingRequest | null>(null);
  const [editingNotesRequest, setEditingNotesRequest] = useState<BookingRequest | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Connection Diagnostics State
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const res = await runConnectionDiagnostics();
      setDiagnostics(res);
    } catch (err: any) {
      console.error('Connection diagnostics failed:', err);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // Calendar Views State (Requirement B: Month, Week, Day)
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentAccount | null>(null);
  const [newBlockedDateInput, setNewBlockedDateInput] = useState('');

  // Admin Move Lesson Modal State (Requirement A)
  const [movingLesson, setMovingLesson] = useState<{
    studentId: string;
    studentName: string;
    originalDate: string;
    time: string;
  } | null>(null);
  const [moveNewDate, setMoveNewDate] = useState('');
  const [moveNewTime, setMoveNewTime] = useState('17:00');
  const [moveReason, setMoveReason] = useState('Moved by teacher');
  const [movingLessonLoading, setMovingLessonLoading] = useState(false);
  const [moveLessonError, setMoveLessonError] = useState<string | null>(null);

  // Payments logging in Student Profile (Requirement D)
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDate, setNewPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash');
  const [newPaymentNote, setNewPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Student Admin Notes (Requirement C)
  const [adminNotesText, setAdminNotesText] = useState('');
  const [savingAdminNotes, setSavingAdminNotes] = useState(false);

  // Site Content Gallery Upload State (Requirement E)
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Attendance logging in Student Profile
  const [newHistoryDate, setNewHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newHistoryTime, setNewHistoryTime] = useState('17:00');
  const [newHistoryStatus, setNewHistoryStatus] = useState<LessonAttendanceStatus>('completed');
  const [newHistoryNotes, setNewHistoryNotes] = useState('');
  const [isAddingHistory, setIsAddingHistory] = useState(false);

  const handleToggleStudentPayment = async (student: StudentAccount) => {
    const nextPayment: PaymentStatus = student.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    await updateStudentProfile(student.id, { paymentStatus: nextPayment });
    setSelectedStudentProfile(prev => prev && prev.id === student.id ? { ...prev, paymentStatus: nextPayment } : prev);
    showSavedToast(`Updated payment status to ${nextPayment} for ${student.name}`);
  };

  const handleAddLessonHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentProfile) return;
    const currentHistory = selectedStudentProfile.lessonHistory || [];
    const newEntry = {
      date: newHistoryDate,
      time: newHistoryTime,
      status: newHistoryStatus,
      notes: newHistoryNotes.trim() || undefined,
    };
    const updatedHistory = [newEntry, ...currentHistory];
    await updateStudentProfile(selectedStudentProfile.id, { lessonHistory: updatedHistory });
    setSelectedStudentProfile(prev => prev ? { ...prev, lessonHistory: updatedHistory } : prev);
    setNewHistoryNotes('');
    setIsAddingHistory(false);
    showSavedToast('Attendance record logged successfully');
  };

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [notesText, setNotesText] = useState('');

  const [firestoreSyncNotice, setFirestoreSyncNotice] = useState<string | null>(null);

  // Subscribe to real-time requests, students and calendar settings
  useEffect(() => {
    if (!adminUser) return;
    setFirestoreSyncNotice(null);
    const unsubRequests = subscribeToBookingRequests(
      (items) => {
        setRequests(items);
        setFirestoreSyncNotice(null);
      },
      () => {
        setFirestoreSyncNotice('Firestore Security Notice: Make sure firestore.rules are published in your Firebase Console to enable real-time requests syncing.');
      }
    );
    const unsubStudents = subscribeToAllStudents(setStudents);
    const unsubCalendar = subscribeToCalendarSettings(setCalendarSettings);
    const unsubLibrary = subscribeToLibraryCourses(setLibraryCourses);
    const unsubCommunity = subscribeToCommunityMessages(setCommunityMessages);

    return () => {
      unsubRequests();
      unsubStudents();
      unsubCalendar();
      unsubLibrary();
      unsubCommunity();
    };
  }, [adminUser]);

  // Form state for manual student add
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    instrument: DEFAULT_COURSES[0].nameEn,
    frequency: '2x per week',
    sessionLength: '60 min',
    sessionBlocks: 2,
    pricePerWeek: 48,
    totalPrice: 192,
    preferredLocation: "at the teacher's place",
    status: 'confirmed' as LessonStatus,
    paymentStatus: 'paid' as PaymentStatus,
    appointmentDate: '',
    appointmentTime: '17:00',
    invoiceNotes: 'In-person enrollment at Ben Arous studio.',
  });

  // ==========================================
  // LIBRARY MANAGER HANDLERS
  // ==========================================
  const handleOpenCreateCourse = () => {
    setEditingCourseId(null);
    setCourseFormTitle('');
    setCourseFormTitleFr('');
    setCourseFormDesc('');
    setCourseFormDescFr('');
    setCourseFormCover('');
    setCourseFormPrice(0);
    setCourseFormLevel('All Levels');
    setCourseFormInstrument('Piano');
    setCourseFormStatus('published');
    setCourseFormAccessAll(true);
    setCourseFormAccessStudentIds([]);
    setCourseFormMaterials([]);
    setNewMatTitle('');
    setNewMatDesc('');
    setNewMatType('video');
    setNewMatUrl('');
    setStudentAccessSearch('');
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (c: LibraryCourse) => {
    setEditingCourseId(c.id);
    setCourseFormTitle(c.title || '');
    setCourseFormTitleFr(c.titleFr || '');
    setCourseFormDesc(c.description || '');
    setCourseFormDescFr(c.descriptionFr || '');
    setCourseFormCover(c.coverImage || '');
    setCourseFormPrice(c.price ?? 0);
    setCourseFormLevel(c.level || 'All Levels');
    setCourseFormInstrument(c.instrument || 'Piano');
    setCourseFormStatus(c.status || 'published');
    const isAll = !c.accessStudentIds || c.accessStudentIds.length === 0 || c.accessStudentIds.includes('*');
    setCourseFormAccessAll(isAll);
    setCourseFormAccessStudentIds((c.accessStudentIds || []).filter(id => id !== '*'));
    setCourseFormMaterials(c.materials ? [...c.materials] : []);
    setNewMatTitle('');
    setNewMatDesc('');
    setNewMatType('video');
    setNewMatUrl('');
    setStudentAccessSearch('');
    setIsCourseModalOpen(true);
  };

  const handleCourseCoverUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert(currentLang === 'fr' ? 'La taille de image ne peut pas dépasser 15 Mo' : 'Image size cannot exceed 15 MB');
      return;
    }
    setUploadingCover(true);
    try {
      const res = await uploadImageFile(file, 'course_materials');
      if (res.success && res.url) {
        setCourseFormCover(res.url);
        showSavedToast(currentLang === 'fr' ? 'Image de couverture téléversée' : 'Cover image uploaded');
      } else {
        alert(res.error || 'Failed to upload cover image');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadMaterialFile = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      alert(currentLang === 'fr' ? 'La taille maximale du fichier est de 30 Mo' : 'File size cannot exceed 30 MB');
      return;
    }
    setUploadingMaterialFile(true);
    try {
      const res = await uploadImageFile(file, 'course_materials');
      if (res.success && res.url) {
        setNewMatUrl(res.url);
        if (!newMatTitle) {
          const rawName = file.name.replace(/\.[^/.]+$/, '');
          setNewMatTitle(rawName);
        }
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          setNewMatType('pdf');
        } else if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav') || lowerName.endsWith('.m4a') || lowerName.endsWith('.ogg')) {
          setNewMatType('audio');
        } else if (file.type.startsWith('image/')) {
          setNewMatType('sheet_music');
        }
        showSavedToast(currentLang === 'fr' ? 'Fichier téléversé dans course_materials' : 'File uploaded to course_materials');
      } else {
        alert(res.error || 'File upload failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingMaterialFile(false);
    }
  };

  const handleAddMaterialToCourse = () => {
    if (!newMatTitle.trim()) {
      alert(currentLang === 'fr' ? 'Veuillez saisir un titre pour la ressource' : 'Please provide a title for the material');
      return;
    }
    if (!newMatUrl.trim()) {
      alert(currentLang === 'fr' ? 'Veuillez téléverser un fichier ou fournir une URL' : 'Please upload a file or provide a URL/link');
      return;
    }

    const newMat: CourseMaterial = {
      id: 'mat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: newMatTitle.trim(),
      description: newMatDesc.trim() || undefined,
      type: newMatType,
      url: newMatUrl.trim(),
      order: courseFormMaterials.length + 1,
    };

    setCourseFormMaterials(prev => [...prev, newMat]);
    setNewMatTitle('');
    setNewMatDesc('');
    setNewMatUrl('');
    if (materialFileInputRef.current) materialFileInputRef.current.value = '';
  };

  const handleRemoveMaterial = (matId: string) => {
    setCourseFormMaterials(prev => prev.filter(m => m.id !== matId));
  };

  const handleMoveMaterial = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= courseFormMaterials.length) return;
    const updated = [...courseFormMaterials];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updated.forEach((m, idx) => { m.order = idx + 1; });
    setCourseFormMaterials(updated);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormTitle.trim()) {
      alert(currentLang === 'fr' ? 'Le titre du cours est obligatoire' : 'Course title is required');
      return;
    }

    setSavingCourse(true);
    try {
      const accessStudentIds = courseFormAccessAll ? ['*'] : courseFormAccessStudentIds;

      const coursePayload: Omit<LibraryCourse, 'id' | 'createdAt' | 'updatedAt'> = {
        title: courseFormTitle.trim(),
        titleFr: courseFormTitleFr.trim() || courseFormTitle.trim(),
        description: courseFormDesc.trim(),
        descriptionFr: courseFormDescFr.trim(),
        coverImage: courseFormCover.trim() || undefined,
        price: Number(courseFormPrice) || 0,
        level: courseFormLevel,
        instrument: courseFormInstrument,
        status: courseFormStatus,
        accessStudentIds,
        materials: courseFormMaterials,
      };

      if (editingCourseId) {
        const res = await updateLibraryCourse(editingCourseId, coursePayload);
        if (res.success) {
          showSavedToast(currentLang === 'fr' ? 'Cours mis à jour avec succès !' : 'Course updated successfully!');
          setIsCourseModalOpen(false);
        } else {
          alert(res.error || 'Failed to update course');
        }
      } else {
        const res = await addLibraryCourse(coursePayload);
        if (res.success) {
          showSavedToast(currentLang === 'fr' ? 'Nouveau cours ajouté à la médiathèque !' : 'New course added to library!');
          setIsCourseModalOpen(false);
        } else {
          alert(res.error || 'Failed to create course');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error saving course');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteLibraryCourse = async (courseId: string) => {
    const confirmMsg = currentLang === 'fr'
      ? 'Voulez-vous vraiment supprimer ce cours et toutes ses ressources ?'
      : 'Are you sure you want to delete this course and all its materials?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteLibraryCourse(courseId);
      if (res.success) {
        showSavedToast(currentLang === 'fr' ? 'Cours supprimé' : 'Course deleted');
      } else {
        alert(res.error || 'Failed to delete course');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ==========================================
  // COMMUNITY MODERATION HANDLERS
  // ==========================================
  const handleTeacherPostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherChatText.trim() && !teacherChatImage) return;

    setPostingTeacherMsg(true);
    try {
      let uploadedUrl: string | undefined = undefined;
      if (teacherChatImage) {
        const uploadRes = await uploadImageFile(teacherChatImage, 'community');
        if (uploadRes.success && uploadRes.url) {
          uploadedUrl = uploadRes.url;
        } else {
          alert(uploadRes.error || 'Failed to upload photo');
          setPostingTeacherMsg(false);
          return;
        }
      }

      const res = await postCommunityMessage({
        studentId: adminUser?.uid || 'admin',
        authorName: 'Mohamed Mimouni (Teacher)',
        authorRole: 'teacher',
        text: teacherChatText.trim(),
        imageUrl: uploadedUrl,
      });

      if (res.success) {
        setTeacherChatText('');
        setTeacherChatImage(null);
        if (teacherChatImagePreview) URL.revokeObjectURL(teacherChatImagePreview);
        setTeacherChatImagePreview(null);
        if (teacherImageInputRef.current) teacherImageInputRef.current.value = '';
        showSavedToast(currentLang === 'fr' ? 'Annonce publiée dans le chat !' : 'Announcement posted to community chat!');
      } else {
        alert(res.error || 'Failed to post announcement');
      }
    } catch (err: any) {
      alert(err.message || 'Error posting message');
    } finally {
      setPostingTeacherMsg(false);
    }
  };

  const handleDeleteCommunityMessage = async (messageId: string) => {
    const confirmMsg = currentLang === 'fr'
      ? 'Supprimer ce message de la communauté du studio ?'
      : 'Delete this message from the studio community?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteCommunityMessage(messageId);
      if (res.success) {
        showSavedToast(currentLang === 'fr' ? 'Message supprimé' : 'Message deleted');
      } else {
        alert(res.error || 'Failed to delete message');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStudentMute = async (studentId: string, willMute: boolean) => {
    setMutingStudentId(studentId);
    try {
      const res = await toggleStudentMute(studentId, willMute);
      if (res.success) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, isMuted: willMute } : s));
        showSavedToast(willMute
          ? (currentLang === 'fr' ? 'Élève suspendu du chat' : 'Student muted from chat')
          : (currentLang === 'fr' ? 'Droits de publication rétablis' : 'Student unmuted in chat')
        );
      } else {
        alert(res.error || 'Failed to toggle student mute status');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMutingStudentId(null);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const confirmed = requests.filter(r => r.status === 'confirmed' || r.status === 'scheduled').length;
    const revenue = requests
      .filter(r => r.status !== 'cancelled')
      .reduce((acc, r) => acc + (r.totalPrice || 0), 0);
    return { total, pending, confirmed, revenue };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.instrument.toLowerCase().includes(q);

      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchPayment = filterPayment === 'all' || r.paymentStatus === filterPayment;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [requests, searchQuery, filterStatus, filterPayment]);

  const handleApproveStudent = async (studentId: string, linkedRequestId?: string) => {
    try {
      const res = await setStudentApproval(studentId, 'approved', linkedRequestId);
      if (res.success) {
        showSavedToast('Student approved! Request confirmed.');
      } else {
        alert('Failed to approve student: ' + (res.error || 'Unknown error') + (res.code ? ` [${res.code}]` : ''));
      }
    } catch (err: any) {
      console.error('Approve student error:', err);
      alert('Approval error: ' + err.message);
    }
  };

  const handleRejectStudent = async (studentId: string, linkedRequestId?: string) => {
    try {
      const res = await setStudentApproval(studentId, 'rejected', linkedRequestId);
      if (res.success) {
        showSavedToast('Student rejected.');
      } else {
        alert('Failed to reject student: ' + (res.error || 'Unknown error') + (res.code ? ` [${res.code}]` : ''));
      }
    } catch (err: any) {
      console.error('Reject student error:', err);
      alert('Rejection error: ' + err.message);
    }
  };

  const handleInviteGuest = (req: BookingRequest) => {
    const inviteText = `Hello ${req.name}, your lesson request with Maestro Mohamed Mimouni has been reviewed! Please create your student account at ${window.location.origin}/#student using your email (${req.email}) to select your lesson schedule.`;
    navigator.clipboard.writeText(inviteText);
    showSavedToast(`Invitation message copied for ${req.name}!`);
  };

  const handleOpenStudentProfile = (student: StudentAccount) => {
    if (student.tempPassword) {
      purgeLegacyTempPassword(student.id);
    }
    setAdminNotesText(student.adminNotes || '');
    setIsAddingPayment(false);
    setSelectedStudentProfile(student);
  };

  const handleStatusChange = async (req: BookingRequest, newStatus: LessonStatus) => {
    await updateBookingRequest(req.id, { status: newStatus });
    const matchingStudent = students.find(s => (req.studentUid && s.id === req.studentUid) || (s.email && s.email.toLowerCase() === req.email.toLowerCase()));
    if (matchingStudent) {
      if (newStatus === 'confirmed') {
        await setStudentApproval(matchingStudent.id, 'approved', req.id);
      } else if (newStatus === 'cancelled') {
        await setStudentApproval(matchingStudent.id, 'rejected', req.id);
      }
    }
    showSavedToast(`Request status updated to ${newStatus}`);
  };

  // Helper to look up student info from the students collection by studentId (Requirement A)
  const getStudentById = (id: string): StudentAccount | undefined => {
    return students.find(s => s.id === id);
  };

  // Universal Lessons Resolver for any date (Requirement A & B)
  const getLessonsForDate = (dateISO: string) => {
    const d = new Date(dateISO + 'T12:00:00Z');
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
    const isBlocked = calendarSettings.blockedDates?.includes(dateISO) || false;
    const isOpen = calendarSettings.openDays?.includes(dayOfWeek) || false;

    const lessonsOnDay: Array<{
      student: StudentAccount;
      time: string;
      lengthMinutes: number;
      isRescheduled: boolean;
      originalDate?: string;
      attendanceStatus?: LessonAttendanceStatus;
    }> = [];

    students.forEach(s => {
      const isRecurringDay = s.isDaily 
        ? (calendarSettings.openDays || []).includes(dayOfWeek)
        : (s.selectedWeeklyDays || []).includes(dayOfWeek);
      const hasRescheduledAway = s.rescheduledOccurrences?.[dateISO] !== undefined;

      if (isRecurringDay && !hasRescheduledAway && (s.daysLocked || s.isDaily)) {
        const time = s.selectedTimeSlots?.[dayOfWeek] || '17:00';
        const len = s.sessionBlocks ? s.sessionBlocks * 30 : 60;
        const logged = s.lessonHistory?.find(h => h.date === dateISO && h.time === time);
        lessonsOnDay.push({
          student: s,
          time,
          lengthMinutes: len,
          isRescheduled: false,
          attendanceStatus: logged?.status,
        });
      }

      if (s.rescheduledOccurrences) {
        Object.entries(s.rescheduledOccurrences).forEach(([origDate, override]) => {
          if (override.newDateISO === dateISO) {
            const len = s.sessionBlocks ? s.sessionBlocks * 30 : 60;
            const logged = s.lessonHistory?.find(h => h.date === dateISO && h.time === override.newTime);
            lessonsOnDay.push({
              student: s,
              time: override.newTime,
              lengthMinutes: len,
              isRescheduled: true,
              originalDate: origDate,
              attendanceStatus: logged?.status,
            });
          }
        });
      }
    });

    lessonsOnDay.sort((a, b) => a.time.localeCompare(b.time));
    const maxCapacity = calendarSettings.maxStudentsPerDay || 5;
    const count = lessonsOnDay.length;
    const isFull = count >= maxCapacity;

    return {
      dateISO,
      dayOfWeek,
      isBlocked,
      isOpen,
      bookedOnThisDay: lessonsOnDay,
      count,
      maxCapacity,
      isFull,
    };
  };

  // Selected Calendar Day Calculation
  const selectedDayInfo = useMemo(() => {
    return getLessonsForDate(selectedCalendarDate);
  }, [selectedCalendarDate, calendarSettings, students]);

  const handleToggleOpenDay = async (day: DayOfWeek) => {
    const current = calendarSettings.openDays || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    const updated = { ...calendarSettings, openDays: next };
    setCalendarSettings(updated);
    await updateCalendarSettings({ openDays: next });
    showSavedToast('Studio open days updated');
  };

  const handleBlockDate = async () => {
    if (!newBlockedDateInput) return;
    const current = calendarSettings.blockedDates || [];
    if (current.includes(newBlockedDateInput)) return;
    const next = [...current, newBlockedDateInput].sort();
    const updated = { ...calendarSettings, blockedDates: next };
    setCalendarSettings(updated);
    await updateCalendarSettings({ blockedDates: next });
    showSavedToast(`Date ${newBlockedDateInput} blocked`);
    setNewBlockedDateInput('');
  };

  const handleUnblockDate = async (dateISO: string) => {
    const current = calendarSettings.blockedDates || [];
    const next = current.filter(d => d !== dateISO);
    const updated = { ...calendarSettings, blockedDates: next };
    setCalendarSettings(updated);
    await updateCalendarSettings({ blockedDates: next });
    showSavedToast(`Date ${dateISO} unblocked`);
  };

  // Quick toggle block/unblock directly from calendar (Requirement B)
  const handleToggleBlockDateDirect = async (dateISO: string) => {
    const res = await toggleBlockCalendarDate(dateISO);
    if (res.success) {
      const isBlockedNow = res.isBlocked;
      setCalendarSettings(prev => ({
        ...prev,
        blockedDates: isBlockedNow
          ? [...(prev.blockedDates || []), dateISO].sort()
          : (prev.blockedDates || []).filter(d => d !== dateISO)
      }));
      showSavedToast(isBlockedNow ? `Date ${dateISO} is now BLOCKED` : `Date ${dateISO} is now UNBLOCKED`);
    } else {
      alert(`Could not toggle block status: ${res.error}`);
    }
  };

  // Mark lesson attendance (attended, missed, cancelled) from calendar (Requirement A)
  const handleMarkAttendanceFromCalendar = async (
    studentId: string, 
    date: string, 
    time: string, 
    status: LessonAttendanceStatus
  ) => {
    try {
      const res = await logStudentLessonAttendance(studentId, {
        date,
        time,
        status,
        notes: `Marked ${status} by admin on ${new Date().toLocaleDateString()}`
      });
      if (res.success) {
        showSavedToast(`Lesson on ${date} marked as ${status}`);
        // update local student state if open
        setSelectedStudentProfile(prev => {
          if (prev && prev.id === studentId) {
            const history = [...(prev.lessonHistory || [])];
            const idx = history.findIndex(h => h.date === date && h.time === time);
            const entry = { date, time, status, notes: `Marked ${status} by admin` };
            if (idx >= 0) history[idx] = entry;
            else history.unshift(entry);
            return { ...prev, lessonHistory: history };
          }
          return prev;
        });
      } else {
        alert(`Failed to log attendance: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error logging attendance: ${err.message}`);
    }
  };

  // Cancel lesson from calendar (Requirement A)
  const handleCancelLessonFromCalendar = async (studentId: string, date: string, time: string) => {
    if (!window.confirm(`Are you sure you want to cancel the lesson on ${date} at ${time}?`)) return;
    try {
      const res = await adminCancelLesson(studentId, date, time, 'Cancelled by teacher from calendar');
      if (res.success) {
        showSavedToast(`Lesson on ${date} at ${time} cancelled`);
      } else {
        alert(`Failed to cancel lesson: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Move lesson from calendar (Requirement A)
  const handleOpenMoveLesson = (studentId: string, studentName: string, originalDate: string, time: string) => {
    setMovingLesson({ studentId, studentName, originalDate, time });
    setMoveNewDate(originalDate);
    setMoveNewTime(time);
    setMoveReason('Moved by teacher');
    setMoveLessonError(null);
  };

  const handleConfirmMoveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingLesson) return;
    setMovingLessonLoading(true);
    setMoveLessonError(null);
    try {
      const res = await adminMoveLesson(
        movingLesson.studentId,
        movingLesson.originalDate,
        moveNewDate,
        moveNewTime,
        moveReason
      );
      if (res.success) {
        showSavedToast(`Lesson moved to ${moveNewDate} at ${moveNewTime}`);
        setMovingLesson(null);
      } else {
        setMoveLessonError(res.error || 'Failed to move lesson');
      }
    } catch (err: any) {
      setMoveLessonError(err.message || 'System error moving lesson');
    } finally {
      setMovingLessonLoading(false);
    }
  };

  // Payment Handlers (Requirement D)
  const handleAddStudentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentProfile) return;
    if (newPaymentAmount <= 0) {
      alert('Please enter a valid payment amount greater than 0 TND.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await recordStudentPayment(selectedStudentProfile.id, {
        date: newPaymentDate,
        amount: Number(newPaymentAmount),
        method: newPaymentMethod,
        note: newPaymentNote.trim() || undefined,
      });
      if (res.success) {
        showSavedToast(`Payment of ${newPaymentAmount} TND recorded!`);
        setIsAddingPayment(false);
        setNewPaymentAmount(0);
        setNewPaymentNote('');
        // Update local student profile
        setSelectedStudentProfile(prev => {
          if (!prev) return null;
          const currentPayments = prev.payments || [];
          const newPay: PaymentRecord = {
            id: `pay_${Date.now()}`,
            date: newPaymentDate,
            amount: Number(newPaymentAmount),
            method: newPaymentMethod,
            note: newPaymentNote.trim() || undefined,
            createdAt: new Date().toISOString(),
          };
          return { ...prev, payments: [...currentPayments, newPay] };
        });
      } else {
        alert(`Failed to record payment: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeleteStudentPayment = async (paymentId: string) => {
    if (!selectedStudentProfile) return;
    if (!window.confirm('Delete this payment record permanently?')) return;
    try {
      const res = await deleteStudentPayment(selectedStudentProfile.id, paymentId);
      if (res.success) {
        showSavedToast('Payment record deleted');
        setSelectedStudentProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            payments: (prev.payments || []).filter(p => p.id !== paymentId),
          };
        });
      } else {
        alert(`Failed to delete payment: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting payment: ${err.message}`);
    }
  };

  // Student Admin Notes (Requirement C)
  const handleSaveStudentAdminNotes = async () => {
    if (!selectedStudentProfile) return;
    setSavingAdminNotes(true);
    try {
      const res = await updateStudentAdminNotes(selectedStudentProfile.id, adminNotesText);
      if (res.success) {
        showSavedToast('Admin notes saved successfully');
        setSelectedStudentProfile(prev => prev ? { ...prev, adminNotes: adminNotesText } : prev);
      } else {
        alert(`Failed to save notes: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error saving notes: ${err.message}`);
    } finally {
      setSavingAdminNotes(false);
    }
  };

  // Gallery Management Handlers (Requirement E)
  const handleUploadGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const res = await uploadImageFile(file, 'gallery');
      if (res.success && res.url) {
        const currentImages = siteSettings.galleryImages || [];
        const newImg: GalleryImage = {
          id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: res.url,
          captionEn: 'Studio lesson moment',
          captionFr: 'Instant au piano au studio',
          order: currentImages.length,
        };
        const updated = [...currentImages, newImg];
        await handleSaveSettings({ galleryImages: updated });
        showSavedToast('Gallery image uploaded successfully!');
      } else {
        alert('Photo upload failed: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryImage = async (imgId: string) => {
    if (!window.confirm('Delete this photo from the studio gallery?')) return;
    const current = siteSettings.galleryImages || [];
    const updated = current.filter(img => img.id !== imgId).map((img, i) => ({ ...img, order: i }));
    await handleSaveSettings({ galleryImages: updated });
    showSavedToast('Photo removed from gallery');
  };

  const handleMoveGalleryImage = async (index: number, direction: 'up' | 'down') => {
    const current = [...(siteSettings.galleryImages || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    const reordered = current.map((img, i) => ({ ...img, order: i }));
    await handleSaveSettings({ galleryImages: reordered });
    showSavedToast('Gallery photos reordered');
  };

  const handleUpdateGalleryCaption = async (imgId: string, captionEn?: string, captionFr?: string) => {
    const current = siteSettings.galleryImages || [];
    const updated = current.map(img => {
      if (img.id === imgId) {
        return {
          ...img,
          ...(captionEn !== undefined ? { captionEn } : {}),
          ...(captionFr !== undefined ? { captionFr } : {}),
        };
      }
      return img;
    });
    await handleSaveSettings({ galleryImages: updated });
  };

  const handleTogglePayment = async (req: BookingRequest) => {
    const newPayment: PaymentStatus = req.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    await updateBookingRequest(req.id, { paymentStatus: newPayment });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this lesson booking record permanently?')) {
      await deleteBookingRequest(id);
      showSavedToast('Booking record deleted');
    }
  };

  const handleSaveSchedule = async () => {
    if (!editingScheduleRequest) return;
    await updateBookingRequest(editingScheduleRequest.id, {
      appointmentDate: scheduleDate,
      appointmentTime: scheduleTime,
      status: 'scheduled' as LessonStatus,
    });
    setEditingScheduleRequest(null);
    showSavedToast('Lesson schedule updated');
  };

  const handleSaveNotes = async () => {
    if (!editingNotesRequest) return;
    await updateBookingRequest(editingNotesRequest.id, {
      invoiceNotes: notesText,
    });
    setEditingNotesRequest(null);
    showSavedToast('Student notes saved');
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBookingRequest({
      name: manualForm.name,
      phone: manualForm.phone,
      email: manualForm.email,
      instrument: manualForm.instrument,
      frequency: manualForm.frequency,
      sessionLength: manualForm.sessionLength,
      sessionBlocks: manualForm.sessionBlocks,
      pricePerWeek: manualForm.pricePerWeek,
      totalPrice: manualForm.totalPrice,
      preferredLocation: manualForm.preferredLocation,
      message: 'Manually entered by teacher',
      status: manualForm.status,
      paymentStatus: manualForm.paymentStatus,
      appointmentDate: manualForm.appointmentDate,
      appointmentTime: manualForm.appointmentTime,
      invoiceNotes: manualForm.invoiceNotes,
    });
    setIsManualModalOpen(false);
    showSavedToast('Student added successfully');
  };

  // ==========================================
  // 2. SITE CONTENT STATE
  // ==========================================
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [teachingRows, setTeachingRows] = useState<TeachingRow[]>(DEFAULT_TEACHING_ROWS);
  const [courses, setCourses] = useState<InstrumentCourse[]>(DEFAULT_COURSES);

  // Subscribe to live settings, teaching rows, courses
  useEffect(() => {
    if (!adminUser) return;
    const unsub1 = subscribeToSiteSettings(setSiteSettings);
    const unsub2 = subscribeToTeachingRows(setTeachingRows);
    const unsub3 = subscribeToCourses(setCourses);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [adminUser]);

  // Hero Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleHeroPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadImageFile(file, 'hero');
      if (res.success && res.url) {
        await updateSiteSettings({ heroPhotoUrl: res.url });
        setSiteSettings(prev => ({ ...prev, heroPhotoUrl: res.url! }));
        showSavedToast('Hero photo updated successfully');
      } else {
        alert('Photo upload failed: ' + (res.error || 'Unknown error') + (res.code ? ` [${res.code}]` : ''));
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert('Photo upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Settings Save
  const handleSaveSettings = async (partial: Partial<SiteSettings>) => {
    await updateSiteSettings(partial);
    setSiteSettings(prev => ({ ...prev, ...partial }));
    showSavedToast('Settings saved to Firestore');
  };

  // Handle Teaching Rows Reorder & Edit
  const handleMoveTeachingRow = async (index: number, direction: 'up' | 'down') => {
    const newRows = [...teachingRows];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    
    const temp = newRows[index];
    newRows[index] = newRows[targetIndex];
    newRows[targetIndex] = temp;
    
    // Update order indices
    const updated = newRows.map((r, idx) => ({ ...r, order: idx }));
    setTeachingRows(updated);
    await updateTeachingRows(updated);
    showSavedToast('Teaching rows reordered');
  };

  const handleAddTeachingRow = async () => {
    const newRow: TeachingRow = {
      id: 'row-' + Date.now(),
      order: teachingRows.length,
      labelEn: 'Institution',
      labelFr: 'Établissement',
      nameEn: 'Music Academy',
      nameFr: 'Académie de Musique',
      noteEn: 'Classical piano training',
      noteFr: 'Enseignement classique du piano',
    };
    const next = [...teachingRows, newRow];
    setTeachingRows(next);
    await updateTeachingRows(next);
    showSavedToast('New teaching row added');
  };

  const handleDeleteTeachingRow = async (id: string) => {
    if (!window.confirm('Delete this teaching experience row?')) return;
    const next = teachingRows.filter(r => r.id !== id);
    setTeachingRows(next);
    await updateTeachingRows(next);
    showSavedToast('Teaching row deleted');
  };

  const handleUpdateTeachingRow = async (id: string, updates: Partial<TeachingRow>) => {
    const next = teachingRows.map(r => r.id === id ? { ...r, ...updates } : r);
    setTeachingRows(next);
    await updateTeachingRows(next);
    showSavedToast('Teaching row updated');
  };

  // Handle Courses Edit, Reorder, Add, Delete, Visibility, Popular
  const handleMoveCourse = async (index: number, direction: 'up' | 'down') => {
    const newCourses = [...courses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCourses.length) return;
    
    const temp = newCourses[index];
    newCourses[index] = newCourses[targetIndex];
    newCourses[targetIndex] = temp;

    const updated = newCourses.map((c, idx) => ({ ...c, order: idx }));
    setCourses(updated);
    await updateCourses(updated);
    showSavedToast('Courses reordered');
  };

  const handleToggleCourseVisibility = async (courseId: string) => {
    const updated = courses.map(c => 
      c.id === courseId ? { ...c, visible: c.visible === false ? true : false } : c
    );
    setCourses(updated);
    await updateCourses(updated);
    showSavedToast('Course visibility updated');
  };

  const handleToggleCoursePopular = async (courseId: string) => {
    const updated = courses.map(c => 
      c.id === courseId ? { ...c, popular: !c.popular } : c
    );
    setCourses(updated);
    await updateCourses(updated);
    showSavedToast('Course popular status updated');
  };

  const handleAddCourse = async () => {
    const newCourse: InstrumentCourse = {
      id: 'course-' + Date.now(),
      order: courses.length,
      visible: true,
      popular: false,
      nameEn: 'Piano Masterclass',
      nameFr: 'Masterclass Piano',
      taglineEn: 'Advanced technique and recital coaching',
      taglineFr: 'Perfectionnement et préparation aux concerts',
      descriptionEn: 'Intensive repertoire study and concert piece refinement.',
      descriptionFr: 'Étude approfondie du répertoire et travail de scène.',
      levelEn: 'All levels',
      levelFr: 'Tous niveaux',
      ageEn: 'Teens & Adults',
      ageFr: 'Ados & Adultes',
    };
    const next = [...courses, newCourse];
    setCourses(next);
    await updateCourses(next);
    showSavedToast('New course added');
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Delete this course permanently?')) return;
    const next = courses.filter(c => c.id !== id);
    setCourses(next);
    await updateCourses(next);
    showSavedToast('Course deleted');
  };

  const handleUpdateCourse = async (id: string, updates: Partial<InstrumentCourse>) => {
    const next = courses.map(c => c.id === id ? { ...c, ...updates } : c);
    setCourses(next);
    await updateCourses(next);
    showSavedToast('Course details saved');
  };

  // ==========================================
  // RENDER: AUTH LOADING OR LOGIN SCREEN
  // ==========================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0C0E] flex items-center justify-center text-[#EDE7DC]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#E8913C]" />
          <span className="text-xs uppercase tracking-[0.15em] text-[#9EA5A8]">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#0A0C0E] text-[#EDE7DC] flex flex-col justify-center items-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-[#E8913C]/10 text-[#E8913C] mb-2 border border-[#E8913C]/20">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC] tracking-tight">
              Admin Authentication
            </h2>
            <p className="text-xs text-[#9EA5A8]">
              Sign in with your authorized studio email
            </p>
            {!isFirebaseConfigured && (
              <div className="mt-3 p-3 bg-[#E8913C]/10 border border-[#E8913C]/30 rounded-xl text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E8913C]">
                  <span>Demo Mode Active</span>
                </div>
                <p className="text-[11px] text-[#EDE7DC]/80">
                  Firebase environment variables not set. You can log in with demo credentials to explore the full dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@mohamedmimouni.tn');
                    setLoginPass('admin123');
                  }}
                  className="cursor-pointer text-[10.5px] font-mono text-[#E8913C] hover:text-[#EDE7DC] underline"
                >
                  Fill Demo: admin@mohamedmimouni.tn
                </button>
              </div>
            )}
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#9EA5A8]">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6C7378] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#EDE7DC] placeholder-[#6C7378] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#9EA5A8]">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6C7378] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#EDE7DC] placeholder-[#6C7378] outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] font-bold text-xs tracking-[0.12em] uppercase py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[rgba(237,231,220,0.08)] flex justify-between items-center text-[11px] text-[#6C7378]">
            <button
              onClick={onBackToSite}
              className="hover:text-[#EDE7DC] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to site</span>
            </button>
            <span className="text-[10px] text-[#6C7378]">Administrator Access</span>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: AUTHENTICATED DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0A0C0E] text-[#EDE7DC] py-8 sm:py-10 px-4 sm:px-6 lg:px-12">
      
      {/* Toast Notification */}
      {savedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101317] border border-[#E8913C] text-[#EDE7DC] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#E8913C]" />
          <span className="text-xs font-medium tracking-wide">{savedNotification}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[rgba(237,231,220,0.13)]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C]" />
              <span className="text-[10.5px] font-semibold tracking-[0.15em] text-[#9EA5A8] uppercase">
                {t.admin.title}
              </span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#EDE7DC] tracking-[-0.02em]">
              Mimouni · Studio Administration
            </h1>
            <p className="text-xs text-[#9EA5A8] mt-1 flex items-center gap-2">
              <span>Admin:</span>
              <span className="font-mono text-[#E8913C] font-semibold">{adminUser.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onBackToSite}
              className="cursor-pointer border border-[rgba(237,231,220,0.15)] hover:border-[#EDE7DC] text-[#EDE7DC] text-[10.5px] font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.nav.backToSite}</span>
            </button>
            <button
              onClick={handleLogout}
              className="cursor-pointer border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[10.5px] font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Firestore Sync Notice */}
        {firestoreSyncNotice && (
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3 text-xs text-[#EDE7DC]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#E8913C] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#E8913C]">Firebase Rules Notice</p>
                <p className="text-[#9EA5A8] mt-0.5">{firestoreSyncNotice}</p>
              </div>
            </div>
            <button
              onClick={() => setFirestoreSyncNotice(null)}
              className="text-[#9EA5A8] hover:text-[#EDE7DC] text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-[rgba(237,231,220,0.1)] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('requests')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'requests'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Requests ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('calendar')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'calendar'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Shared Calendar</span>
          </button>

          <button
            onClick={() => setActiveMainTab('students')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'students'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{currentLang === 'fr' ? 'Élèves' : 'Students'} ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('library')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'library'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{currentLang === 'fr' ? 'Médiathèque' : 'Course Library'} ({libraryCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('community')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'community'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{currentLang === 'fr' ? 'Communauté' : 'Community Chat'} ({communityMessages.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('content')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'content'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Site Content</span>
          </button>

          <button
            onClick={() => setActiveMainTab('settings')}
            className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold tracking-[0.08em] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'settings'
                ? 'bg-[#E8913C] text-[#0A0C0E]'
                : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Calendar Settings</span>
          </button>
        </div>

        {/* TAB 1: BOOKING REQUESTS */}
        {activeMainTab === 'requests' && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#9EA5A8] mb-1">Total Inquiries</div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#EDE7DC]">{stats.total}</div>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#E8913C] mb-1">Pending Review</div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#E8913C]">{stats.pending}</div>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-emerald-400 mb-1">Active / Scheduled</div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-400">{stats.confirmed}</div>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-5">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#9EA5A8] mb-1">Est. Monthly Tuition</div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold font-mono text-[#EDE7DC]">{stats.revenue} <span className="text-xs font-normal">TND</span></div>
              </div>
            </div>

            {/* Controls Bar: Search, Filters, CSV, Add Student */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[#6C7378] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search students by name, email, phone, instrument..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.13)] focus:border-[#E8913C] rounded-xl pl-10 pr-4 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.13)] text-[#EDE7DC] text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.13)] text-[#EDE7DC] text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>

                <button
                  onClick={() => exportRequestsToCSV(requests)}
                  disabled={requests.length === 0}
                  className="cursor-pointer border border-[rgba(237,231,220,0.15)] hover:border-[#EDE7DC] disabled:opacity-40 text-[#EDE7DC] text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Requests List or Clean Empty State */}
            {filteredRequests.length === 0 ? (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] flex items-center justify-center mx-auto text-[#6C7378]">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                  {searchQuery || filterStatus !== 'all' || filterPayment !== 'all' ? 'No matching requests' : 'No requests yet'}
                </h3>
                <p className="text-xs text-[#9EA5A8] max-w-sm mx-auto">
                  {searchQuery || filterStatus !== 'all' || filterPayment !== 'all'
                    ? 'Try clearing search terms or selecting "All Statuses".'
                    : 'Lesson booking inquiries submitted by visitors on the website will arrive here in real-time.'}
                </p>
                {requests.length === 0 && (
                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="cursor-pointer text-xs text-[#E8913C] hover:underline font-semibold mt-2 inline-block"
                  >
                    + Record a student manually
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#101317] border border-[rgba(237,231,220,0.13)] hover:border-[rgba(237,231,220,0.25)] rounded-2xl p-5 sm:p-6 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(237,231,220,0.08)] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-lg text-[#EDE7DC]">
                            {req.name}
                          </h4>
                          <span className="text-[10px] font-mono text-[#6C7378] bg-[#0A0C0E] px-2 py-0.5 rounded border border-[rgba(237,231,220,0.08)]">
                            {req.id}
                          </span>
                        </div>
                        <div className="text-xs text-[#9EA5A8] flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span>{req.phone}</span>
                          <span>•</span>
                          <span>{req.email}</span>
                          <span>•</span>
                          <span className="text-[#E8913C] font-semibold">{req.instrument}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Student / Guest Status and Approval Actions */}
                        {(() => {
                          const studentAcc = students.find(s => (req.studentUid && s.id === req.studentUid) || s.email.toLowerCase() === req.email.toLowerCase());
                          const isRegistered = Boolean(studentAcc && (studentAcc.authUid || req.studentUid));

                          if (isRegistered && studentAcc) {
                            return (
                              <div className="flex items-center gap-2">
                                {/* Email verification badge */}
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                  studentAcc.emailVerified 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                  {studentAcc.emailVerified ? 'Verified ✓' : 'Unverified ⚠'}
                                </span>

                                {studentAcc.approvalStatus === 'pending' || req.status === 'pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveStudent(studentAcc.id, req.id)}
                                      className="cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectStudent(studentAcc.id, req.id)}
                                      className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                                    Student Approved
                                  </span>
                                )}
                              </div>
                            );
                          }

                          // Guest request (no account yet)
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-[#0A0C0E] text-[#9EA5A8] border border-[rgba(237,231,220,0.1)] px-2 py-0.5 rounded">
                                Guest Request
                              </span>
                              <button
                                type="button"
                                onClick={() => handleInviteGuest(req)}
                                className="cursor-pointer border border-[#E8913C]/40 bg-[#E8913C]/10 hover:bg-[#E8913C]/20 text-[#E8913C] text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                title="Copy invitation message with registration link"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Invite</span>
                              </button>
                            </div>
                          );
                        })()}

                        {/* Status Selector */}
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req, e.target.value as LessonStatus)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none ${
                            req.status === 'confirmed' || req.status === 'scheduled'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : req.status === 'pending'
                              ? 'bg-[#E8913C]/10 border-[#E8913C]/30 text-[#E8913C]'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}
                        >
                          <option value="pending" className="bg-[#101317] text-[#EDE7DC]">Pending</option>
                          <option value="confirmed" className="bg-[#101317] text-[#EDE7DC]">Confirmed</option>
                          <option value="scheduled" className="bg-[#101317] text-[#EDE7DC]">Scheduled</option>
                          <option value="cancelled" className="bg-[#101317] text-[#EDE7DC]">Cancelled</option>
                        </select>

                        {/* Payment Toggle */}
                        <button
                          onClick={() => handleTogglePayment(req)}
                          className={`cursor-pointer text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                            req.paymentStatus === 'paid'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {req.paymentStatus === 'paid' ? 'Paid ✓' : 'Unpaid'}
                        </button>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#9EA5A8]">
                      <div>
                        <span className="block text-[10px] uppercase text-[#6C7378]">Plan</span>
                        <span className="text-[#EDE7DC] font-medium">{req.frequency} ({req.sessionLength})</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-[#6C7378]">Tuition</span>
                        <span className="text-[#E8913C] font-mono font-bold">{req.totalPrice} TND / mo</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-[#6C7378]">Location</span>
                        <span className="text-[#EDE7DC] truncate">{req.preferredLocation}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-[#6C7378]">Schedule</span>
                        <span className="text-[#EDE7DC]">
                          {req.appointmentDate ? `${req.appointmentDate} @ ${req.appointmentTime || '17:00'}` : 'Not scheduled'}
                        </span>
                      </div>
                    </div>

                    {/* Message or Notes */}
                    {req.message && (
                      <div className="p-3 bg-[#0A0C0E] rounded-xl text-xs text-[#EDE7DC]/80 border border-[rgba(237,231,220,0.06)]">
                        <span className="text-[10px] uppercase text-[#6C7378] font-bold block mb-1">Student Note:</span>
                        {req.message}
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgba(237,231,220,0.08)]">
                      <div className="text-[10px] text-[#6C7378]">
                        Created: {new Date(req.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingScheduleRequest(req);
                            setScheduleDate(req.appointmentDate || '');
                            setScheduleTime(req.appointmentTime || '17:00');
                          }}
                          className="cursor-pointer text-xs text-[#EDE7DC] hover:text-[#E8913C] px-3 py-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#E8913C] transition-colors flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Schedule</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingNotesRequest(req);
                            setNotesText(req.invoiceNotes || '');
                          }}
                          className="cursor-pointer text-xs text-[#EDE7DC] hover:text-[#E8913C] px-3 py-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#E8913C] transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Notes</span>
                        </button>

                        <button
                          onClick={() => setSelectedInvoiceRequest(req)}
                          className="cursor-pointer text-xs text-[#EDE7DC] hover:text-[#E8913C] px-3 py-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#E8913C] transition-colors flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>

                        <button
                          onClick={() => handleDelete(req.id)}
                          className="cursor-pointer text-xs text-red-400 hover:text-red-300 p-2 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SITE CONTENT MANAGER */}
        {activeMainTab === 'content' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Subnav: Hero, About, Courses, Pricing & Language switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setContentSection('hero')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'hero' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Hero Section</span>
                </button>
                <button
                  onClick={() => setContentSection('about')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'about' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>About & Teaching</span>
                </button>
                <button
                  onClick={() => setContentSection('courses')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'courses' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Courses ({courses.length})</span>
                </button>
                <button
                  onClick={() => setContentSection('pricing')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'pricing' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pricing Rate</span>
                </button>
                <button
                  onClick={() => setContentSection('gallery')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'gallery' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo Gallery ({siteSettings.galleryImages?.length || 0})</span>
                </button>
                <button
                  onClick={() => setContentSection('promo')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'promo' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Promo Banner</span>
                </button>
                <button
                  onClick={() => setContentSection('contact')}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    contentSection === 'contact' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact & Links</span>
                </button>
              </div>

              {/* Language Selector for Text Fields */}
              <div className="flex items-center gap-1 bg-[#0A0C0E] p-1 rounded-xl border border-[rgba(237,231,220,0.1)] self-start sm:self-auto">
                <span className="text-[10px] text-[#6C7378] px-2 font-semibold uppercase">Editing:</span>
                <button
                  onClick={() => setContentLangTab('en')}
                  className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    contentLangTab === 'en' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setContentLangTab('fr')}
                  className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    contentLangTab === 'fr' ? 'bg-[#E8913C] text-[#0A0C0E]' : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                  }`}
                >
                  FR
                </button>
              </div>
            </div>

            {/* SECTION 1: HERO */}
            {contentSection === 'hero' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-8">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Portal Hero Settings</h3>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Customize the full-bleed photo behind the parting portal doors and the corner metadata badges.
                  </p>
                </div>

                {/* Hero Photo Upload & Replace */}
                <div className="space-y-3">
                  <label className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                    Hero Full-Bleed Photo
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl">
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-black/60 border border-[rgba(237,231,220,0.2)] flex-shrink-0">
                      {siteSettings.heroPhotoUrl ? (
                        <img src={siteSettings.heroPhotoUrl} alt="Hero Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#6C7378] text-[10px] p-2 text-center">
                          <ImageIcon className="w-6 h-6 mb-1" />
                          <span>Default Asset Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-[#EDE7DC]">Upload or Replace Photo</div>
                        <div className="text-[11px] text-[#9EA5A8] mt-0.5">
                          Select an image from your computer. It is stored securely in Firebase Storage and served live.
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroPhotoUpload}
                        className="hidden"
                      />

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{uploadingPhoto ? 'Uploading Photo...' : 'Upload from Computer'}</span>
                        </button>
                        {siteSettings.heroPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => handleSaveSettings({ heroPhotoUrl: '' })}
                            className="cursor-pointer text-xs text-[#9EA5A8] hover:text-red-400 underline"
                          >
                            Reset to Default Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Corner Metadata Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[rgba(237,231,220,0.08)]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                      Top-Left Eyeline ({contentLangTab.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={contentLangTab === 'fr' ? siteSettings.heroTaglineFr : siteSettings.heroTaglineEn}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (contentLangTab === 'fr') {
                          handleSaveSettings({ heroTaglineFr: val });
                        } else {
                          handleSaveSettings({ heroTaglineEn: val });
                        }
                      }}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                      Top-Right Location ({contentLangTab.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={contentLangTab === 'fr' ? siteSettings.heroLocationFr : siteSettings.heroLocationEn}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (contentLangTab === 'fr') {
                          handleSaveSettings({ heroLocationFr: val });
                        } else {
                          handleSaveSettings({ heroLocationEn: val });
                        }
                      }}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                      Bottom-Left Degree ({contentLangTab.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={contentLangTab === 'fr' ? siteSettings.heroDegreeFr : siteSettings.heroDegreeEn}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (contentLangTab === 'fr') {
                          handleSaveSettings({ heroDegreeFr: val });
                        } else {
                          handleSaveSettings({ heroDegreeEn: val });
                        }
                      }}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: ABOUT STATEMENT & TEACHING ROWS */}
            {contentSection === 'about' && (
              <div className="space-y-6">
                {/* Statement Text Box */}
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Statement & About Fold</h3>
                    <p className="text-xs text-[#9EA5A8] mt-1">
                      Configure the main editorial statement and highlight phrase in amber.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                        Main Statement ({contentLangTab.toUpperCase()})
                      </label>
                      <textarea
                        rows={3}
                        value={contentLangTab === 'fr' ? siteSettings.aboutHeadingFr : siteSettings.aboutHeadingEn}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (contentLangTab === 'fr') {
                            handleSaveSettings({ aboutHeadingFr: val });
                          } else {
                            handleSaveSettings({ aboutHeadingEn: val });
                          }
                        }}
                        className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                        Amber Highlight Phrase ({contentLangTab.toUpperCase()})
                      </label>
                      <input
                        type="text"
                        value={contentLangTab === 'fr' ? siteSettings.aboutAccentPhraseFr : siteSettings.aboutAccentPhraseEn}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (contentLangTab === 'fr') {
                            handleSaveSettings({ aboutAccentPhraseFr: val });
                          } else {
                            handleSaveSettings({ aboutAccentPhraseEn: val });
                          }
                        }}
                        placeholder="piano and music theory"
                        className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none"
                      />
                      <span className="text-[10px] text-[#6C7378]">This phrase inside the statement is rendered in bright amber.</span>
                    </div>
                  </div>
                </div>

                {/* Teaching Rows Manager */}
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Teaching Experience Rows</h3>
                      <p className="text-xs text-[#9EA5A8] mt-1">
                        Add, edit, reorder or remove the hairline-ruled credentials rows.
                      </p>
                    </div>
                    <button
                      onClick={handleAddTeachingRow}
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {teachingRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl p-4 sm:p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[rgba(237,231,220,0.06)] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#E8913C]">#{idx + 1}</span>
                            <span className="text-xs font-bold text-[#EDE7DC]">
                              {contentLangTab === 'fr' ? (row.nameFr || row.nameEn) : (row.nameEn || row.nameFr)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMoveTeachingRow(idx, 'up')}
                              disabled={idx === 0}
                              className="cursor-pointer p-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveTeachingRow(idx, 'down')}
                              disabled={idx === teachingRows.length - 1}
                              className="cursor-pointer p-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeachingRow(row.id)}
                              className="cursor-pointer p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 ml-2"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Amber Tag ({contentLangTab.toUpperCase()})</label>
                            <input
                              type="text"
                              value={contentLangTab === 'fr' ? row.labelFr : row.labelEn}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateTeachingRow(row.id, contentLangTab === 'fr' ? { labelFr: val } : { labelEn: val });
                              }}
                              className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Institution / Title ({contentLangTab.toUpperCase()})</label>
                            <input
                              type="text"
                              value={contentLangTab === 'fr' ? row.nameFr : row.nameEn}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateTeachingRow(row.id, contentLangTab === 'fr' ? { nameFr: val } : { nameEn: val });
                              }}
                              className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Right Note ({contentLangTab.toUpperCase()})</label>
                            <input
                              type="text"
                              value={contentLangTab === 'fr' ? row.noteFr : row.noteEn}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateTeachingRow(row.id, contentLangTab === 'fr' ? { noteFr: val } : { noteEn: val });
                              }}
                              className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: COURSES */}
            {contentSection === 'courses' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Course Catalog & Card Deck</h3>
                    <p className="text-xs text-[#9EA5A8] mt-1">
                      Manage lessons presented in the physical throwable card deck on the public site.
                    </p>
                  </div>
                  <button
                    onClick={handleAddCourse}
                    className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Course</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl p-5 space-y-4"
                    >
                      {/* Top Header of Course Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(237,231,220,0.06)] pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#E8913C]">#{idx + 1}</span>
                          <h4 className="font-display font-bold text-sm text-[#EDE7DC]">
                            {contentLangTab === 'fr' ? course.nameFr : course.nameEn}
                          </h4>
                          {course.popular && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E8913C]/20 text-[#E8913C] px-2 py-0.5 rounded border border-[#E8913C]/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                          {course.visible === false && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-700/40 text-zinc-400 px-2 py-0.5 rounded border border-zinc-600/30">
                              Hidden
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Popular */}
                          <button
                            onClick={() => handleToggleCoursePopular(course.id)}
                            className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                              course.popular 
                                ? 'bg-[#E8913C]/20 border-[#E8913C] text-[#E8913C]' 
                                : 'border-[rgba(237,231,220,0.1)] text-[#9EA5A8] hover:text-[#EDE7DC]'
                            }`}
                            title="Toggle Popular Badge"
                          >
                            <Star className="w-3 h-3" />
                            <span className="text-[10px]">Popular</span>
                          </button>

                          {/* Toggle Visibility */}
                          <button
                            onClick={() => handleToggleCourseVisibility(course.id)}
                            className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                              course.visible !== false 
                                ? 'border-emerald-500/30 text-emerald-400' 
                                : 'border-zinc-600/30 text-zinc-400'
                            }`}
                            title="Toggle Visibility on Public Site"
                          >
                            {course.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span className="text-[10px]">{course.visible !== false ? 'Visible' : 'Hidden'}</span>
                          </button>

                          {/* Move Up / Down */}
                          <button
                            onClick={() => handleMoveCourse(idx, 'up')}
                            disabled={idx === 0}
                            className="cursor-pointer p-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveCourse(idx, 'down')}
                            disabled={idx === courses.length - 1}
                            className="cursor-pointer p-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="cursor-pointer p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 ml-1"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Course Edit Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Course Name ({contentLangTab.toUpperCase()})</label>
                          <input
                            type="text"
                            value={contentLangTab === 'fr' ? course.nameFr : course.nameEn}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(course.id, contentLangTab === 'fr' ? { nameFr: val } : { nameEn: val });
                            }}
                            className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Tagline ({contentLangTab.toUpperCase()})</label>
                          <input
                            type="text"
                            value={contentLangTab === 'fr' ? course.taglineFr : course.taglineEn}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(course.id, contentLangTab === 'fr' ? { taglineFr: val } : { taglineEn: val });
                            }}
                            className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Description ({contentLangTab.toUpperCase()})</label>
                          <textarea
                            rows={2}
                            value={contentLangTab === 'fr' ? course.descriptionFr : course.descriptionEn}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(course.id, contentLangTab === 'fr' ? { descriptionFr: val } : { descriptionEn: val });
                            }}
                            className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Level ({contentLangTab.toUpperCase()})</label>
                          <input
                            type="text"
                            value={contentLangTab === 'fr' ? course.levelFr : course.levelEn}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(course.id, contentLangTab === 'fr' ? { levelFr: val } : { levelEn: val });
                            }}
                            className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#6C7378] uppercase font-semibold">Age Group ({contentLangTab.toUpperCase()})</label>
                          <input
                            type="text"
                            value={contentLangTab === 'fr' ? course.ageFr : course.ageEn}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCourse(course.id, contentLangTab === 'fr' ? { ageFr: val } : { ageEn: val });
                            }}
                            className="w-full bg-[#101317] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: PRICING SETTING */}
            {contentSection === 'pricing' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Pricing Rate Configuration</h3>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Control the baseline hourly calculation used by the interactive pricing calculator and public tuition table.
                  </p>
                </div>

                <div className="p-5 bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9EA5A8] block">
                      Price per 30-minute block (TND)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={siteSettings.ratePer30Min || 12}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 12;
                          handleSaveSettings({ ratePer30Min: val });
                        }}
                        className="w-32 bg-[#101317] border border-[rgba(237,231,220,0.2)] focus:border-[#E8913C] rounded-xl px-4 py-2.5 text-base font-mono font-bold text-[#E8913C] outline-none"
                      />
                      <span className="text-sm font-semibold text-[#EDE7DC]">TND / 30 minutes</span>
                    </div>
                  </div>

                  {/* Live Breakdown Preview */}
                  <div className="pt-4 border-t border-[rgba(237,231,220,0.08)] space-y-2 text-xs text-[#9EA5A8]">
                    <div className="text-[10px] uppercase tracking-wider text-[#6C7378] font-bold">Calculation Preview:</div>
                    <div className="flex justify-between">
                      <span>1 hour lesson (2 blocks):</span>
                      <strong className="text-[#EDE7DC] font-mono">{(siteSettings.ratePer30Min || 12) * 2} TND / lesson</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>1x per week, 1 hour (monthly):</span>
                      <strong className="text-[#EDE7DC] font-mono">{(siteSettings.ratePer30Min || 12) * 2 * 4} TND / month</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>2x per week, 1 hour (monthly):</span>
                      <strong className="text-[#E8913C] font-mono font-bold">{(siteSettings.ratePer30Min || 12) * 2 * 2 * 4} TND / month</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6C7378] italic pt-2">
                    Any change immediately updates the public pricing table, the slider formulas, and new student booking totals.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 5: PHOTO GALLERY (Requirement E) */}
            {contentSection === 'gallery' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(237,231,220,0.08)] pb-4">
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Photo Gallery Manager</h3>
                    <p className="text-xs text-[#9EA5A8] mt-1">
                      Upload, reorder, and caption studio moments displayed in the clean architectural gallery on the public site.
                    </p>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={galleryInputRef}
                      accept="image/*"
                      onChange={handleUploadGalleryPhoto}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery}
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                    >
                      <Upload className={`w-3.5 h-3.5 ${uploadingGallery ? 'animate-bounce' : ''}`} />
                      <span>{uploadingGallery ? 'Uploading Photo...' : 'Upload New Photo'}</span>
                    </button>
                  </div>
                </div>

                {(!siteSettings.galleryImages || siteSettings.galleryImages.length === 0) ? (
                  <div className="p-12 text-center border border-dashed border-[rgba(237,231,220,0.1)] rounded-2xl space-y-2">
                    <Camera className="w-8 h-8 text-[#6C7378] mx-auto" />
                    <p className="text-xs text-[#9EA5A8]">No photos in the gallery yet. Click "Upload New Photo" above to add some.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {siteSettings.galleryImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl p-4 flex gap-4 items-start"
                      >
                        <div className="w-24 h-28 rounded-xl overflow-hidden bg-black shrink-0 border border-[rgba(237,231,220,0.15)] relative">
                          <img
                            src={img.url}
                            alt="Gallery preview"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] text-[#E8913C] px-1 rounded">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                          <div>
                            <label className="text-[10px] uppercase font-mono text-[#6C7378] block">Caption (English)</label>
                            <input
                              type="text"
                              value={img.captionEn || ''}
                              onChange={(e) => handleUpdateGalleryCaption(img.id, e.target.value, undefined)}
                              placeholder="e.g. Studio Grand Piano lesson"
                              className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-lg px-2.5 py-1 text-xs text-[#EDE7DC] outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-mono text-[#6C7378] block">Caption (French)</label>
                            <input
                              type="text"
                              value={img.captionFr || ''}
                              onChange={(e) => handleUpdateGalleryCaption(img.id, undefined, e.target.value)}
                              placeholder="e.g. Cours au piano à queue"
                              className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-lg px-2.5 py-1 text-xs text-[#EDE7DC] outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveGalleryImage(idx, 'up')}
                                disabled={idx === 0}
                                className="cursor-pointer p-1 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveGalleryImage(idx, 'down')}
                                disabled={idx === siteSettings.galleryImages!.length - 1}
                                className="cursor-pointer p-1 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] disabled:opacity-20 text-[#EDE7DC]"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(img.id)}
                              className="cursor-pointer p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: PROMO BANNER (Requirement E) */}
            {contentSection === 'promo' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Promotional Announcement Banner</h3>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Displays an elegant slim headline at the very top of the public website. Perfect for semester openings, masterclasses, or recitals.
                  </p>
                </div>

                <div className="p-4 bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl space-y-4">
                  {/* Active Switch */}
                  <div className="flex items-center justify-between pb-3 border-b border-[rgba(237,231,220,0.06)]">
                    <div>
                      <span className="text-sm font-bold text-[#EDE7DC] block">Banner Active Status</span>
                      <span className="text-xs text-[#6C7378]">Show or hide the slim notification bar at the top of the site</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = siteSettings.promoBanner?.active || false;
                        handleSaveSettings({
                          promoBanner: {
                            ...(siteSettings.promoBanner || { textEn: '', textFr: '' }),
                            active: !current,
                          }
                        });
                      }}
                      className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        siteSettings.promoBanner?.active
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                          : 'bg-[#161B22] text-[#9EA5A8] border-[rgba(237,231,220,0.15)]'
                      }`}
                    >
                      {siteSettings.promoBanner?.active ? 'Active (Visible)' : 'Disabled (Hidden)'}
                    </button>
                  </div>

                  {/* Text En */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Text in English *</label>
                    <input
                      type="text"
                      value={siteSettings.promoBanner?.textEn || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSiteSettings(prev => ({
                          ...prev,
                          promoBanner: { ...(prev.promoBanner || { textFr: '', active: false }), textEn: val }
                        }));
                      }}
                      placeholder="e.g. Autumn Semester 2026: Intensive Piano & Solfège slots now open in Ben Arous"
                      className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  {/* Text Fr */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Text in French *</label>
                    <input
                      type="text"
                      value={siteSettings.promoBanner?.textFr || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSiteSettings(prev => ({
                          ...prev,
                          promoBanner: { ...(prev.promoBanner || { textEn: '', active: false }), textFr: val }
                        }));
                      }}
                      placeholder="e.g. Session Automne 2026 : Inscriptions ouvertes pour les cours de piano et solfège à Ben Arous"
                      className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  {/* Link */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Optional Link URL or Anchor</label>
                    <input
                      type="text"
                      value={siteSettings.promoBanner?.link || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSiteSettings(prev => ({
                          ...prev,
                          promoBanner: { ...(prev.promoBanner || { textEn: '', textFr: '', active: false }), link: val }
                        }));
                      }}
                      placeholder="e.g. #pricing or https://example.com"
                      className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  {/* Start Date & End Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8]">Start Date (Optional)</label>
                      <input
                        type="date"
                        value={siteSettings.promoBanner?.startDate || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSiteSettings(prev => ({
                            ...prev,
                            promoBanner: { ...(prev.promoBanner || { textEn: '', textFr: '', active: false }), startDate: val }
                          }));
                        }}
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8]">End Date (Optional)</label>
                      <input
                        type="date"
                        value={siteSettings.promoBanner?.endDate || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSiteSettings(prev => ({
                            ...prev,
                            promoBanner: { ...(prev.promoBanner || { textEn: '', textFr: '', active: false }), endDate: val }
                          }));
                        }}
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings({ promoBanner: siteSettings.promoBanner })}
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                    >
                      Save Promo Banner
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: CONTACT DETAILS & SOCIAL PROFILES (Requirement E) */}
            {contentSection === 'contact' && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#EDE7DC]">Studio Contact Details & Social Links</h3>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Editable contact details used in the site footer strip, contact modal, and tuition statements / invoices.
                  </p>
                </div>

                <div className="p-5 bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Studio Phone *</label>
                      <input
                        type="tel"
                        value={siteSettings.contactPhone || ''}
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+216 98 123 456"
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Studio Email *</label>
                      <input
                        type="email"
                        value={siteSettings.contactEmail || ''}
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="contact@mohamedmimouni.tn"
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-[#9EA5A8] font-bold">Studio Physical Address</label>
                    <input
                      type="text"
                      value={siteSettings.contactAddress || ''}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, contactAddress: e.target.value }))}
                      placeholder="Studio Mohamed Mimouni, Avenue Habib Bourguiba, Ben Arous, Tunisia"
                      className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-[rgba(237,231,220,0.06)] space-y-3">
                    <span className="text-[11px] font-bold uppercase font-mono text-[#E8913C] block">Social Media Links</span>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8]">Facebook Profile / Page</label>
                      <input
                        type="url"
                        value={siteSettings.socialFacebook || ''}
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, socialFacebook: e.target.value }))}
                        placeholder="https://facebook.com/..."
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8]">Instagram Profile</label>
                      <input
                        type="url"
                        value={siteSettings.socialInstagram || ''}
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, socialInstagram: e.target.value }))}
                        placeholder="https://instagram.com/..."
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-[#9EA5A8]">YouTube Channel</label>
                      <input
                        type="url"
                        value={siteSettings.socialYoutube || ''}
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, socialYoutube: e.target.value }))}
                        placeholder="https://youtube.com/..."
                        className="w-full bg-[#161B22] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings({
                        contactPhone: siteSettings.contactPhone,
                        contactEmail: siteSettings.contactEmail,
                        contactAddress: siteSettings.contactAddress,
                        socialFacebook: siteSettings.socialFacebook,
                        socialInstagram: siteSettings.socialInstagram,
                        socialYoutube: siteSettings.socialYoutube,
                      })}
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                    >
                      Save Contact Information
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN CALENDAR VIEW (MONTH, WEEK, AND DAY VIEWS - REQUIREMENT B & A) */}
        {activeMainTab === 'calendar' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Toolbar: View Switcher & Navigator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-4 h-4 text-[#E8913C]" />
                  <span className="text-[10.5px] font-mono tracking-wider uppercase text-[#9EA5A8]">
                    Master Studio Schedule
                  </span>
                </div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#EDE7DC]">
                  {calendarViewMode === 'month' && (
                    calendarMonth.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                      month: 'long',
                      year: 'numeric'
                    })
                  )}
                  {calendarViewMode === 'week' && (
                    (() => {
                      const endOfWeek = new Date(calendarWeekStart);
                      endOfWeek.setDate(endOfWeek.getDate() + 6);
                      return `${calendarWeekStart.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    })()
                  )}
                  {calendarViewMode === 'day' && (
                    new Date(selectedCalendarDate + 'T12:00:00Z').toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  )}
                </h2>
              </div>

              {/* View Switcher & Navigation Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Mode Switcher Tabs */}
                <div className="flex items-center bg-[#0A0C0E] p-1 rounded-xl border border-[rgba(237,231,220,0.1)]">
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('month')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      calendarViewMode === 'month'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Month View
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('week')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      calendarViewMode === 'week'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Week View
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode('day')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      calendarViewMode === 'day'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Day View
                  </button>
                </div>

                {/* Date Steppers based on active view mode */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarViewMode === 'month') {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      } else if (calendarViewMode === 'week') {
                        const prev = new Date(calendarWeekStart);
                        prev.setDate(prev.getDate() - 7);
                        setCalendarWeekStart(prev);
                      } else {
                        const prev = new Date(selectedCalendarDate + 'T12:00:00Z');
                        prev.setDate(prev.getDate() - 1);
                        setSelectedCalendarDate(prev.toISOString().split('T')[0]);
                      }
                    }}
                    className="cursor-pointer px-2.5 py-1.5 rounded-xl border border-[rgba(237,231,220,0.15)] hover:border-[#EDE7DC] text-xs font-semibold text-[#EDE7DC]"
                    title="Previous"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonth(today);
                      const day = today.getDay();
                      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                      setCalendarWeekStart(new Date(new Date().setDate(diff)));
                      setSelectedCalendarDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="cursor-pointer px-3 py-1.5 rounded-xl border border-[#E8913C]/40 bg-[#E8913C]/10 hover:bg-[#E8913C]/20 text-[#E8913C] text-xs font-semibold"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarViewMode === 'month') {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      } else if (calendarViewMode === 'week') {
                        const next = new Date(calendarWeekStart);
                        next.setDate(next.getDate() + 7);
                        setCalendarWeekStart(next);
                      } else {
                        const next = new Date(selectedCalendarDate + 'T12:00:00Z');
                        next.setDate(next.getDate() + 1);
                        setSelectedCalendarDate(next.toISOString().split('T')[0]);
                      }
                    }}
                    className="cursor-pointer px-2.5 py-1.5 rounded-xl border border-[rgba(237,231,220,0.15)] hover:border-[#EDE7DC] text-xs font-semibold text-[#EDE7DC]"
                    title="Next"
                  >
                    →
                  </button>

                  {calendarViewMode === 'day' && (
                    <input
                      type="date"
                      value={selectedCalendarDate}
                      onChange={(e) => setSelectedCalendarDate(e.target.value)}
                      className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.2)] focus:border-[#E8913C] rounded-xl px-3 py-1.5 text-xs text-[#EDE7DC] outline-none ml-1"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* VIEW 1: MONTH VIEW (Requirement B) */}
            {calendarViewMode === 'month' && (() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const daysInMonth = lastDay.getDate();

              // Adjust so Monday is 0, Sunday is 6
              const startDayOfWeek = (firstDay.getDay() + 6) % 7;
              const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

              const monthDays: Array<{
                dayNumber?: number;
                dateISO?: string;
                isCurrentMonth: boolean;
              }> = [];

              for (let i = 0; i < totalCells; i++) {
                const dayNum = i - startDayOfWeek + 1;
                if (dayNum > 0 && dayNum <= daysInMonth) {
                  const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  monthDays.push({
                    dayNumber: dayNum,
                    dateISO: dStr,
                    isCurrentMonth: true,
                  });
                } else {
                  monthDays.push({ isCurrentMonth: false });
                }
              }

              return (
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-6 space-y-4">
                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold font-mono text-[#9EA5A8] border-b border-[rgba(237,231,220,0.08)] pb-3">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {monthDays.map((cell, idx) => {
                      if (!cell.isCurrentMonth || !cell.dateISO) {
                        return (
                          <div
                            key={idx}
                            className="min-h-[110px] p-2 rounded-xl bg-[#0A0C0E]/40 border border-transparent opacity-25"
                          />
                        );
                      }

                      const dayInfo = getLessonsForDate(cell.dateISO);
                      const isSelected = cell.dateISO === selectedCalendarDate;
                      const isToday = cell.dateISO === new Date().toISOString().split('T')[0];

                      return (
                        <div
                          key={cell.dateISO}
                          onClick={() => {
                            setSelectedCalendarDate(cell.dateISO!);
                          }}
                          className={`min-h-[120px] p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                            isSelected
                              ? 'border-[#E8913C] bg-[#161B22]'
                              : isToday
                              ? 'border-[#E8913C]/40 bg-[#12161C]'
                              : dayInfo.isBlocked
                              ? 'border-red-500/25 bg-red-950/15'
                              : !dayInfo.isOpen
                              ? 'border-[rgba(237,231,220,0.05)] bg-[#0A0C0E]/60'
                              : 'border-[rgba(237,231,220,0.08)] bg-[#0D1014] hover:border-[rgba(237,231,220,0.2)]'
                          }`}
                        >
                          {/* Top Row: Date Number & Block/Unblock Button */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-bold ${isToday ? 'text-[#E8913C]' : 'text-[#EDE7DC]'}`}>
                              {cell.dayNumber}
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Quick Block / Unblock Toggle Button (Requirement B) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBlockDateDirect(cell.dateISO!);
                                }}
                                className={`cursor-pointer p-1 rounded-md transition-colors ${
                                  dayInfo.isBlocked 
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                    : 'text-[#6C7378] hover:text-red-400 opacity-60 group-hover:opacity-100'
                                }`}
                                title={dayInfo.isBlocked ? 'Click to unblock date' : 'Click to block date'}
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Middle: Status & Student Count against limit */}
                          <div className="my-1.5 space-y-1">
                            {dayInfo.isBlocked ? (
                              <span className="block text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/30 text-center font-bold">
                                Blocked
                              </span>
                            ) : !dayInfo.isOpen ? (
                              <span className="block text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 text-center">
                                Closed
                              </span>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  dayInfo.isFull 
                                    ? 'bg-red-500/20 text-red-400' 
                                    : dayInfo.count > 0 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'text-[#6C7378]'
                                }`}>
                                  {dayInfo.count} / {dayInfo.maxCapacity}
                                </span>
                              </div>
                            )}

                            {/* Booked Students Preview Pills */}
                            <div className="space-y-1 overflow-hidden max-h-14">
                              {dayInfo.bookedOnThisDay.slice(0, 3).map((l, i) => (
                                <div
                                  key={i}
                                  className="text-[9.5px] truncate font-sans px-1.5 py-0.5 rounded bg-[#161B22] border border-[rgba(237,231,220,0.06)] text-[#EDE7DC] flex items-center justify-between"
                                  title={`${l.student.name} at ${l.time} (${l.student.instrument})`}
                                >
                                  <span className="truncate">{l.student.name.split(' ')[0]}</span>
                                  <span className="font-mono text-[9px] text-[#E8913C] ml-1">{l.time}</span>
                                </div>
                              ))}
                              {dayInfo.bookedOnThisDay.length > 3 && (
                                <span className="text-[9px] text-[#9EA5A8] block text-center font-mono">
                                  +{dayInfo.bookedOnThisDay.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Click to open in Day View */}
                          <div className="pt-1 border-t border-[rgba(237,231,220,0.04)] text-[9.5px] text-[#6C7378] flex justify-between items-center">
                            <span className="opacity-0 group-hover:opacity-100 text-[#E8913C] font-semibold transition-opacity">
                              Select Day →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* VIEW 2: WEEK VIEW (Requirement B) */}
            {calendarViewMode === 'week' && (() => {
              const weekDates = [0, 1, 2, 3, 4, 5, 6].map(offset => {
                const d = new Date(calendarWeekStart);
                d.setDate(d.getDate() + offset);
                return d.toISOString().split('T')[0];
              });

              return (
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {weekDates.map((dateISO) => {
                      const dayInfo = getLessonsForDate(dateISO);
                      const isSelected = dateISO === selectedCalendarDate;
                      const isToday = dateISO === new Date().toISOString().split('T')[0];

                      return (
                        <div
                          key={dateISO}
                          className={`rounded-2xl border p-3 flex flex-col justify-between space-y-3 min-h-[360px] ${
                            isSelected
                              ? 'border-[#E8913C] bg-[#161B22]'
                              : isToday
                              ? 'border-[#E8913C]/40 bg-[#12161C]'
                              : dayInfo.isBlocked
                              ? 'border-red-500/25 bg-red-950/15'
                              : 'border-[rgba(237,231,220,0.08)] bg-[#0A0C0E]'
                          }`}
                        >
                          {/* Column Header */}
                          <div className="border-b border-[rgba(237,231,220,0.08)] pb-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-display font-bold text-sm text-[#EDE7DC]">
                                {dayInfo.dayOfWeek.slice(0, 3)}
                              </span>
                              <span className="font-mono text-xs text-[#9EA5A8]">
                                {dateISO.slice(5)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                dayInfo.isFull 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : dayInfo.count > 0 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'text-[#6C7378]'
                              }`}>
                                {dayInfo.count} / {dayInfo.maxCapacity} Booked
                              </span>

                              <button
                                type="button"
                                onClick={() => handleToggleBlockDateDirect(dateISO)}
                                className={`cursor-pointer text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                  dayInfo.isBlocked
                                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : 'border-[rgba(237,231,220,0.15)] text-[#9EA5A8] hover:text-red-400'
                                }`}
                                title={dayInfo.isBlocked ? 'Unblock Date' : 'Block Date'}
                              >
                                {dayInfo.isBlocked ? 'Blocked' : 'Block'}
                              </button>
                            </div>
                          </div>

                          {/* Lessons Column */}
                          <div className="space-y-2 flex-1 overflow-y-auto max-h-[340px]">
                            {dayInfo.bookedOnThisDay.length === 0 ? (
                              <p className="text-[11px] text-[#6C7378] italic text-center py-8">
                                {dayInfo.isBlocked ? 'Blocked' : !dayInfo.isOpen ? 'Closed' : 'No lessons'}
                              </p>
                            ) : (
                              dayInfo.bookedOnThisDay.map((l, i) => (
                                <div
                                  key={i}
                                  className="p-2.5 rounded-xl bg-[#12161C] border border-[rgba(237,231,220,0.08)] space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudentProfile(l.student)}
                                        className="cursor-pointer text-xs font-bold text-[#EDE7DC] hover:text-[#E8913C] truncate text-left block"
                                      >
                                        {l.student.name}
                                      </button>
                                      <span className="text-[10px] text-[#9EA5A8] block truncate">
                                        {l.student.instrument} · {l.lengthMinutes}m
                                      </span>
                                    </div>

                                    <span className="font-mono text-xs font-bold text-[#E8913C] shrink-0">
                                      {l.time}
                                    </span>
                                  </div>

                                  {/* Attendance Badge if marked */}
                                  {l.attendanceStatus && (
                                    <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded uppercase block text-center ${
                                      l.attendanceStatus === 'attended' || l.attendanceStatus === 'completed'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : l.attendanceStatus === 'missed'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {l.attendanceStatus}
                                    </span>
                                  )}

                                  {/* Action Buttons: Attended, Missed, Cancel, Move (Requirement A) */}
                                  <div className="pt-1.5 border-t border-[rgba(237,231,220,0.06)] grid grid-cols-4 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAttendanceFromCalendar(l.student.id, dateISO, l.time, 'attended')}
                                      className="cursor-pointer p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 text-[9.5px] font-bold text-center"
                                      title="Mark as Attended"
                                    >
                                      Att
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAttendanceFromCalendar(l.student.id, dateISO, l.time, 'missed')}
                                      className="cursor-pointer p-1 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 text-[9.5px] font-bold text-center"
                                      title="Mark as Missed"
                                    >
                                      Mis
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelLessonFromCalendar(l.student.id, dateISO, l.time)}
                                      className="cursor-pointer p-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 text-[9.5px] font-bold text-center"
                                      title="Cancel Lesson"
                                    >
                                      Can
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMoveLesson(l.student.id, l.student.name, dateISO, l.time)}
                                      className="cursor-pointer p-1 rounded bg-[#E8913C]/10 hover:bg-[#E8913C]/25 text-[#E8913C] text-[9.5px] font-bold text-center"
                                      title="Move Lesson"
                                    >
                                      Mov
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* VIEW 3: DAY VIEW (Requirement B & A) */}
            {calendarViewMode === 'day' && (
              <div className="space-y-6">
                {/* Day Status & Capacity Meter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] block mb-1">
                      Day Status
                    </span>
                    <div className="font-display font-bold text-lg text-[#EDE7DC]">
                      {selectedDayInfo.dayOfWeek}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {selectedDayInfo.isBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-950/80 text-red-400 border border-red-500/40">
                          Studio Blocked / Holiday
                        </span>
                      ) : !selectedDayInfo.isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/40">
                          Studio Closed (Off-day)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          Studio Open
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleBlockDateDirect(selectedCalendarDate)}
                        className="cursor-pointer text-xs text-[#E8913C] hover:underline font-semibold ml-auto"
                      >
                        {selectedDayInfo.isBlocked ? 'Unblock Date' : 'Block Date'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-4 md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8]">
                        Daily Student Capacity
                      </span>
                      <span className="font-mono text-xs font-bold text-[#EDE7DC]">
                        {selectedDayInfo.count} / {selectedDayInfo.maxCapacity} students booked
                      </span>
                    </div>

                    <div className="w-full bg-[#0A0C0E] h-2.5 rounded-full overflow-hidden border border-[rgba(237,231,220,0.08)]">
                      <div
                        className={`h-full transition-all rounded-full ${
                          selectedDayInfo.isFull 
                            ? 'bg-red-500' 
                            : selectedDayInfo.count >= selectedDayInfo.maxCapacity * 0.7 
                            ? 'bg-[#E8913C]' 
                            : 'bg-emerald-400'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((selectedDayInfo.count / (selectedDayInfo.maxCapacity || 1)) * 100))}%`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7E858A]">
                      <span>Limit configured in Calendar Settings: {selectedDayInfo.maxCapacity} max students/day</span>
                      {selectedDayInfo.isFull && (
                        <span className="text-red-400 font-bold uppercase tracking-wider">Full Capacity (Locked to new bookings)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booked Students for This Day with Attendance, Cancel, and Move (Requirement A) */}
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                        Lessons Scheduled for {selectedDayInfo.dayOfWeek}
                      </h3>
                      <p className="text-xs text-[#9EA5A8]">
                        Manage lesson attendance, reschedule, or cancel bookings directly from the master schedule
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#E8913C] bg-[#E8913C]/10 border border-[#E8913C]/30 px-3 py-1 rounded-full">
                      {selectedDayInfo.count} Booked
                    </span>
                  </div>

                  {selectedDayInfo.bookedOnThisDay.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#9EA5A8] border border-dashed border-[rgba(237,231,220,0.1)] rounded-xl">
                      {selectedDayInfo.isBlocked 
                        ? 'This date is marked as blocked (studio holiday / personal leave).' 
                        : !selectedDayInfo.isOpen 
                        ? 'The studio is regularly closed on this weekday.' 
                        : 'No students booked for this day yet.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {selectedDayInfo.bookedOnThisDay.map(({ student, time, lengthMinutes, isRescheduled, originalDate, attendanceStatus }) => (
                        <div
                          key={student.id + time}
                          className="p-4 rounded-xl bg-[#161A20] border border-[rgba(237,231,220,0.1)] hover:border-[#E8913C] transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-display font-bold text-base text-[#EDE7DC]">
                                  {student.name}
                                </h4>
                                {isRescheduled && (
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#E8913C]/15 text-[#E8913C] border border-[#E8913C]/40 uppercase tracking-wider">
                                    Rescheduled
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#9EA5A8] mt-0.5">
                                {student.instrument} · {student.sessionLength || `${lengthMinutes} min`} ({student.frequency})
                              </p>
                            </div>

                            <span className="font-mono text-sm font-bold text-[#E8913C] bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] px-2.5 py-1 rounded-lg">
                              {time}
                            </span>
                          </div>

                          {isRescheduled && originalDate && (
                            <p className="text-[11px] text-[#E8913C] italic">
                              Occurrence shifted from original date: {originalDate}
                            </p>
                          )}

                          {/* Attendance Status Badge */}
                          {attendanceStatus && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[#9EA5A8]">Attendance status:</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                                attendanceStatus === 'attended' || attendanceStatus === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : attendanceStatus === 'missed'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {attendanceStatus}
                              </span>
                            </div>
                          )}

                          {/* Admin Calendar Action Buttons (Requirement A) */}
                          <div className="pt-2 border-t border-[rgba(237,231,220,0.06)] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleMarkAttendanceFromCalendar(student.id, selectedCalendarDate, time, 'attended')}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                              >
                                Attended
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAttendanceFromCalendar(student.id, selectedCalendarDate, time, 'missed')}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                              >
                                Missed
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelLessonFromCalendar(student.id, selectedCalendarDate, time)}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenMoveLesson(student.id, student.name, selectedCalendarDate, time)}
                                className="cursor-pointer px-2.5 py-1 rounded-lg bg-[#E8913C]/15 hover:bg-[#E8913C]/25 border border-[#E8913C]/40 text-[#E8913C] text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Move className="w-3 h-3" />
                                <span>Move</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedStudentProfile(student)}
                              className="cursor-pointer text-xs text-[#EDE7DC] hover:text-[#E8913C] font-medium flex items-center gap-1 transition-colors"
                            >
                              <span>Profile</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENROLLED STUDENTS DIRECTORY (REQUIREMENT C & D) */}
        {activeMainTab === 'students' && (() => {
          const filteredStudents = students.filter(student => {
            // Search filter
            if (studentSearchQuery.trim()) {
              const q = studentSearchQuery.toLowerCase();
              const matchName = student.name?.toLowerCase().includes(q);
              const matchEmail = student.email?.toLowerCase().includes(q);
              const matchPhone = student.phone?.toLowerCase().includes(q);
              const matchInstrument = student.instrument?.toLowerCase().includes(q);
              if (!matchName && !matchEmail && !matchPhone && !matchInstrument) return false;
            }

            // Status & Payment filters
            const paySummary = computeStudentPaymentSummary(student, siteSettings.ratePer30Min);
            if (studentFilter === 'approved' && student.approvalStatus !== 'approved') return false;
            if (studentFilter === 'pending' && student.approvalStatus !== 'pending') return false;
            if (studentFilter === 'paid' && paySummary.paymentStatus !== 'paid') return false;
            if (studentFilter === 'unpaid' && paySummary.paymentStatus !== 'unpaid') return false;

            return true;
          });

          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
                    Enrolled Students Directory ({students.length})
                  </h2>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Student profiles, weekly schedules, attendance records, and payment logs
                  </p>
                </div>
              </div>

              {/* Search and Filters Bar (Requirement C) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9EA5A8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by student name, email, phone, or course..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.12)] focus:border-[#E8913C] rounded-xl pl-9 pr-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-[#9EA5A8] hover:text-[#EDE7DC]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters Pills (approved, pending, paid, unpaid) */}
                <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0A0C0E] p-1 rounded-xl border border-[rgba(237,231,220,0.08)]">
                  <button
                    type="button"
                    onClick={() => setStudentFilter('all')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      studentFilter === 'all'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('approved')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      studentFilter === 'approved'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('pending')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      studentFilter === 'pending'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('paid')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      studentFilter === 'paid'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('unpaid')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      studentFilter === 'unpaid'
                        ? 'bg-[#E8913C] text-[#0A0C0E]'
                        : 'text-[#9EA5A8] hover:text-[#EDE7DC]'
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-12 text-center space-y-3">
                  <UserCheck className="w-8 h-8 text-[#6C7378] mx-auto" />
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">
                    {students.length === 0 ? 'No Enrolled Students Yet' : 'No Students Matching Search or Filter'}
                  </h3>
                  <p className="text-xs text-[#9EA5A8] max-w-md mx-auto">
                    {students.length === 0
                      ? 'When you approve a booking inquiry or when students register, they will appear in this directory.'
                      : 'Try adjusting your search keywords or resetting your filter tabs.'}
                  </p>
                  {studentSearchQuery || studentFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearchQuery('');
                        setStudentFilter('all');
                      }}
                      className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[#E8913C] hover:underline font-semibold mt-2"
                    >
                      Reset Filters
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => {
                    const paySummary = computeStudentPaymentSummary(student, siteSettings.ratePer30Min);

                    return (
                      <div
                        key={student.id}
                        className="bg-[#101317] border border-[rgba(237,231,220,0.13)] hover:border-[rgba(237,231,220,0.25)] rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Student Header */}
                          <div className="flex items-start justify-between gap-3 border-b border-[rgba(237,231,220,0.06)] pb-3">
                            <div>
                              <h4 className="font-display font-bold text-base text-[#EDE7DC]">
                                {student.name}
                              </h4>
                              <p className="text-xs text-[#E8913C] font-semibold mt-0.5">
                                {student.instrument} · {student.sessionLength || '60 min'} ({student.frequency})
                              </p>
                            </div>

                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                              paySummary.paymentStatus === 'paid'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                            }`}>
                              {paySummary.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>

                          {/* Student Details Grid */}
                          <div className="space-y-1.5 text-xs text-[#9EA5A8]">
                            <div className="flex items-center justify-between">
                              <span className="text-[#6C7378]">Email:</span>
                              <span className="text-[#EDE7DC] truncate max-w-[180px] font-mono">{student.email}</span>
                            </div>
                            {student.phone && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#6C7378]">Phone:</span>
                                <span className="text-[#EDE7DC] font-mono">{student.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[#6C7378]">Monthly Tuition:</span>
                              <span className="text-[#E8913C] font-bold font-mono">
                                {paySummary.monthlyTuition} TND
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#6C7378]">Paid / Due:</span>
                              <span className="text-[#EDE7DC] font-mono">
                                {paySummary.totalPaid} TND / {paySummary.amountDue} TND
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#6C7378]">Schedule:</span>
                              <span className="text-[#EDE7DC] truncate max-w-[180px]">
                                {student.daysLocked 
                                  ? (student.isDaily ? 'Daily (Mon-Sat)' : student.selectedWeeklyDays?.join(', '))
                                  : 'Pending day selection'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="pt-3 border-t border-[rgba(237,231,220,0.06)] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Email verified indicator */}
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              student.emailVerified
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {student.emailVerified ? 'Verified ✓' : 'Unverified ⚠'}
                            </span>

                            {/* Approval actions if pending */}
                            {student.approvalStatus === 'pending' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleApproveStudent(student.id, student.requestId)}
                                  className="cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectStudent(student.id, student.requestId)}
                                  className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Generate Invoice Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceStudent(student)}
                              className="cursor-pointer text-xs font-semibold text-[#9EA5A8] hover:text-[#EDE7DC] flex items-center gap-1 p-1 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[#EDE7DC] transition-colors"
                              title="Generate Official Tuition Statement"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#E8913C]" />
                              <span>Invoice</span>
                            </button>

                            {/* View Profile Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenStudentProfile(student)}
                              className="cursor-pointer text-xs font-semibold text-[#E8913C] hover:underline flex items-center gap-1"
                            >
                              <span>Profile</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 5: CALENDAR & STUDIO SETTINGS (REQUIREMENT 4) */}
        {activeMainTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
              <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
                Studio & Calendar Configuration
              </h2>
              <p className="text-xs text-[#9EA5A8] mt-1">
                Configure open weekdays, working hours, student capacity limits, and blocked dates with live sync to student portals.
              </p>
            </div>

            {/* CONNECTION CHECK CARD (REQUIREMENT A) */}
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(237,231,220,0.08)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#E8913C]" />
                    <h3 className="font-display font-bold text-base text-[#EDE7DC]">Firebase Connection Check</h3>
                  </div>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    Verifies Firebase environment variables, Firestore read accessibility, Storage connectivity, and authentication providers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  disabled={runningDiagnostics}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningDiagnostics ? 'animate-spin' : ''}`} />
                  <span>{runningDiagnostics ? 'Checking...' : 'Run Diagnostics'}</span>
                </button>
              </div>

              {!diagnostics && !runningDiagnostics && (
                <div className="py-4 text-center">
                  <button
                    type="button"
                    onClick={handleRunDiagnostics}
                    className="cursor-pointer text-xs text-[#E8913C] hover:underline font-semibold"
                  >
                    Click to test live Firebase connectivity
                  </button>
                </div>
              )}

              {diagnostics && (
                <div className="space-y-4">
                  {/* Environment variables grid */}
                  <div>
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] mb-2 font-bold">
                      Environment Variables ({diagnostics.envVars.filter(v => v.present).length} / {diagnostics.envVars.length} Configured)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {diagnostics.envVars.map((v) => (
                        <div
                          key={v.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            v.present 
                              ? 'bg-[#0A0C0E] border-emerald-500/30 text-[#EDE7DC]' 
                              : 'bg-red-950/20 border-red-500/30 text-red-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {v.present ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            )}
                            <span className="font-mono text-[11px] truncate">{v.key}</span>
                          </div>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            v.present ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400 font-bold'
                          }`}>
                            {v.present ? 'Present' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services status cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* Firestore Read Test */}
                    <div className={`p-4 rounded-xl border space-y-1.5 ${
                      diagnostics.firestore.ok 
                        ? 'bg-emerald-950/15 border-emerald-500/30' 
                        : 'bg-red-950/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#EDE7DC]">Firestore Read</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diagnostics.firestore.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {diagnostics.firestore.ok ? 'Green / OK' : 'Red / Failed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9EA5A8] leading-tight">
                        {diagnostics.firestore.message}
                      </p>
                      {diagnostics.firestore.code && (
                        <span className="font-mono text-[9px] text-red-400 block">[{diagnostics.firestore.code}]</span>
                      )}
                    </div>

                    {/* Storage Bucket Test */}
                    <div className={`p-4 rounded-xl border space-y-1.5 ${
                      diagnostics.storage.ok 
                        ? 'bg-emerald-950/15 border-emerald-500/30' 
                        : 'bg-red-950/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#EDE7DC]">Storage Bucket</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diagnostics.storage.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {diagnostics.storage.ok ? 'Green / OK' : 'Red / Failed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9EA5A8] leading-tight truncate">
                        {diagnostics.storage.message}
                      </p>
                      {diagnostics.storage.code && (
                        <span className="font-mono text-[9px] text-red-400 block">[{diagnostics.storage.code}]</span>
                      )}
                    </div>

                    {/* Sign-in Providers */}
                    <div className="p-4 rounded-xl border bg-emerald-950/15 border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#EDE7DC]">Sign-In Providers</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          Green / Active
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-[#9EA5A8]">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Email & Password</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Google Sign-In Popup</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Open Days of the Week */}
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#EDE7DC]">Open Days for Lessons</h3>
                <p className="text-xs text-[#9EA5A8]">
                  Select the weekdays the Ben Arous studio is available for student lesson reservations.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ALL_DAYS.map((day) => {
                  const isOpen = calendarSettings.openDays?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleOpenDay(day)}
                      className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isOpen 
                          ? 'border-[#E8913C] bg-[#161B22] text-[#EDE7DC]'
                          : 'border-[rgba(237,231,220,0.1)] text-[#6C7378] hover:border-[rgba(237,231,220,0.2)]'
                      }`}
                    >
                      <span className="text-xs font-semibold">{day}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${
                        isOpen ? 'bg-[#E8913C] text-[#0A0C0E]' : 'border border-[rgba(237,231,220,0.2)]'
                      }`}>
                        {isOpen && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Working Hours per Day & Max Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">Daily Working Hours</h3>
                  <p className="text-xs text-[#9EA5A8]">
                    Start and closing hours for studio teaching appointments.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#9EA5A8] block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={calendarSettings.startHour || '09:00'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const updated = { ...calendarSettings, startHour: val };
                        setCalendarSettings(updated);
                        await updateCalendarSettings({ startHour: val });
                      }}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#9EA5A8] block mb-1">End Time</label>
                    <input
                      type="time"
                      value={calendarSettings.endHour || '19:00'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const updated = { ...calendarSettings, endHour: val };
                        setCalendarSettings(updated);
                        await updateCalendarSettings({ endHour: val });
                      }}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Maximum Students Per Day */}
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">Daily Capacity Limit</h3>
                  <p className="text-xs text-[#9EA5A8]">
                    Maximum students allowed per day before day locks as full.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={calendarSettings.maxStudentsPerDay || 5}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value, 10) || 5;
                      const updated = { ...calendarSettings, maxStudentsPerDay: val };
                      setCalendarSettings(updated);
                      await updateCalendarSettings({ maxStudentsPerDay: val });
                    }}
                    className="w-24 bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-4 py-2 text-sm font-mono font-bold text-[#E8913C] outline-none"
                  />
                  <span className="text-xs text-[#EDE7DC] font-medium">Students max per day</span>
                </div>
              </div>

              {/* Minimum Notice for Rescheduling (Requirement B & A) */}
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">Minimum Reschedule Notice</h3>
                  <p className="text-xs text-[#9EA5A8]">
                    Minimum advance notice in hours required before a student can reschedule a lesson.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={calendarSettings.minNoticeHours !== undefined ? calendarSettings.minNoticeHours : 12}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value, 10) || 12;
                      const updated = { ...calendarSettings, minNoticeHours: val };
                      setCalendarSettings(updated);
                      await updateCalendarSettings({ minNoticeHours: val });
                    }}
                    className="w-24 bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-4 py-2 text-sm font-mono font-bold text-[#E8913C] outline-none"
                  />
                  <span className="text-xs text-[#EDE7DC] font-medium">Hours in advance (default: 12h)</span>
                </div>
              </div>

              {/* Allowed Lesson Lengths (Requirement B) */}
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">Available Lesson Lengths</h3>
                  <p className="text-xs text-[#9EA5A8]">
                    Supported session durations offered to enrolled students.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['30 min', '45 min', '60 min', '90 min', '120 min'].map((len) => {
                    const activeLengths = calendarSettings.lessonLengths || ['30 min', '45 min', '60 min', '90 min'];
                    const isSelected = activeLengths.includes(len);

                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={async () => {
                          const updatedLengths = isSelected
                            ? activeLengths.filter(l => l !== len)
                            : [...activeLengths, len];
                          const updated = { ...calendarSettings, lessonLengths: updatedLengths };
                          setCalendarSettings(updated);
                          await updateCalendarSettings({ lessonLengths: updatedLengths });
                        }}
                        className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#E8913C]/20 border-[#E8913C] text-[#E8913C]'
                            : 'border-[rgba(237,231,220,0.1)] text-[#6C7378] hover:border-[rgba(237,231,220,0.2)]'
                        }`}
                      >
                        {len} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Block Specific Dates (Holidays / Travel) */}
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#EDE7DC]">Block Specific Dates (Holidays / Absence)</h3>
                <p className="text-xs text-[#9EA5A8]">
                  Dates blocked here are immediately unavailable to students for lessons or rescheduling.
                </p>
              </div>

              <div className="flex items-center gap-3 max-w-md">
                <input
                  type="date"
                  value={newBlockedDateInput}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewBlockedDateInput(e.target.value)}
                  className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={handleBlockDate}
                  disabled={!newBlockedDateInput}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-semibold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all"
                >
                  Block Date
                </button>
              </div>

              {/* Blocked Dates List */}
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase text-[#6C7378] tracking-wider block mb-2">
                  Currently Blocked Dates ({calendarSettings.blockedDates?.length || 0}):
                </span>

                {(!calendarSettings.blockedDates || calendarSettings.blockedDates.length === 0) ? (
                  <p className="text-xs text-[#6C7378] italic">No dates blocked.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {calendarSettings.blockedDates.map((dateISO) => (
                      <span
                        key={dateISO}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 font-mono"
                      >
                        <span>{dateISO}</span>
                        <button
                          type="button"
                          onClick={() => handleUnblockDate(dateISO)}
                          className="cursor-pointer text-red-400 hover:text-red-200"
                          title="Unblock date"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: COURSE LIBRARY MANAGER (REQUIREMENT 3a) */}
        {activeMainTab === 'library' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(237,231,220,0.1)] pb-5">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC] flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-[#E8913C]" />
                  <span>{currentLang === 'fr' ? 'Gestion Médiathèque & Cours' : 'Course Library Manager'}</span>
                </h2>
                <p className="text-xs text-[#9EA5A8] mt-1">
                  {currentLang === 'fr' 
                    ? 'Ajoutez, modifiez et supprimez des cours, partitions PDF, audios et masterclasses pour vos élèves.' 
                    : 'Curate masterclass repertoire, sheet music PDFs, audio exercises, and courses for enrolled students.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateCourse}
                className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#E8913C]/10 self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{currentLang === 'fr' ? 'Nouveau Cours' : 'Create New Course'}</span>
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-4">
                <span className="text-[10px] uppercase font-mono text-[#9EA5A8] block mb-1">
                  {currentLang === 'fr' ? 'Total Cours' : 'Total Courses'}
                </span>
                <span className="text-2xl font-display font-extrabold text-[#EDE7DC]">
                  {libraryCourses.length}
                </span>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-4">
                <span className="text-[10px] uppercase font-mono text-emerald-400 block mb-1">
                  {currentLang === 'fr' ? 'Publiés / Nouveaux' : 'Published / New'}
                </span>
                <span className="text-2xl font-display font-extrabold text-emerald-400">
                  {libraryCourses.filter(c => c.status === 'published' || c.status === 'new').length}
                </span>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-4">
                <span className="text-[10px] uppercase font-mono text-amber-400 block mb-1">
                  {currentLang === 'fr' ? 'Brouillons (Admin)' : 'Drafts (Private)'}
                </span>
                <span className="text-2xl font-display font-extrabold text-amber-400">
                  {libraryCourses.filter(c => c.status === 'draft').length}
                </span>
              </div>
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-4">
                <span className="text-[10px] uppercase font-mono text-[#E8913C] block mb-1">
                  {currentLang === 'fr' ? 'Ressources Pédagogiques' : 'Learning Resources'}
                </span>
                <span className="text-2xl font-display font-extrabold text-[#E8913C]">
                  {libraryCourses.reduce((sum, c) => sum + (c.materials?.length || 0), 0)}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7378]" />
                <input
                  type="text"
                  placeholder={currentLang === 'fr' ? 'Rechercher un cours par titre, instrument, niveau...' : 'Search courses by title, instrument, level...'}
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl pl-9 pr-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                  className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                >
                  <option value="all">{currentLang === 'fr' ? 'Tous les statuts' : 'All Statuses'}</option>
                  <option value="published">{currentLang === 'fr' ? 'Publiés' : 'Published'}</option>
                  <option value="new">{currentLang === 'fr' ? 'Nouveaux' : 'New'}</option>
                  <option value="coming_soon">{currentLang === 'fr' ? 'Bientôt disponible' : 'Coming Soon'}</option>
                  <option value="draft">{currentLang === 'fr' ? 'Brouillons' : 'Draft'}</option>
                </select>
              </div>
            </div>

            {/* Courses Grid */}
            {(() => {
              const filteredCourses = libraryCourses.filter(c => {
                const q = courseSearchQuery.toLowerCase();
                const matchesSearch = !courseSearchQuery ||
                  (c.title && c.title.toLowerCase().includes(q)) ||
                  (c.titleFr && c.titleFr.toLowerCase().includes(q)) ||
                  (c.instrument && c.instrument.toLowerCase().includes(q)) ||
                  (c.level && c.level.toLowerCase().includes(q));
                const matchesStatus = courseStatusFilter === 'all' || c.status === courseStatusFilter;
                return matchesSearch && matchesStatus;
              });

              if (filteredCourses.length === 0) {
                return (
                  <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-12 text-center space-y-3">
                    <BookOpen className="w-10 h-10 mx-auto text-[#6C7378]" />
                    <h4 className="font-display font-bold text-base text-[#EDE7DC]">
                      {currentLang === 'fr' ? 'Aucun cours trouvé' : 'No courses found'}
                    </h4>
                    <p className="text-xs text-[#9EA5A8] max-w-sm mx-auto">
                      {courseSearchQuery || courseStatusFilter !== 'all'
                        ? (currentLang === 'fr' ? 'Essayez de modifier vos critères de recherche.' : 'Try adjusting your search query or filter.')
                        : (currentLang === 'fr' ? 'Créez votre premier cours avec ses partitions et masterclasses.' : 'Create your first course curriculum with attached scores and masterclasses.')}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreateCourse}
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all"
                    >
                      {currentLang === 'fr' ? 'Créer un Cours' : 'Create Course'}
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCourses.map((course) => {
                    const isAllStudents = !course.accessStudentIds || course.accessStudentIds.length === 0 || course.accessStudentIds.includes('*');
                    const displayTitle = currentLang === 'fr' && course.titleFr ? course.titleFr : course.title;
                    const altTitle = currentLang === 'fr' ? course.title : course.titleFr;
                    const materialsCount = course.materials?.length || 0;

                    return (
                      <div
                        key={course.id}
                        className="bg-[#101317] border border-[rgba(237,231,220,0.12)] hover:border-[#E8913C]/40 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group"
                      >
                        <div>
                          {/* Banner / Cover */}
                          <div className="relative h-40 bg-[#161B22] overflow-hidden">
                            {course.coverImage ? (
                              <img
                                src={course.coverImage}
                                alt={displayTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#161B22] to-[#0A0C0E]">
                                <BookOpen className="w-10 h-10 text-[rgba(237,231,220,0.15)]" />
                              </div>
                            )}

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                              {course.status === 'published' && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/80 text-[#0A0C0E]">
                                  {currentLang === 'fr' ? 'PUBLIÉ' : 'PUBLISHED'}
                                </span>
                              )}
                              {course.status === 'new' && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/80 text-white">
                                  {currentLang === 'fr' ? 'NOUVEAU' : 'NEW'}
                                </span>
                              )}
                              {course.status === 'coming_soon' && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/80 text-[#0A0C0E]">
                                  {currentLang === 'fr' ? 'BIENTÔT' : 'COMING SOON'}
                                </span>
                              )}
                              {course.status === 'draft' && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-700/90 text-slate-200 border border-slate-500">
                                  {currentLang === 'fr' ? 'BROUILLON (PRIVÉ)' : 'DRAFT (PRIVATE)'}
                                </span>
                              )}
                            </div>

                            {/* Access Badge */}
                            <div className="absolute top-3 right-3">
                              {isAllStudents ? (
                                <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-mono font-semibold">
                                  <Unlock className="w-3 h-3" />
                                  <span>{currentLang === 'fr' ? 'Tous les élèves' : 'All students'}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[10px] font-mono font-semibold">
                                  <Lock className="w-3 h-3" />
                                  <span>{course.accessStudentIds?.length || 0} {currentLang === 'fr' ? 'élèves' : 'student(s)'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 sm:p-5 space-y-3">
                            <div>
                              <div className="flex items-center gap-2 text-[10px] text-[#E8913C] font-mono font-semibold uppercase tracking-wider mb-1">
                                <span>{course.instrument || 'Piano'}</span>
                                <span>•</span>
                                <span>{course.level || 'All Levels'}</span>
                              </div>
                              <h3 className="font-display font-bold text-base text-[#EDE7DC] line-clamp-1">
                                {displayTitle}
                              </h3>
                              {altTitle && altTitle !== displayTitle && (
                                <p className="text-[11px] text-[#6C7378] italic line-clamp-1">
                                  {altTitle}
                                </p>
                              )}
                            </div>

                            <p className="text-xs text-[#9EA5A8] line-clamp-2 leading-relaxed">
                              {(currentLang === 'fr' && course.descriptionFr) ? course.descriptionFr : course.description}
                            </p>

                            {/* Materials Attached List */}
                            <div className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.06)] rounded-xl p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-[#6C7378] font-mono">
                                <span>{currentLang === 'fr' ? 'Ressources attachées' : 'Attached Materials'}</span>
                                <span className="text-[#EDE7DC] font-bold">{materialsCount}</span>
                              </div>

                              {materialsCount > 0 ? (
                                <div className="space-y-1 pt-1 border-t border-[rgba(237,231,220,0.04)]">
                                  {course.materials?.slice(0, 3).map((mat) => (
                                    <div key={mat.id} className="flex items-center gap-2 text-[11px] text-[#9EA5A8] truncate">
                                      {mat.type === 'video' && <Video className="w-3 h-3 text-[#E8913C] shrink-0" />}
                                      {mat.type === 'pdf' && <FileText className="w-3 h-3 text-red-400 shrink-0" />}
                                      {mat.type === 'sheet_music' && <Music className="w-3 h-3 text-emerald-400 shrink-0" />}
                                      {mat.type === 'audio' && <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />}
                                      {mat.type === 'link' && <LinkIcon className="w-3 h-3 text-blue-400 shrink-0" />}
                                      <span className="truncate">{mat.title}</span>
                                    </div>
                                  ))}
                                  {materialsCount > 3 && (
                                    <span className="text-[10px] text-[#6C7378] block pt-0.5">
                                      + {materialsCount - 3} {currentLang === 'fr' ? 'autres ressources' : 'more materials'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#6C7378] italic block">
                                  {currentLang === 'fr' ? 'Aucune ressource pour le moment' : 'No materials attached yet'}
                                </span>
                              )}
                            </div>

                            {/* Price / Enrollment */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-[#6C7378]">{currentLang === 'fr' ? 'Tarif :' : 'Tuition:'}</span>
                              <span className="font-mono font-bold text-[#EDE7DC]">
                                {course.price && course.price > 0 
                                  ? `${course.price} TND` 
                                  : (currentLang === 'fr' ? 'Inclus dans les cours' : 'Included in lessons')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 sm:p-5 pt-0 border-t border-[rgba(237,231,220,0.06)] flex items-center justify-between gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCourse(course)}
                            className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-xl bg-[rgba(237,231,220,0.08)] hover:bg-[rgba(237,231,220,0.15)] text-[#EDE7DC] flex items-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#E8913C]" />
                            <span>{currentLang === 'fr' ? 'Modifier' : 'Edit & Materials'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLibraryCourse(course.id)}
                            className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{currentLang === 'fr' ? 'Supprimer' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: COMMUNITY CHAT MODERATION (REQUIREMENT 3b) */}
        {activeMainTab === 'community' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(237,231,220,0.1)] pb-5">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC] flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-[#E8913C]" />
                  <span>{currentLang === 'fr' ? 'Modération de la Communauté & Chat' : 'Community Chat Moderation'}</span>
                </h2>
                <p className="text-xs text-[#9EA5A8] mt-1">
                  {currentLang === 'fr'
                    ? 'Supervisez les échanges, publiez vos annonces professeur, supprimez les messages et gérez les droits de publication des élèves.'
                    : 'Read live messages, post teacher announcements, delete any message, and manage student privileges.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400 font-semibold uppercase">
                  {communityMessages.length} {currentLang === 'fr' ? 'messages' : 'messages'}
                </span>
              </div>
            </div>

            {/* Split layout: Feed + Student Moderation Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Chat Feed & Teacher Composer (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                {/* Teacher Announcement Composer */}
                <div className="bg-[#101317] border border-[#E8913C]/30 rounded-2xl p-4 sm:p-5 shadow-xl shadow-[#E8913C]/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded bg-[#E8913C] text-[#0A0C0E] text-[10px] font-mono font-bold uppercase tracking-wider">
                      {currentLang === 'fr' ? 'Annonce Professeur' : 'Teacher Announcement'}
                    </span>
                    <span className="text-xs text-[#EDE7DC] font-semibold">
                      Mohamed Mimouni
                    </span>
                  </div>

                  <form onSubmit={handleTeacherPostMessage} className="space-y-3">
                    <textarea
                      rows={2}
                      value={teacherChatText}
                      onChange={(e) => setTeacherChatText(e.target.value)}
                      placeholder={currentLang === 'fr' 
                        ? 'Rédiger une annonce officielle pour les élèves (devoirs, audition, masterclass, conseils de pratique)...' 
                        : 'Write an official teacher announcement or update for all students...'}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.12)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none resize-none"
                    />

                    {/* Image Preview */}
                    {teacherChatImagePreview && (
                      <div className="relative inline-block border border-[rgba(237,231,220,0.2)] rounded-xl overflow-hidden bg-black max-w-xs">
                        <img
                          src={teacherChatImagePreview}
                          alt="Attachment Preview"
                          className="h-28 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherChatImage(null);
                            if (teacherChatImagePreview) URL.revokeObjectURL(teacherChatImagePreview);
                            setTeacherChatImagePreview(null);
                            if (teacherImageInputRef.current) teacherImageInputRef.current.value = '';
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-red-400 hover:text-red-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div>
                        <input
                          ref={teacherImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              alert(currentLang === 'fr' ? 'L\'image ne peut pas dépasser 10 Mo' : 'Image cannot exceed 10 MB');
                              return;
                            }
                            setTeacherChatImage(file);
                            setTeacherChatImagePreview(URL.createObjectURL(file));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => teacherImageInputRef.current?.click()}
                          className="cursor-pointer text-xs text-[#9EA5A8] hover:text-[#EDE7DC] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(237,231,220,0.1)] hover:border-[rgba(237,231,220,0.2)] transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#E8913C]" />
                          <span>{teacherChatImage ? (currentLang === 'fr' ? 'Changer l\'image' : 'Change Image') : (currentLang === 'fr' ? 'Joindre une photo' : 'Attach Photo')}</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={postingTeacherMsg || (!teacherChatText.trim() && !teacherChatImage)}
                        className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        {postingTeacherMsg ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{currentLang === 'fr' ? 'Envoi...' : 'Posting...'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{currentLang === 'fr' ? 'Publier en Professeur' : 'Post as Teacher'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Messages Feed Container */}
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-4 sm:p-5 flex flex-col h-[650px]">
                  {/* Feed Search & Role Filter */}
                  <div className="flex items-center gap-3 pb-3 border-b border-[rgba(237,231,220,0.08)] mb-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7378]" />
                      <input
                        type="text"
                        placeholder={currentLang === 'fr' ? 'Filtrer les messages par auteur ou texte...' : 'Filter messages by author or text...'}
                        value={communitySearchQuery}
                        onChange={(e) => setCommunitySearchQuery(e.target.value)}
                        className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>
                    <select
                      value={communityFilterRole}
                      onChange={(e) => setCommunityFilterRole(e.target.value as any)}
                      className="bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-lg px-2.5 py-1.5 text-xs text-[#EDE7DC] outline-none"
                    >
                      <option value="all">{currentLang === 'fr' ? 'Tous les rôles' : 'All Roles'}</option>
                      <option value="teacher">{currentLang === 'fr' ? 'Professeur seul' : 'Teacher Only'}</option>
                      <option value="student">{currentLang === 'fr' ? 'Élèves seuls' : 'Students Only'}</option>
                    </select>
                  </div>

                  {/* Messages Stream */}
                  {(() => {
                    const filtered = communityMessages.filter((msg) => {
                      const q = communitySearchQuery.toLowerCase();
                      const matchesText = !communitySearchQuery ||
                        (msg.authorName && msg.authorName.toLowerCase().includes(q)) ||
                        (msg.text && msg.text.toLowerCase().includes(q));
                      const matchesRole = communityFilterRole === 'all' || msg.authorRole === communityFilterRole;
                      return matchesText && matchesRole;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-xs text-[#6C7378]">
                          <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                          <span>{currentLang === 'fr' ? 'Aucun message ne correspond à vos filtres.' : 'No messages match your filters.'}</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                        {filtered.map((msg) => {
                          const isTeacher = msg.authorRole === 'teacher';
                          const authorStudent = !isTeacher ? students.find(s => s.id === msg.studentId || s.authUid === msg.studentId) : null;
                          const isMuted = authorStudent?.isMuted;

                          return (
                            <div
                              key={msg.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isTeacher 
                                  ? 'bg-[#E8913C]/8 border-[#E8913C]/35' 
                                  : 'bg-[#0A0C0E] border-[rgba(237,231,220,0.08)]'
                              }`}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2.5">
                                  {msg.authorPhotoUrl ? (
                                    <img
                                      src={msg.authorPhotoUrl}
                                      alt={msg.authorName}
                                      className="w-7 h-7 rounded-full object-cover border border-[rgba(237,231,220,0.15)]"
                                    />
                                  ) : (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isTeacher ? 'bg-[#E8913C] text-[#0A0C0E]' : 'bg-[#161B22] text-[#EDE7DC]'
                                    }`}>
                                      {msg.authorName.charAt(0).toUpperCase()}
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#EDE7DC]">
                                        {msg.authorName}
                                      </span>
                                      {isTeacher ? (
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#E8913C] text-[#0A0C0E]">
                                          TEACHER
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                          STUDENT
                                        </span>
                                      )}
                                      {isMuted && (
                                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                          MUTED
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#6C7378]">
                                      {typeof msg.createdAt === 'string' 
                                        ? msg.createdAt.split('T')[0] 
                                        : msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Message Moderation Actions: Delete ANY message, Mute student */}
                                <div className="flex items-center gap-1.5">
                                  {!isTeacher && msg.studentId && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStudentMute(msg.studentId, !isMuted)}
                                      className={`cursor-pointer px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-colors border ${
                                        isMuted
                                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                                      }`}
                                      title={isMuted ? 'Unmute student posting' : 'Mute student from posting'}
                                    >
                                      {isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                      <span>{isMuted ? (currentLang === 'fr' ? 'Rétablir' : 'Unmute') : (currentLang === 'fr' ? 'Suspendre' : 'Mute')}</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCommunityMessage(msg.id)}
                                    className="cursor-pointer p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors"
                                    title={currentLang === 'fr' ? 'Supprimer ce message' : 'Delete message'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Body Text */}
                              {msg.text && (
                                <p className="text-xs text-[#EDE7DC] whitespace-pre-wrap leading-relaxed pl-9.5">
                                  {msg.text}
                                </p>
                              )}

                              {/* Attached Photo */}
                              {msg.imageUrl && (
                                <div className="mt-2 pl-9.5">
                                  <a
                                    href={msg.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <img
                                      src={msg.imageUrl}
                                      alt="Chat Attachment"
                                      className="rounded-xl border border-[rgba(237,231,220,0.1)] max-h-48 max-w-full object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Student Privileges & Moderation (4 cols) */}
              <div className="lg:col-span-4 bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E8913C]" />
                    <span>{currentLang === 'fr' ? 'Droits des Élèves & Modération' : 'Student Moderation Panel'}</span>
                  </h3>
                  <p className="text-xs text-[#9EA5A8] mt-1">
                    {currentLang === 'fr'
                      ? 'Suspendre ou rétablir le droit de publication des élèves inscrits dans le chat.'
                      : 'Mute or unmute student chat privileges at any time.'}
                  </p>
                </div>

                {/* Quick Student Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7378]" />
                  <input
                    type="text"
                    placeholder={currentLang === 'fr' ? 'Rechercher un élève...' : 'Filter students by name...'}
                    value={studentAccessSearch}
                    onChange={(e) => setStudentAccessSearch(e.target.value)}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                {/* Students List */}
                <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                  {students
                    .filter(s => !studentAccessSearch || s.name.toLowerCase().includes(studentAccessSearch.toLowerCase()) || s.email.toLowerCase().includes(studentAccessSearch.toLowerCase()))
                    .map((s) => {
                      const isMuted = s.isMuted === true;

                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.06)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate">
                            <div className="font-bold text-[#EDE7DC] truncate">{s.name}</div>
                            <div className="text-[10px] text-[#6C7378] truncate">{s.instrument} · {s.email}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              isMuted
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {isMuted ? 'MUTED' : 'ACTIVE'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleStudentMute(s.id, !isMuted)}
                              disabled={mutingStudentId === s.id}
                              className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                isMuted
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                              <span>{isMuted ? (currentLang === 'fr' ? 'Rétablir' : 'Unmute') : (currentLang === 'fr' ? 'Suspendre' : 'Mute')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="p-3 rounded-xl bg-[#0A0C0E]/50 border border-[rgba(237,231,220,0.05)] text-[11px] text-[#6C7378] leading-relaxed">
                  {currentLang === 'fr'
                    ? 'Note : Les élèves suspendus peuvent toujours lire les messages et accéder à leurs cours, mais ne peuvent plus poster.'
                    : 'Note: Muted students can still read all studio messages and access library courses, but cannot send new posts.'}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: COURSE & CURRICULUM MATERIALS EDITOR (REQUIREMENT 3a) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.2)] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[rgba(237,231,220,0.1)] pb-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-[#EDE7DC] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#E8913C]" />
                  <span>
                    {editingCourseId 
                      ? (currentLang === 'fr' ? 'Modifier le Cours & Ressources' : 'Edit Course & Curriculum')
                      : (currentLang === 'fr' ? 'Créer un Nouveau Cours' : 'Create New Course')}
                  </span>
                </h3>
                <p className="text-xs text-[#9EA5A8] mt-0.5">
                  {currentLang === 'fr' 
                    ? 'Définissez le titre, l\'accès élève, le statut et ajoutez les partitions ou masterclasses.' 
                    : 'Configure title, description, student access, status, and attach curriculum materials.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="cursor-pointer text-[#6C7378] hover:text-[#EDE7DC] p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-6 text-xs">
              {/* SECTION 1: COURSE METADATA */}
              <div className="space-y-4 bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] rounded-xl p-4 sm:p-5">
                <span className="text-[10px] uppercase font-mono font-bold text-[#E8913C] tracking-wider block">
                  1. {currentLang === 'fr' ? 'Informations Générales' : 'General Course Details'}
                </span>

                {/* Titles EN & FR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Titre (Anglais)' : 'Title (English)'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Masterclass: Classical Piano Technique"
                      value={courseFormTitle}
                      onChange={(e) => setCourseFormTitle(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Titre (Français)' : 'Title (French)'}
                    </label>
                    <input
                      type="text"
                      placeholder="ex. Masterclass : Technique Pianistique Classique"
                      value={courseFormTitleFr}
                      onChange={(e) => setCourseFormTitleFr(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>
                </div>

                {/* Descriptions EN & FR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Description (Anglais)' : 'Description (English)'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Curriculum overview, pedagogical goals, and recommended practice routines..."
                      value={courseFormDesc}
                      onChange={(e) => setCourseFormDesc(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Description (Français)' : 'Description (French)'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Objectifs pédagogiques, morceaux étudiés et conseils de travail..."
                      value={courseFormDescFr}
                      onChange={(e) => setCourseFormDescFr(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Instrument, Level, Price, Status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Discipline' : 'Instrument'}
                    </label>
                    <select
                      value={courseFormInstrument}
                      onChange={(e) => setCourseFormInstrument(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-2.5 py-2 text-xs text-[#EDE7DC] outline-none"
                    >
                      <option value="Piano">Piano</option>
                      <option value="Music Theory">Music Theory / Solfège</option>
                      <option value="Oud">Oud / Oriental</option>
                      <option value="Harmony">Harmony & Analysis</option>
                      <option value="All Instruments">All Instruments</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Niveau' : 'Level'}
                    </label>
                    <select
                      value={courseFormLevel}
                      onChange={(e) => setCourseFormLevel(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-2.5 py-2 text-xs text-[#EDE7DC] outline-none"
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="Beginner">Beginner (Initiation)</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced (Conservatory)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Tarif (TND, 0 = Inclus)' : 'Price (TND, 0 = Free)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={courseFormPrice}
                      onChange={(e) => setCourseFormPrice(Number(e.target.value))}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs font-mono text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Statut' : 'Status'}
                    </label>
                    <select
                      value={courseFormStatus}
                      onChange={(e) => setCourseFormStatus(e.target.value as any)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-2.5 py-2 text-xs text-[#EDE7DC] outline-none"
                    >
                      <option value="published">Published (Visible to allowed students)</option>
                      <option value="new">New (Highlighted tag)</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="draft">Draft (Admin Only - Hidden from students)</option>
                    </select>
                  </div>
                </div>

                {/* Cover Image Upload & URL */}
                <div>
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                    {currentLang === 'fr' ? 'Image de Couverture' : 'Course Cover Image'}
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      ref={courseCoverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCourseCoverUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => courseCoverInputRef.current?.click()}
                      className="cursor-pointer px-3.5 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] text-[#EDE7DC] flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      {uploadingCover ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E8913C]" />
                          <span>{currentLang === 'fr' ? 'Téléversement...' : 'Uploading...'}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-[#E8913C]" />
                          <span>{currentLang === 'fr' ? 'Téléverser Image' : 'Upload Cover'}</span>
                        </>
                      )}
                    </button>

                    <input
                      type="url"
                      placeholder="Or paste cover image URL (https://...)"
                      value={courseFormCover}
                      onChange={(e) => setCourseFormCover(e.target.value)}
                      className="flex-1 bg-[#101317] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />

                    {courseFormCover && (
                      <div className="flex items-center gap-2">
                        <img
                          src={courseFormCover}
                          alt="Preview"
                          className="w-10 h-8 rounded-lg object-cover border border-[rgba(237,231,220,0.2)]"
                        />
                        <button
                          type="button"
                          onClick={() => setCourseFormCover('')}
                          className="cursor-pointer text-red-400 hover:text-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACCESS CONTROL (WHICH STUDENTS HAVE ACCESS) */}
              <div className="space-y-3 bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#E8913C] tracking-wider block">
                    2. {currentLang === 'fr' ? 'Autorisation d\'Accès Élèves' : 'Student Access Permissions'}
                  </span>
                  <span className="text-[10px] font-mono text-[#9EA5A8]">
                    {courseFormAccessAll 
                      ? (currentLang === 'fr' ? 'Accessible à tous les élèves approuvés' : 'Granted to all approved students') 
                      : `${courseFormAccessStudentIds.length} ${currentLang === 'fr' ? 'élève(s) sélectionné(s)' : 'student(s) selected'}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCourseFormAccessAll(true)}
                    className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      courseFormAccessAll
                        ? 'border-[#E8913C] bg-[#E8913C]/10 text-[#EDE7DC]'
                        : 'border-[rgba(237,231,220,0.1)] text-[#6C7378] hover:border-[rgba(237,231,220,0.2)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{currentLang === 'fr' ? 'Tous les Élèves Approuvés' : 'All Approved Students'}</span>
                      </div>
                      <p className="text-[10px] text-[#9EA5A8] mt-0.5">
                        {currentLang === 'fr' ? 'Tout élève avec compte approuvé peut consulter ce cours' : 'Any approved student in the studio has full access'}
                      </p>
                    </div>
                    {courseFormAccessAll && <Check className="w-4 h-4 text-[#E8913C]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourseFormAccessAll(false)}
                    className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      !courseFormAccessAll
                        ? 'border-[#E8913C] bg-[#E8913C]/10 text-[#EDE7DC]'
                        : 'border-[rgba(237,231,220,0.1)] text-[#6C7378] hover:border-[rgba(237,231,220,0.2)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentLang === 'fr' ? 'Élèves Spécifiques Seulement' : 'Specific Students Only'}</span>
                      </div>
                      <p className="text-[10px] text-[#9EA5A8] mt-0.5">
                        {currentLang === 'fr' ? 'Attribuer l\'accès uniquement aux élèves choisis ci-dessous' : 'Grant access only to manually selected students'}
                      </p>
                    </div>
                    {!courseFormAccessAll && <Check className="w-4 h-4 text-[#E8913C]" />}
                  </button>
                </div>

                {/* Specific student checklist */}
                {!courseFormAccessAll && (
                  <div className="pt-2 space-y-2 border-t border-[rgba(237,231,220,0.06)]">
                    <span className="text-[10px] uppercase font-mono text-[#9EA5A8] block">
                      {currentLang === 'fr' ? 'Cocher les élèves autorisés :' : 'Select students allowed to view:'}
                    </span>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[#101317] rounded-xl border border-[rgba(237,231,220,0.1)]">
                      {students.map((st) => {
                        const isChecked = courseFormAccessStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked ? 'bg-[#E8913C]/10 text-[#EDE7DC]' : 'hover:bg-[#0A0C0E] text-[#9EA5A8]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCourseFormAccessStudentIds(prev => [...prev, st.id]);
                                  } else {
                                    setCourseFormAccessStudentIds(prev => prev.filter(id => id !== st.id));
                                  }
                                }}
                                className="rounded text-[#E8913C] focus:ring-0"
                              />
                              <span className="font-semibold text-xs text-[#EDE7DC]">{st.name}</span>
                              <span className="text-[10px] text-[#6C7378]">({st.instrument})</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#6C7378]">{st.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: COURSE MATERIALS (VIDEO LINK, PDF, SHEET MUSIC, AUDIO, LINK) */}
              <div className="space-y-4 bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#E8913C] tracking-wider block">
                      3. {currentLang === 'fr' ? 'Ressources & Supports de Cours' : 'Curriculum Materials & Files'}
                    </span>
                    <p className="text-[11px] text-[#9EA5A8] mt-0.5">
                      {currentLang === 'fr' 
                        ? 'Ajoutez des partitions PDF, masterclasses vidéo, fichiers audio et liens.' 
                        : 'Upload scores (PDF), audio tracks, video links, or study guides via course_materials storage.'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#EDE7DC]">
                    {courseFormMaterials.length} {currentLang === 'fr' ? 'ressource(s)' : 'item(s)'}
                  </span>
                </div>

                {/* Existing materials list */}
                {courseFormMaterials.length > 0 && (
                  <div className="space-y-2 border-b border-[rgba(237,231,220,0.06)] pb-4">
                    {courseFormMaterials.map((mat, idx) => (
                      <div
                        key={mat.id}
                        className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-[10px] font-mono text-[#6C7378] w-4 shrink-0 font-bold">
                            #{idx + 1}
                          </span>

                          <div className="p-1.5 rounded-lg bg-[#0A0C0E] shrink-0">
                            {mat.type === 'video' && <Video className="w-3.5 h-3.5 text-[#E8913C]" />}
                            {mat.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-red-400" />}
                            {mat.type === 'sheet_music' && <Music className="w-3.5 h-3.5 text-emerald-400" />}
                            {mat.type === 'audio' && <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
                            {mat.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-blue-400" />}
                          </div>

                          <div className="truncate">
                            <span className="font-semibold text-[#EDE7DC] block truncate">{mat.title}</span>
                            <span className="text-[10px] font-mono text-[#6C7378] truncate block">{mat.url}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMaterial(idx, 'up')}
                            className="cursor-pointer p-1 rounded hover:bg-[#0A0C0E] disabled:opacity-20 text-[#9EA5A8]"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === courseFormMaterials.length - 1}
                            onClick={() => handleMoveMaterial(idx, 'down')}
                            className="cursor-pointer p-1 rounded hover:bg-[#0A0C0E] disabled:opacity-20 text-[#9EA5A8]"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(mat.id)}
                            className="cursor-pointer p-1 rounded hover:bg-red-500/20 text-red-400"
                            title="Remove Material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new material inline sub-form */}
                <div className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#EDE7DC] block">
                    + {currentLang === 'fr' ? 'Ajouter une Nouvelle Ressource' : 'Add New Material'}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                        {currentLang === 'fr' ? 'Titre de la Ressource' : 'Material Title'} *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Czerny Op. 599 Score (PDF) or Phrasing Masterclass"
                        value={newMatTitle}
                        onChange={(e) => setNewMatTitle(e.target.value)}
                        className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                        {currentLang === 'fr' ? 'Type de Ressource' : 'Type'}
                      </label>
                      <select
                        value={newMatType}
                        onChange={(e) => setNewMatType(e.target.value as any)}
                        className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-2.5 py-2 text-xs text-[#EDE7DC] outline-none"
                      >
                        <option value="video">Video (YouTube / Vimeo / Drive)</option>
                        <option value="pdf">PDF Document</option>
                        <option value="sheet_music">Sheet Music (Score)</option>
                        <option value="audio">Audio Track (MP3 / WAV)</option>
                        <option value="link">External Web Link</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Description ou Note Pédagogique (Optionnel)' : 'Description / Pedagogical Note (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Work on measures 1-16 with metronome at 72 bpm"
                      value={newMatDesc}
                      onChange={(e) => setNewMatDesc(e.target.value)}
                      className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  {/* Material URL or File Upload via course_materials storage path */}
                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">
                      {currentLang === 'fr' ? 'Fichier ou Lien' : 'File Upload or External Link'} *
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        ref={materialFileInputRef}
                        type="file"
                        accept=".pdf,.mp3,.wav,.m4a,.ogg,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadMaterialFile(file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingMaterialFile}
                        onClick={() => materialFileInputRef.current?.click()}
                        className="cursor-pointer px-3.5 py-2 rounded-xl bg-[rgba(237,231,220,0.08)] hover:bg-[rgba(237,231,220,0.15)] border border-[rgba(237,231,220,0.15)] text-[#EDE7DC] flex items-center justify-center gap-1.5 transition-colors shrink-0"
                      >
                        {uploadingMaterialFile ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E8913C]" />
                            <span>{currentLang === 'fr' ? 'Téléversement...' : 'Uploading File...'}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-[#E8913C]" />
                            <span>{currentLang === 'fr' ? 'Téléverser Fichier (PDF, Audio...)' : 'Upload File (PDF / Audio / Score)'}</span>
                          </>
                        )}
                      </button>

                      <input
                        type="url"
                        placeholder="Or enter URL (https://youtube.com/watch?... or https://...)"
                        value={newMatUrl}
                        onChange={(e) => setNewMatUrl(e.target.value)}
                        className="flex-1 bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddMaterialToCourse}
                      className="cursor-pointer bg-[rgba(237,231,220,0.12)] hover:bg-[#E8913C] hover:text-[#0A0C0E] text-[#EDE7DC] font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{currentLang === 'fr' ? 'Ajouter cette Ressource au Cursus' : 'Add Material to Course'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(237,231,220,0.1)]">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC] hover:bg-[#0A0C0E] transition-colors"
                >
                  {currentLang === 'fr' ? 'Annuler' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={savingCourse}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#E8913C]/20"
                >
                  {savingCourse ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{currentLang === 'fr' ? 'Enregistrement...' : 'Saving Course...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{currentLang === 'fr' ? 'Enregistrer le Cours' : 'Save Course'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE / RECEIPT */}
      {selectedInvoiceRequest && (
        <InvoiceModal
          request={selectedInvoiceRequest}
          onClose={() => setSelectedInvoiceRequest(null)}
        />
      )}

      {/* MODAL: SCHEDULE APPOINTMENT */}
      {editingScheduleRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                Schedule Student Lesson
              </h3>
              <button
                onClick={() => setEditingScheduleRequest(null)}
                className="cursor-pointer text-[#6C7378] hover:text-[#EDE7DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Student</label>
                <div className="text-sm font-bold text-[#EDE7DC]">{editingScheduleRequest.name}</div>
                <div className="text-[#6C7378]">{editingScheduleRequest.instrument} · {editingScheduleRequest.frequency}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingScheduleRequest(null)}
                className="cursor-pointer text-xs px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-5 py-2 rounded-xl transition-colors"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTES */}
      {editingNotesRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                Student & Invoice Notes
              </h3>
              <button
                onClick={() => setEditingNotesRequest(null)}
                className="cursor-pointer text-[#6C7378] hover:text-[#EDE7DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Student</label>
                <div className="text-sm font-bold text-[#EDE7DC]">{editingNotesRequest.name}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block">Notes / Pedagogical Log</label>
                <textarea
                  rows={4}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Notes for student progress or tuition receipt..."
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl p-3 text-xs text-[#EDE7DC] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingNotesRequest(null)}
                className="cursor-pointer text-xs px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-5 py-2 rounded-xl transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ADD STUDENT */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                Add Student Record Manually
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="cursor-pointer text-[#6C7378] hover:text-[#EDE7DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Email *</label>
                  <input
                    type="email"
                    required
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Course</label>
                  <select
                    value={manualForm.instrument}
                    onChange={(e) => setManualForm({ ...manualForm, instrument: e.target.value })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.nameEn}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Monthly Tuition (TND)</label>
                  <input
                    type="number"
                    value={manualForm.totalPrice}
                    onChange={(e) => setManualForm({ ...manualForm, totalPrice: Number(e.target.value) || 0 })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold">Payment Status</label>
                  <select
                    value={manualForm.paymentStatus}
                    onChange={(e) => setManualForm({ ...manualForm, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(237,231,220,0.08)]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="cursor-pointer text-xs px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#E8913C]/90 text-[#0A0C0E] text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT PROFILE & ATTENDANCE */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-2xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[rgba(237,231,220,0.08)] pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
                    {selectedStudentProfile.name}
                  </h3>
                  <span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full ${
                    selectedStudentProfile.paymentStatus === 'paid'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedStudentProfile.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                <p className="text-xs text-[#E8913C] font-semibold mt-1">
                  {selectedStudentProfile.instrument} · {selectedStudentProfile.sessionLength} ({selectedStudentProfile.frequency})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentProfile(null)}
                className="cursor-pointer text-[#6C7378] hover:text-[#EDE7DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-[#9EA5A8] tracking-wider block">Contact Information</span>
                <div className="flex items-center gap-2 text-[#EDE7DC]">
                  <Mail className="w-3.5 h-3.5 text-[#E8913C]" />
                  <span>{selectedStudentProfile.email}</span>
                </div>
                {selectedStudentProfile.phone && (
                  <div className="flex items-center gap-2 text-[#EDE7DC]">
                    <Phone className="w-3.5 h-3.5 text-[#E8913C]" />
                    <span>{selectedStudentProfile.phone}</span>
                  </div>
                )}
                {selectedStudentProfile.preferredLocation && (
                  <div className="flex items-center gap-2 text-[#EDE7DC]">
                    <MapPin className="w-3.5 h-3.5 text-[#E8913C]" />
                    <span>{selectedStudentProfile.preferredLocation}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-[#9EA5A8] tracking-wider block">Lesson Schedule</span>
                <div className="text-[#EDE7DC] font-semibold">
                  {selectedStudentProfile.isDaily 
                    ? 'Daily (Monday through Saturday at 17:00)' 
                    : selectedStudentProfile.daysLocked
                    ? selectedStudentProfile.selectedWeeklyDays?.map(d => `${d} (${selectedStudentProfile.selectedTimeSlots?.[d] || '17:00'})`).join(', ')
                    : 'Pending initial day selection by student'}
                </div>
                <div className="pt-1.5 flex items-center justify-between text-[11px] border-t border-[rgba(237,231,220,0.05)]">
                  <span className="text-[#9EA5A8]">Payment Status:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleStudentPayment(selectedStudentProfile)}
                    className="cursor-pointer text-[#E8913C] hover:underline font-semibold"
                  >
                    Toggle to {selectedStudentProfile.paymentStatus === 'paid' ? 'Unpaid' : 'Paid'}
                  </button>
                </div>
              </div>
            </div>

            {/* Rescheduled Occurrences Section */}
            {selectedStudentProfile.rescheduledOccurrences && Object.keys(selectedStudentProfile.rescheduledOccurrences).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#EDE7DC] uppercase tracking-wider font-mono">
                  Single-Occurrence Reschedules
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedStudentProfile.rescheduledOccurrences).map(([origDate, override]) => (
                    <div key={origDate} className="p-3 rounded-xl bg-[#161B22] border border-[rgba(237,231,220,0.1)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[#9EA5A8]">Original: </span>
                        <span className="font-mono text-[#EDE7DC]">{origDate}</span>
                        <span className="text-[#E8913C] mx-2">➔</span>
                        <span className="text-[#9EA5A8]">Rescheduled: </span>
                        <span className="font-mono text-[#E8913C] font-semibold">{override.newDateISO} at {override.newTime}</span>
                      </div>
                      {override.reason && (
                        <span className="text-[11px] text-[#7E858A] italic">{override.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance & Lesson History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[rgba(237,231,220,0.08)] pb-2">
                <h4 className="text-xs font-bold text-[#EDE7DC] uppercase tracking-wider font-mono">
                  Lesson History & Pedagogical Log ({selectedStudentProfile.lessonHistory?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingHistory(!isAddingHistory)}
                  className="cursor-pointer text-xs text-[#E8913C] hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingHistory ? 'Cancel' : 'Log Lesson'}</span>
                </button>
              </div>

              {/* Log Lesson Form */}
              {isAddingHistory && (
                <form onSubmit={handleAddLessonHistory} className="p-4 rounded-xl bg-[#0A0C0E] border border-[#E8913C]/30 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={newHistoryDate}
                        onChange={(e) => setNewHistoryDate(e.target.value)}
                        className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] rounded-lg px-2.5 py-1.5 text-xs text-[#EDE7DC]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={newHistoryTime}
                        onChange={(e) => setNewHistoryTime(e.target.value)}
                        className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] rounded-lg px-2.5 py-1.5 text-xs text-[#EDE7DC]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Status</label>
                      <select
                        value={newHistoryStatus}
                        onChange={(e) => setNewHistoryStatus(e.target.value as any)}
                        className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] rounded-lg px-2.5 py-1.5 text-xs text-[#EDE7DC]"
                      >
                        <option value="completed">Completed</option>
                        <option value="attended">Attended</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-[#9EA5A8] font-semibold block mb-1">Pedagogical Notes (Exercises, Repertoire studied)</label>
                    <input
                      type="text"
                      placeholder="e.g. Czerny op. 599 no. 14, Bach Invention 1 phrasing"
                      value={newHistoryNotes}
                      onChange={(e) => setNewHistoryNotes(e.target.value)}
                      className="w-full bg-[#101317] border border-[rgba(237,231,220,0.15)] rounded-lg px-3 py-1.5 text-xs text-[#EDE7DC]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingHistory(false)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold px-4 py-1.5 rounded-lg text-xs"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              )}

              {/* History List */}
              {(!selectedStudentProfile.lessonHistory || selectedStudentProfile.lessonHistory.length === 0) ? (
                <p className="text-xs text-[#6C7378] italic py-2">No past lesson records logged yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedStudentProfile.lessonHistory.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.06)] flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#EDE7DC]">{item.date} at {item.time}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 uppercase">
                            {item.status}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[#9EA5A8] mt-1 text-[11px]">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Account Status */}
            <div className="p-3.5 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[#6C7378] block text-[10px] uppercase font-mono">Student Portal Access</span>
                <span className="font-mono text-[#EDE7DC]">{selectedStudentProfile.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  selectedStudentProfile.emailVerified 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {selectedStudentProfile.emailVerified ? 'Email Verified ✓' : 'Email Unverified ⚠'}
                </span>
                {selectedStudentProfile.approvalStatus === 'pending' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApproveStudent(selectedStudentProfile.id, selectedStudentProfile.requestId)}
                      className="cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectStudent(selectedStudentProfile.id, selectedStudentProfile.requestId)}
                      className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-[rgba(237,231,220,0.08)]">
              <button
                type="button"
                onClick={() => setSelectedStudentProfile(null)}
                className="cursor-pointer text-xs px-5 py-2.5 rounded-xl bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
