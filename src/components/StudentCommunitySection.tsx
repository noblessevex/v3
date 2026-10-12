import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Image as ImageIcon, Trash2, X, RefreshCw, MessageSquare, 
  Sparkles, AlertCircle, Shield, CheckCircle2, User as UserIcon
} from 'lucide-react';
import { CommunityMessage, StudentAccount, Language } from '../types';
import { 
  subscribeToCommunityMessages, 
  postCommunityMessage, 
  deleteCommunityMessage,
  uploadImageFile 
} from '../firebase';
import { translations } from '../translations';

interface StudentCommunitySectionProps {
  student: StudentAccount;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const StudentCommunitySection: React.FC<StudentCommunitySectionProps> = ({
  student,
  currentLang,
  showToast,
}) => {
  const t = translations[currentLang].studentSpace.community;
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // New message form state
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time community messages
  useEffect(() => {
    const unsub = subscribeToCommunityMessages(
      (items) => {
        setMessages(items);
        setLoading(false);
      },
      (err) => {
        console.error('Community messages listener error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size cannot exceed 10 MB');
      return;
    }

    setAttachedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !attachedImage) return;

    if (student.isMuted) {
      setErrorMsg(t.mutedNotice);
      return;
    }

    setPosting(true);
    setErrorMsg(null);

    try {
      let uploadedUrl: string | undefined = undefined;

      if (attachedImage) {
        const uploadRes = await uploadImageFile(attachedImage, 'community');
        if (uploadRes.success && uploadRes.url) {
          uploadedUrl = uploadRes.url;
        } else {
          setErrorMsg(uploadRes.error || 'Failed to upload photo');
          setPosting(false);
          return;
        }
      }

      const payload: {
        studentId: string;
        authorName: string;
        authorPhotoUrl?: string;
        authorRole: 'student';
        text: string;
        imageUrl?: string;
      } = {
        studentId: student.id,
        authorName: student.name,
        authorRole: 'student',
        text: text.trim(),
      };

      if (student.photoUrl && student.photoUrl.trim()) {
        payload.authorPhotoUrl = student.photoUrl.trim();
      }
      if (uploadedUrl && uploadedUrl.trim()) {
        payload.imageUrl = uploadedUrl.trim();
      }

      const res = await postCommunityMessage(payload);

      if (res.success) {
        setText('');
        handleRemoveImage();
      } else {
        setErrorMsg(res.error || 'Failed to post message');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error posting message');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete your message from the community?')) return;
    try {
      const res = await deleteCommunityMessage(msgId);
      if (res.success) {
        showToast('Message deleted');
      } else {
        alert(res.error || 'Failed to delete message');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[750px] max-h-[85vh]">
      {/* Header Info */}
      <div className="border-b border-[rgba(237,231,220,0.1)] pb-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
              {t.title}
            </h2>
            <p className="text-xs text-[#9EA5A8] mt-0.5">
              {t.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase">
              Live Studio Channel
            </span>
          </div>
        </div>
      </div>

      {student.isMuted && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{t.mutedNotice}</span>
        </div>
      )}

      {errorMsg && !student.isMuted && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-[#0A0C0E] border border-[rgba(237,231,220,0.1)] rounded-2xl p-4 sm:p-6 space-y-4 shadow-inner">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-[#9EA5A8] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E8913C]" />
            <span>Loading community chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <MessageSquare className="w-10 h-10 text-[#6C7378]" />
            <p className="text-xs text-[#9EA5A8] max-w-sm">{t.emptyFeed}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.studentId === student.id;
            const isTeacher = msg.authorRole === 'teacher';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group transition-opacity ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Author Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#161B22] border border-[rgba(237,231,220,0.15)] overflow-hidden shrink-0 flex items-center justify-center">
                  {msg.authorPhotoUrl ? (
                    <img
                      src={msg.authorPhotoUrl}
                      alt={msg.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display font-bold text-xs text-[#E8913C]">
                      {msg.authorName ? msg.authorName.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-md md:max-w-lg rounded-2xl p-4 space-y-2 text-xs shadow-md ${
                    isTeacher
                      ? 'bg-gradient-to-br from-[#1C160C] to-[#120F0A] border-2 border-[#E8913C]/60 text-[#EDE7DC]'
                      : isMe
                      ? 'bg-[#E8913C]/15 border border-[#E8913C]/40 text-[#EDE7DC]'
                      : 'bg-[#101317] border border-[rgba(237,231,220,0.12)] text-[#EDE7DC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#EDE7DC]">
                        {msg.authorName}
                      </span>
                      {isTeacher && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#E8913C] text-[#0A0C0E] font-black uppercase">
                          {t.teacherBadge}
                        </span>
                      )}
                      {!isTeacher && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#161B22] text-[#9EA5A8] border border-[rgba(237,231,220,0.1)]">
                          {t.studentBadge}
                        </span>
                      )}
                    </div>

                    {/* Delete button (if message author) */}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#6C7378] hover:text-red-400 transition-opacity p-0.5"
                        title={t.deleteMessage}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {msg.text && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  {msg.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-[rgba(237,231,220,0.1)] mt-2 max-h-72">
                      <img
                        src={msg.imageUrl}
                        alt="Attached by student"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    </div>
                  )}

                  <div className="text-[9.5px] font-mono text-[#6C7378] text-right pt-0.5">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input composer */}
      <form onSubmit={handleSendMessage} className="bg-[#101317] border border-[rgba(237,231,220,0.12)] rounded-2xl p-3 sm:p-4 space-y-3 shrink-0 shadow-xl">
        {imagePreview && (
          <div className="relative inline-block border border-[#E8913C]/40 rounded-xl overflow-hidden bg-[#0A0C0E] max-w-xs">
            <img src={imagePreview} alt="Preview" className="h-20 w-auto object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            disabled={posting || student.isMuted}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={student.isMuted ? t.mutedNotice : t.postPlaceholder}
            className="flex-1 bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-4 py-2.5 text-xs text-[#EDE7DC] outline-none transition-colors"
          />

          <label className="p-2.5 rounded-xl border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] hover:text-[#E8913C] text-[#9EA5A8] cursor-pointer transition-colors flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={posting || student.isMuted}
            />
          </label>

          <button
            type="submit"
            disabled={posting || (!text.trim() && !attachedImage) || student.isMuted}
            className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-40 text-[#0A0C0E] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
          >
            {posting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">{posting ? t.sending : t.send}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
