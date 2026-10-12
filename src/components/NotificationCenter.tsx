import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Check, ExternalLink, X, CheckCheck, Sparkles, AlertCircle 
} from 'lucide-react';
import { InAppNotification, Language } from '../types';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  requestWebPushPermission 
} from '../firebase';
import { translations } from '../translations';

interface NotificationCenterProps {
  userId: string;
  role: 'student' | 'admin';
  currentLang: Language;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  role,
  currentLang,
}) => {
  const t = translations[currentLang].studentSpace.notifications;
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [requestingPush, setRequestingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUserNotifications(
      userId,
      (list) => {
        setNotifications(list);
      },
      (err) => console.error('Notifications subscribe error:', err)
    );
    return () => unsub();
  }, [userId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(userId);
  };

  const handleEnablePush = async () => {
    setRequestingPush(true);
    try {
      const res = await requestWebPushPermission(userId, role, currentLang);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushStatus(Notification.permission);
      }
    } catch (e) {
      console.warn('Error enabling push:', e);
    } finally {
      setRequestingPush(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-full border border-[rgba(237,231,220,0.15)] hover:border-[#E8913C] text-[#EDE7DC] hover:text-[#E8913C] transition-colors cursor-pointer bg-[#101317]"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8913C] text-[#0A0C0E] font-bold text-[9px] flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl shadow-2xl z-50 overflow-hidden text-xs text-[#EDE7DC] animate-scale-in">
          {/* Header */}
          <div className="p-3.5 bg-[#0A0C0E] border-b border-[rgba(237,231,220,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#EDE7DC]">
                {t.title}
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8913C]/20 text-[#E8913C] border border-[#E8913C]/40">
                  {unreadCount} {t.unreadBadge}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="cursor-pointer text-[10.5px] text-[#E8913C] hover:underline flex items-center gap-1 font-semibold"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>{t.markAllRead}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer text-[#9EA5A8] hover:text-[#EDE7DC]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Web Push Prompt Banner (Triggered by user click, never automatic) */}
          {pushStatus !== 'granted' && (
            <div className="p-3 bg-[#161B22] border-b border-[rgba(237,231,220,0.08)] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#9EA5A8]">
                {pushStatus === 'denied' ? t.pushDenied : t.enablePush}
              </span>
              {pushStatus !== 'denied' && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={requestingPush}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-[10.5px] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                >
                  {requestingPush ? '...' : (currentLang === 'fr' ? 'Activer' : 'Enable')}
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[rgba(237,231,220,0.06)]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#9EA5A8] space-y-2">
                <Bell className="w-6 h-6 mx-auto opacity-30" />
                <p className="text-xs">{t.empty}</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const title = currentLang === 'fr' && notif.titleFr ? notif.titleFr : notif.title;
                const body = currentLang === 'fr' && notif.bodyFr ? notif.bodyFr : notif.body;

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                      notif.read ? 'opacity-70 hover:opacity-100' : 'bg-[#E8913C]/5 hover:bg-[#E8913C]/10'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8913C] shrink-0" />
                        )}
                        <h5 className="font-bold text-xs text-[#EDE7DC]">
                          {title}
                        </h5>
                      </div>
                      <p className="text-[11px] text-[#9EA5A8] leading-relaxed">
                        {body}
                      </p>
                      {notif.link && (
                        <a
                          href={notif.link}
                          className="text-[11px] text-[#E8913C] hover:underline inline-flex items-center gap-1 font-semibold pt-0.5"
                        >
                          <span>{currentLang === 'fr' ? 'Voir le détail' : 'View details'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {!notif.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="cursor-pointer text-[#9EA5A8] hover:text-[#E8913C] p-1 shrink-0"
                        title={currentLang === 'fr' ? 'Marquer comme lu' : 'Mark as read'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
