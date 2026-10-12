export type LessonStatus = 'pending' | 'confirmed' | 'scheduled' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type Language = 'en' | 'fr';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type StudentApprovalStatus = 'pending' | 'approved' | 'rejected';

export type LessonAttendanceStatus = 'attended' | 'missed' | 'cancelled' | 'completed' | 'rescheduled';

export interface CalendarSettings {
  openDays: DayOfWeek[];
  startHour: string; // e.g. '09:00'
  endHour: string;   // e.g. '19:00'
  maxStudentsPerDay: number; // e.g. 5
  lessonLengths: string[]; // e.g. ['30 min', '45 min', '60 min', '90 min']
  minNoticeHours: number; // minimum notice in hours to reschedule, default: 12
  blockedDates: string[]; // array of ISO strings 'YYYY-MM-DD'
}

export interface PaymentRecord {
  id: string;
  studentId?: string; // UID of student
  studentName?: string;
  date: string; // 'YYYY-MM-DD'
  amount: number; // in TND
  method: 'cash' | 'transfer' | 'other';
  status?: 'confirmed' | 'pending' | 'rejected'; // student submitted payments are pending until admin confirms
  note?: string;
  receiptUrl?: string; // optional receipt photo URL
  createdAt?: string;
  updatedAt?: string;
}

export type LibraryCategory = 'book' | 'score' | 'pdf' | 'link' | 'other';

export interface LibraryItem {
  id: string;
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  category: LibraryCategory;
  coverImage?: string;
  fileUrl?: string;
  externalUrl?: string;
  author?: string;
  instrument?: string;
  level?: string;
  status: 'published' | 'draft';
  accessStudentIds?: string[]; // '*' or empty = all approved students
  createdAt?: any;
  updatedAt?: any;
}

export interface InAppNotification {
  id: string;
  userId: string; // recipient UID or 'all' or 'admin'
  title: string;
  titleFr?: string;
  body: string;
  bodyFr?: string;
  link?: string;
  read: boolean;
  type?: 'payment_confirmed' | 'payment_rejected' | 'payment_submitted' | 'new_course' | 'new_library_item' | 'announcement';
  createdAt: any;
}

export interface FcmTokenDoc {
  id?: string;
  userId: string;
  token: string;
  role: 'student' | 'admin';
  language: 'en' | 'fr';
  createdAt: any;
  updatedAt?: any;
}

export interface StudentAccount {
  id: string; // Auth UID
  authUid?: string;
  requestId?: string;
  name: string;
  email: string;
  phone: string;
  instrument: string;
  frequency: string; // '1x per week', '2x per week', '3x per week', 'Daily / Intensive'
  requiredDaysCount: number; // 1, 2, 3, or 7
  isDaily: boolean;
  sessionLength: string;
  sessionBlocks: number;
  preferredLocation: string;
  approvalStatus: StudentApprovalStatus;
  paymentStatus: PaymentStatus;
  emailVerified?: boolean;
  selectedWeeklyDays: DayOfWeek[];
  selectedTimeSlots?: { [key in DayOfWeek]?: string };
  daysLocked: boolean;
  rescheduledOccurrences?: {
    [originalDateISO: string]: {
      newDateISO: string;
      newTime: string;
      reason?: string;
      rescheduledAt?: string;
    };
  };
  lessonHistory?: Array<{
    date: string;
    time: string;
    status: LessonAttendanceStatus;
    notes?: string;
  }>;
  payments?: PaymentRecord[];
  adminNotes?: string;
  createdAt: any;
  tempPassword?: string; // Optional for legacy migration only
  photoUrl?: string;
  bio?: string;
  instrumentLevel?: string; // e.g. 'Beginner', 'Intermediate', 'Advanced', 'Conservatory'
  preferredGenre?: string; // e.g. 'Classical', 'Jazz', 'Oriental/Malouf', 'Contemporary'
  practiceGoal?: string;
  isMuted?: boolean; // Set by admin/teacher to prevent posting in community
}

export interface CourseMaterial {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'pdf' | 'sheet_music' | 'audio' | 'link';
  url: string; // Firebase storage download URL or external link (e.g. YouTube, Google Drive)
  order: number;
}

export interface LibraryCourse {
  id: string;
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  coverImage?: string;
  price?: number; // 0 or price in TND
  level?: string;
  instrument?: string;
  status: 'published' | 'new' | 'coming_soon' | 'draft';
  accessStudentIds?: string[]; // Empty or contains '*' for all approved students, or specific student IDs
  materials?: CourseMaterial[];
  createdAt?: any;
  updatedAt?: any;
}

export interface CommunityMessage {
  id: string;
  studentId: string; // or admin UID
  authorName: string;
  authorPhotoUrl?: string;
  authorRole: 'student' | 'teacher';
  text: string;
  imageUrl?: string;
  createdAt: any; // Firestore serverTimestamp or ISO
}

export interface CalendarBookingSlot {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  instrument?: string;
  dateISO?: string; // 'YYYY-MM-DD'
  weekday?: DayOfWeek;
  startTime: string; // 'HH:mm'
  lengthMinutes: number;
  isRecurring: boolean;
  isRescheduled?: boolean;
  originalDateISO?: string;
}

export interface BookingRequest {
  id: string;
  studentUid?: string;
  emailVerified?: boolean;
  name: string;
  phone: string;
  email: string;
  instrument: string;
  frequency: string; // e.g., '1x per week', '2x per week', '3x per week', 'Daily / Intensive'
  sessionLength: string; // e.g., '30 min', '45 min', '60 min', '90 min'
  sessionBlocks: number; // 30 min = 1 block
  pricePerWeek: number;
  totalPrice: number; // monthly
  preferredLocation: string; // "Teacher's Studio (Ben Arous)", "Student's Home (Grand Tunis)", "Online / To be discussed"
  message: string;
  status: LessonStatus;
  paymentStatus: PaymentStatus;
  appointmentDate?: string;
  appointmentTime?: string;
  invoiceNotes?: string;
  createdAt: string;
}

export interface InstrumentCourse {
  id: string;
  nameEn: string;
  nameFr: string;
  nameAr?: string;
  icon?: string;
  taglineEn: string;
  taglineFr: string;
  descriptionEn: string;
  descriptionFr: string;
  levelEn: string;
  levelFr: string;
  ageEn: string;
  ageFr: string;
  popular?: boolean;
  visible?: boolean;
  order?: number;
}

export interface TeachingRow {
  id: string;
  order: number;
  labelEn: string;
  labelFr: string;
  nameEn: string;
  nameFr: string;
  noteEn: string;
  noteFr: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  imageUrl?: string;
  captionEn?: string;
  captionFr?: string;
  order: number;
}

export interface PromoBanner {
  textEn: string;
  textFr: string;
  link?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PromoBannerSettings {
  textEn: string;
  textFr: string;
  linkUrl?: string;
  enabled: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SiteSettings {
  heroTaglineEn: string;
  heroTaglineFr: string;
  heroLocationEn: string;
  heroLocationFr: string;
  heroDegreeEn: string;
  heroDegreeFr: string;
  heroPhotoUrl?: string;
  aboutHeadingEn: string;
  aboutHeadingFr: string;
  aboutAccentPhraseEn: string;
  aboutAccentPhraseFr: string;
  aboutParagraphEn: string;
  aboutParagraphFr: string;
  ratePer30Min: number; // price per 30 minutes in TND (default: 12)
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  promoBanner?: PromoBanner;
  galleryImages?: GalleryImage[];
}

export interface TeacherProfile {
  name: string;
  titleEn: string;
  titleFr: string;
  degreesEn: string[];
  degreesFr: string[];
  experienceYears: number;
  location: string;
  phone: string;
  email: string;
  bioEn: string;
  bioFr: string;
  hourlyRateBlock: number; // 12 TND per 30 minutes
}
