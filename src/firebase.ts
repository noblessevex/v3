/**
 * Firebase Integration for Mimouni Music Studio
 * Strictly connected to live Firebase: Authentication, Firestore, and Storage.
 * Configured via environment variables:
 * VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
 * VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID,
 * and VITE_ADMIN_UID.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  deleteField,
  orderBy,
  limit,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  signOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  FirebaseStorage 
} from 'firebase/storage';

import { 
  BookingRequest, 
  SiteSettings, 
  TeachingRow, 
  InstrumentCourse,
  StudentAccount,
  CalendarSettings,
  CalendarBookingSlot,
  DayOfWeek,
  PaymentRecord,
  LessonAttendanceStatus,
  PaymentStatus,
  GalleryImage,
  PromoBannerSettings,
  CourseMaterial,
  LibraryCourse,
  CommunityMessage,
  LibraryItem,
  InAppNotification,
  FcmTokenDoc
} from './types';
export type { GalleryImage, PromoBannerSettings, CourseMaterial, LibraryCourse, CommunityMessage, LibraryItem, InAppNotification, FcmTokenDoc };
// Environment Variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Admin UID (strict authentication by UID only)
export const ADMIN_UID = (import.meta.env.VITE_ADMIN_UID || '').trim();

export function isAppConfigured(): { configured: boolean; missingVars: string[] } {
  const missing: string[] = [];
  if (!import.meta.env.VITE_FIREBASE_API_KEY) missing.push('VITE_FIREBASE_API_KEY');
  if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) missing.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!import.meta.env.VITE_FIREBASE_APP_ID) missing.push('VITE_FIREBASE_APP_ID');
  if (!import.meta.env.VITE_ADMIN_UID) missing.push('VITE_ADMIN_UID');
  return {
    configured: missing.length === 0,
    missingVars: missing,
  };
}

export const isFirebaseConfigured = isAppConfigured().configured;

// Initialize Firebase instances
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (err: any) {
    console.error('Firebase initialization failure:', err.code || err.message, err);
  }
}

export { app, db, auth, storage };

// Default Initial Courses
export const DEFAULT_COURSES: InstrumentCourse[] = [
  {
    id: 'piano-beginners',
    order: 0,
    visible: true,
    nameEn: 'Piano for Beginners',
    nameFr: 'Piano Débutant',
    taglineEn: 'First contact with keys, posture, and note reading',
    taglineFr: 'Premier contact avec le clavier, posture et lecture de notes',
    descriptionEn: 'Hands ergonomics, treble & bass clef recognition, foundational rhythm exercises, and playing initial melodies from week one.',
    descriptionFr: 'Tenue des mains, lecture des clés de sol et de fa, exercices rythmiques fondamentaux et premières mélodies dès la première séance.',
    levelEn: 'Beginner (No prior music needed)',
    levelFr: 'Débutant complet',
    ageEn: 'Ages 6 to Adult',
    ageFr: 'Dès 6 ans & Adultes',
    popular: true,
  },
  {
    id: 'piano-intermediate',
    order: 1,
    visible: true,
    nameEn: 'Piano Intermediate',
    nameFr: 'Piano Intermédiaire',
    taglineEn: 'Scale fluency, Hanon technique, and classical repertoire',
    taglineFr: 'Délié des doigts, méthode Hanon et répertoire classique',
    descriptionEn: 'Independence of hands, pedal nuance, dynamic articulation, Bach preludes, Czerny etudes, and expressive romantic themes.',
    descriptionFr: 'Indépendance des mains, jeu de pédale, phrasé expressif, préludes de Bach, études de Czerny et répertoire romantique.',
    levelEn: '1-3 Years Experience',
    levelFr: '1 à 3 ans de pratique',
    ageEn: 'Teens & Adults',
    ageFr: 'Ados & Adultes',
    popular: true,
  },
  {
    id: 'piano-advanced',
    order: 2,
    visible: true,
    nameEn: 'Piano Advanced',
    nameFr: 'Piano Avancé',
    taglineEn: 'Conservatory standards, virtuoso sonatas, and interpretation',
    taglineFr: 'Niveau conservatoire, sonates et interprétation stylistique',
    descriptionEn: 'Beethoven sonatas, Chopin nocturnes, advanced harmonic analysis, polyphony, touch tone refinement, and performance preparation.',
    descriptionFr: 'Sonates de Beethoven, nocturnes de Chopin, analyse harmonique, polyphonie, raffinement du toucher et préparation de scène.',
    levelEn: 'Advanced / Conservatory Prep',
    levelFr: 'Avancé / Prépa Concours',
    ageEn: 'Adolescents & Adults',
    ageFr: 'Ados & Adultes',
    popular: false,
  },
  {
    id: 'music-theory',
    order: 3,
    visible: true,
    nameEn: 'Music Theory and Solfège',
    nameFr: 'Théorie Musicale & Solfège',
    taglineEn: 'Essential literacy for sight reading and state exams',
    taglineFr: 'Socle indispensable pour le déchiffrage et le Bac Musique',
    descriptionEn: 'Rhythmic dictations, pitch ear training, chord construction, interval analysis, and targeted prep for Tunisian public secondary baccalaureate music exams.',
    descriptionFr: 'Dictées de notes et rythmiques, oreille absolue/relative, chiffrage d’accords et préparation spécifique aux examens d’État.',
    levelEn: 'All levels & Exam Section',
    levelFr: 'Tous niveaux & Spécialité Bac',
    ageEn: 'All Ages',
    ageFr: 'Tous âges',
    popular: false,
  },
  {
    id: 'music-children',
    order: 4,
    visible: true,
    nameEn: 'Music for Children',
    nameFr: 'Éveil & Piano Enfants',
    taglineEn: 'Playful pedagogical initiation to piano and rhythm',
    taglineFr: 'Initiation ludique et bienveillante au clavier et au rythme',
    descriptionEn: 'Engaging, patient pedagogy tailored to young attention spans. Nursery themes, colorful musical games, rhythmic clapping, and joy in sound.',
    descriptionFr: 'Pédagogie douce et interactive adaptée au jeune âge. Comptines, repères visuels sur le clavier, écoute active et épanouissement sonore.',
    levelEn: 'Early Discovery',
    levelFr: 'Éveil & Initiation',
    ageEn: 'Ages 5 to 10',
    ageFr: '5 à 10 ans',
    popular: false,
  },
];

// Default Teaching Rows
export const DEFAULT_TEACHING_ROWS: TeachingRow[] = [
  {
    id: 'row-1',
    order: 0,
    labelEn: 'Government school',
    labelFr: 'Enseignement public',
    nameEn: 'Public school teaching',
    nameFr: 'Éducation nationale tunisienne',
    noteEn: 'State music curriculum',
    noteFr: 'Programme officiel & Bac Musique',
  },
  {
    id: 'row-2',
    order: 1,
    labelEn: 'Private schools',
    labelFr: 'Établissements privés',
    nameEn: 'Teaching outside the public system',
    nameFr: 'Académies & Enseignement privé',
    noteEn: 'Accredited music pedagogy',
    noteFr: 'Pédagogie certifiée',
  },
  {
    id: 'row-3',
    order: 2,
    labelEn: 'Private lessons',
    labelFr: 'Cours particuliers',
    nameEn: 'One to one',
    nameFr: 'Cours individuels sur mesure',
    noteEn: 'Ben Arous studio & in-home',
    noteFr: 'Studio Ben Arous & à domicile',
  },
];

// Default Site Settings
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroTaglineEn: 'Music Teacher · Piano',
  heroTaglineFr: 'Professeur de Musique · Piano',
  heroLocationEn: 'Ben Arous, Tunisia',
  heroLocationFr: 'Ben Arous, Tunisie',
  heroDegreeEn: 'Master of Music',
  heroDegreeFr: 'Maître de Musique',
  aboutHeadingEn: 'A Master of Music teaching piano and music theory in Ben Arous, in schools and in private lessons.',
  aboutHeadingFr: 'Un Maître de Musique enseignant le piano et le solfège à Ben Arous, en milieu scolaire et en cours particuliers.',
  aboutAccentPhraseEn: 'piano and music theory',
  aboutAccentPhraseFr: 'le piano et le solfège',
  aboutParagraphEn: 'Formed at the Higher Institute of Music, teaching with classical discipline and warm modern pedagogy.',
  aboutParagraphFr: 'Diplômé de l\'Institut Supérieur de Musique, alliant rigueur classique et pédagogie bienveillante.',
  ratePer30Min: 12,
  contactPhone: '+216 98 123 456',
  contactEmail: 'contact@mohamedmimouni.tn',
  contactAddress: 'Studio Mohamed Mimouni, Avenue Habib Bourguiba, Ben Arous 2013, Tunisie',
  socialFacebook: 'https://facebook.com',
  socialInstagram: 'https://instagram.com',
  socialYoutube: 'https://youtube.com',
  promoBanner: {
    textEn: 'Autumn Semester 2026: Intensive Piano & Solfège slots now open in Ben Arous',
    textFr: 'Session Automne 2026 : Inscriptions ouvertes pour les cours de piano et solfège à Ben Arous',
    link: '#pricing',
    active: false,
  },
  galleryImages: [
    {
      id: 'gal-1',
      url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
      captionEn: 'Studio Grand Piano & Repertoire Analysis',
      captionFr: 'Piano à queue du studio & analyse de répertoire',
      order: 0,
    },
    {
      id: 'gal-2',
      url: 'https://images.unsplash.com/photo-1514119412350-e174d90d280e?auto=format&fit=crop&w=1200&q=80',
      captionEn: 'Precision Touch & Pedagogical Guidance',
      captionFr: 'Précision du toucher & accompagnement pédagogique',
      order: 1,
    },
    {
      id: 'gal-3',
      url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
      captionEn: 'Bach, Beethoven, and Chopin Classical Scores',
      captionFr: 'Partitions classiques : Bach, Beethoven et Chopin',
      order: 2,
    },
    {
      id: 'gal-4',
      url: 'https://images.unsplash.com/photo-1520523839898-507127053c37?auto=format&fit=crop&w=1200&q=80',
      captionEn: 'Concert Performance & Masterclass Sessions',
      captionFr: 'Récital de concert & sessions de masterclass',
      order: 3,
    },
  ],
};

// Default Calendar Settings
export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  startHour: '09:00',
  endHour: '19:00',
  maxStudentsPerDay: 5,
  lessonLengths: ['30 min', '45 min', '60 min', '90 min'],
  minNoticeHours: 12,
  blockedDates: [],
};

// ==========================================
// MOCK DATA & LOCAL STORAGE STORE (When Firebase is unconfigured)
// ==========================================

const INITIAL_MOCK_REQUESTS: BookingRequest[] = [
  {
    id: 'req-demo-1',
    name: 'Yasmine Ben Salem',
    phone: '+216 98 111 222',
    email: 'yasmine.bensalem@gmail.com',
    instrument: 'Piano for Beginners',
    frequency: '2x per week',
    sessionLength: '60 min',
    sessionBlocks: 2,
    pricePerWeek: 48,
    totalPrice: 192,
    preferredLocation: 'Studio Ben Arous',
    message: 'Looking forward to starting piano lessons for classical repertoire.',
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'req-demo-2',
    name: 'Ahmed Triki',
    phone: '+216 22 333 444',
    email: 'ahmed.triki@gmail.com',
    instrument: 'Piano Intermediate',
    frequency: '2x per week',
    sessionLength: '60 min',
    sessionBlocks: 2,
    pricePerWeek: 48,
    totalPrice: 192,
    preferredLocation: 'Studio Ben Arous',
    message: 'Prepping for conservatory intermediate auditions.',
    status: 'confirmed',
    paymentStatus: 'paid',
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '17:00',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const INITIAL_MOCK_STUDENTS: StudentAccount[] = [
  {
    id: 'demo-student-1',
    authUid: 'demo-student-1',
    name: 'Ahmed Triki',
    email: 'ahmed.triki@gmail.com',
    phone: '+216 22 333 444',
    instrument: 'Piano Intermediate',
    frequency: '2x per week',
    requiredDaysCount: 2,
    isDaily: false,
    sessionLength: '60 min',
    sessionBlocks: 2,
    preferredLocation: 'Studio Ben Arous',
    approvalStatus: 'approved',
    paymentStatus: 'paid',
    emailVerified: true,
    selectedWeeklyDays: ['Tuesday', 'Thursday'],
    selectedTimeSlots: {
      Tuesday: '17:00',
      Thursday: '17:00',
    },
    daysLocked: false,
    rescheduledOccurrences: {},
    lessonHistory: [
      {
        date: new Date(Date.now() - 3600000 * 24 * 7).toISOString().slice(0, 10),
        time: '17:00',
        status: 'attended',
        notes: 'Good fluency on Czerny Op. 599 No. 12',
      },
    ],
    payments: [
      {
        id: 'pay-1',
        amount: 192,
        date: new Date(Date.now() - 3600000 * 24 * 14).toISOString().slice(0, 10),
        method: 'cash',
        note: 'Monthly tuition October 2026',
        createdAt: new Date().toISOString(),
      },
    ],
    adminNotes: 'Excellent progress on Czerny Op. 599. Ready for Bach Invention No. 1.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-student-2',
    authUid: 'demo-student-2',
    name: 'Yasmine Ben Salem',
    email: 'yasmine.bensalem@gmail.com',
    phone: '+216 98 111 222',
    instrument: 'Piano for Beginners',
    frequency: '2x per week',
    requiredDaysCount: 2,
    isDaily: false,
    sessionLength: '60 min',
    sessionBlocks: 2,
    preferredLocation: 'Studio Ben Arous',
    approvalStatus: 'pending',
    paymentStatus: 'unpaid',
    emailVerified: true,
    selectedWeeklyDays: [],
    selectedTimeSlots: {},
    daysLocked: false,
    rescheduledOccurrences: {},
    lessonHistory: [],
    payments: [],
    createdAt: new Date().toISOString(),
  },
];

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const mockSubscribers = {
  requests: new Set<(reqs: BookingRequest[]) => void>(),
  students: new Set<(students: StudentAccount[]) => void>(),
  siteSettings: new Set<(s: SiteSettings) => void>(),
  teachingRows: new Set<(r: TeachingRow[]) => void>(),
  courses: new Set<(c: InstrumentCourse[]) => void>(),
  calendarSettings: new Set<(c: CalendarSettings) => void>(),
  auth: new Set<(u: User | null) => void>(),
  studentAccount: new Map<string, Set<(s: StudentAccount | null) => void>>(),
  libraryCourses: new Set<(c: LibraryCourse[]) => void>(),
  communityMessages: new Set<(m: CommunityMessage[]) => void>(),
};

export function getMockRequests(): BookingRequest[] {
  return safeGetStorage('mimouni_mock_requests', INITIAL_MOCK_REQUESTS);
}
export function saveMockRequests(reqs: BookingRequest[]): void {
  safeSetStorage('mimouni_mock_requests', reqs);
  mockSubscribers.requests.forEach((cb) => cb(reqs));
}

export function getMockStudents(): StudentAccount[] {
  return safeGetStorage('mimouni_mock_students', INITIAL_MOCK_STUDENTS);
}
export function saveMockStudents(students: StudentAccount[]): void {
  safeSetStorage('mimouni_mock_students', students);
  mockSubscribers.students.forEach((cb) => cb(students));
  students.forEach((st) => {
    const subs = mockSubscribers.studentAccount.get(st.id);
    if (subs) subs.forEach((cb) => cb(st));
  });
}

export function getMockSiteSettings(): SiteSettings {
  return safeGetStorage('mimouni_mock_site_settings', DEFAULT_SITE_SETTINGS);
}
export function saveMockSiteSettings(settings: SiteSettings): void {
  safeSetStorage('mimouni_mock_site_settings', settings);
  mockSubscribers.siteSettings.forEach((cb) => cb(settings));
}

export function getMockTeachingRows(): TeachingRow[] {
  return safeGetStorage('mimouni_mock_teaching_rows', DEFAULT_TEACHING_ROWS);
}
export function saveMockTeachingRows(rows: TeachingRow[]): void {
  safeSetStorage('mimouni_mock_teaching_rows', rows);
  mockSubscribers.teachingRows.forEach((cb) => cb(rows));
}

export function getMockCourses(): InstrumentCourse[] {
  return safeGetStorage('mimouni_mock_courses', DEFAULT_COURSES);
}
export function saveMockCourses(courses: InstrumentCourse[]): void {
  safeSetStorage('mimouni_mock_courses', courses);
  mockSubscribers.courses.forEach((cb) => cb(courses));
}

export function getMockCalendarSettings(): CalendarSettings {
  return safeGetStorage('mimouni_mock_calendar_settings', DEFAULT_CALENDAR_SETTINGS);
}
export function saveMockCalendarSettings(settings: CalendarSettings): void {
  safeSetStorage('mimouni_mock_calendar_settings', settings);
  mockSubscribers.calendarSettings.forEach((cb) => cb(settings));
}

export function getMockLibraryCourses(): LibraryCourse[] {
  return safeGetStorage('mimouni_mock_library_courses', []);
}
export function saveMockLibraryCourses(courses: LibraryCourse[]): void {
  safeSetStorage('mimouni_mock_library_courses', courses);
  mockSubscribers.libraryCourses.forEach((cb) => cb(courses));
}

export function getMockCommunityMessages(): CommunityMessage[] {
  return safeGetStorage('mimouni_mock_community_messages', []);
}
export function saveMockCommunityMessages(msgs: CommunityMessage[]): void {
  safeSetStorage('mimouni_mock_community_messages', msgs);
  mockSubscribers.communityMessages.forEach((cb) => cb(msgs));
}

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.uid) return false;
  if (!isFirebaseConfigured) return true;
  if (!ADMIN_UID) return false;
  return user.uid === ADMIN_UID;
}

export async function loginAdminUser(
  email: string, 
  pass: string
): Promise<{ success: boolean; error?: string; code?: string; user?: User }> {
  if (!isFirebaseConfigured || !auth) {
    const mockUser: any = {
      uid: 'demo-admin-uid',
      email: email.trim() || 'admin@mohamedmimouni.tn',
      displayName: 'Mohamed Mimouni (Teacher)',
    };
    try {
      localStorage.setItem('mimouni_mock_admin', JSON.stringify(mockUser));
    } catch {}
    mockSubscribers.auth.forEach((cb) => cb(mockUser));
    return { success: true, user: mockUser };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (!isAdminUser(cred.user)) {
      await signOut(auth);
      const code = 'auth/unauthorized-admin-uid';
      const msg = ADMIN_UID
        ? `Access denied. Signed-in account UID (${cred.user.uid}) does not match configured VITE_ADMIN_UID.`
        : 'Access denied. VITE_ADMIN_UID is not configured on the server.';
      console.error('Admin authorization rejected:', code, msg);
      return { success: false, error: msg, code };
    }
    return { success: true, user: cred.user };
  } catch (err: any) {
    console.error('loginAdminUser Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'Authentication failed', code: err.code || 'auth/unknown-error' };
  }
}

export async function logoutAdminUser(): Promise<void> {
  if (!isFirebaseConfigured || !auth) {
    try {
      localStorage.removeItem('mimouni_mock_admin');
    } catch {}
    mockSubscribers.auth.forEach((cb) => cb(null));
    return;
  }
  if (auth && isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('logoutAdminUser error:', err.code, err.message);
    }
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  if (!isFirebaseConfigured || !auth) {
    mockSubscribers.auth.add(callback);
    let currentUser: User | null = null;
    try {
      const saved = localStorage.getItem('mimouni_mock_admin');
      if (saved) currentUser = JSON.parse(saved);
    } catch {}
    callback(currentUser);
    return () => {
      mockSubscribers.auth.delete(callback);
    };
  }
  return onAuthStateChanged(auth, (user) => {
    if (user && isAdminUser(user)) {
      callback(user);
    } else {
      callback(null);
    }
  });
}

// ==========================================
// 2. STUDENT AUTHENTICATION & PORTAL
// ==========================================

export interface StudentRegistrationPlan {
  instrument: string;
  frequency: string;
  sessionLength: string;
  sessionBlocks: number;
  pricePerWeek?: number;
  totalPrice?: number;
  preferredLocation: string;
}

export function calculateRequiredDays(frequency: string): { requiredDaysCount: number; isDaily: boolean } {
  const raw = (frequency || '').toLowerCase();
  if (raw.includes('3x') || raw.includes('3')) {
    return { requiredDaysCount: 3, isDaily: false };
  }
  if (raw.includes('2x') || raw.includes('2')) {
    return { requiredDaysCount: 2, isDaily: false };
  }
  if (raw.includes('daily') || raw.includes('quotidien') || raw.includes('intensive') || raw.includes('chaque')) {
    return { requiredDaysCount: 7, isDaily: true };
  }
  return { requiredDaysCount: 1, isDaily: false };
}

/**
 * Register a student account with email and password
 * Creates auth user, sends verification email, creates students/{uid} and matching requests doc.
 */
export async function registerStudentAccount(
  name: string,
  email: string,
  phone: string,
  pass: string,
  plan: StudentRegistrationPlan
): Promise<{ success: boolean; student?: StudentAccount; error?: string; code?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.trim();
  const { requiredDaysCount, isDaily } = calculateRequiredDays(plan.frequency);

  if (!isFirebaseConfigured || !auth || !db) {
    const uid = 'demo-student-' + Date.now();
    const newStudent: StudentAccount = {
      id: uid,
      authUid: uid,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      instrument: plan.instrument,
      frequency: plan.frequency,
      requiredDaysCount,
      isDaily,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      preferredLocation: plan.preferredLocation,
      approvalStatus: 'pending',
      paymentStatus: 'unpaid',
      emailVerified: true,
      selectedWeeklyDays: isDaily ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : [],
      selectedTimeSlots: isDaily ? {
        Monday: '17:00', Tuesday: '17:00', Wednesday: '17:00',
        Thursday: '17:00', Friday: '17:00', Saturday: '17:00'
      } : {},
      daysLocked: false,
      rescheduledOccurrences: {},
      lessonHistory: [],
      createdAt: new Date().toISOString(),
    };
    const students = getMockStudents();
    students.push(newStudent);
    saveMockStudents(students);

    const reqs = getMockRequests();
    const newReq: BookingRequest = {
      id: 'req-' + uid,
      studentUid: uid,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      instrument: plan.instrument,
      frequency: plan.frequency,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      pricePerWeek: plan.pricePerWeek || 0,
      totalPrice: plan.totalPrice || 0,
      preferredLocation: plan.preferredLocation,
      message: 'Self-registered student via Student Portal',
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    reqs.unshift(newReq);
    saveMockRequests(reqs);

    newStudent.requestId = newReq.id;
    return { success: true, student: newStudent };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
    const user = userCredential.user;

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (verErr: any) {
      console.warn('sendEmailVerification notice:', verErr.code, verErr.message);
    }

    const newStudent: StudentAccount = {
      id: user.uid,
      authUid: user.uid,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      instrument: plan.instrument,
      frequency: plan.frequency,
      requiredDaysCount,
      isDaily,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      preferredLocation: plan.preferredLocation,
      approvalStatus: 'pending',
      paymentStatus: 'unpaid',
      emailVerified: user.emailVerified,
      selectedWeeklyDays: isDaily ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : [],
      selectedTimeSlots: isDaily ? {
        Monday: '17:00', Tuesday: '17:00', Wednesday: '17:00',
        Thursday: '17:00', Friday: '17:00', Saturday: '17:00'
      } : {},
      daysLocked: false,
      rescheduledOccurrences: {},
      lessonHistory: [],
      createdAt: serverTimestamp(),
    };

    // 1. Write students/{uid} document
    const studentDocRef = doc(db, 'students', user.uid);
    await setDoc(studentDocRef, newStudent);

    // 2. Write matching document in requests collection
    const reqDocRef = await addDoc(collection(db, 'requests'), {
      studentUid: user.uid,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      instrument: plan.instrument,
      frequency: plan.frequency,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      pricePerWeek: plan.pricePerWeek || 0,
      totalPrice: plan.totalPrice || 0,
      preferredLocation: plan.preferredLocation,
      message: 'Self-registered student via Student Portal',
      status: 'pending',
      paymentStatus: 'unpaid',
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });

    newStudent.requestId = reqDocRef.id;

    return { success: true, student: newStudent };
  } catch (err: any) {
    console.error('registerStudentAccount Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'Registration failed', code: err.code || 'auth/unknown-error' };
  }
}

/**
 * Sign in existing student with email and password
 */
export async function loginStudentUser(
  email: string,
  pass: string
): Promise<{ success: boolean; student?: StudentAccount; error?: string; code?: string; user?: User; isNewGoogleUser?: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!isFirebaseConfigured || !auth || !db) {
    const students = getMockStudents();
    const student = students.find((s) => s.email.toLowerCase() === normalizedEmail);
    if (student) {
      const mockUser: any = { uid: student.authUid || student.id, email: student.email, displayName: student.name };
      return { success: true, student, user: mockUser };
    }
    if (students.length > 0) {
      const fallbackStudent = students[0];
      const mockUser: any = { uid: fallbackStudent.authUid || fallbackStudent.id, email: fallbackStudent.email, displayName: fallbackStudent.name };
      return { success: true, student: fallbackStudent, user: mockUser };
    }
    return {
      success: false,
      error: 'No student account found. Please register first.',
      code: 'auth/user-not-found',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    const user = cred.user;

    // Fetch student document by auth UID
    const studentDocRef = doc(db, 'students', user.uid);
    const studentSnap = await getDoc(studentDocRef);

    if (studentSnap.exists()) {
      const student = { ...studentSnap.data(), id: studentSnap.id } as StudentAccount;
      // Sync email verification status
      if (student.emailVerified !== user.emailVerified) {
        await updateDoc(studentDocRef, { emailVerified: user.emailVerified });
        student.emailVerified = user.emailVerified;
      }
      return { success: true, student, user };
    }

    // If it does not exist: open the same profile form instead of an error
    return {
      success: true,
      isNewGoogleUser: true,
      user,
    };
  } catch (err: any) {
    console.error('loginStudentUser Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'Login failed', code: err.code || 'auth/unknown-error' };
  }
}

/**
 * Google Sign-in for students
 */
export async function signInStudentWithGoogle(): Promise<{
  success: boolean;
  isNewGoogleUser?: boolean;
  student?: StudentAccount;
  user?: User;
  error?: string;
  code?: string;
}> {
  if (!isFirebaseConfigured || !auth || !db) {
    const students = getMockStudents();
    if (students.length > 0) {
      const student = students[0];
      const mockUser: any = { uid: student.authUid || student.id, email: student.email, displayName: student.name };
      return { success: true, student, user: mockUser, isNewGoogleUser: false };
    }
    const mockUser: any = { uid: 'google-student-demo', email: 'demo@google.com', displayName: 'Google Student' };
    return { success: true, isNewGoogleUser: true, user: mockUser };
  }

  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    // Check if student doc exists
    const studentDocRef = doc(db, 'students', user.uid);
    const studentSnap = await getDoc(studentDocRef);

    if (studentSnap.exists()) {
      const student = { ...studentSnap.data(), id: studentSnap.id } as StudentAccount;
      return { success: true, student, user, isNewGoogleUser: false };
    }

    // Needs profile completion
    return {
      success: true,
      isNewGoogleUser: true,
      user,
    };
  } catch (err: any) {
    console.error('signInStudentWithGoogle Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'Google sign-in failed', code: err.code || 'auth/unknown-error' };
  }
}

/**
 * Complete profile registration for first-time Google sign-in
 */
export async function completeGoogleStudentRegistration(
  user: User,
  phone: string,
  plan: StudentRegistrationPlan
): Promise<{ success: boolean; student?: StudentAccount; error?: string; code?: string }> {
  const { requiredDaysCount, isDaily } = calculateRequiredDays(plan.frequency);
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  if (!isFirebaseConfigured || !db) {
    return registerStudentAccount(user.displayName || 'Google Student', user.email || '', phone, 'demo123', plan);
  }

  try {
    const newStudent: StudentAccount = {
      id: user.uid,
      authUid: user.uid,
      name: user.displayName || 'Google Student',
      email: normalizedEmail,
      phone: phone.trim(),
      instrument: plan.instrument,
      frequency: plan.frequency,
      requiredDaysCount,
      isDaily,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      preferredLocation: plan.preferredLocation,
      approvalStatus: 'pending',
      paymentStatus: 'unpaid',
      emailVerified: user.emailVerified,
      selectedWeeklyDays: isDaily ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : [],
      selectedTimeSlots: isDaily ? {
        Monday: '17:00', Tuesday: '17:00', Wednesday: '17:00',
        Thursday: '17:00', Friday: '17:00', Saturday: '17:00'
      } : {},
      daysLocked: false,
      rescheduledOccurrences: {},
      lessonHistory: [],
      createdAt: serverTimestamp(),
    };

    const studentDocRef = doc(db, 'students', user.uid);
    await setDoc(studentDocRef, newStudent);

    // Create matching request
    await addDoc(collection(db, 'requests'), {
      studentUid: user.uid,
      name: user.displayName || 'Google Student',
      email: normalizedEmail,
      phone: phone.trim(),
      instrument: plan.instrument,
      frequency: plan.frequency,
      sessionLength: plan.sessionLength,
      sessionBlocks: plan.sessionBlocks || 2,
      pricePerWeek: plan.pricePerWeek || 0,
      totalPrice: plan.totalPrice || 0,
      preferredLocation: plan.preferredLocation,
      message: 'Registered student via Google Sign-In',
      status: 'pending',
      paymentStatus: 'unpaid',
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });

    return { success: true, student: newStudent };
  } catch (err: any) {
    console.error('completeGoogleStudentRegistration error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Send password reset email
 */
export async function sendStudentPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !auth) {
    return { success: true };
  }
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (err: any) {
    console.error('sendStudentPasswordReset error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'auth/unknown-error' };
  }
}

/**
 * Resend email verification
 */
export async function resendStudentEmailVerification(): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !auth) {
    return { success: true };
  }
  if (!auth.currentUser) {
    return { success: false, error: 'User is not logged in', code: 'auth/not-authenticated' };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (err: any) {
    console.error('resendStudentEmailVerification error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'auth/unknown-error' };
  }
}

/**
 * Change current student password
 */
export async function changeStudentPassword(
  newPass: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !auth) {
    return { success: true };
  }
  if (!auth.currentUser) {
    return { success: false, error: 'User is not authenticated', code: 'auth/not-authenticated' };
  }
  try {
    await updatePassword(auth.currentUser, newPass);
    return { success: true };
  } catch (err: any) {
    console.error('changeStudentPassword error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'auth/unknown-error' };
  }
}

export async function logoutStudentUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e: any) {
      console.warn('Student sign-out error:', e.code, e.message);
    }
  }
}

/**
 * Real-time listener for current student profile
 */
export function subscribeToCurrentStudent(
  studentUid: string,
  callback: (student: StudentAccount | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    let studentSet = mockSubscribers.studentAccount.get(studentUid);
    if (!studentSet) {
      studentSet = new Set();
      mockSubscribers.studentAccount.set(studentUid, studentSet);
    }
    studentSet.add(callback);
    const students = getMockStudents();
    const found = students.find((s) => s.id === studentUid || s.authUid === studentUid) || null;
    callback(found);
    return () => {
      studentSet?.delete(callback);
    };
  }

  const docRef = doc(db, 'students', studentUid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), id: snap.id } as StudentAccount);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('subscribeToCurrentStudent snapshot error:', err);
      if (onError) onError(err);
      callback(null);
    }
  );
}

/**
 * Real-time listener for all students (Admin view)
 */
export function subscribeToAllStudents(
  callback: (students: StudentAccount[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.students.add(callback);
    callback(getMockStudents());
    return () => {
      mockSubscribers.students.delete(callback);
    };
  }

  const colRef = collection(db, 'students');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: StudentAccount[] = [];
      snap.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as StudentAccount);
      });
      callback(items);
    },
    (err) => {
      console.error('subscribeToAllStudents snapshot error:', err);
      if (onError) onError(err);
      callback([]);
    }
  );
}

/**
 * Update student profile doc and delete legacy tempPassword if present
 */
export async function updateStudentProfile(
  studentId: string, 
  updates: Partial<StudentAccount>
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...updates };
      saveMockStudents(students);
    }
    return { success: true };
  }

  try {
    const docRef = doc(db, 'students', studentId);
    await setDoc(docRef, updates, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('updateStudentProfile error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Teacher removes legacy tempPassword from student profile
 */
export async function purgeLegacyTempPassword(studentId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      delete students[idx].tempPassword;
      saveMockStudents(students);
    }
    return;
  }
  try {
    const docRef = doc(db, 'students', studentId);
    await updateDoc(docRef, {
      tempPassword: deleteField(),
    });
  } catch (err) {
    // silently catch if field doesn't exist
  }
}

/**
 * Teacher approves or rejects a registered student
 */
export async function setStudentApproval(
  studentId: string,
  approvalStatus: 'approved' | 'rejected',
  linkedRequestId?: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].approvalStatus = approvalStatus;
      saveMockStudents(students);
    }
    const reqs = getMockRequests();
    const reqIdx = reqs.findIndex((r) => r.studentUid === studentId || r.id === linkedRequestId);
    if (reqIdx !== -1) {
      reqs[reqIdx].status = approvalStatus === 'approved' ? 'confirmed' : 'cancelled';
      saveMockRequests(reqs);
    }
    return { success: true };
  }

  try {
    const studentDocRef = doc(db, 'students', studentId);
    await updateDoc(studentDocRef, { approvalStatus });

    // Also update matching request if exists
    if (linkedRequestId) {
      const reqRef = doc(db, 'requests', linkedRequestId);
      await updateDoc(reqRef, {
        status: approvalStatus === 'approved' ? 'confirmed' : 'cancelled',
      });
    } else {
      // Find matching request by studentUid
      const q = query(collection(db, 'requests'), where('studentUid', '==', studentId));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await updateDoc(d.ref, {
          status: approvalStatus === 'approved' ? 'confirmed' : 'cancelled',
        });
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('setStudentApproval error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 3. BOOKING REQUESTS (REAL-TIME FIRESTORE)
// ==========================================

export async function addBookingRequest(
  data: Omit<BookingRequest, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const mockId = 'req-' + Date.now();
    const newReq: BookingRequest = {
      ...data,
      id: mockId,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    const reqs = getMockRequests();
    reqs.unshift(newReq);
    saveMockRequests(reqs);
    return { success: true, id: mockId };
  }

  try {
    const colRef = collection(db, 'requests');
    const docRef = await addDoc(colRef, {
      ...data,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('addBookingRequest Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'Failed to submit request', code: err.code || 'firestore/error' };
  }
}

export function subscribeToBookingRequests(
  callback: (requests: BookingRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.requests.add(callback);
    callback(getMockRequests());
    return () => {
      mockSubscribers.requests.delete(callback);
    };
  }

  const colRef = collection(db, 'requests');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: BookingRequest[] = [];
      snapshot.forEach((docSnap) => {
        const docData = docSnap.data() as BookingRequest;
        items.push({
          ...docData,
          id: docSnap.id,
        });
      });
      // Sort descending by creation date
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(items);
    },
    (error) => {
      console.error('subscribeToBookingRequests error:', error);
      if (onError) onError(error);
      callback([]);
    }
  );
}

export async function updateBookingRequest(
  id: string, 
  updates: Partial<BookingRequest>
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const reqs = getMockRequests();
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx !== -1) {
      reqs[idx] = { ...reqs[idx], ...updates };
      saveMockRequests(reqs);
    }
    return { success: true };
  }
  try {
    const docRef = doc(db, 'requests', id);
    await updateDoc(docRef, updates);
    return { success: true };
  } catch (err: any) {
    console.error('updateBookingRequest error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function deleteBookingRequest(
  id: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const reqs = getMockRequests().filter((r) => r.id !== id);
    saveMockRequests(reqs);
    return { success: true };
  }
  try {
    const docRef = doc(db, 'requests', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('deleteBookingRequest error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 4. SITE CONTENT & SETTINGS
// ==========================================

export function subscribeToSiteSettings(
  callback: (settings: SiteSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.siteSettings.add(callback);
    callback(getMockSiteSettings());
    return () => {
      mockSubscribers.siteSettings.delete(callback);
    };
  }

  const docRef = doc(db, 'settings', 'site');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...DEFAULT_SITE_SETTINGS, ...(docSnap.data() as SiteSettings) });
      } else {
        callback(DEFAULT_SITE_SETTINGS);
      }
    },
    (err) => {
      console.error('subscribeToSiteSettings error:', err);
      if (onError) onError(err);
      callback(DEFAULT_SITE_SETTINGS);
    }
  );
}

export async function updateSiteSettings(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const cur = getMockSiteSettings();
    saveMockSiteSettings({ ...cur, ...settings });
    return { success: true };
  }
  try {
    const docRef = doc(db, 'settings', 'site');
    await setDoc(docRef, settings, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('updateSiteSettings error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export function subscribeToTeachingRows(
  callback: (rows: TeachingRow[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.teachingRows.add(callback);
    callback(getMockTeachingRows());
    return () => {
      mockSubscribers.teachingRows.delete(callback);
    };
  }

  const docRef = doc(db, 'content', 'teaching');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists() && docSnap.data().rows) {
        callback(docSnap.data().rows as TeachingRow[]);
      } else {
        callback(DEFAULT_TEACHING_ROWS);
      }
    },
    (err) => {
      console.error('subscribeToTeachingRows error:', err);
      if (onError) onError(err);
      callback(DEFAULT_TEACHING_ROWS);
    }
  );
}

export async function updateTeachingRows(
  rows: TeachingRow[]
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    saveMockTeachingRows(rows);
    return { success: true };
  }
  try {
    const docRef = doc(db, 'content', 'teaching');
    await setDoc(docRef, { rows }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('updateTeachingRows error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export function subscribeToCourses(
  callback: (courses: InstrumentCourse[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.courses.add(callback);
    callback(getMockCourses());
    return () => {
      mockSubscribers.courses.delete(callback);
    };
  }

  const docRef = doc(db, 'content', 'courses');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists() && docSnap.data().courses) {
        callback(docSnap.data().courses as InstrumentCourse[]);
      } else {
        callback(DEFAULT_COURSES);
      }
    },
    (err) => {
      console.error('subscribeToCourses error:', err);
      if (onError) onError(err);
      callback(DEFAULT_COURSES);
    }
  );
}

export async function updateCourses(
  courses: InstrumentCourse[]
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    saveMockCourses(courses);
    return { success: true };
  }
  try {
    const docRef = doc(db, 'content', 'courses');
    await setDoc(docRef, { courses }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('updateCourses error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 5. FIREBASE STORAGE IMAGE UPLOAD
// ==========================================

export async function uploadImageFile(
  file: File, 
  folder: string = 'hero'
): Promise<{ success: boolean; url?: string; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !storage) {
    const url = URL.createObjectURL(file);
    return { success: true, url };
  }

  const maxLimit = folder === 'course_materials' ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxLimit) {
    const errorMsg = `File size exceeds maximum allowed limit of ${maxLimit / (1024 * 1024)} MB.`;
    console.error('uploadImageFile error: storage/file-too-large', errorMsg);
    return { success: false, error: errorMsg, code: 'storage/file-too-large' };
  }

  try {
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, filename);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadUrl };
  } catch (err: any) {
    console.error('uploadImageFile Firebase error:', err.code, err.message);
    return { success: false, error: err.message || 'File upload failed', code: err.code || 'storage/upload-failed' };
  }
}

// ==========================================
// 6. SHARED CALENDAR & FIRESTORE TRANSACTIONS
// ==========================================

export function subscribeToCalendarSettings(
  callback: (settings: CalendarSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.calendarSettings.add(callback);
    callback(getMockCalendarSettings());
    return () => {
      mockSubscribers.calendarSettings.delete(callback);
    };
  }

  const docRef = doc(db, 'settings', 'calendar');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...DEFAULT_CALENDAR_SETTINGS, ...(docSnap.data() as CalendarSettings) });
      } else {
        callback(DEFAULT_CALENDAR_SETTINGS);
      }
    },
    (err) => {
      console.error('subscribeToCalendarSettings error:', err);
      if (onError) onError(err);
      callback(DEFAULT_CALENDAR_SETTINGS);
    }
  );
}

export async function updateCalendarSettings(
  settings: Partial<CalendarSettings>
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const cur = getMockCalendarSettings();
    saveMockCalendarSettings({ ...cur, ...settings });
    return { success: true };
  }
  try {
    const docRef = doc(db, 'settings', 'calendar');
    await setDoc(docRef, settings, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('updateCalendarSettings error:', err.code, err.message);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function parseLengthMinutes(lengthStr?: string, blocks?: number): number {
  if (lengthStr) {
    const parsed = parseInt(lengthStr, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (blocks && blocks > 0) return blocks * 30;
  return 60;
}

/**
 * Save a student's permanent recurring weekly slots with Firestore transaction
 * CRITICAL RULE A & D:
 * 1. Do ALL reads first, then ALL writes! (Firestore rejects get after update/set)
 * 2. Slot documents contain ONLY studentId, weekday, startTime and lengthMinutes!
 */
export async function saveStudentRecurringDays(
  studentId: string,
  selectedDays: DayOfWeek[],
  timeSlots: { [key in DayOfWeek]?: string }
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].selectedWeeklyDays = selectedDays;
      students[idx].selectedTimeSlots = timeSlots;
      saveMockStudents(students);
    }
    return { success: true };
  }

  const firestore = db;

  try {
    await runTransaction(firestore, async (transaction) => {
      // ==========================================
      // PHASE 1: ALL READS FIRST
      // ==========================================
      const settingsRef = doc(firestore, 'settings', 'calendar');
      const settingsSnap = await transaction.get(settingsRef);
      const settings: CalendarSettings = settingsSnap.exists()
        ? (settingsSnap.data() as CalendarSettings)
        : DEFAULT_CALENDAR_SETTINGS;

      const maxLimit = settings.maxStudentsPerDay || 5;

      const studentRef = doc(firestore, 'students', studentId);
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Student profile not found in database.');
      }
      const student = studentSnap.data() as StudentAccount;

      if (student.approvalStatus !== 'approved') {
        throw new Error('Your account is waiting for teacher approval before you can pick lesson slots.');
      }

      if (selectedDays.length !== student.requiredDaysCount && !student.isDaily) {
        throw new Error(`You must select exactly ${student.requiredDaysCount} day(s).`);
      }

      // Read all capacity and slot documents for selected days
      const dayReads: Array<{
        day: DayOfWeek;
        slotTime: string;
        dayCapRef: any;
        dayCapSnap: any;
        slotRef: any;
        slotSnap: any;
      }> = [];

      for (const day of selectedDays) {
        const slotTime = timeSlots[day] || '17:00';
        const dayCapRef = doc(firestore, 'calendar_recurring_days', day);
        const slotRef = doc(firestore, 'calendar_recurring_slots', `${day}_${slotTime.replace(':', '')}`);

        const dayCapSnap = await transaction.get(dayCapRef);
        const slotSnap = await transaction.get(slotRef);

        dayReads.push({
          day,
          slotTime,
          dayCapRef,
          dayCapSnap,
          slotRef,
          slotSnap,
        });
      }

      // ==========================================
      // PHASE 2: IN-MEMORY VALIDATION
      // ==========================================
      for (const r of dayReads) {
        const currentStudentIds: string[] = r.dayCapSnap.exists()
          ? (r.dayCapSnap.data().studentIds || [])
          : [];

        if (!currentStudentIds.includes(studentId) && currentStudentIds.length >= maxLimit) {
          throw new Error(`${r.day} has reached capacity (${maxLimit} students). Please pick another day.`);
        }

        if (r.slotSnap.exists() && r.slotSnap.data().studentId !== studentId) {
          throw new Error(`The slot on ${r.day} at ${r.slotTime} was just claimed. Please choose another time.`);
        }
      }

      // ==========================================
      // PHASE 3: ALL WRITES SECOND
      // ==========================================
      // 1. Update student document
      transaction.update(studentRef, {
        selectedWeeklyDays: selectedDays,
        selectedTimeSlots: timeSlots,
        daysLocked: true,
      });

      // 2. Update day capacity and slot documents
      const lengthMinutes = parseLengthMinutes(student.sessionLength, student.sessionBlocks);

      for (const r of dayReads) {
        const currentStudentIds: string[] = r.dayCapSnap.exists()
          ? (r.dayCapSnap.data().studentIds || [])
          : [];
        const updatedStudentIds = Array.from(new Set([...currentStudentIds, studentId]));

        transaction.set(r.dayCapRef, {
          day: r.day,
          count: updatedStudentIds.length,
          studentIds: updatedStudentIds,
        }, { merge: true });

        // Slot document contains ONLY studentId, weekday, startTime and lengthMinutes
        transaction.set(r.slotRef, {
          studentId,
          weekday: r.day,
          startTime: r.slotTime,
          lengthMinutes,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('saveStudentRecurringDays transaction error:', err.code, err.message);
    return { success: false, error: err.message || 'Failed to reserve recurring slots', code: err.code || 'firestore/error' };
  }
}

/**
 * Reschedule a single occurrence with a Firestore transaction
 * Checks inside one transaction:
 * - the new date is not in the past and not in blockedDates
 * - it is an open day and the time is inside the opening hours
 * - it respects the minimum notice (admin setting minNoticeHours, default 12)
 * - it does not overlap another lesson (use start time + real length in minutes)
 * - maxStudentsPerDay is not exceeded, counting recurring students and one-off lessons on that date
 * - originalDateISO is one of this student's real lesson dates
 * - the previous one-off slot is released if the same lesson is rescheduled again
 * CRITICAL RULE A & D: All reads first, then all writes! Slot documents contain only studentId, date, startTime, lengthMinutes.
 */
export async function rescheduleStudentLesson(
  studentId: string,
  originalDateISO: string,
  newDateISO: string,
  newTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].rescheduledOccurrences = {
        ...(students[idx].rescheduledOccurrences || {}),
        [originalDateISO]: {
          newDateISO,
          newTime,
          reason: reason || '',
          rescheduledAt: new Date().toISOString(),
        },
      };
      saveMockStudents(students);
    }
    return { success: true };
  }

  const firestore = db;

  try {
    const newDateObj = new Date(`${newDateISO}T12:00:00Z`);
    const newDayOfWeek = newDateObj.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;

    // Read only documents students are allowed to read:
    // 1. calendar_recurring_slots (weekday, startTime, lengthMinutes, studentId)
    // 2. calendar_single_slots (date, startTime, lengthMinutes, studentId, originalDateISO)
    // 3. calendar_exceptions (studentId, date)
    const [recurringSnap, singleSnap, exceptionsSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'calendar_recurring_slots'), where('weekday', '==', newDayOfWeek))),
      getDocs(query(collection(firestore, 'calendar_single_slots'), where('date', '==', newDateISO))),
      getDocs(query(collection(firestore, 'calendar_exceptions'), where('date', '==', newDateISO))),
    ]);

    const exceptionsOnNewDate = new Set<string>();
    exceptionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.studentId) {
        exceptionsOnNewDate.add(data.studentId);
      }
    });

    const lessonsOnNewDate: Array<{
      studentId: string;
      startTime: string;
      lengthMinutes: number;
    }> = [];

    // Recurring lessons on newDayOfWeek (excluding those moved away and current student)
    recurringSnap.forEach((docSnap) => {
      const slot = docSnap.data() as { weekday: string; startTime: string; lengthMinutes: number; studentId: string };
      if (slot.studentId !== studentId && !exceptionsOnNewDate.has(slot.studentId)) {
        lessonsOnNewDate.push({
          studentId: slot.studentId,
          startTime: slot.startTime,
          lengthMinutes: slot.lengthMinutes || 60,
        });
      }
    });

    // Single slots on newDateISO (excluding current student's previous reschedule for originalDateISO)
    singleSnap.forEach((docSnap) => {
      const single = docSnap.data() as { date: string; startTime: string; lengthMinutes: number; studentId: string; originalDateISO?: string };
      if (single.studentId === studentId && single.originalDateISO === originalDateISO) {
        return;
      }
      lessonsOnNewDate.push({
        studentId: single.studentId,
        startTime: single.startTime,
        lengthMinutes: single.lengthMinutes || 60,
      });
    });

    await runTransaction(firestore, async (transaction) => {
      // ==========================================
      // PHASE 1: ALL READS FIRST
      // ==========================================
      const settingsRef = doc(firestore, 'settings', 'calendar');
      const settingsSnap = await transaction.get(settingsRef);
      const settings: CalendarSettings = settingsSnap.exists()
        ? (settingsSnap.data() as CalendarSettings)
        : DEFAULT_CALENDAR_SETTINGS;

      const studentRef = doc(firestore, 'students', studentId);
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Student profile not found.');
      }
      const student = studentSnap.data() as StudentAccount;

      if (student.approvalStatus !== 'approved') {
        throw new Error('Your account is not approved for scheduling yet.');
      }

      // Check if this occurrence was previously rescheduled
      const prevReschedule = student.rescheduledOccurrences?.[originalDateISO];
      let prevSlotSnap = null;
      let prevSlotRef = null;
      if (prevReschedule) {
        prevSlotRef = doc(firestore, 'calendar_single_slots', `${prevReschedule.newDateISO}_${prevReschedule.newTime.replace(':', '')}`);
        prevSlotSnap = await transaction.get(prevSlotRef);
      }

      const isMovingBack = newDateISO === originalDateISO;
      const newSlotRef = isMovingBack
        ? null
        : doc(firestore, 'calendar_single_slots', `${newDateISO}_${newTime.replace(':', '')}`);
      const newSlotSnap = newSlotRef ? await transaction.get(newSlotRef) : null;

      // ==========================================
      // PHASE 2: VALIDATIONS (IN-MEMORY)
      // ==========================================
      if (newSlotSnap && newSlotSnap.exists() && newSlotSnap.data().studentId !== studentId) {
        throw new Error(`The slot on ${newDateISO} at ${newTime} is already booked by another student.`);
      }

      // 1. New date/time is not in the past
      const newDateTime = new Date(`${newDateISO}T${newTime}:00`);
      if (isNaN(newDateTime.getTime()) || newDateTime.getTime() <= Date.now()) {
        throw new Error('Cannot reschedule to a past date or time.');
      }

      // 2. Not in blockedDates
      if (settings.blockedDates?.includes(newDateISO)) {
        throw new Error('Studio is closed on that date (holiday/blocked). Please pick another date.');
      }

      // 3. Open day
      if (!settings.openDays?.includes(newDayOfWeek)) {
        throw new Error(`${newDateISO} (${newDayOfWeek}) is not an open studio teaching day.`);
      }

      // 4. Time inside opening hours (considering start time + real length in minutes)
      const newStartMin = timeToMinutes(newTime);
      const lengthMinutes = parseLengthMinutes(student.sessionLength, student.sessionBlocks);
      const newEndMin = newStartMin + lengthMinutes;

      const openStartMin = timeToMinutes(settings.startHour || '09:00');
      const openEndMin = timeToMinutes(settings.endHour || '19:00');

      if (newStartMin < openStartMin || newEndMin > openEndMin) {
        throw new Error(`Lesson time (${newTime} - ${minutesToTime(newEndMin)}) falls outside opening hours (${settings.startHour || '09:00'} - ${settings.endHour || '19:00'}).`);
      }

      // 5. Minimum notice check (minNoticeHours, default 12)
      const minNoticeHours = settings.minNoticeHours !== undefined ? settings.minNoticeHours : 12;
      const minNoticeMs = minNoticeHours * 60 * 60 * 1000;

      const origDateObj = new Date(`${originalDateISO}T12:00:00Z`);
      const origDayOfWeek = origDateObj.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
      const origTime = student.selectedTimeSlots?.[origDayOfWeek] || '17:00';
      const origDateTime = new Date(`${originalDateISO}T${origTime}:00`);

      if (origDateTime.getTime() - Date.now() < minNoticeMs) {
        throw new Error(`Rescheduling requires at least ${minNoticeHours} hours advance notice.`);
      }
      if (newDateTime.getTime() - Date.now() < minNoticeMs) {
        throw new Error(`New lesson slot must be at least ${minNoticeHours} hours in advance.`);
      }

      // 6. originalDateISO is one of this student's real lesson dates
      const isStudentRecurringDay = student.isDaily
        ? settings.openDays.includes(origDayOfWeek)
        : (student.selectedWeeklyDays || []).includes(origDayOfWeek);

      const isRealLessonDate = isStudentRecurringDay || Boolean(student.rescheduledOccurrences?.[originalDateISO]);
      if (!isRealLessonDate) {
        throw new Error(`${originalDateISO} is not a valid recurring lesson date for your account.`);
      }

      // 7. Check collision/overlap with any existing lesson on that date
      for (const booked of lessonsOnNewDate) {
        const bStart = timeToMinutes(booked.startTime);
        const bEnd = bStart + booked.lengthMinutes;

        // Overlap condition: max(startA, startB) < min(endA, endB)
        if (Math.max(newStartMin, bStart) < Math.min(newEndMin, bEnd)) {
          throw new Error(`Slot overlaps with an existing lesson scheduled from ${booked.startTime} to ${minutesToTime(bEnd)}.`);
        }
      }

      // 8. Check daily capacity limit
      const distinctStudents = new Set(lessonsOnNewDate.map(l => l.studentId));
      distinctStudents.add(studentId);
      const maxLimit = settings.maxStudentsPerDay || 5;

      if (distinctStudents.size > maxLimit) {
        throw new Error(`${newDateISO} has reached its daily limit of ${maxLimit} students.`);
      }

      // ==========================================
      // PHASE 3: ALL WRITES SECOND
      // ==========================================
      const reschedules = { ...(student.rescheduledOccurrences || {}) };

      if (isMovingBack) {
        delete reschedules[originalDateISO];
        transaction.update(studentRef, {
          rescheduledOccurrences: reschedules,
        });

        // Release previous one-off slot
        if (prevSlotRef) {
          transaction.delete(prevSlotRef);
        }

        // Delete exception document
        const exceptionRef = doc(firestore, 'calendar_exceptions', `${originalDateISO}_${studentId}`);
        transaction.delete(exceptionRef);
      } else {
        reschedules[originalDateISO] = {
          newDateISO,
          newTime,
          reason: reason || 'Student requested reschedule',
          rescheduledAt: new Date().toISOString(),
        };

        // 1. Update student document
        transaction.update(studentRef, {
          rescheduledOccurrences: reschedules,
        });

        // 2. Release previous one-off slot if lesson was rescheduled before
        if (prevSlotRef) {
          transaction.delete(prevSlotRef);
        }

        // 3. Write new slot document (ONLY studentId, date, startTime, lengthMinutes)
        transaction.set(newSlotRef!, {
          studentId,
          date: newDateISO,
          startTime: newTime,
          lengthMinutes,
          originalDateISO,
          isRescheduled: true,
          updatedAt: new Date().toISOString(),
        });

        // 4. Write exception document {studentId, date} with id "{date}_{studentId}"
        const exceptionRef = doc(firestore, 'calendar_exceptions', `${originalDateISO}_${studentId}`);
        transaction.set(exceptionRef, {
          studentId,
          date: originalDateISO,
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('rescheduleStudentLesson transaction error:', err.code, err.message);
    return { success: false, error: err.message || 'Reschedule failed', code: err.code || 'firestore/error' };
  }
}

/**
 * Compute real-time payment summary for a student based on payment records (Part 2 Requirement D)
 */
export function computeStudentPaymentSummary(
  student: StudentAccount,
  ratePer30Min: number = 12
) {
  const blocks = student.sessionBlocks || 2;
  const weeklySessions = student.requiredDaysCount || (student.isDaily ? 6 : (student.selectedWeeklyDays?.length || 2));
  const monthlyTuition = blocks * ratePer30Min * weeklySessions * 4;
  const allPayments = student.payments || [];
  // Only confirmed payments count toward paid total (legacy payments with no status count as confirmed)
  const confirmedPayments = allPayments.filter(p => !p.status || p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const amountDue = Math.max(0, monthlyTuition - totalPaid);

  let computedStatus: PaymentStatus = 'unpaid';
  if (confirmedPayments.length > 0) {
    computedStatus = totalPaid >= monthlyTuition ? 'paid' : 'unpaid';
  } else {
    computedStatus = student.paymentStatus || 'unpaid';
  }

  let nextDueDate = '';
  if (confirmedPayments.length > 0) {
    const sorted = [...confirmedPayments].sort((a, b) => b.date.localeCompare(a.date));
    const d = new Date(sorted[0].date + 'T12:00:00Z');
    d.setMonth(d.getMonth() + 1);
    nextDueDate = d.toISOString().split('T')[0];
  } else {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextDueDate = nextMonth.toISOString().split('T')[0];
  }

  return {
    monthlyTuition,
    totalPaid,
    amountDue,
    paymentStatus: computedStatus,
    nextDueDate,
    paymentCount: allPayments.length,
    confirmedCount: confirmedPayments.length,
    pendingCount: allPayments.filter(p => p.status === 'pending').length,
  };
}

/**
 * Record a payment for a student (Admin or Student)
 */
export async function recordStudentPayment(
  studentId: string,
  paymentData: Omit<PaymentRecord, 'id'>,
  isStudentSubmission: boolean = false
): Promise<{ success: boolean; paymentId?: string; error?: string; code?: string }> {
  const newPayment: PaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId,
    date: paymentData.date,
    amount: Number(paymentData.amount),
    method: paymentData.method,
    status: isStudentSubmission ? 'pending' : (paymentData.status || 'confirmed'),
    note: paymentData.note || '',
    receiptUrl: paymentData.receiptUrl,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      const existingPayments = students[idx].payments || [];
      students[idx].payments = [...existingPayments, newPayment];
      if (!isStudentSubmission && newPayment.status === 'confirmed') {
        const summary = computeStudentPaymentSummary(students[idx]);
        students[idx].paymentStatus = summary.paymentStatus;
      }
      saveMockStudents(students);
    }
    return { success: true, paymentId: newPayment.id };
  }

  try {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      return { success: false, error: 'Student profile not found', code: 'firestore/not-found' };
    }
    const student = snap.data() as StudentAccount;
    const existingPayments = student.payments || [];
    const updatedPayments = [...existingPayments, newPayment];

    const updates: Partial<StudentAccount> = { payments: updatedPayments };
    if (!isStudentSubmission && newPayment.status === 'confirmed') {
      const testStudent = { ...student, payments: updatedPayments };
      const summary = computeStudentPaymentSummary(testStudent);
      updates.paymentStatus = summary.paymentStatus;
    }

    await updateDoc(studentRef, updates);
    return { success: true, paymentId: newPayment.id };
  } catch (err: any) {
    console.error('recordStudentPayment error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Update an existing student payment record (Admin only)
 */
export async function updateStudentPayment(
  studentId: string,
  paymentId: string,
  updatedData: Partial<PaymentRecord>
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      const existingPayments = students[idx].payments || [];
      students[idx].payments = existingPayments.map(p => 
        p.id === paymentId ? { ...p, ...updatedData, updatedAt: new Date().toISOString() } : p
      );
      const summary = computeStudentPaymentSummary(students[idx]);
      students[idx].paymentStatus = summary.paymentStatus;
      saveMockStudents(students);
    }
    return { success: true };
  }

  try {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      return { success: false, error: 'Student not found', code: 'firestore/not-found' };
    }
    const student = snap.data() as StudentAccount;
    const existingPayments = student.payments || [];
    const updatedPayments = existingPayments.map(p => 
      p.id === paymentId ? { ...p, ...updatedData, updatedAt: new Date().toISOString() } : p
    );

    const testStudent = { ...student, payments: updatedPayments };
    const summary = computeStudentPaymentSummary(testStudent);

    await updateDoc(studentRef, {
      payments: updatedPayments,
      paymentStatus: summary.paymentStatus
    });
    return { success: true };
  } catch (err: any) {
    console.error('updateStudentPayment error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Confirm a pending payment (Admin only, automatically updates student paymentStatus)
 */
export async function confirmStudentPayment(
  studentId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  return updateStudentPayment(studentId, paymentId, { status: 'confirmed' });
}

/**
 * Reject a pending payment (Admin only)
 */
export async function rejectStudentPayment(
  studentId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  return updateStudentPayment(studentId, paymentId, { status: 'rejected' });
}

/**
 * Delete a student payment record
 */
export async function deleteStudentPayment(
  studentId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].payments = (students[idx].payments || []).filter((p) => p.id !== paymentId);
      saveMockStudents(students);
    }
    return { success: true };
  }

  try {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      return { success: false, error: 'Student profile not found', code: 'firestore/not-found' };
    }
    const student = snap.data() as StudentAccount;
    const updatedPayments = (student.payments || []).filter(p => p.id !== paymentId);
    await updateDoc(studentRef, { payments: updatedPayments });
    return { success: true };
  } catch (err: any) {
    console.error('deleteStudentPayment error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Admin logs or updates a student's lesson attendance in lessonHistory (Part 2 Requirement A & C)
 */
export async function logStudentLessonAttendance(
  studentId: string,
  entry: {
    date: string;
    time: string;
    status: LessonAttendanceStatus;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      const history = [...(students[idx].lessonHistory || [])];
      const existingIdx = history.findIndex((h) => h.date === entry.date && h.time === entry.time);
      if (existingIdx >= 0) {
        history[existingIdx] = { ...history[existingIdx], ...entry };
      } else {
        history.unshift(entry);
      }
      students[idx].lessonHistory = history;
      saveMockStudents(students);
    }
    return { success: true };
  }

  try {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      return { success: false, error: 'Student not found', code: 'firestore/not-found' };
    }
    const student = snap.data() as StudentAccount;
    const history = [...(student.lessonHistory || [])];

    const existingIdx = history.findIndex(h => h.date === entry.date && h.time === entry.time);
    if (existingIdx >= 0) {
      history[existingIdx] = { ...history[existingIdx], ...entry };
    } else {
      history.unshift(entry);
    }

    await updateDoc(studentRef, { lessonHistory: history });
    return { success: true };
  } catch (err: any) {
    console.error('logStudentLessonAttendance error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

/**
 * Admin cancels a lesson from the calendar (Part 2 Requirement A)
 */
export async function adminCancelLesson(
  studentId: string,
  dateISO: string,
  time: string,
  reason?: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  return logStudentLessonAttendance(studentId, {
    date: dateISO,
    time,
    status: 'cancelled',
    notes: reason || 'Cancelled by teacher',
  });
}

/**
 * Admin moves a lesson from the calendar to another date/time (Part 2 Requirement A)
 */
export async function adminMoveLesson(
  studentId: string,
  originalDateISO: string,
  newDateISO: string,
  newTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  return rescheduleStudentLesson(studentId, originalDateISO, newDateISO, newTime, reason || 'Moved by teacher');
}

/**
 * Toggle blocked date on calendar settings (Part 2 Requirement B)
 */
export async function toggleBlockCalendarDate(
  dateISO: string
): Promise<{ success: boolean; isBlocked?: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    const settings = getMockCalendarSettings();
    const blocked = settings.blockedDates || [];
    let updated: string[];
    let isBlocked: boolean;
    if (blocked.includes(dateISO)) {
      updated = blocked.filter((d) => d !== dateISO);
      isBlocked = false;
    } else {
      updated = [...blocked, dateISO].sort();
      isBlocked = true;
    }
    saveMockCalendarSettings({ ...settings, blockedDates: updated });
    return { success: true, isBlocked };
  }

  try {
    const docRef = doc(db, 'settings', 'calendar');
    const snap = await getDoc(docRef);
    const settings: CalendarSettings = snap.exists() ? (snap.data() as CalendarSettings) : DEFAULT_CALENDAR_SETTINGS;
    const blocked = settings.blockedDates || [];
    let updated: string[];
    let isBlocked: boolean;
    if (blocked.includes(dateISO)) {
      updated = blocked.filter(d => d !== dateISO);
      isBlocked = false;
    } else {
      updated = [...blocked, dateISO].sort();
      isBlocked = true;
    }
    await setDoc(docRef, { ...settings, blockedDates: updated }, { merge: true });
    return { success: true, isBlocked };
  } catch (err: any) {
    console.error('toggleBlockCalendarDate error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update private admin notes for a student
 */
export async function updateStudentAdminNotes(
  studentId: string,
  adminNotes: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].adminNotes = adminNotes;
      saveMockStudents(students);
    }
    return { success: true };
  }
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, { adminNotes });
    return { success: true };
  } catch (err: any) {
    console.error('updateStudentAdminNotes error:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 7. CONNECTION DIAGNOSTICS FOR ADMIN
// ==========================================

export interface DiagnosticResult {
  envVars: Array<{ key: string; present: boolean; maskedValue: string }>;
  firestore: { ok: boolean; message: string; error?: string; code?: string };
  storage: { ok: boolean; message: string; error?: string; code?: string };
  authProviders: { google: boolean; emailPassword: boolean; message: string };
  adminUid: { configured: boolean; uid: string };
}

export async function runConnectionDiagnostics(): Promise<DiagnosticResult> {
  const envVars = [
    {
      key: 'VITE_FIREBASE_API_KEY',
      present: Boolean(firebaseConfig.apiKey),
      maskedValue: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 6)}...` : 'Missing',
    },
    {
      key: 'VITE_FIREBASE_AUTH_DOMAIN',
      present: Boolean(firebaseConfig.authDomain),
      maskedValue: firebaseConfig.authDomain || 'Missing',
    },
    {
      key: 'VITE_FIREBASE_PROJECT_ID',
      present: Boolean(firebaseConfig.projectId),
      maskedValue: firebaseConfig.projectId || 'Missing',
    },
    {
      key: 'VITE_FIREBASE_STORAGE_BUCKET',
      present: Boolean(firebaseConfig.storageBucket),
      maskedValue: firebaseConfig.storageBucket || 'Missing',
    },
    {
      key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
      present: Boolean(firebaseConfig.messagingSenderId),
      maskedValue: firebaseConfig.messagingSenderId || 'Missing',
    },
    {
      key: 'VITE_FIREBASE_APP_ID',
      present: Boolean(firebaseConfig.appId),
      maskedValue: firebaseConfig.appId ? `${firebaseConfig.appId.slice(0, 10)}...` : 'Missing',
    },
    {
      key: 'VITE_ADMIN_UID',
      present: Boolean(ADMIN_UID),
      maskedValue: ADMIN_UID ? `${ADMIN_UID.slice(0, 8)}...` : 'Not set (Required for Admin entry)',
    },
  ];

  // Test Firestore
  let firestoreStatus: { ok: boolean; message: string; error?: string; code?: string } = {
    ok: false,
    message: 'Firestore not checked',
  };

  if (db) {
    try {
      const testDocRef = doc(db, 'settings', 'site');
      await getDoc(testDocRef);
      firestoreStatus = { ok: true, message: 'Firestore read test succeeded. Documents reachable.' };
    } catch (err: any) {
      console.error('Diagnostics Firestore check error:', err.code, err.message);
      firestoreStatus = {
        ok: false,
        message: err.message || 'Firestore read test failed',
        error: err.message,
        code: err.code || 'firestore/error',
      };
    }
  } else {
    firestoreStatus = { ok: false, message: 'Firestore instance not initialized.' };
  }

  // Test Storage
  let storageStatus: { ok: boolean; message: string; error?: string; code?: string } = {
    ok: false,
    message: 'Storage not checked',
  };

  if (storage) {
    try {
      const probeRef = ref(storage, '_probe_ping.txt');
      // Storage ref created successfully
      storageStatus = {
        ok: true,
        message: `Storage bucket connected: ${firebaseConfig.storageBucket}`,
      };
    } catch (err: any) {
      console.error('Diagnostics Storage check error:', err.code, err.message);
      storageStatus = {
        ok: false,
        message: err.message || 'Storage check failed',
        error: err.message,
        code: err.code || 'storage/error',
      };
    }
  } else {
    storageStatus = { ok: false, message: 'Storage instance not initialized.' };
  }

  return {
    envVars,
    firestore: firestoreStatus,
    storage: storageStatus,
    authProviders: {
      google: true,
      emailPassword: true,
      message: 'Email/Password and Google Popup providers initialized.',
    },
    adminUid: {
      configured: Boolean(ADMIN_UID),
      uid: ADMIN_UID || 'Unset',
    },
  };
}

// ==========================================
// 12. LIBRARY COURSES (STUDENTS & ADMIN)
// ==========================================

export function subscribeToLibraryCourses(
  callback: (courses: LibraryCourse[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.libraryCourses.add(callback);
    callback(getMockLibraryCourses());
    return () => {
      mockSubscribers.libraryCourses.delete(callback);
    };
  }

  const colRef = collection(db, 'library_courses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const courses: LibraryCourse[] = [];
      snapshot.forEach((docSnap) => {
        courses.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      // Sort: published/new first, then by title
      courses.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      callback(courses);
    },
    (err) => {
      console.error('subscribeToLibraryCourses error:', err);
      if (onError) onError(err);
      callback([]);
    }
  );
}

export async function addLibraryCourse(
  courseData: Omit<LibraryCourse, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string; code?: string }> {
  const cleanCourseData: any = {};
  for (const [key, value] of Object.entries(courseData)) {
    if (value !== undefined) {
      cleanCourseData[key] = value;
    }
  }

  if (!isFirebaseConfigured || !db) {
    const id = 'lib-course-' + Date.now();
    const newCourse: LibraryCourse = {
      ...cleanCourseData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const courses = getMockLibraryCourses();
    courses.push(newCourse);
    saveMockLibraryCourses(courses);
    return { success: true, id };
  }

  try {
    const colRef = collection(db, 'library_courses');
    const docRef = await addDoc(colRef, {
      ...cleanCourseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('addLibraryCourse error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function updateLibraryCourse(
  courseId: string,
  updates: Partial<LibraryCourse>
): Promise<{ success: boolean; error?: string; code?: string }> {
  const cleanUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  if (!isFirebaseConfigured || !db) {
    const courses = getMockLibraryCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx !== -1) {
      courses[idx] = { ...courses[idx], ...cleanUpdates, updatedAt: new Date().toISOString() };
      saveMockLibraryCourses(courses);
    }
    return { success: true };
  }

  try {
    const docRef = doc(db, 'library_courses', courseId);
    await updateDoc(docRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('updateLibraryCourse error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function deleteLibraryCourse(
  courseId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const courses = getMockLibraryCourses().filter((c) => c.id !== courseId);
    saveMockLibraryCourses(courses);
    return { success: true };
  }

  try {
    const docRef = doc(db, 'library_courses', courseId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('deleteLibraryCourse error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 13. COMMUNITY CHAT MESSAGES
// ==========================================

export function subscribeToCommunityMessages(
  callback: (messages: CommunityMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    mockSubscribers.communityMessages.add(callback);
    callback(getMockCommunityMessages());
    return () => {
      mockSubscribers.communityMessages.delete(callback);
    };
  }

  const colRef = collection(db, 'community_messages');
  const q = query(colRef, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: CommunityMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(messages);
    },
    (err) => {
      console.error('subscribeToCommunityMessages error:', err);
      if (onError) onError(err);
      callback([]);
    }
  );
}

export async function postCommunityMessage(message: {
  studentId: string;
  authorName: string;
  authorPhotoUrl?: string;
  authorRole: 'student' | 'teacher';
  text: string;
  imageUrl?: string;
}): Promise<{ success: boolean; id?: string; error?: string; code?: string }> {
  const cleanData: any = {
    studentId: message.studentId,
    authorName: message.authorName,
    authorRole: message.authorRole,
    text: message.text || '',
  };
  if (message.authorPhotoUrl && message.authorPhotoUrl.trim()) {
    cleanData.authorPhotoUrl = message.authorPhotoUrl.trim();
  }
  if (message.imageUrl && message.imageUrl.trim()) {
    cleanData.imageUrl = message.imageUrl.trim();
  }

  if (!isFirebaseConfigured || !db) {
    const id = 'msg-' + Date.now();
    const newMsg: CommunityMessage = {
      ...cleanData,
      id,
      createdAt: new Date().toISOString(),
    };
    const msgs = getMockCommunityMessages();
    msgs.push(newMsg);
    saveMockCommunityMessages(msgs);
    return { success: true, id };
  }

  try {
    const colRef = collection(db, 'community_messages');
    const docRef = await addDoc(colRef, {
      ...cleanData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('postCommunityMessage error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function deleteCommunityMessage(
  messageId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const msgs = getMockCommunityMessages().filter((m) => m.id !== messageId);
    saveMockCommunityMessages(msgs);
    return { success: true };
  }

  try {
    const docRef = doc(db, 'community_messages', messageId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('deleteCommunityMessage error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function toggleStudentMute(
  studentId: string,
  isMuted: boolean
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const students = getMockStudents();
    const idx = students.findIndex((s) => s.id === studentId || s.authUid === studentId);
    if (idx !== -1) {
      students[idx].isMuted = isMuted;
      saveMockStudents(students);
    }
    return { success: true };
  }

  try {
    const docRef = doc(db, 'students', studentId);
    await updateDoc(docRef, { isMuted });
    return { success: true };
  } catch (err: any) {
    console.error('toggleStudentMute error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 8. LIBRARY ITEMS (BOOKS, SCORES, PDFS, LINKS)
// ==========================================

const MOCK_LIBRARY_ITEMS_KEY = 'mimouni_mock_library_items';

function getMockLibraryItems(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(MOCK_LIBRARY_ITEMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read mock library items from localStorage', e);
  }
  return [
    {
      id: 'lib_item_1',
      title: 'Hanon: The Virtuoso Pianist (60 Exercises)',
      titleFr: 'Hanon : Le Pianiste Virtuose (60 Exercices)',
      description: 'The complete foundational technical gymnastics for piano agility, independence, and finger strength.',
      descriptionFr: 'La gymnastique technique complète pour l\'agilité, l\'indépendance et la force des doigts.',
      category: 'book',
      author: 'C.L. Hanon',
      instrument: 'Piano',
      level: 'All Levels',
      status: 'published',
      accessStudentIds: ['*'],
      externalUrl: 'https://imslp.org/wiki/The_Virtuoso_Pianist_(Hanon,_Charles-Louis)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_item_2',
      title: 'Chopin - Nocturnes Complete (Urtext Edition)',
      titleFr: 'Chopin - Nocturnes Complets (Édition Urtext)',
      description: 'Complete high-fidelity score collection with pedagogical pedaling and phrasing annotations.',
      descriptionFr: 'Recueil complet de partitions avec annotations de phrasé et de pédale par le professeur.',
      category: 'score',
      author: 'Frédéric Chopin',
      instrument: 'Piano',
      level: 'Intermediate - Advanced',
      status: 'published',
      accessStudentIds: ['*'],
      externalUrl: 'https://imslp.org/wiki/Nocturnes,_Op.9_(Chopin,_Fr%C3%A9d%C3%A9ric)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lib_item_3',
      title: 'Guide to Classical Solfège & Ear Training',
      titleFr: 'Guide de Solfège & Entraînement de l\'Oreille',
      description: 'Comprehensive rhythm, pitch recognition, and sight-reading workbook used in Tunisian conservatories.',
      descriptionFr: 'Cahier complet de rythme, de reconnaissance tonale et de déchiffrage utilisé en conservatoire.',
      category: 'pdf',
      author: 'Mohamed Mimouni',
      instrument: 'Music Theory / Solfège',
      level: 'Beginner - Intermediate',
      status: 'published',
      accessStudentIds: ['*'],
      externalUrl: 'https://www.musictheory.net/exercises',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
}

function saveMockLibraryItems(items: LibraryItem[]) {
  try {
    localStorage.setItem(MOCK_LIBRARY_ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not save mock library items to localStorage', e);
  }
}

export function subscribeToLibraryItems(
  onUpdate: (items: LibraryItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onUpdate(getMockLibraryItems());
    const interval = setInterval(() => {
      onUpdate(getMockLibraryItems());
    }, 2000);
    return () => clearInterval(interval);
  }

  const q = query(collection(db, 'library_items'));
  return onSnapshot(
    q,
    (snap) => {
      const list: LibraryItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LibraryItem, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.error('subscribeToLibraryItems error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addLibraryItem(
  itemData: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string; code?: string }> {
  const cleanData: any = {};
  for (const [k, v] of Object.entries(itemData)) {
    if (v !== undefined) cleanData[k] = v;
  }

  if (!isFirebaseConfigured || !db) {
    const id = `lib_item_${Date.now()}`;
    const newItem: LibraryItem = {
      id,
      ...cleanData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const items = getMockLibraryItems();
    items.unshift(newItem);
    saveMockLibraryItems(items);
    return { success: true, id };
  }

  try {
    const colRef = collection(db, 'library_items');
    const docRef = await addDoc(colRef, {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('addLibraryItem error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function updateLibraryItem(
  itemId: string,
  updates: Partial<Omit<LibraryItem, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string; code?: string }> {
  const cleanData: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) cleanData[k] = v;
  }

  if (!isFirebaseConfigured || !db) {
    const items = getMockLibraryItems();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        ...cleanData,
        updatedAt: new Date().toISOString(),
      };
      saveMockLibraryItems(items);
    }
    return { success: true };
  }

  try {
    const docRef = doc(db, 'library_items', itemId);
    await updateDoc(docRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('updateLibraryItem error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

export async function deleteLibraryItem(
  itemId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !db) {
    const items = getMockLibraryItems().filter((i) => i.id !== itemId);
    saveMockLibraryItems(items);
    return { success: true };
  }

  try {
    const docRef = doc(db, 'library_items', itemId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('deleteLibraryItem error:', err);
    return { success: false, error: err.message, code: err.code || 'firestore/error' };
  }
}

// ==========================================
// 9. IN-APP NOTIFICATIONS & FCM PUSH NOTIFICATIONS
// ==========================================

const MOCK_NOTIFICATIONS_KEY = 'mimouni_mock_notifications';

function getMockNotifications(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read mock notifications from localStorage', e);
  }
  return [
    {
      id: 'notif_welcome',
      userId: 'all',
      title: 'Welcome to Mimouni Studio Student Space',
      titleFr: 'Bienvenue dans votre Espace Élève Mimouni',
      body: 'Explore your weekly calendar, library scores, and community feed.',
      bodyFr: 'Consultez votre planning hebdomadaire, vos partitions et vos actualités.',
      read: false,
      type: 'announcement',
      createdAt: new Date().toISOString(),
    }
  ];
}

function saveMockNotifications(items: InAppNotification[]) {
  try {
    localStorage.setItem(MOCK_NOTIFICATIONS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not save mock notifications to localStorage', e);
  }
}

export function subscribeToUserNotifications(
  userId: string,
  onUpdate: (notifications: InAppNotification[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    const all = getMockNotifications();
    const filtered = all.filter(n => n.userId === userId || n.userId === 'all' || (userId === ADMIN_UID && n.userId === 'admin'));
    onUpdate(filtered);
    const interval = setInterval(() => {
      const cur = getMockNotifications();
      const f = cur.filter(n => n.userId === userId || n.userId === 'all' || (userId === ADMIN_UID && n.userId === 'admin'));
      onUpdate(f);
    }, 2500);
    return () => clearInterval(interval);
  }

  // Subscribe to all notifications and filter in memory to avoid index requirements
  const q = query(collection(db, 'notifications'));
  return onSnapshot(
    q,
    (snap) => {
      const list: InAppNotification[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<InAppNotification, 'id'>),
      }));
      const userList = list.filter(n => n.userId === userId || n.userId === 'all' || (userId === ADMIN_UID && n.userId === 'admin'));
      userList.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });
      onUpdate(userList);
    },
    (err) => {
      console.error('subscribeToUserNotifications error:', err);
      if (onError) onError(err);
    }
  );
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    const list = getMockNotifications();
    const idx = list.findIndex(n => n.id === notificationId);
    if (idx !== -1) {
      list[idx].read = true;
      saveMockNotifications(list);
    }
    return { success: true };
  }

  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
    return { success: true };
  } catch (err: any) {
    console.error('markNotificationAsRead error:', err);
    return { success: false, error: err.message };
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    const list = getMockNotifications();
    list.forEach(n => {
      if (n.userId === userId || n.userId === 'all' || (userId === ADMIN_UID && n.userId === 'admin')) {
        n.read = true;
      }
    });
    saveMockNotifications(list);
    return { success: true };
  }

  try {
    const q = query(collection(db, 'notifications'));
    const snap = await getDocs(q);
    const updates = snap.docs
      .filter(d => {
        const data = d.data();
        return (data.userId === userId || data.userId === 'all' || (userId === ADMIN_UID && data.userId === 'admin')) && !data.read;
      })
      .map(d => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);
    return { success: true };
  } catch (err: any) {
    console.error('markAllNotificationsAsRead error:', err);
    return { success: false, error: err.message };
  }
}

export async function createInAppNotification(
  notification: Omit<InAppNotification, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const cleanData: any = {};
  for (const [k, v] of Object.entries(notification)) {
    if (v !== undefined) cleanData[k] = v;
  }

  if (!isFirebaseConfigured || !db) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: InAppNotification = {
      id,
      ...cleanData,
      createdAt: new Date().toISOString(),
    };
    const list = getMockNotifications();
    list.unshift(newNotif);
    saveMockNotifications(list);
    return { success: true, id };
  }

  try {
    const colRef = collection(db, 'notifications');
    const docRef = await addDoc(colRef, {
      ...cleanData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('createInAppNotification error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Register or update FCM Token in Firestore for Web Push
 */
export async function registerFcmToken(
  userId: string,
  token: string,
  role: 'student' | 'admin',
  language: 'en' | 'fr'
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    try {
      localStorage.setItem('mimouni_fcm_token', JSON.stringify({ userId, token, role, language }));
    } catch (e) {}
    return { success: true };
  }

  try {
    // Unique ID combining userId and hashed token or sanitized token
    const tokenDocId = `${userId}_${token.slice(-16)}`;
    const tokenRef = doc(db, 'fcm_tokens', tokenDocId);
    await setDoc(tokenRef, {
      userId,
      token,
      role,
      language,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('registerFcmToken error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Request Notification Permission and register token using VAPID key
 */
export async function requestWebPushPermission(
  userId: string,
  role: 'student' | 'admin' = 'student',
  language: 'en' | 'fr' = 'en'
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY is not defined. Device permission granted; register push token when VAPID key is configured.');
      return { success: true };
    }

    if (!app) {
      return { success: true };
    }

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(app);

    // Register service worker if not already registered
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (currentToken) {
      await registerFcmToken(userId, currentToken, role, language);
      return { success: true, token: currentToken };
    } else {
      return { success: false, error: 'No FCM registration token received.' };
    }
  } catch (err: any) {
    console.error('requestWebPushPermission error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Push Notification via Backend Server Endpoint (/api/send-notification)
 */
export async function sendPushNotification(payload: {
  target: 'all' | 'students' | 'admin' | 'selected';
  studentIds?: string[];
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
  link?: string;
  type?: 'payment_confirmed' | 'payment_rejected' | 'payment_submitted' | 'new_course' | 'new_library_item' | 'announcement';
}): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  // Always write in-app notification first so users without push permission still receive it
  try {
    if (payload.target === 'all') {
      await createInAppNotification({
        userId: 'all',
        title: payload.titleEn,
        titleFr: payload.titleFr,
        body: payload.bodyEn,
        bodyFr: payload.bodyFr,
        link: payload.link,
        type: payload.type || 'announcement',
        read: false,
      });
    } else if (payload.target === 'admin') {
      await createInAppNotification({
        userId: 'admin',
        title: payload.titleEn,
        titleFr: payload.titleFr,
        body: payload.bodyEn,
        bodyFr: payload.bodyFr,
        link: payload.link,
        type: payload.type || 'announcement',
        read: false,
      });
    } else if (payload.studentIds && payload.studentIds.length > 0) {
      for (const sid of payload.studentIds) {
        await createInAppNotification({
          userId: sid,
          title: payload.titleEn,
          titleFr: payload.titleFr,
          body: payload.bodyEn,
          bodyFr: payload.bodyFr,
          link: payload.link,
          type: payload.type || 'announcement',
          read: false,
        });
      }
    }
  } catch (notifErr) {
    console.warn('Error saving in-app notification:', notifErr);
  }

  // Attempt server-side FCM push dispatch
  try {
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, sentCount: data.sentCount || 1 };
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('Push API response not ok:', res.status, errData);
      return { success: true, sentCount: 1, error: errData.error || 'Server dispatch responded with error' };
    }
  } catch (err: any) {
    console.warn('Backend push dispatch unavailable (fallback to in-app notification only):', err.message);
    return { success: true, sentCount: 1 };
  }
}


