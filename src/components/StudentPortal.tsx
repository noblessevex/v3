import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Music, CheckCircle2, AlertCircle, 
  LogOut, ArrowLeft, RefreshCw, Lock, Sparkles, ChevronRight, User, 
  CreditCard, ShieldCheck, MapPin, Check, Eye, EyeOff, Mail, KeyRound, 
  Send, Phone as PhoneIcon, X, BookOpen, MessageSquare
} from 'lucide-react';
import { StudentAccount, CalendarSettings, DayOfWeek, Language } from '../types';
import { 
  loginStudentUser, 
  registerStudentAccount,
  signInStudentWithGoogle,
  completeGoogleStudentRegistration,
  sendStudentPasswordReset,
  resendStudentEmailVerification,
  changeStudentPassword,
  logoutStudentUser, 
  subscribeToCurrentStudent, 
  subscribeToCalendarSettings,
  saveStudentRecurringDays,
  rescheduleStudentLesson,
  DEFAULT_CALENDAR_SETTINGS,
  DEFAULT_COURSES,
  isFirebaseConfigured
} from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { StudentProfileSection } from './StudentProfileSection';
import { StudentLibrarySection } from './StudentLibrarySection';
import { StudentCommunitySection } from './StudentCommunitySection';
import { translations } from '../translations';

interface StudentPortalProps {
  currentLang: Language;
  onBackToSite: () => void;
  prefillPlan?: {
    durationLabel: string;
    durationMinutes: number;
    blocks: number;
    frequencyLabel: string;
    weeklySessions: number;
    pricePerWeek: number;
    pricePerMonth: number;
  };
}

const ALL_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function validateTunisianPhone(phone: string): { valid: boolean; normalized: string } {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (/^(\+216)?[234579]\d{7}$/.test(cleaned)) {
    const digits = cleaned.startsWith('+216') ? cleaned : `+216${cleaned}`;
    return { valid: true, normalized: digits };
  }
  return { valid: false, normalized: phone };
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ 
  currentLang, 
  onBackToSite,
  prefillPlan 
}) => {
  // Authentication state
  const [currentStudent, setCurrentStudent] = useState<StudentAccount | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<{ message: string; code?: string } | null>(null);

  // Forgot password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<{ message: string; code?: string } | null>(null);

  // Create Account form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+216 ');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regInstrument, setRegInstrument] = useState(DEFAULT_COURSES[0].nameEn);
  const [regSessionLength, setRegSessionLength] = useState(prefillPlan?.durationLabel ? `${prefillPlan.durationMinutes} min` : '60 min');
  const [regFrequency, setRegFrequency] = useState(prefillPlan?.frequencyLabel || '2x per week');
  const [regLocation, setRegLocation] = useState("Teacher's Studio (Ben Arous)");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<{ message: string; code?: string } | null>(null);

  // Google sign-in onboarding modal (first-time Google user)
  const [googleOnboardingUser, setGoogleOnboardingUser] = useState<FirebaseUser | null>(null);
  const [googlePhone, setGooglePhone] = useState('+216 ');
  const [googleInstrument, setGoogleInstrument] = useState(DEFAULT_COURSES[0].nameEn);
  const [googleSessionLength, setGoogleSessionLength] = useState('60 min');
  const [googleFrequency, setGoogleFrequency] = useState('2x per week');
  const [googleLocation, setGoogleLocation] = useState("Teacher's Studio (Ben Arous)");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<{ message: string; code?: string } | null>(null);

  // Change password modal
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);
  const [changePassError, setChangePassError] = useState<{ message: string; code?: string } | null>(null);

  // Resend email verification
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Calendar settings
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR_SETTINGS);

  // Day picker state (for initial setup)
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<{ [key in DayOfWeek]?: string }>({});
  const [submittingDays, setSubmittingDays] = useState(false);
  const [daysError, setDaysError] = useState<{ message: string; code?: string } | null>(null);

  // Reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState<string | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('17:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<{ message: string; code?: string } | null>(null);

  // Student Space Tabs ('lessons' | 'profile' | 'library' | 'community')
  const [activeSpaceTab, setActiveSpaceTab] = useState<'lessons' | 'profile' | 'library' | 'community'>('lessons');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Prefill plan if user navigated after using pricing calculator
  useEffect(() => {
    if (prefillPlan) {
      setRegSessionLength(`${prefillPlan.durationMinutes} min`);
      setRegFrequency(prefillPlan.frequencyLabel);
    }
  }, [prefillPlan]);

  // Subscribe to calendar settings
  useEffect(() => {
    const unsub = subscribeToCalendarSettings(
      setCalendarSettings,
      (err) => console.error('Calendar settings listener error:', err)
    );
    return () => unsub();
  }, []);

  // Subscribe to active student profile updates
  useEffect(() => {
    if (!currentStudent?.id) return;
    const unsub = subscribeToCurrentStudent(
      currentStudent.id,
      (updated) => {
        if (updated) {
          setCurrentStudent(updated);
        }
      },
      (err) => console.error('Student profile listener error:', err)
    );
    return () => unsub();
  }, [currentStudent?.id]);

  // Sign In handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await loginStudentUser(loginEmail, loginPass);
      if (!res.success) {
        setLoginError({
          message: res.error || 'Authentication failed. Please verify your credentials.',
          code: res.code || 'auth/invalid-credential',
        });
      } else if (res.isNewGoogleUser && res.user) {
        setGoogleOnboardingUser(res.user);
      } else if (res.student) {
        setCurrentStudent(res.student);
        if (res.user) setFirebaseUser(res.user);
        setLoginEmail('');
        setLoginPass('');
        showToast(`Welcome back, ${res.student.name}!`);
      }
    } catch (err: any) {
      console.error('Login submit exception:', err);
      setLoginError({
        message: err.message || 'An unexpected error occurred during sign-in.',
        code: err.code || 'auth/unknown-error',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validate Tunisian phone (+216 and 8 digits)
    const phoneCheck = validateTunisianPhone(regPhone);
    if (!phoneCheck.valid) {
      setRegError({
        message: 'Please enter a valid Tunisian phone number (+216 followed by 8 digits, e.g. +216 98 123 456).',
        code: 'validation/invalid-tunisian-phone',
      });
      return;
    }

    // Password validation (min 8 chars)
    if (regPass.length < 8) {
      setRegError({
        message: 'Password must be at least 8 characters in length.',
        code: 'validation/weak-password',
      });
      return;
    }

    if (regPass !== regConfirmPass) {
      setRegError({
        message: 'Password confirmation does not match.',
        code: 'validation/password-mismatch',
      });
      return;
    }

    setRegLoading(true);
    try {
      const res = await registerStudentAccount(
        regName,
        regEmail,
        phoneCheck.normalized,
        regPass,
        {
          instrument: regInstrument,
          frequency: regFrequency,
          sessionLength: regSessionLength,
          sessionBlocks: regSessionLength.includes('30') ? 1 : regSessionLength.includes('45') ? 1.5 : regSessionLength.includes('90') ? 3 : 2,
          pricePerWeek: prefillPlan?.pricePerWeek,
          totalPrice: prefillPlan?.pricePerMonth,
          preferredLocation: regLocation,
        }
      );

      if (!res.success || !res.student) {
        setRegError({
          message: res.error || 'Failed to create student account.',
          code: res.code || 'auth/registration-failed',
        });
      } else {
        setCurrentStudent(res.student);
        showToast('Account created! A verification email has been sent to your address.');
      }
    } catch (err: any) {
      console.error('Registration exception:', err);
      setRegError({
        message: err.message || 'Error occurred during registration.',
        code: err.code || 'auth/unknown-error',
      });
    } finally {
      setRegLoading(false);
    }
  };

  // Google sign in handler
  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setRegError(null);
    setLoginLoading(true);
    try {
      const res = await signInStudentWithGoogle();
      if (!res.success) {
        setLoginError({
          message: res.error || 'Google authentication failed.',
          code: res.code || 'auth/google-sign-in-failed',
        });
      } else if (res.isNewGoogleUser && res.user) {
        // Needs profile completion
        setGoogleOnboardingUser(res.user);
      } else if (res.student) {
        setCurrentStudent(res.student);
        if (res.user) setFirebaseUser(res.user);
        showToast(`Welcome, ${res.student.name}!`);
      }
    } catch (err: any) {
      console.error('Google sign-in exception:', err);
      setLoginError({
        message: err.message || 'Google sign-in error occurred.',
        code: err.code || 'auth/unknown-error',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Complete Google Onboarding
  const handleGoogleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleOnboardingUser) return;
    setGoogleError(null);

    const phoneCheck = validateTunisianPhone(googlePhone);
    if (!phoneCheck.valid) {
      setGoogleError({
        message: 'Please enter a valid Tunisian phone number (+216 followed by 8 digits).',
        code: 'validation/invalid-tunisian-phone',
      });
      return;
    }

    setGoogleLoading(true);
    try {
      const res = await completeGoogleStudentRegistration(
        googleOnboardingUser,
        phoneCheck.normalized,
        {
          instrument: googleInstrument,
          frequency: googleFrequency,
          sessionLength: googleSessionLength,
          sessionBlocks: 2,
          preferredLocation: googleLocation,
        }
      );

      if (!res.success || !res.student) {
        setGoogleError({
          message: res.error || 'Failed to complete profile.',
          code: res.code || 'firestore/error',
        });
      } else {
        setCurrentStudent(res.student);
        setGoogleOnboardingUser(null);
        showToast('Registration complete! Welcome to Maestro Mimouni Studio.');
      }
    } catch (err: any) {
      console.error('Google onboarding exception:', err);
      setGoogleError({
        message: err.message || 'Error completing profile.',
        code: err.code || 'firestore/error',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Send password reset
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await sendStudentPasswordReset(forgotEmail);
      if (!res.success) {
        setForgotError({
          message: res.error || 'Failed to send reset link.',
          code: res.code || 'auth/reset-failed',
        });
      } else {
        setForgotSuccess(`Password reset instructions sent to ${forgotEmail}. Please check your inbox.`);
      }
    } catch (err: any) {
      console.error('Password reset exception:', err);
      setForgotError({
        message: err.message || 'Failed to send password reset email.',
        code: err.code || 'auth/unknown-error',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend email verification
  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationFeedback(null);
    try {
      const res = await resendStudentEmailVerification();
      if (!res.success) {
        setVerificationFeedback(`Failed to send verification: ${res.error}`);
      } else {
        setVerificationFeedback('A new verification email has been dispatched to your address.');
      }
    } catch (err: any) {
      setVerificationFeedback('Could not send verification email at this moment.');
    } finally {
      setResendingVerification(false);
      setTimeout(() => setVerificationFeedback(null), 5000);
    }
  };

  // Change password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    if (newPassword.length < 8) {
      setChangePassError({
        message: 'Password must be at least 8 characters.',
        code: 'validation/weak-password',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePassError({
        message: 'Passwords do not match.',
        code: 'validation/password-mismatch',
      });
      return;
    }

    setChangePassLoading(true);
    try {
      const res = await changeStudentPassword(newPassword);
      if (!res.success) {
        setChangePassError({
          message: res.error || 'Failed to change password. You may need to re-login.',
          code: res.code || 'auth/change-password-failed',
        });
      } else {
        setChangePassSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setChangePassOpen(false);
          setChangePassSuccess(null);
        }, 2000);
      }
    } catch (err: any) {
      setChangePassError({
        message: err.message || 'Error updating password.',
        code: err.code || 'auth/unknown-error',
      });
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutStudentUser();
    setCurrentStudent(null);
    setFirebaseUser(null);
  };

  // Toggle day selection for recurring schedule
  const toggleDaySelection = (day: DayOfWeek) => {
    if (!currentStudent) return;
    if (currentStudent.approvalStatus !== 'approved') return;

    const required = currentStudent.requiredDaysCount || 1;
    setDaysError(null);

    if (selectedDays.includes(day)) {
      setSelectedDays(prev => prev.filter(d => d !== day));
      setSelectedTimes(prev => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
    } else {
      if (selectedDays.length >= required) {
        setDaysError({
          message: `You can select exactly ${required} day${required > 1 ? 's' : ''} for your "${currentStudent.frequency}" enrollment.`,
          code: 'schedule/day-quota-reached',
        });
        return;
      }
      setSelectedDays(prev => [...prev, day]);
      setSelectedTimes(prev => ({
        ...prev,
        [day]: prev[day] || '17:00'
      }));
    }
  };

  const handleConfirmRecurringDays = async () => {
    if (!currentStudent) return;
    if (currentStudent.approvalStatus !== 'approved') {
      setDaysError({
        message: 'Your registration is pending approval by Maestro Mimouni before picking slots.',
        code: 'schedule/not-approved',
      });
      return;
    }

    const required = currentStudent.requiredDaysCount || 1;
    if (selectedDays.length !== required) {
      setDaysError({
        message: `Please select exactly ${required} day${required > 1 ? 's' : ''}. Currently selected: ${selectedDays.length}.`,
        code: 'schedule/incomplete-selection',
      });
      return;
    }

    setSubmittingDays(true);
    setDaysError(null);
    try {
      const res = await saveStudentRecurringDays(currentStudent.id, selectedDays, selectedTimes);
      if (!res.success) {
        setDaysError({
          message: res.error || 'Failed to reserve recurring days.',
          code: res.code || 'firestore/error',
        });
      } else {
        showToast('Your weekly recurring schedule has been confirmed and locked!');
      }
    } catch (err: any) {
      console.error('saveStudentRecurringDays error:', err);
      setDaysError({
        message: err.message || 'Transaction error while reserving schedule.',
        code: err.code || 'firestore/transaction-error',
      });
    } finally {
      setSubmittingDays(false);
    }
  };

  const openRescheduleModal = (dateISO: string) => {
    setRescheduleTargetDate(dateISO);
    setNewRescheduleDate('');
    setNewRescheduleTime('17:00');
    setRescheduleReason('');
    setRescheduleError(null);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!currentStudent || !rescheduleTargetDate || !newRescheduleDate) {
      setRescheduleError({ message: 'Please select a valid replacement date.', code: 'validation/missing-date' });
      return;
    }

    // Verify day is open
    const targetDayName = new Date(newRescheduleDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
    if (calendarSettings.openDays && !calendarSettings.openDays.includes(targetDayName)) {
      setRescheduleError({
        message: `The studio is closed on ${targetDayName}s.`,
        code: 'calendar/studio-closed-day',
      });
      return;
    }

    if (calendarSettings.blockedDates?.includes(newRescheduleDate)) {
      setRescheduleError({
        message: 'The studio is closed on that specific date (holiday/travel).',
        code: 'calendar/date-blocked',
      });
      return;
    }

    setReschedulingLoading(true);
    setRescheduleError(null);
    try {
      const res = await rescheduleStudentLesson(
        currentStudent.id,
        rescheduleTargetDate,
        newRescheduleDate,
        newRescheduleTime,
        rescheduleReason
      );
      if (!res.success) {
        setRescheduleError({
          message: res.error || 'Failed to reschedule lesson.',
          code: res.code || 'firestore/error',
        });
      } else {
        setRescheduleModalOpen(false);
        showToast(`Lesson successfully rescheduled to ${newRescheduleDate} at ${newRescheduleTime}!`);
      }
    } catch (err: any) {
      console.error('Reschedule exception:', err);
      setRescheduleError({
        message: err.message || 'Reschedule failed due to a system error.',
        code: err.code || 'firestore/error',
      });
    } finally {
      setReschedulingLoading(false);
    }
  };

  // Compute upcoming lessons
  const upcomingLessons = useMemo(() => {
    if (!currentStudent || (!currentStudent.daysLocked && !currentStudent.isDaily)) return [];
    
    const lessons: Array<{
      dateISO: string;
      formattedDate: string;
      dayOfWeek: DayOfWeek;
      time: string;
      isRescheduled: boolean;
      isBlocked: boolean;
      originalDateISO?: string;
    }> = [];

    const recurringDays: DayOfWeek[] = currentStudent.isDaily 
      ? (calendarSettings.openDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
      : (currentStudent.selectedWeeklyDays || []);

    const now = new Date();
    for (let i = 1; i <= 35; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dateISO = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;

      const rescheduleOverride = currentStudent.rescheduledOccurrences?.[dateISO];

      if (recurringDays.includes(dayName)) {
        if (!rescheduleOverride) {
          const isBlocked = calendarSettings.blockedDates?.includes(dateISO) || false;
          const assignedTime = currentStudent.selectedTimeSlots?.[dayName] || '17:00';
          lessons.push({
            dateISO,
            formattedDate: d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }),
            dayOfWeek: dayName,
            time: assignedTime,
            isRescheduled: false,
            isBlocked,
          });
        }
      }
    }

    // Add rescheduled targets
    if (currentStudent.rescheduledOccurrences) {
      Object.entries(currentStudent.rescheduledOccurrences).forEach(([origDate, override]) => {
        const d = new Date(override.newDateISO + 'T12:00:00Z');
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
        lessons.push({
          dateISO: override.newDateISO,
          formattedDate: d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          dayOfWeek: dayName,
          time: override.newTime,
          isRescheduled: true,
          isBlocked: calendarSettings.blockedDates?.includes(override.newDateISO) || false,
          originalDateISO: origDate,
        });
      });
    }

    lessons.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    return lessons.slice(0, 8);
  }, [currentStudent, calendarSettings, currentLang]);

  // Available time slots
  const availableTimeSlots = useMemo(() => {
    const slots: string[] = [];
    const startH = parseInt(calendarSettings.startHour?.split(':')[0] || '9', 10);
    const endH = parseInt(calendarSettings.endHour?.split(':')[0] || '19', 10);
    for (let h = startH; h < endH; h++) {
      const hh = h < 10 ? `0${h}` : `${h}`;
      slots.push(`${hh}:00`);
      slots.push(`${hh}:30`);
    }
    return slots;
  }, [calendarSettings]);

  // ==========================================
  // VIEW: UN-AUTHENTICATED LOGIN / REGISTER SCREEN
  // ==========================================
  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-[#0A0C0E] text-[#EDE7DC] flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="w-full max-w-lg bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(237,231,220,0.1)] text-[10px] tracking-[0.14em] uppercase text-[#9EA5A8]">
              <Music className="w-3 h-3 text-[#E8913C]" />
              <span>Maestro Mimouni · Ben Arous</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#EDE7DC]">
              Student Portal
            </h1>
            <p className="text-xs text-[#9EA5A8]">
              {currentLang === 'fr' 
                ? 'Accédez à votre espace pédagogique, vos créneaux et votre calendrier' 
                : 'Access your lessons, weekly schedule, and studio calendar'}
            </p>
          </div>

          {/* Auth Tabs */}
          <div className="flex border-b border-[rgba(237,231,220,0.1)]">
            <button
              type="button"
              onClick={() => { setAuthTab('signin'); setLoginError(null); setRegError(null); }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
                authTab === 'signin'
                  ? 'border-[#E8913C] text-[#E8913C]'
                  : 'border-transparent text-[#9EA5A8] hover:text-[#EDE7DC]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('register'); setLoginError(null); setRegError(null); }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
                authTab === 'register'
                  ? 'border-[#E8913C] text-[#E8913C]'
                  : 'border-transparent text-[#9EA5A8] hover:text-[#EDE7DC]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* TAB 1: SIGN IN */}
          {authTab === 'signin' && (
            <div className="space-y-4 animate-fade-in">
              {loginError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError.message}</span>
                  </div>
                  {loginError.code && (
                    <p className="font-mono text-[10px] text-red-400/80 pl-6">Firebase error code: {loginError.code}</p>
                  )}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {!isFirebaseConfigured && (
                  <div className="p-3 bg-[#E8913C]/10 border border-[#E8913C]/30 rounded-xl space-y-1.5 text-left">
                    <p className="text-xs font-semibold text-[#E8913C]">Demo Mode Active</p>
                    <p className="text-[11px] text-[#EDE7DC]/80">
                      Firebase environment variables not set. You can sign in as sample student Ahmed Triki to test the student portal features.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('ahmed.triki@gmail.com');
                        setLoginPass('student123');
                      }}
                      className="cursor-pointer text-[10.5px] font-mono text-[#E8913C] hover:text-[#EDE7DC] underline"
                    >
                      Fill Demo: ahmed.triki@gmail.com
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] placeholder-[#555C61] outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(loginEmail); setForgotPasswordOpen(true); }}
                      className="text-[11px] text-[#E8913C] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#EDE7DC] placeholder-[#555C61] outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-2.5 text-[#9EA5A8] hover:text-[#EDE7DC] cursor-pointer"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-semibold text-xs tracking-wider uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2"
                >
                  {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{loginLoading ? 'Authenticating...' : 'Sign In as Student'}</span>
                </button>
              </form>

              {/* Google Sign-In Option */}
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[rgba(237,231,220,0.1)]"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-[#6C7378] uppercase font-mono">or continue with</span>
                  <div className="flex-grow border-t border-[rgba(237,231,220,0.1)]"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loginLoading}
                  className="w-full cursor-pointer border border-[rgba(237,231,220,0.18)] hover:border-[#EDE7DC] bg-white/5 hover:bg-white/10 text-[#EDE7DC] font-medium text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17C3.7 20.7 7.5 23.5 12 23.5z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ACCOUNT */}
          {authTab === 'register' && (
            <div className="space-y-4 animate-fade-in">
              {regError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{regError.message}</span>
                  </div>
                  {regError.code && (
                    <p className="font-mono text-[10px] text-red-400/80 pl-6">Firebase error code: {regError.code}</p>
                  )}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Sarra Trabelsi"
                    className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="sarra@example.com"
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                      Phone (Tunisian +216) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+216 98 123 456"
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                      Password (min 8) *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl pl-3 pr-8 py-2 text-xs text-[#EDE7DC] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="absolute right-2.5 top-2 text-[#9EA5A8] hover:text-[#EDE7DC]"
                      >
                        {showRegPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono tracking-wider uppercase text-[#9EA5A8] mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regConfirmPass}
                      onChange={(e) => setRegConfirmPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                    />
                  </div>
                </div>

                {/* Enrollment Plan Selection */}
                <div className="pt-2 border-t border-[rgba(237,231,220,0.06)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#E8913C]">
                      Enrollment Configuration
                    </span>
                    {prefillPlan && (
                      <span className="text-[10px] text-emerald-400 font-mono">Plan prefilled from calculator</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Course</label>
                      <select
                        value={regInstrument}
                        onChange={(e) => setRegInstrument(e.target.value)}
                        className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                      >
                        {DEFAULT_COURSES.map(c => (
                          <option key={c.id} value={c.nameEn}>{c.nameEn}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Session Length</label>
                      <select
                        value={regSessionLength}
                        onChange={(e) => setRegSessionLength(e.target.value)}
                        className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                      >
                        <option value="30 min">30 min (Introductory)</option>
                        <option value="45 min">45 min (Standard)</option>
                        <option value="60 min">60 min (Full lesson)</option>
                        <option value="90 min">90 min (Masterclass)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Weekly Frequency</label>
                      <select
                        value={regFrequency}
                        onChange={(e) => setRegFrequency(e.target.value)}
                        className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                      >
                        <option value="1x per week">1x per week (1 day)</option>
                        <option value="2x per week">2x per week (2 days)</option>
                        <option value="3x per week">3x per week (3 days)</option>
                        <option value="Daily / Intensive">Daily / Intensive (Mon–Sat)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Location</label>
                      <select
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                      >
                        <option value="Teacher's Studio (Ben Arous)">Studio (Ben Arous)</option>
                        <option value="Student's Home (Grand Tunis)">Student's Home (Grand Tunis)</option>
                        <option value="Online / To be discussed">Online / Distance</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-semibold text-xs tracking-wider uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-3"
                >
                  {regLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{regLoading ? 'Registering...' : 'Register Student Account'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 border-t border-[rgba(237,231,220,0.08)] flex items-center justify-between text-xs text-[#9EA5A8]">
            <button
              onClick={onBackToSite}
              className="hover:text-[#EDE7DC] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to studio website</span>
            </button>
            <span className="text-[10px] text-[#555C61]">Secure Firebase Auth</span>
          </div>
        </div>

        {/* FORGOT PASSWORD MODAL */}
        {forgotPasswordOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#E8913C]" />
                  <h3 className="font-display font-bold text-lg text-[#EDE7DC]">Reset Password</h3>
                </div>
                <button
                  onClick={() => setForgotPasswordOpen(false)}
                  className="text-[#6C7378] hover:text-[#EDE7DC] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#9EA5A8] leading-relaxed">
                Enter your registered student email address. We will send you an official Firebase password reset link.
              </p>

              {forgotError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                  <p>{forgotError.message}</p>
                  {forgotError.code && <p className="font-mono text-[10px] text-red-400 mt-0.5">{forgotError.code}</p>}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {forgotLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Reset Email</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* GOOGLE FIRST-TIME ONBOARDING MODAL */}
        {googleOnboardingUser && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#101317] border border-[#E8913C]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#E8913C]" />
                    <span className="text-[10px] font-mono uppercase text-[#9EA5A8]">Almost there</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-[#EDE7DC]">
                    Complete Your Student Enrollment
                  </h3>
                </div>
                <button
                  onClick={() => setGoogleOnboardingUser(null)}
                  className="text-[#6C7378] hover:text-[#EDE7DC]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#9EA5A8] leading-relaxed">
                Welcome, <strong className="text-[#EDE7DC]">{googleOnboardingUser.displayName}</strong>! Please specify your contact phone and lesson preferences to finalize your studio account.
              </p>

              {googleError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                  <p>{googleError.message}</p>
                  {googleError.code && <p className="font-mono text-[10px] text-red-400">{googleError.code}</p>}
                </div>
              )}

              <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                    Tunisian Phone (+216 8 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="+216 98 123 456"
                    className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Course</label>
                    <select
                      value={googleInstrument}
                      onChange={(e) => setGoogleInstrument(e.target.value)}
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                    >
                      {DEFAULT_COURSES.map(c => (
                        <option key={c.id} value={c.nameEn}>{c.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Session Length</label>
                    <select
                      value={googleSessionLength}
                      onChange={(e) => setGoogleSessionLength(e.target.value)}
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                    >
                      <option value="30 min">30 min</option>
                      <option value="45 min">45 min</option>
                      <option value="60 min">60 min</option>
                      <option value="90 min">90 min</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Weekly Rhythm</label>
                    <select
                      value={googleFrequency}
                      onChange={(e) => setGoogleFrequency(e.target.value)}
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                    >
                      <option value="1x per week">1x per week</option>
                      <option value="2x per week">2x per week</option>
                      <option value="3x per week">3x per week</option>
                      <option value="Daily / Intensive">Daily / Intensive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">Location</label>
                    <select
                      value={googleLocation}
                      onChange={(e) => setGoogleLocation(e.target.value)}
                      className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                    >
                      <option value="Teacher's Studio (Ben Arous)">Studio (Ben Arous)</option>
                      <option value="Student's Home (Grand Tunis)">Student's Home</option>
                      <option value="Online / To be discussed">Online</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="w-full cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    {googleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Confirm & Create Profile</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // VIEW: AUTHENTICATED STUDENT DASHBOARD
  // ==========================================
  const isApproved = currentStudent.approvalStatus === 'approved';
  const isPending = currentStudent.approvalStatus === 'pending' || !currentStudent.approvalStatus;
  const isRejected = currentStudent.approvalStatus === 'rejected';
  const needsDaySelection = isApproved && !currentStudent.daysLocked && !currentStudent.isDaily;

  return (
    <div className="min-h-screen bg-[#0A0C0E] text-[#EDE7DC] py-8 sm:py-10 px-4 sm:px-6 lg:px-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161A20] border border-[#E8913C] text-[#EDE7DC] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#E8913C]" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[rgba(237,231,220,0.13)]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E8913C]" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#9EA5A8]">
                Student Space · Espace Élève
              </span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#EDE7DC]">
              Welcome, {currentStudent.name}
            </h1>
            <p className="text-xs text-[#9EA5A8] mt-0.5">
              {currentStudent.instrument} · {currentStudent.frequency}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setChangePassOpen(true)}
              className="border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] text-[#EDE7DC] hover:text-[#E8913C] text-xs font-medium px-3.5 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <button
              onClick={onBackToSite}
              className="border border-[rgba(237,231,220,0.15)] hover:border-[#EDE7DC] text-[#EDE7DC] text-xs font-medium px-3.5 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Studio Site</span>
            </button>
            <button
              onClick={handleLogout}
              className="border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium px-3.5 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {currentStudent.emailVerified === false && (
          <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-[#EDE7DC]">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#E8913C] shrink-0" />
              <span>Your email address is not yet verified. Please check your inbox for the confirmation email.</span>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="cursor-pointer text-[#E8913C] hover:underline font-semibold whitespace-nowrap text-xs"
            >
              {resendingVerification ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}

        {verificationFeedback && (
          <div className="p-2.5 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-300">
            {verificationFeedback}
          </div>
        )}

        {/* APPROVAL STATUS BANNER (CRITICAL REQUIREMENT B) */}
        {isPending && (
          <div className="p-6 bg-[#161B22] border border-amber-500/40 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#E8913C] border border-amber-500/20">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                  Waiting for the teacher's approval
                </h3>
                <p className="text-xs text-[#9EA5A8]">
                  En Attente de Validation par Maestro Mohamed Mimouni
                </p>
              </div>
            </div>
            <p className="text-xs text-[#EDE7DC]/80 leading-relaxed max-w-2xl">
              Your registration for <strong className="text-[#E8913C]">{currentStudent.instrument}</strong> has been received by the studio. Maestro Mimouni reviews every student enrollment personally to confirm studio capacity. Once approved, the calendar below will unlock immediately so you can reserve your recurring weekly days.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="p-6 bg-red-950/20 border border-red-500/40 rounded-2xl space-y-2">
            <h3 className="font-display font-bold text-lg text-red-300">Enrollment Request Declined</h3>
            <p className="text-xs text-[#9EA5A8]">
              The studio was unable to accept this enrollment request at this time. Please reach out to Maestro Mimouni directly.
            </p>
          </div>
        )}

        {/* APPROVED STUDENT SPACE NAVIGATION TABS */}
        {isApproved && (
          <div className="flex items-center gap-2 border-b border-[rgba(237,231,220,0.12)] pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSpaceTab('lessons')}
              className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSpaceTab === 'lessons'
                  ? 'bg-[#E8913C] text-[#0A0C0E] shadow-lg shadow-[#E8913C]/10 font-bold'
                  : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>{translations[currentLang].studentSpace.tabs.lessons}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSpaceTab('profile')}
              className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSpaceTab === 'profile'
                  ? 'bg-[#E8913C] text-[#0A0C0E] shadow-lg shadow-[#E8913C]/10 font-bold'
                  : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{translations[currentLang].studentSpace.tabs.profile}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSpaceTab('library')}
              className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSpaceTab === 'library'
                  ? 'bg-[#E8913C] text-[#0A0C0E] shadow-lg shadow-[#E8913C]/10 font-bold'
                  : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{translations[currentLang].studentSpace.tabs.library}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSpaceTab('community')}
              className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSpaceTab === 'community'
                  ? 'bg-[#E8913C] text-[#0A0C0E] shadow-lg shadow-[#E8913C]/10 font-bold'
                  : 'text-[#9EA5A8] hover:text-[#EDE7DC] hover:bg-[#101317]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{translations[currentLang].studentSpace.tabs.community}</span>
            </button>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {isApproved && activeSpaceTab === 'profile' && (
          <StudentProfileSection
            student={currentStudent}
            currentLang={currentLang}
            onProfileUpdated={(updated) => setCurrentStudent(updated)}
            onOpenChangePassword={() => setChangePassOpen(true)}
            onResendVerification={handleResendVerification}
            resendingVerification={resendingVerification}
            verificationFeedback={verificationFeedback}
            showToast={showToast}
          />
        )}

        {/* TAB 2: LIBRARY */}
        {isApproved && activeSpaceTab === 'library' && (
          <StudentLibrarySection
            student={currentStudent}
            currentLang={currentLang}
          />
        )}

        {/* TAB 3: COMMUNITY */}
        {isApproved && activeSpaceTab === 'community' && (
          <StudentCommunitySection
            student={currentStudent}
            currentLang={currentLang}
            showToast={showToast}
          />
        )}

        {/* TAB 4: LESSONS & SCHEDULE (Default Dashboard view or when activeSpaceTab === 'lessons') */}
        {(!isApproved || activeSpaceTab === 'lessons') && (
          <>
            {/* Profile Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 sm:p-6 bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] flex items-center gap-1">
                  <Music className="w-3 h-3 text-[#E8913C]" /> Course
                </span>
                <p className="font-semibold text-sm text-[#EDE7DC]">{currentStudent.instrument}</p>
                <p className="text-[11px] text-[#7E858A]">{currentStudent.sessionLength} per lesson</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#E8913C]" /> Rhythm & Days
                </span>
                <p className="font-semibold text-sm text-[#EDE7DC]">{currentStudent.frequency}</p>
                <p className="text-[11px] text-[#7E858A]">
                  {currentStudent.isDaily 
                    ? 'Daily intensive practice' 
                    : `${currentStudent.requiredDaysCount} fixed day(s) weekly`}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#E8913C]" /> Location
                </span>
                <p className="font-semibold text-sm text-[#EDE7DC] truncate">{currentStudent.preferredLocation}</p>
                <p className="text-[11px] text-[#7E858A]">{currentStudent.phone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-[#E8913C]" /> Tuition Status
                </span>
                <div className="pt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    currentStudent.paymentStatus === 'paid'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                  }`}>
                    {currentStudent.paymentStatus === 'paid' ? 'Paid / À jour' : 'Pending Tuition / En attente'}
                  </span>
                </div>
                <p className="text-[10px] text-[#7E858A] italic">Read-only billing record</p>
              </div>
            </div>

            {/* 1. RECURRING DAY SELECTION (ONLY UNLOCKED IF APPROVED) */}
            {needsDaySelection && (
              <div className="bg-[#101317] border border-[#E8913C]/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8913C]/10 text-[#E8913C] text-[10px] font-mono tracking-wider uppercase border border-[#E8913C]/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Action Required: Select Your Fixed Weekly Days</span>
                  </div>
                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#EDE7DC]">
                    Pick your {currentStudent.requiredDaysCount} weekly recurring lesson day{currentStudent.requiredDaysCount > 1 ? 's' : ''}
                  </h2>
                  <p className="text-xs text-[#9EA5A8] leading-relaxed max-w-2xl">
                    Based on your "{currentStudent.frequency}" tuition, please choose exactly {currentStudent.requiredDaysCount} day{currentStudent.requiredDaysCount > 1 ? 's' : ''} of the week. Once confirmed, these will be your permanent recurring weekly reservation slots at the studio.
                  </p>
                </div>

                {daysError && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p>{daysError.message}</p>
                      {daysError.code && <p className="font-mono text-[10px] text-red-400/80">{daysError.code}</p>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {ALL_DAYS.map((day) => {
                    const isOpen = calendarSettings.openDays?.includes(day);
                    const isSelected = selectedDays.includes(day);

                    return (
                      <div
                        key={day}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          !isOpen 
                            ? 'opacity-40 border-[rgba(237,231,220,0.06)] bg-[#0A0C0E] pointer-events-none'
                            : isSelected
                            ? 'border-[#E8913C] bg-[#1A1F26] shadow-lg shadow-[#E8913C]/5'
                            : 'border-[rgba(237,231,220,0.12)] bg-[#101317] hover:border-[rgba(237,231,220,0.25)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-[#EDE7DC]">{day}</span>
                          <button
                            type="button"
                            disabled={!isOpen}
                            onClick={() => toggleDaySelection(day)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#E8913C] text-[#0A0C0E]'
                                : 'border border-[rgba(237,231,220,0.2)] text-transparent hover:border-[#E8913C]'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>

                        <div className="text-[11px] text-[#9EA5A8]">
                          {!isOpen ? (
                            <span className="text-red-400/80">Studio Closed</span>
                          ) : (
                            <span>Studio Open · Max {calendarSettings.maxStudentsPerDay || 5} students</span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="pt-2 border-t border-[rgba(237,231,220,0.08)]">
                            <label className="text-[10px] font-mono text-[#9EA5A8] uppercase block mb-1">
                              Preferred Hour
                            </label>
                            <select
                              value={selectedTimes[day] || '17:00'}
                              onChange={(e) => setSelectedTimes(prev => ({ ...prev, [day]: e.target.value }))}
                              className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] rounded-lg px-2.5 py-1 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                            >
                              {availableTimeSlots.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[rgba(237,231,220,0.08)]">
                  <span className="text-xs font-mono text-[#9EA5A8]">
                    Selected: <strong className="text-[#E8913C]">{selectedDays.length}</strong> / {currentStudent.requiredDaysCount} day(s)
                  </span>

                  <button
                    type="button"
                    onClick={handleConfirmRecurringDays}
                    disabled={submittingDays || selectedDays.length !== currentStudent.requiredDaysCount}
                    className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-40 text-[#0A0C0E] font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {submittingDays ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Confirm & Lock Weekly Schedule</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. UPCOMING SESSIONS & RESCHEDULE */}
            {isApproved && (currentStudent.daysLocked || currentStudent.isDaily) && (
              <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#EDE7DC]">
                      Upcoming Lesson Occurrences
                    </h2>
                    <p className="text-xs text-[#9EA5A8] mt-1">
                      You can reschedule any single upcoming session to an alternate open date without changing your permanent weekly recurring pattern.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                      Recurring Schedule Locked
                    </span>
                  </div>
                </div>

                {upcomingLessons.length === 0 ? (
                  <p className="text-xs text-[#9EA5A8] italic py-4">No upcoming lessons calculated for this month.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {upcomingLessons.map((lesson) => (
                      <div
                        key={lesson.dateISO}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          lesson.isBlocked
                            ? 'border-red-500/30 bg-red-950/20'
                            : lesson.isRescheduled
                            ? 'border-[#E8913C]/40 bg-[#161B22]'
                            : 'border-[rgba(237,231,220,0.1)] bg-[#0A0C0E]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8] block">
                              {lesson.dayOfWeek}
                            </span>
                            <h4 className="font-display font-bold text-base text-[#EDE7DC]">
                              {lesson.formattedDate}
                            </h4>
                          </div>

                          <span className="font-mono text-xs font-bold text-[#E8913C] bg-[#161A20] px-2 py-0.5 rounded border border-[rgba(237,231,220,0.1)]">
                            {lesson.time}
                          </span>
                        </div>

                        {lesson.isBlocked ? (
                          <span className="text-[10.5px] text-red-400 block font-semibold">
                            Studio Holiday / Blocked
                          </span>
                        ) : lesson.isRescheduled ? (
                          <span className="text-[10px] font-mono text-[#E8913C] block font-semibold">
                            Rescheduled Session
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400/90 block">
                            Regular Recurring Slot
                          </span>
                        )}

                        {!lesson.isBlocked && (
                          <button
                            type="button"
                            onClick={() => openRescheduleModal(lesson.dateISO)}
                            className="w-full cursor-pointer text-xs font-medium py-1.5 rounded-lg border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] hover:text-[#E8913C] text-[#EDE7DC] transition-colors"
                          >
                            Reschedule Date
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. ATTENDANCE & LESSON HISTORY */}
            <div className="bg-[#101317] border border-[rgba(237,231,220,0.13)] rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="font-display font-extrabold text-xl text-[#EDE7DC]">
                Lesson History & Progress Record
              </h2>
              <p className="text-xs text-[#9EA5A8]">
                Notes, exercises and repertoire logged by Maestro Mohamed Mimouni during your sessions.
              </p>

              {(!currentStudent.lessonHistory || currentStudent.lessonHistory.length === 0) ? (
                <p className="text-xs text-[#6C7378] italic py-4">No completed lessons recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {currentStudent.lessonHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0A0C0E] border border-[rgba(237,231,220,0.08)] flex items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#EDE7DC]">{item.date}</span>
                          <span className="text-[#6C7378]">at</span>
                          <span className="font-mono text-[#E8913C]">{item.time}</span>
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            {item.status}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[#9EA5A8] text-[11px] leading-relaxed mt-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-[#EDE7DC]">
                  Reschedule Single Occurrence
                </h3>
                <p className="text-xs text-[#9EA5A8] mt-0.5">
                  Shifting session from <strong className="text-[#EDE7DC]">{rescheduleTargetDate}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="text-[#6C7378] hover:text-[#EDE7DC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                <p>{rescheduleError.message}</p>
                {rescheduleError.code && <p className="font-mono text-[10px] text-red-400 mt-0.5">{rescheduleError.code}</p>}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                  New Date (Must be an open studio day)
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                  Time Slot
                </label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none cursor-pointer"
                >
                  {availableTimeSlots.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                  Reason for Rescheduling (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. School exams, travel, doctor appointment"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="cursor-pointer px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC] text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reschedulingLoading || !newRescheduleDate}
                onClick={handleConfirmReschedule}
                className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-40 text-[#0A0C0E] font-bold text-xs px-5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                {reschedulingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>Confirm Reschedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {changePassOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#E8913C]" />
                <h3 className="font-display font-bold text-lg text-[#EDE7DC]">Change Password</h3>
              </div>
              <button
                onClick={() => setChangePassOpen(false)}
                className="text-[#6C7378] hover:text-[#EDE7DC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {changePassError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                <p>{changePassError.message}</p>
                {changePassError.code && <p className="font-mono text-[10px] text-red-400">{changePassError.code}</p>}
              </div>
            )}

            {changePassSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                {changePassSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                  New Password (min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161A20] border border-[rgba(237,231,220,0.15)] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePassOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[rgba(237,231,220,0.15)] text-[#EDE7DC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePassLoading}
                  className="bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                >
                  {changePassLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
