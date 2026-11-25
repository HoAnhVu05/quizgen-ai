import React, { useState, useEffect } from 'react';
import { getAvatarGradient, getInitials, getUserAvatarUrl } from '../../utils/avatarHelper';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  imgClassName?: string;
  rounded?: string;
  alt?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px] font-bold',
  sm: 'w-8 h-8 text-xs font-bold',
  md: 'w-10 h-10 text-sm font-extrabold',
  lg: 'w-12 h-12 text-base font-extrabold',
  xl: 'w-16 h-16 text-xl font-black',
  '2xl': 'w-24 h-24 text-3xl font-black',
  custom: '',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl: initialAvatarUrl,
  name,
  email,
  size = 'md',
  className = '',
  imgClassName = '',
  rounded = 'rounded-xl',
  alt,
  title,
  onClick,
  showOnlineIndicator = false,
  isOnline = false,
}) => {
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(() => {
    if (initialAvatarUrl && initialAvatarUrl.trim()) return initialAvatarUrl.trim();
    return getUserAvatarUrl(email, name);
  });
  const [imgFailed, setImgFailed] = useState(false);

  // Cập nhật khi props thay đổi
  useEffect(() => {
    if (initialAvatarUrl && initialAvatarUrl.trim()) {
      setResolvedAvatar(initialAvatarUrl.trim());
      setImgFailed(false);
    } else {
      const found = getUserAvatarUrl(email, name);
      setResolvedAvatar(found);
      setImgFailed(false);
    }
  }, [initialAvatarUrl, email, name]);

  // Lắng nghe sự kiện đồng bộ avatar toàn hệ thống (CustomEvent 'quizgen:avatar-updated')
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ email?: string; avatarUrl?: string; globalSync?: boolean }>;
      const isGlobal = customEvt.detail?.globalSync;
      const updatedEmail = customEvt.detail?.email;
      const updatedUrl = customEvt.detail?.avatarUrl;

      if (isGlobal) {
        const found = getUserAvatarUrl(email, name);
        if (found) {
          setResolvedAvatar(found);
          setImgFailed(false);
        }
      } else if (email && updatedEmail && email.trim().toLowerCase() === updatedEmail.trim().toLowerCase()) {
        setResolvedAvatar(updatedUrl || null);
        setImgFailed(false);
      }
    };

    window.addEventListener('quizgen:avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('quizgen:avatar-updated', handleAvatarUpdate);
  }, [email, name]);

  const initials = getInitials(name, email);
  const gradient = getAvatarGradient(email || name);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const displayName = name || email || 'Người dùng';

  const containerClasses = [
    'relative shrink-0 select-none overflow-hidden inline-flex items-center justify-center transition-all',
    sizeClass,
    rounded,
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} onClick={onClick} title={title || displayName}>
      {resolvedAvatar && !imgFailed ? (
        <img
          src={resolvedAvatar}
          alt={alt || displayName}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`w-full h-full object-cover ${rounded} ${imgClassName}`}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-tr ${gradient} text-white flex items-center justify-center shadow-inner tracking-wider select-none`}
        >
          {initials}
        </div>
      )}

      {showOnlineIndicator && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        />
      )}
    </div>
  );
};
