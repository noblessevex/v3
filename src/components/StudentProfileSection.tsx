import React, { useState } from 'react';
import { 
  User as UserIcon, Camera, Sparkles, Check, KeyRound, Mail, 
  Phone as PhoneIcon, Music, Award, Compass, Target, RefreshCw, AlertCircle, ShieldCheck
} from 'lucide-react';
import { StudentAccount, Language } from '../types';
import { updateStudentProfile, uploadImageFile } from '../firebase';
import { translations } from '../translations';

interface StudentProfileSectionProps {
  student: StudentAccount;
  currentLang: Language;
  onProfileUpdated: (updated: StudentAccount) => void;
  onOpenChangePassword: () => void;
  onResendVerification: () => void;
  resendingVerification: boolean;
  verificationFeedback: string | null;
  showToast: (msg: string) => void;
}

export const StudentProfileSection: React.FC<StudentProfileSectionProps> = ({
  student,
  currentLang,
  onProfileUpdated,
  onOpenChangePassword,
  onResendVerification,
  resendingVerification,
  verificationFeedback,
  showToast,
}) => {
  const t = translations[currentLang].studentSpace.profile;

  // Form state
  const [name, setName] = useState(student.name || '');
  const [phone, setPhone] = useState(student.phone || '');
  const [bio, setBio] = useState(student.bio || '');
  const [instrumentLevel, setInstrumentLevel] = useState(student.instrumentLevel || 'beginner');
  const [preferredGenre, setPreferredGenre] = useState(student.preferredGenre || 'classical');
  const [practiceGoal, setPracticeGoal] = useState(student.practiceGoal || '');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB');
      return;
    }

    setUploadingAvatar(true);
    setErrorMsg(null);
    try {
      const res = await uploadImageFile(file, `avatars/${student.id}`);
      if (res.success && res.url) {
        const updateRes = await updateStudentProfile(student.id, { photoUrl: res.url });
        if (updateRes.success) {
          onProfileUpdated({ ...student, photoUrl: res.url });
          showToast(t.savedToast);
        } else {
          setErrorMsg(updateRes.error || 'Failed to save avatar URL');
        }
      } else {
        setErrorMsg(res.error || 'Photo upload failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const updates = {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        instrumentLevel,
        preferredGenre,
        practiceGoal: practiceGoal.trim(),
      };
      const res = await updateStudentProfile(student.id, updates);
      if (res.success) {
        onProfileUpdated({ ...student, ...updates });
        showToast(t.savedToast);
      } else {
        setErrorMsg(res.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
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

      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Avatar & Hero Profile Bar */}
      <div className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#161B22] border-2 border-[#E8913C]/40 overflow-hidden flex items-center justify-center shadow-xl">
            {student.photoUrl ? (
              <img 
                src={student.photoUrl} 
                alt={student.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-[#9EA5A8]" />
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 p-2 bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center">
            {uploadingAvatar ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
          </label>
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h3 className="font-display font-bold text-xl text-[#EDE7DC]">
              {student.name}
            </h3>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#E8913C]/10 text-[#E8913C] border border-[#E8913C]/30 font-semibold">
              {student.instrument}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              Approved Student
            </span>
          </div>

          <p className="text-xs text-[#9EA5A8] max-w-xl leading-relaxed">
            {student.bio || (currentLang === 'fr' 
              ? "Aucune biographie rédigée pour le moment. Décrivez votre parcours ci-dessous !" 
              : "No bio written yet. Tell the teacher and community about your goals below!")}
          </p>

          <p className="text-[11px] text-[#6C7378] flex items-center justify-center sm:justify-start gap-2 pt-1 font-mono">
            <span>{t.memberSince}: {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString() : 'Active'}</span>
            <span>·</span>
            <span>{student.frequency}</span>
          </p>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSubmit} className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[rgba(237,231,220,0.08)]">
          <Sparkles className="w-4 h-4 text-[#E8913C]" />
          <h4 className="font-display font-bold text-base text-[#EDE7DC]">
            {t.personalInfo}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-[#E8913C]" /> {t.fullName}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
              <PhoneIcon className="w-3 h-3 text-[#E8913C]" /> {t.phone}
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-[#E8913C]" /> {t.instrumentLevel}
            </label>
            <select
              value={instrumentLevel}
              onChange={(e) => setInstrumentLevel(e.target.value)}
              className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none cursor-pointer"
            >
              <option value="beginner">{t.levels.beginner}</option>
              <option value="intermediate">{t.levels.intermediate}</option>
              <option value="advanced">{t.levels.advanced}</option>
              <option value="virtuoso">{t.levels.virtuoso}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-[#E8913C]" /> {t.preferredGenre}
            </label>
            <select
              value={preferredGenre}
              onChange={(e) => setPreferredGenre(e.target.value)}
              className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none cursor-pointer"
            >
              <option value="classical">{t.genres.classical}</option>
              <option value="oriental">{t.genres.oriental}</option>
              <option value="jazz">{t.genres.jazz}</option>
              <option value="contemporary">{t.genres.contemporary}</option>
              <option value="soundtrack">{t.genres.soundtrack}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-[#E8913C]" /> {t.practiceGoal}
          </label>
          <input
            type="text"
            value={practiceGoal}
            onChange={(e) => setPracticeGoal(e.target.value)}
            placeholder={t.practiceGoalPlaceholder}
            className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-[#9EA5A8] mb-1.5 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-[#E8913C]" /> {t.bio}
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t.bioPlaceholder}
            className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3.5 py-2.5 text-xs text-[#EDE7DC] outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
            <span>{saving ? t.saving : t.saveChanges}</span>
          </button>
        </div>
      </form>

      {/* Account & Security Area */}
      <div className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[rgba(237,231,220,0.08)]">
          <KeyRound className="w-4 h-4 text-[#E8913C]" />
          <h4 className="font-display font-bold text-base text-[#EDE7DC]">
            {t.accountSettings}
          </h4>
        </div>

        <div className="space-y-4 text-xs">
          {/* Email Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#0A0C0E] rounded-xl border border-[rgba(237,231,220,0.08)]">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-[#6C7378] flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#E8913C]" /> Registered Studio Email
              </span>
              <p className="font-mono text-[#EDE7DC] text-xs font-semibold">{student.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${
                student.emailVerified 
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
              }`}>
                {student.emailVerified ? t.emailVerified : t.emailUnverified}
              </span>

              {!student.emailVerified && (
                <button
                  type="button"
                  onClick={onResendVerification}
                  disabled={resendingVerification}
                  className="cursor-pointer text-xs font-semibold text-[#E8913C] hover:underline"
                >
                  {resendingVerification ? '...' : t.resendVerification}
                </button>
              )}
            </div>
          </div>

          {verificationFeedback && (
            <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-blue-300 text-xs">
              {verificationFeedback}
            </div>
          )}

          {/* Password Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#0A0C0E] rounded-xl border border-[rgba(237,231,220,0.08)]">
            <div>
              <p className="font-semibold text-[#EDE7DC]">Account Authentication</p>
              <p className="text-[#9EA5A8] text-[11px] mt-0.5">
                Update your login credentials or reset student password securely.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenChangePassword}
              className="cursor-pointer border border-[#E8913C]/40 bg-[#E8913C]/10 hover:bg-[#E8913C]/20 text-[#E8913C] font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t.changePassword}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
