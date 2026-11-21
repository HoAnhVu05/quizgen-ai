/**
 * QGroupScreen – Complete Slack & Messenger Style Upgrade
 * Tính năng phong cách Slack:
 * 1. Rich Text Composer (Bold, Italic, Code, Quote, List, Emoji, Attachment, Quanta AI)
 * 2. Header Slack Toolbar: Huddle (Audio Call), Star, Summarize Channel by AI, Channel Details
 * 3. ChannelDetailsModal đa tab: Giới thiệu | Thành viên & Mời | Học liệu & Tệp | Cài đặt nhóm
 * 4. AI Summarize Modal: Tự động tóm tắt nội dung thảo luận chuyên môn
 * 5. Loại bỏ hoàn toàn sự thừa thãi của 2 popup thành viên cũ
 */
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Users,
  Search,
  Plus,
  Send,
  MoreVertical,
  Check,
  X,
  UserPlus,
  Shield,
  Copy,
  Settings,
  Bell,
  BellOff,
  User,
  Trash2,
  MessageCircle,
  Inbox,
  LogOut,
  UserCheck,
  Hash,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Star,
  Headphones,
  FileText,
  Share2,
  BookOpen,
  Info,
  CheckCheck,
  UserMinus,
  ShieldCheck,
  Globe,
  Lock,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Reply,
  Pin,
  Pencil,
  Undo2,
  CheckCircle2,
  Download,
  File as FileIcon,
  Film,
  Image as ImageIcon,
  AtSign,
} from 'lucide-react';
import {
  QGroup,
  QGroupMessage,
  FriendRequest,
  QGroupInvitation,
  ScreenId,
  UserProfile,
  UserSubscriptionInfo,
} from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { PublicProfileModal } from './PublicProfileModal';
import { SlackEmojiPicker } from './SlackEmojiPicker';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { ConfirmModal } from './qgroup/QGroupConfirmModal';
import { InvitationsPanel } from './qgroup/InvitationsPanel';
import { ChannelDetailsModal } from './qgroup/ChannelDetailsModal';
import { ChannelSettingsModal } from './qgroup/ChannelSettingsModal';
import { AiSummarizeModal, HuddleCallModal } from './qgroup/HuddleAndAiModals';
import { IncomingHuddleModal, IncomingHuddleData } from './qgroup/IncomingHuddleModal';
import { ActiveHuddleBanner, ActiveHuddleInfo } from './qgroup/ActiveHuddleBanner';
import { FriendModal } from './qgroup/FriendModal';
import { DirectAddMemberModal } from './qgroup/DirectAddMemberModal';
import { CreateOrJoinGroupModal } from './qgroup/CreateOrJoinGroupModal';
import { ChannelSidebar } from './qgroup/ChannelSidebar';
import { ChatHeader } from './qgroup/ChatHeader';
import { PinnedMessagesBar } from './qgroup/PinnedMessagesBar';
import { ChatComposer } from './qgroup/ChatComposer';
import { MediaLightboxModal } from './qgroup/MediaLightboxModal';
import { SharedMediaDrawer } from './qgroup/SharedMediaDrawer';
import { deduplicateDMsAndChannels } from './qgroup/chatUtils';
import { isGroupMuted, toggleGroupMute, isConversationPinned, toggleConversationPin } from '../utils/notificationPrefs';
import { openUserProfile } from '../utils/userProfileModalHelper';
import { downloadFileSafely } from '../utils/fileDownloadHelper';
import {
  getOptimalAudioDeviceId,
  cycleToNextMicrophone,
  setPreferredAudioDeviceId,
} from '../utils/audioDeviceManager';

// ─── Props ─────────────────────────────────────────────────────────────────
interface QGroupScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
  currentUser?: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
  onOpenMobileMenu?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const parseLegacyForumShare = (text: string) => {
  if (!text || !text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]')) return null;
  const tagMatch = text.match(/#(\S+)/);
  const authorMatch = text.match(/Tác giả:\s*([^\n\r]+)/);
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') &&
        !l.startsWith('Tác giả:') &&
        !l.startsWith('Đính kèm:') &&
        !l.startsWith('Video:')
    );
  const content = lines.join(' ').slice(0, 180);
  return {
    id: undefined,
    tag: tagMatch ? tagMatch[1] : 'HọcThuật',
    authorName: authorMatch ? authorMatch[1].trim() : 'Giảng viên',
    authorTitle: undefined,
    department: 'Khoa Công nghệ Thông tin',
    content: content || 'Bài viết trao đổi học thuật trên diễn đàn.',
    attachmentFileName: text.includes('Đính kèm:') ? text.split('Đính kèm:')[1]?.split('\n')[0]?.trim() : undefined,
    attachmentFileSize: undefined,
  };
};

const initials = (name: string) =>
  String(name || 'QG')
    .trim()
    .slice(0, 2)
    .toUpperCase();

const formatTime = (ts: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} ph`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getGroupSortTime = (g: QGroup): number => {
  let best = 0;
  const nowCap = Date.now() + 60000;
  const msgs = g.messages || [];
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1];
    if (last?.id && last.id.startsWith('msg-')) {
      const parsed = parseInt(last.id.replace('msg-', ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= nowCap) {
        best = Math.max(best, parsed);
      }
    }
  }
  const up = Number(g.updatedAt) || 0;
  if (up > 0 && up <= nowCap) {
    best = Math.max(best, up);
  }
  return best;
};

// ─── Blacklist helpers ──────────────────────────────────────────────────────
const getBlacklistKey = (email: string) =>
  `quizgen_deleted_qgroups_${(email || 'global').toLowerCase()}`;

const getBlacklist = (email: string): Set<string> => {
  try {
    const saved = localStorage.getItem(getBlacklistKey(email));
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {}
  return new Set();
};

const addToBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  ids.forEach((id) => id && bl.add(id));
  try {
    localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
  } catch {}
};

const removeFromBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  let changed = false;
  ids.forEach((id) => {
    if (id && bl.has(id)) {
      bl.delete(id);
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
    } catch {}
  }
};

const isGroupMemberOrOwner = (g: QGroup, email: string): boolean => {
  if (!email || !g) return false;
  const clean = email.trim().toLowerCase();
  const owner = (g.ownerEmail || '').trim().toLowerCase();
  const partner = (g.directPartnerEmail || '').trim().toLowerCase();
  const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
  return owner === clean || partner === clean || members.includes(clean);
};

const flattenGroups = (arr: unknown[]): QGroup[] => {
  const out: QGroup[] = [];
  for (const it of arr) {
    if (it && typeof it === 'object') {
      const obj = it as Record<string, unknown>;
      if (Array.isArray(obj.groups)) out.push(...flattenGroups(obj.groups));
      else if (obj.id && obj.name) out.push(obj as unknown as QGroup);
    }
  }
  return out;
};

const dedupMessages = (msgs: QGroupMessage[]): QGroupMessage[] => {
  const seen = new Set<string>();
  return (msgs || []).filter((m) => {
    const mid = String(m?.id || '').trim();
    if (mid) {
      if (seen.has(mid)) return false;
      seen.add(mid);
    }
    return true;
  });
};

// ─── Direct Partner Resolution for Dual-Sided DM Rooms ──────────────────────
export interface ResolvedChatInfo {
  displayName: string;
  displayEmail?: string;
  partnerEmail?: string;
  displayRoleOrMembers: string;
  isDirect: boolean;
  avatarInitials: string;
}

export function resolveChatDisplayInfo(group: QGroup, myEmail: string): ResolvedChatInfo {
  if (!group.isDirect) {
    const memCount = group.memberCount || (group.members ? group.members.length : 1);
    return {
      displayName: group.name,
      displayEmail: group.ownerEmail,
      partnerEmail: group.ownerEmail,
      displayRoleOrMembers: `${memCount} thành viên`,
      isDirect: false,
      avatarInitials: (group.name || 'QG').slice(0, 2).toUpperCase(),
    };
  }

  // It's a Direct Message
  const cleanMyEmail = (myEmail || '').trim().toLowerCase();
  const cleanOwnerEmail = (group.ownerEmail || '').trim().toLowerCase();
  const cleanPartnerEmail = (group.directPartnerEmail || '').trim().toLowerCase();

  // If I am the creator/owner -> Partner is the directPartner
  if (cleanMyEmail === cleanOwnerEmail && cleanPartnerEmail) {
    const name = group.directPartnerName || cleanPartnerEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: cleanPartnerEmail,
      partnerEmail: cleanPartnerEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  // If I am the recipient -> Partner is the owner!
  if (cleanMyEmail !== cleanOwnerEmail && cleanOwnerEmail) {
    const name = group.ownerName || cleanOwnerEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: cleanOwnerEmail,
      partnerEmail: cleanOwnerEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  // Fallback: lookup in members list
  const otherEmail = (group.members || []).find(
    (m) => m.trim().toLowerCase() !== cleanMyEmail
  );
  if (otherEmail) {
    const name = group.directPartnerName && group.directPartnerName !== group.ownerName
      ? group.directPartnerName
      : otherEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: otherEmail,
      partnerEmail: otherEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  const fbEmail = group.directPartnerEmail || group.ownerEmail;
  return {
    displayName: group.name,
    displayEmail: fbEmail,
    partnerEmail: fbEmail,
    displayRoleOrMembers: 'Tin nhắn riêng 1-1',
    isDirect: true,
    avatarInitials: (group.name || 'DM').slice(0, 2).toUpperCase(),
  };
}

// ── Helpers for Attachments & Rich Formatting ─────────────────────────────
const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return <FileText className="w-5 h-5 text-blue-600" />;
  }
  if (lower.endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-rose-600" />;
  }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    return <FileText className="w-5 h-5 text-emerald-600" />;
  }
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
    return <FileText className="w-5 h-5 text-amber-600" />;
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) {
    return <FileIcon className="w-5 h-5 text-indigo-600" />;
  }
  return <FileIcon className="w-5 h-5 text-slate-600" />;
};

const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Phân tách khối code: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  const renderInlineSpans = (str: string) => {
    // 1: URL, 2: Bold, 3: Italic, 4: Inline Code, 5: @Mention (chỉ bắt tên viết hoa hoặc từ đơn, không nuốt các từ viết thường tiếp theo)
    const tokenRegex =
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(@(?:all|everyone|kênh|[a-zA-Z0-9_\.\u00C0-\u1EF9]+(?:\s+[A-Z\u00C0-\u1EF9][a-zA-Z0-9_\u00C0-\u1EF9]*)*))/g;
    const tokens: React.ReactNode[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(str)) !== null) {
      if (m.index > cur) {
        tokens.push(str.slice(cur, m.index));
      }
      const val = m[0];
      if (m[1]) {
        // Link web (Clickable mở tab mới an toàn)
        tokens.push(
          <a
            key={m.index}
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-teal-600 hover:text-teal-700 underline underline-offset-2 break-all font-semibold transition-colors inline-flex items-center gap-0.5"
            title={`Mở liên kết: ${val}`}
          >
            <span>{val}</span>
          </a>
        );
      } else if (m[2]) {
        // In đậm: **text**
        tokens.push(
          <strong key={m.index} className="font-bold text-slate-900">
            {val.slice(2, -2)}
          </strong>
        );
      } else if (m[3]) {
        // In nghiêng: *text*
        tokens.push(
          <em key={m.index} className="italic text-slate-800">
            {val.slice(1, -1)}
          </em>
        );
      } else if (m[4]) {
        // Inline code: `code`
        tokens.push(
          <code
            key={m.index}
            className="px-1.5 py-0.5 rounded text-[11.5px] font-mono bg-slate-100 text-rose-600 border border-slate-200"
          >
            {val.slice(1, -1)}
          </code>
        );
      } else if (m[5]) {
        // Tag / @mention thành viên (chỉ bọc đúng huy hiệu tên được tag)
        const isBroadcast =
          val.toLowerCase() === '@all' ||
          val.toLowerCase() === '@everyone' ||
          val.toLowerCase() === '@kênh';
        tokens.push(
          <span
            key={m.index}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs transition-colors cursor-pointer select-text ${
              isBroadcast
                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300 font-bold'
                : 'bg-teal-100/90 text-teal-800 ring-1 ring-teal-300 hover:bg-teal-200 shadow-2xs'
            }`}
          >
            {val}
          </span>
        );
      }
      cur = m.index + val.length;
    }
    if (cur < str.length) {
      tokens.push(str.slice(cur));
    }
    return tokens.length > 0 ? tokens : str;
  };

  const renderLines = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      if (line.startsWith('> ')) {
        // Trích dẫn
        return (
          <div
            key={lIdx}
            className="my-1.5 pl-3 py-1 border-l-4 border-teal-500 bg-teal-50/40 rounded-r-lg text-slate-700 italic text-[12.5px]"
          >
            {renderInlineSpans(line.slice(2))}
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        // Gạch đầu dòng
        return (
          <div key={lIdx} className="flex items-start gap-2 my-0.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <span className="text-[13px] text-slate-800">{renderInlineSpans(line.slice(2))}</span>
          </div>
        );
      }
      return (
        <span key={lIdx} className="block min-h-[1.2em]">
          {renderInlineSpans(line)}
        </span>
      );
    });
  };

  return (
    <div className="text-[13px] text-slate-800 leading-relaxed font-normal break-words space-y-1">
      {parts.map((p, idx) => {
        if (p.type === 'code') {
          return (
            <div
              key={idx}
              className="my-2 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 shadow-xs"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-[11px] font-mono">
                <span className="uppercase font-semibold tracking-wider text-teal-400">
                  {p.language || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(p.content);
                    setCopiedIdx(idx);
                    setTimeout(() => setCopiedIdx(null), 2000);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-slate-300"
                  title="Sao chép mã"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300 whitespace-pre leading-5">
                <code>{p.content}</code>
              </pre>
            </div>
          );
        }
        return <div key={idx}>{renderLines(p.content)}</div>;
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onNavigate,
  onShowToast,
  currentUser,
  subscriptionInfo,
  onOpenMobileMenu,
}) => {
  const myEmail = useMemo(
    () => (currentUser?.email || '').trim().toLowerCase(),
    [currentUser?.email]
  );
  const myName = currentUser?.fullName || 'Giảng viên';

  // ── States ───────────────────────────────────────────────────────────────
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const [systemUsersList, setSystemUsersList] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    try {
      // Chỉ chọn đoạn chat sẵn nếu người dùng vừa bấm "Mở tin nhắn" từ thông báo
      const isDirectOpen = sessionStorage.getItem('quizgen_direct_open_chat') === 'true';
      if (isDirectOpen) {
        return sessionStorage.getItem('qgroup_selected_group_id') || '';
      }
      // Khi mới vào Q-Group từ Menu/Sidebar: không chọn đoạn chat nào để cả mobile lẫn desktop hiển thị đúng chuẩn
      return '';
    } catch {
      return '';
    }
  });
  const [showMobileChat, setShowMobileChat] = useState<boolean>(() => {
    try {
      // Chỉ mở thẳng khung chat trên mobile nếu người dùng vừa bấm "Mở tin nhắn" từ thông báo
      const isDirectOpen = sessionStorage.getItem('quizgen_direct_open_chat') === 'true';
      if (isDirectOpen) {
        sessionStorage.removeItem('quizgen_direct_open_chat');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (selectedGroupId) {
      try {
        sessionStorage.setItem('qgroup_selected_group_id', selectedGroupId);
        localStorage.setItem('qgroup_selected_group_id', selectedGroupId);
      } catch {}
    } else {
      try {
        sessionStorage.removeItem('qgroup_selected_group_id');
        localStorage.removeItem('qgroup_selected_group_id');
      } catch {}
    }
  }, [selectedGroupId]);

  // Đồng bộ danh mục tài khoản người dùng từ auth-service và localStorage
  useEffect(() => {
    let isMounted = true;
    const fetchSystemUsers = async () => {
      try {
        const res = await apiClient.fetch(`${API_BASE}/auth/users/search?q=`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && isMounted) {
            setSystemUsersList((prev) => {
              const map = new Map<string, { email: string; fullName: string; academicTitle?: string; department?: string }>();
              list.forEach((u: any) => {
                if (u.email) {
                  map.set(u.email.toLowerCase(), {
                    email: u.email,
                    fullName: u.fullName || u.email.split('@')[0],
                    academicTitle: u.academicTitle || 'ThS.',
                    department: u.department || 'Khoa Công nghệ Thông tin',
                  });
                }
              });
              try {
                const localUsers = JSON.parse(localStorage.getItem('quizgen_registered_users') || '[]');
                localUsers.forEach((lu: any) => {
                  if (lu.email && !map.has(lu.email.toLowerCase())) {
                    map.set(lu.email.toLowerCase(), {
                      email: lu.email,
                      fullName: lu.fullName || lu.name || lu.email.split('@')[0],
                      academicTitle: lu.academicTitle || lu.title || 'ThS.',
                      department: lu.department || 'Khoa Công nghệ Thông tin',
                    });
                  }
                });
              } catch {}
              return Array.from(map.values());
            });
            return;
          }
        }
      } catch {}

      try {
        const localUsers = JSON.parse(localStorage.getItem('quizgen_registered_users') || '[]');
        if (Array.isArray(localUsers) && isMounted) {
          setSystemUsersList(
            localUsers.map((lu: any) => ({
              email: lu.email,
              fullName: lu.fullName || lu.name || lu.email.split('@')[0],
              academicTitle: lu.academicTitle || lu.title || 'ThS.',
              department: lu.department || 'Khoa Công nghệ Thông tin',
            }))
          );
        }
      } catch {}
    };

    void fetchSystemUsers();
    return () => {
      isMounted = false;
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'unread' | 'groups' | 'friends' | 'invitations'
  >('all');

  // Lời mời
  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [sentGroupInvitations, setSentGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [locallyInvitedGroupMembers, setLocallyInvitedGroupMembers] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [invitationsTab, setInvitationsTab] = useState<'received' | 'sent' | 'groups'>('received');

  // Trưởng nhóm nhượng quyền & giải tán nhóm
  const [isTransferOwnerModalOpen, setIsTransferOwnerModalOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<QGroup | null>(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [transferAlsoLeave, setTransferAlsoLeave] = useState<boolean>(false);
  const [isTransferringOwner, setIsTransferringOwner] = useState(false);

  // Context menu
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);

  // Slack Header Modals & Toolbars
  const [detailsGroup, setDetailsGroup] = useState<QGroup | null>(null);
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [channelDetailsTab, setChannelDetailsTab] = useState<'about' | 'members'>('about');
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isSharedMediaOpen, setIsSharedMediaOpen] = useState(false);

  // Trạng thái Huddle toàn hệ thống và cuộc gọi đến
  const [activeHuddleRooms, setActiveHuddleRooms] = useState<{ [roomId: string]: ActiveHuddleInfo }>({});
  const [incomingHuddleCall, setIncomingHuddleCall] = useState<IncomingHuddleData | null>(null);
  const dismissedCallsRef = useRef<{ [roomId: string]: number }>({});

  // Cuộc trò chuyện đã ẩn (Hidden groups)
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`quizgen_hidden_groups_${myEmail}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleHideGroup = useCallback(
    (groupId: string) => {
      setHiddenGroupIds((prev) => {
        const next = new Set(prev);
        next.add(groupId);
        try {
          localStorage.setItem(`quizgen_hidden_groups_${myEmail}`, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      onShowToast('info', 'Đã ẩn cuộc trò chuyện', 'Cuộc trò chuyện đã được chuyển vào mục "Đã ẩn" ở cuối danh sách.');
    },
    [myEmail, onShowToast]
  );

  const handleUnhideGroup = useCallback(
    (groupId: string) => {
      setHiddenGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        try {
          localStorage.setItem(`quizgen_hidden_groups_${myEmail}`, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      onShowToast('success', 'Đã hiện lại cuộc trò chuyện', 'Cuộc trò chuyện đã xuất hiện lại trong danh sách chính.');
    },
    [myEmail, onShowToast]
  );

  // In-App Modern Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Composer Attachments & Popovers
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);
  const [isTextbookModalOpen, setIsTextbookModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<{ url: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    size?: string;
    type?: string;
  } | null>(null);
  const [activePinnedIdx, setActivePinnedIdx] = useState(0);
  const [selectedAttachments, setSelectedAttachments] = useState<Array<{
    type: 'textbook' | 'file' | 'image' | 'video' | 'audio';
    id: string;
    name: string;
    size: string;
    fileUrl?: string;
    fileType?: string;
    totalPages?: number;
    authorName?: string;
    duration?: number;
  }>>([]);
  const selectedAttachment = selectedAttachments[0] || null;
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveWaveformSamplesRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [liveMicLevels, setLiveMicLevels] = useState<number[]>([30, 50, 80, 60, 40, 70, 50, 30]);

  // ── Mobile Back Gesture & History Popstate Handler for Media Preview ───────
  useEffect(() => {
    if (!previewMediaUrl) return;
    try {
      window.history.pushState({ modal: 'qgroup-media' }, '');
    } catch {}

    const handlePopState = () => {
      setPreviewMediaUrl(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [previewMediaUrl]);

  const closePreviewMedia = useCallback(() => {
    try {
      if (window.history.state?.modal === 'qgroup-media') {
        window.history.back();
        return;
      }
    } catch {}
    setPreviewMediaUrl(null);
  }, []);

  // @Mention state
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);

  // Available Textbooks for Attachment
  const [availableTextbooks, setAvailableTextbooks] = useState<Array<{
    id: string;
    name: string;
    size: string;
    totalPages: number;
    authorName: string;
  }>>([
    {
      id: 'tb-001',
      name: '3000.pdf',
      size: '12.4 MB',
      totalPages: 128,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-002',
      name: '2018-Operating System Concepts-10th.pdf',
      size: '29.7 MB',
      totalPages: 1278,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-003',
      name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
      size: '15.2 MB',
      totalPages: 182,
      authorName: 'ThS. Hân Bích',
    },
    {
      id: 'tb-004',
      name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
      size: '22.1 MB',
      totalPages: 412,
      authorName: 'Bộ Môn Kinh Tế',
    },
  ]);

  // Basic Modals
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [friendLookedUpUser, setFriendLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);
  const [friendLookupStatus, setFriendLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'create' | 'join'>('create');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  // Trạng thái chọn nhiều thành viên khi Tạo kênh học thuật mới
  const [createGroupSelectedMembers, setCreateGroupSelectedMembers] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);
  const [createGroupMemberInput, setCreateGroupMemberInput] = useState('');
  const [createGroupLookupStatus, setCreateGroupLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'not_found'
  >('idle');
  const [createGroupLookedUpUser, setCreateGroupLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);

  // Hàng đợi chọn nhiều người trong modal Thêm thành viên vào kênh (isDirectAddMemberOpen)
  const [directAddSelectedMembers, setDirectAddSelectedMembers] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);

  // Hàng đợi chọn nhiều người trong modal Thêm bạn bè (isAddFriendOpen)
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);

  // Public profile modal
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | undefined>(undefined);

  // Micro thu âm thoại thông minh
  const [activeMicLabel, setActiveMicLabel] = useState<string>('');

  // Collapsible Sections cho Sidebar Slack/Teams
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isDmsOpen, setIsDmsOpen] = useState(true);

  // Slack Header Menu & Outside Member Inviting
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isDirectAddMemberOpen, setIsDirectAddMemberOpen] = useState(false);
  const [directAddMemberEmail, setDirectAddMemberEmail] = useState('');
  const [lookedUpUser, setLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Message Actions: Reply, Inline Edit, Reaction, Recall
  const [replyingToMessage, setReplyingToMessage] = useState<QGroupMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Kiểm tra quan hệ bạn bè / đồng nghiệp theo profile đang mở
  const isTargetFriend = useMemo(() => {
    if (!profileEmail || !myEmail) return false;
    const target = profileEmail.trim().toLowerCase();
    return qgroups.some((g) => {
      if (!g.isDirect) return false;
      const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
      const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
      const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
      return (
        (cleanOwner === target && cleanPartner === myEmail) ||
        (cleanPartner === target && cleanOwner === myEmail) ||
        (members.includes(target) && members.includes(myEmail))
      );
    });
  }, [profileEmail, myEmail, qgroups]);

  const hasTargetPendingRequest = useMemo(() => {
    if (!profileEmail) return false;
    const target = profileEmail.trim().toLowerCase();
    return sentFriendRequests.some((r) => r.targetEmail?.trim().toLowerCase() === target && r.status === 'pending');
  }, [profileEmail, sentFriendRequests]);

  // Danh sách bạn bè & đồng nghiệp kết nối (để thêm nhanh vào kênh 1 chạm)
  const connectedFriends = useMemo(() => {
    const map = new Map<string, { email: string; name: string; title?: string; dept?: string }>();

    // Trích xuất từ các cuộc trò chuyện trực tiếp (DM 1-1)
    qgroups.forEach((g) => {
      if (g.isDirect) {
        const info = resolveChatDisplayInfo(g, myEmail);
        if (info.partnerEmail && info.partnerEmail.toLowerCase() !== myEmail.toLowerCase()) {
          map.set(info.partnerEmail.toLowerCase(), {
            email: info.partnerEmail,
            name: info.displayName,
            title: undefined,
            dept: g.department || 'Đồng nghiệp UTH',
          });
        }
      }
    });

    // 1. Đồng bộ người dùng thực tế từ auth.db (qua admin-service API)
    systemUsersList.forEach((u) => {
      if (u.email && u.email.toLowerCase() !== myEmail.toLowerCase()) {
        const cleanEmail = u.email.toLowerCase();
        if (!map.has(cleanEmail)) {
          map.set(cleanEmail, {
            email: u.email,
            name: `${u.academicTitle ? u.academicTitle + ' ' : ''}${u.fullName}`,
            title: u.academicTitle || 'ThS.',
            dept: u.department || 'Khoa Công nghệ Thông tin',
          });
        }
      }
    });

    // 2. Các tài khoản mẫu hệ thống & đồng nghiệp dự phòng
    const systemLecturers = [
      { email: 'mr.av1222005@gmail.com', name: 'ThS. Mr. AV', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'avanimechannel@gmail.com', name: 'ThS. Vũ Anh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'hieuhieu22112005@gmail.com', name: 'ThS. Hieu Huynh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'daipqps37469@gmail.com', name: 'ThS. Đại Phạm Quang', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'vuha3608@ut.edu.vn', name: 'ThS. Vũ Hồ Anh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'nguyentann0804@gmail.com', name: 'TS. Nguyễn Văn Tân', title: 'TS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'ducngo.180305@gmail.com', name: 'TS. Ngô Phạm Công Đức', title: 'TS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'lieuthanhau@gmail.com', name: 'ThS. Liêu Thanh Hậu', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'anhvu12022005@gmail.com', name: 'ThS. Anhvu12022005', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'quizgen.ai.team@gmail.com', name: 'Ban Quản trị QuizGen AI', title: 'Admin', dept: 'Phòng Đào Tạo & Khảo Thí' },
      { email: 'hod.cntt@uth.edu.vn', name: 'PGS. TS. Trưởng Khoa CNTT', title: 'PGS. TS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'gv.kinhte@uth.edu.vn', name: 'TS. Giảng viên Kinh tế', title: 'TS.', dept: 'Khoa Kinh tế Vận tải' },
    ];

    systemLecturers.forEach((c) => {
      if (c.email.toLowerCase() !== myEmail.toLowerCase()) {
        if (!map.has(c.email.toLowerCase())) {
          map.set(c.email.toLowerCase(), c);
        } else {
          const ex = map.get(c.email.toLowerCase())!;
          if (!ex.title && c.title) ex.title = c.title;
          if ((!ex.dept || ex.dept === 'Đồng nghiệp UTH') && c.dept) ex.dept = c.dept;
        }
      }
    });

    return Array.from(map.values());
  }, [qgroups, myEmail, systemUsersList]);

  // Bộ lọc danh sách bạn bè theo ô tìm kiếm / ký tự @ (khi thêm thành viên vào kênh)
  const filteredFriends = useMemo(() => {
    const q = directAddMemberEmail.trim().toLowerCase();
    if (!q || q === '@') {
      return connectedFriends;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return connectedFriends;
    return connectedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, directAddMemberEmail]);

  // Bộ lọc danh sách đồng nghiệp / giảng viên (khi thêm bạn bè mới)
  const filteredColleaguesForFriend = useMemo(() => {
    const q = friendEmailInput.trim().toLowerCase();
    if (!q || q === '@') {
      return connectedFriends;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return connectedFriends;
    return connectedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, friendEmailInput]);

  // Bộ lọc danh sách đồng nghiệp khi tạo kênh học thuật mới
  const filteredColleaguesForNewGroup = useMemo(() => {
    const selectedEmails = new Set(createGroupSelectedMembers.map((m) => m.email.toLowerCase()));
    const q = createGroupMemberInput.trim().toLowerCase();
    const available = connectedFriends.filter((f) => !selectedEmails.has(f.email.toLowerCase()));
    if (!q || q === '@') {
      return available;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return available;
    return available.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, createGroupSelectedMembers, createGroupMemberInput]);

  // Gợi ý tức thì dạng dropdown nổi khi gõ từ khóa vào ô tìm kiếm bạn bè
  const suggestedFriendsDropdown = useMemo(() => {
    const raw = friendEmailInput.trim().toLowerCase().replace(/^@/, '');
    if (!raw) return [];
    return connectedFriends
      .filter((f) => {
        if (f.email.toLowerCase() === myEmail.toLowerCase()) return false;
        const prefix = f.email.toLowerCase().split('@')[0];
        return (
          f.email.toLowerCase().includes(raw) ||
          prefix.includes(raw) ||
          f.name.toLowerCase().includes(raw) ||
          (f.dept && f.dept.toLowerCase().includes(raw))
        );
      })
      .slice(0, 6);
  }, [connectedFriends, friendEmailInput, myEmail]);

  // Gợi ý tức thì khi thêm thành viên vào kênh
  const suggestedDirectAddDropdown = useMemo(() => {
    const raw = directAddMemberEmail.trim().toLowerCase().replace(/^@/, '');
    if (!raw) return [];
    return connectedFriends
      .filter((f) => {
        if (f.email.toLowerCase() === myEmail.toLowerCase()) return false;
        const prefix = f.email.toLowerCase().split('@')[0];
        return (
          f.email.toLowerCase().includes(raw) ||
          prefix.includes(raw) ||
          f.name.toLowerCase().includes(raw) ||
          (f.dept && f.dept.toLowerCase().includes(raw))
        );
      })
      .slice(0, 6);
  }, [connectedFriends, directAddMemberEmail, myEmail]);

  // Gợi ý tức thì khi tạo nhóm mới
  const suggestedCreateGroupDropdown = useMemo(() => {
    const raw = createGroupMemberInput.trim().toLowerCase().replace(/^@/, '');
    if (!raw) return [];
    const selected = new Set(createGroupSelectedMembers.map((m) => m.email.toLowerCase()));
    return connectedFriends
      .filter((f) => {
        if (f.email.toLowerCase() === myEmail.toLowerCase() || selected.has(f.email.toLowerCase())) return false;
        const prefix = f.email.toLowerCase().split('@')[0];
        return (
          f.email.toLowerCase().includes(raw) ||
          prefix.includes(raw) ||
          f.name.toLowerCase().includes(raw) ||
          (f.dept && f.dept.toLowerCase().includes(raw))
        );
      })
      .slice(0, 6);
  }, [connectedFriends, createGroupMemberInput, createGroupSelectedMembers, myEmail]);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevGroupIdRef = useRef<string | null>(null);
  const isUserNearBottomRef = useRef<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef<Record<string, number>>({});

  // Đóng Slack Header Menu khi nhấp chuột ra ngoài
  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isHeaderMenuOpen]);

  // ── Audio Beep ───────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }, []);

  // ── Âm thanh réo tên chuẩn Chime (Bắt buộc phát dù tắt chuông) ─────────────
  const playMentionChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Note 1: E5 = 659.25Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5 = 987.77Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch {}
  }, []);

  // ── Mở phòng Huddle kèm kích hoạt âm thanh Autoplay trên di động ──────────
  const handleOpenHuddleWithAudioPrime = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().catch(() => {});
      }
    } catch {}
    setIsHuddleOpen(true);
  }, []);

  // Lắng nghe sự kiện điều hướng từ bên ngoài (Toast Click / Global Huddle Accept)
  useEffect(() => {
    const handleOpenGroup = (e: any) => {
      const gid = e?.detail?.groupId || sessionStorage.getItem('qgroup_selected_group_id');
      if (gid) {
        setSelectedGroupId(gid);
        setShowMobileChat(true);
        // Tức thì nhảy đến tin nhắn mới nhất ở cuối trang, triệt tiêu hiệu ứng cuộn từ trên xuống
        const jumpDirectly = () => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
          if (chatEndRef.current) {
            try {
              chatEndRef.current.scrollIntoView({ behavior: 'instant' as any, block: 'end' });
            } catch {
              chatEndRef.current.scrollIntoView(false);
            }
          }
        };
        jumpDirectly();
        requestAnimationFrame(jumpDirectly);
      }
    };

    const handleJoinHuddle = (e: any) => {
      const gid = e?.detail?.groupId || sessionStorage.getItem('qgroup_selected_group_id');
      if (gid) {
        setSelectedGroupId(gid);
        setShowMobileChat(true);
      }
      handleOpenHuddleWithAudioPrime();
    };

    window.addEventListener('quizgen:open-group', handleOpenGroup);
    window.addEventListener('quizgen:join-huddle', handleJoinHuddle);

    // Kiểm tra cờ mở chat trực tiếp từ xem trang cá nhân
    try {
      const targetEmail = sessionStorage.getItem('quizgen_target_chat_email');
      if (targetEmail) {
        sessionStorage.removeItem('quizgen_target_chat_email');
        const cleanTarget = targetEmail.trim().toLowerCase();
        const dm = qgroups.find((g) => {
          if (!g.isDirect) return false;
          const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
          const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
          const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
          return cleanOwner === cleanTarget || cleanPartner === cleanTarget || members.includes(cleanTarget);
        });
        if (dm) {
          setSelectedGroupId(dm.id);
          setShowMobileChat(true);
          setFilterTab('all');
        }
      }
    } catch {}

    // Kiểm tra cờ auto-join nếu vừa chuyển màn hình vào
    try {
      if (sessionStorage.getItem('quizgen_auto_open_huddle') === 'true') {
        sessionStorage.removeItem('quizgen_auto_open_huddle');
        handleOpenHuddleWithAudioPrime();
      }
    } catch {}

    return () => {
      window.removeEventListener('quizgen:open-group', handleOpenGroup);
      window.removeEventListener('quizgen:join-huddle', handleJoinHuddle);
    };
  }, [handleOpenHuddleWithAudioPrime, qgroups]);

  // ── Backend sync & Storage ───────────────────────────────────────────────
  const syncGroupsToBackend = useCallback(async (groups: QGroup[]) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
    } catch {}
  }, []);

  const applyGroups = useCallback(
    (groups: QGroup[]) => {
      const cleanGroups = deduplicateDMsAndChannels(groups);
      const valid = cleanGroups.filter((g) => {
        // Chỉ hiển thị kênh nếu người dùng là thành viên hoặc chủ nhóm
        if (isGroupMemberOrOwner(g, myEmail)) {
          removeFromBlacklist(myEmail, g.id, g.code);
          return true;
        }
        return false;
      });
      setQgroups(valid);
      try {
        const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
        localStorage.setItem(storageKey, JSON.stringify(valid));
      } catch {}
    },
    [myEmail]
  );

  const markGroupAsRead = useCallback(
    (groupId: string) => {
      if (!groupId || !myEmail) return;
      setQgroups((prev) => {
        let changed = false;
        const next = prev.map((g) => {
          if (g.id !== groupId && g.code !== groupId) return g;
          const msgs = (g.messages || []).map((m) => {
            const readBy = m.readBy || [];
            if (!readBy.some((r) => r.toLowerCase() === myEmail)) {
              changed = true;
              return { ...m, readBy: [...readBy, myEmail] };
            }
            return m;
          });
          return changed ? { ...g, messages: msgs } : g;
        });
        if (changed) {
          try {
            const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
        }
        return changed ? next : prev;
      });

      apiClient
        .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(groupId)}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: myEmail }),
        })
        .catch(() => {});
    },
    [myEmail]
  );

  const fetchGroupInvitations = useCallback(async () => {
    if (!myEmail) return;
    try {
      // 1. Lời mời đã nhận (Incoming)
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}&type=received`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data))
          setGroupInvitations(data.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }

      // 2. Lời mời nhóm đã gửi (Outgoing / Sent)
      const resSent = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}&type=sent`
      );
      if (resSent.ok) {
        const dataSent = await resSent.json();
        if (Array.isArray(dataSent))
          setSentGroupInvitations(dataSent.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const fetchFriendRequests = useCallback(async () => {
    if (!myEmail) return;
    try {
      // 1. Lời mời đã nhận (Incoming)
      const resIn = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=received`
      );
      if (resIn.ok) {
        const data = await resIn.json();
        if (Array.isArray(data))
          setFriendRequests(data.filter((r: FriendRequest) => r?.status === 'pending'));
      }

      // 2. Lời mời đã gửi (Outgoing Sent)
      const resOut = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=sent`
      );
      if (resOut.ok) {
        const dataOut = await resOut.json();
        if (Array.isArray(dataOut))
          setSentFriendRequests(dataOut.filter((r: FriendRequest) => r?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const handleCancelFriendRequest = useCallback(async (reqId: string) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/friend-requests/${reqId}`, {
        method: 'DELETE',
      });
      setSentFriendRequests((prev) => prev.filter((r) => r.id !== reqId));
      onShowToast('info', 'Đã thu hồi', 'Đã thu hồi lời mời kết bạn.');
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể thu hồi lời mời kết bạn.');
    }
  }, [onShowToast]);

  const fetchQGroups = useCallback(async () => {
    try {
      const url = myEmail
        ? `${API_BASE}/documents/qgroups?email=${encodeURIComponent(myEmail)}`
        : `${API_BASE}/documents/qgroups`;
      const res = await apiClient.fetch(url);
      if (!res.ok) return;
      const remote = await res.json();
      if (!Array.isArray(remote)) return;

      const bl = getBlacklist(myEmail);
      const remoteClean = flattenGroups(remote).filter((g) => {
        if (isGroupMemberOrOwner(g, myEmail)) {
          removeFromBlacklist(myEmail, g.id, g.code);
          return true;
        }
        return false;
      });

      const merged = deduplicateDMsAndChannels([...remoteClean]);

      const seen = new Set<string>();
      const deduped: QGroup[] = [];
      for (const g of merged) {
        const key = (g.code || g.id || '').trim();
        const isActiveMember = isGroupMemberOrOwner(g, myEmail);
        if (!key || !isActiveMember || bl.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        const cleanMsgs = dedupMessages(g.messages || []);

        const localGroup = qgroups.find(
          (lg) => lg.id === g.id || lg.code === g.code
        );
        if (localGroup) {
          const localReadMsgIds = new Set<string>();
          (localGroup.messages || []).forEach((lm) => {
            if ((lm.readBy || []).some((r) => r.toLowerCase() === myEmail)) {
              if (lm.id) localReadMsgIds.add(lm.id);
            }
          });
          cleanMsgs.forEach((cm) => {
            if (cm.id && localReadMsgIds.has(cm.id)) {
              const currentReadBy = cm.readBy || [];
              if (!currentReadBy.some((r) => r.toLowerCase() === myEmail)) {
                cm.readBy = [...currentReadBy, myEmail];
              }
            }
          });
        }

        if (g.id === selectedGroupId || g.code === selectedGroupId) {
          cleanMsgs.forEach((cm) => {
            const currentReadBy = cm.readBy || [];
            if (!currentReadBy.some((r) => r.toLowerCase() === myEmail)) {
              cm.readBy = [...currentReadBy, myEmail];
            }
          });
        }

        const calculatedTime = getGroupSortTime({ ...g, messages: cleanMsgs });
        const isMuted = isGroupMuted(g.id, myEmail);
        const isPinned = isConversationPinned(g.id, myEmail, g.pinnedBy);
        deduped.push({ ...g, messages: cleanMsgs, updatedAt: calculatedTime, muted: isMuted, isPinned });
      }

      deduped.forEach((g) => {
        const msgs = g.messages || [];
        const prev = prevMsgCount.current[g.id] ?? msgs.length;
        if (msgs.length > prev) {
          const last = msgs[msgs.length - 1];
          if (last && last.senderEmail?.toLowerCase() !== myEmail && !last.isSystem) {
            // Nếu người dùng đang mở đúng cuộc trò chuyện này thì không cần bắn Toast nữa (đang xem trực tiếp)
            if (g.id === selectedGroupId) {
              prevMsgCount.current[g.id] = msgs.length;
              return;
            }

            const lastText = (last.text || '').toLowerCase();
            const cleanMyEmail = myEmail.toLowerCase();
            const cleanMyName = (myName || '').toLowerCase();
            const isMentioned = Boolean(
              (cleanMyName && lastText.includes(`@${cleanMyName}`)) ||
              lastText.includes(`@${cleanMyEmail.split('@')[0]}`) ||
              lastText.includes('@all') ||
              lastText.includes('@everyone') ||
              lastText.includes('@kênh')
            );

            const isMuted = isGroupMuted(g.id, myEmail);
            const isDirectChat = Boolean(g.isDirect || g.type === 'direct');
            const categoryTag = isDirectChat ? '[Bạn bè]' : `[Nhóm #${g.name}]`;
            const senderDisplay = last.senderName || 'Đồng nghiệp';

            if (isMentioned) {
              // BẮT BUỘC BÁO DÙ CÓ TẮT CHUÔNG (BYPASS MUTE ON TAG)
              playMentionChime();
              onShowToast(
                'warning',
                `🔔 ${categoryTag} ${senderDisplay} đã nhắc đến bạn!`,
                last.text || '[Tệp đính kèm]',
                () => {
                  setSelectedGroupId(g.id);
                  setShowMobileChat(true);
                }
              );
            } else {
              // Tin nhắn thường: nếu không tắt chuông thì phát âm thanh
              if (!isMuted) {
                playBeep();
              }
              // DÙ CÓ TẮT CHUÔNG HAY KHÔNG, THÔNG BÁO HÌNH ẢNH VẪN LUÔN XUẤT HIỆN ĐẦY ĐỦ (chỉ là trong im lặng)
              onShowToast(
                'info',
                `${categoryTag} Tin nhắn mới từ ${senderDisplay}`,
                last.text || '[Tệp đính kèm]',
                () => {
                  setSelectedGroupId(g.id);
                  setShowMobileChat(true);
                }
              );
            }
          }
        }
        prevMsgCount.current[g.id] = msgs.length;
      });

      applyGroups(deduped);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail, myName, selectedGroupId, applyGroups, playBeep, playMentionChime, onShowToast]);

  // Đồng bộ trạng thái phòng đàm thoại Huddle và cuộc gọi đến
  const fetchActiveHuddles = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/huddle/active`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rooms) {
          setActiveHuddleRooms(data.rooms);

          // Kiểm tra xem có cuộc gọi 1-1 nào đang gọi tới currentUser không
          if (!isHuddleOpen) {
            const now = Date.now();
            const incoming = Object.values(data.rooms as { [k: string]: any }).find((r: any) => {
              if (!r.isDirect) return false;
              // Chỉ hiện popup chuông reo nếu cuộc gọi đang ở trạng thái đổ chuông thực sự
              if (r.isRinging === false) return false;
              if (r.callerEmail?.toLowerCase() === myEmail.toLowerCase()) return false;

              const matchGroup = qgroups.find((g) => {
                if (!g.isDirect) return false;
                const directPartner = (g.directPartnerEmail || '').toLowerCase().trim();
                const owner = (g.ownerEmail || '').toLowerCase().trim();
                const members = (g.members || []).map((m: string) => m.toLowerCase().trim());
                return (
                  (directPartner === r.callerEmail?.toLowerCase() || owner === r.callerEmail?.toLowerCase() || members.includes(r.callerEmail?.toLowerCase())) &&
                  (owner === myEmail.toLowerCase() || directPartner === myEmail.toLowerCase() || members.includes(myEmail.toLowerCase()))
                );
              });
              if (!matchGroup) return false;

              const dismissedUntil = dismissedCallsRef.current[r.roomId];
              if (dismissedUntil && now < dismissedUntil) return false;

              return true;
            });

          if (incoming) {
            const matchGroup = qgroups.find((g) => {
              if (!g.isDirect) return false;
              const directPartner = (g.directPartnerEmail || '').toLowerCase().trim();
              const owner = (g.ownerEmail || '').toLowerCase().trim();
              const members = (g.members || []).map((m: string) => m.toLowerCase().trim());
              return (
                (directPartner === incoming.callerEmail?.toLowerCase() || owner === incoming.callerEmail?.toLowerCase() || members.includes(incoming.callerEmail?.toLowerCase())) &&
                (owner === myEmail.toLowerCase() || directPartner === myEmail.toLowerCase() || members.includes(myEmail.toLowerCase()))
              );
            });

            setIncomingHuddleCall({
              roomId: incoming.roomId,
              callerName: incoming.callerName || 'Đồng nghiệp',
              callerEmail: incoming.callerEmail,
              groupName: matchGroup ? matchGroup.name : undefined,
              isDirect: true,
              groupId: matchGroup ? matchGroup.id : selectedGroupId,
            });
          } else {
            setIncomingHuddleCall(null);
          }
        } else {
          setIncomingHuddleCall(null);
        }
      }
    }
  } catch {
    // Ignored
  }
}, [isHuddleOpen, myEmail, qgroups, selectedGroupId]);

  // Polling 2s
  useEffect(() => {
    void fetchQGroups();
    void fetchGroupInvitations();
    void fetchFriendRequests();
    void fetchActiveHuddles();
    const iv = setInterval(() => {
      void fetchQGroups();
      void fetchGroupInvitations();
      void fetchFriendRequests();
      void fetchActiveHuddles();
    }, 2000);
    return () => clearInterval(iv);
  }, [fetchQGroups, fetchGroupInvitations, fetchFriendRequests, fetchActiveHuddles]);

  // Đồng bộ danh mục tài khoản toàn hệ thống từ auth.db (admin API)
  useEffect(() => {
    let isMounted = true;
    apiClient
      .fetch(`${API_BASE}/admin/users`)
      .then((res) => (res.ok ? res.json() : []))
      .then((users) => {
        if (!isMounted || !Array.isArray(users)) return;
        const normalized = users.map((u: any) => ({
          email: u.email,
          fullName: u.fullName || u.name || 'Giảng viên UTH',
          academicTitle: u.academicTitle || 'ThS.',
          department: u.department || 'Khoa Công nghệ Thông tin',
        }));
        setSystemUsersList(normalized);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Khi tài khoản đăng nhập thay đổi (switch user) -> lập tức fetch lại dữ liệu mới nhất
  useEffect(() => {
    void fetchQGroups();
    void fetchGroupInvitations();
    void fetchFriendRequests();
  }, [myEmail, fetchQGroups, fetchGroupInvitations, fetchFriendRequests]);

  // Nhảy tới tin nhắn mới nhất CHỈ KHI chuyển sang kênh/đoạn chat khác (không tự cuộn khi người dùng đang đọc tin nhắn cũ)
  useLayoutEffect(() => {
    if (selectedGroupId) {
      const isSwitchingGroup = prevGroupIdRef.current !== selectedGroupId;
      prevGroupIdRef.current = selectedGroupId;
      if (isSwitchingGroup) {
        isUserNearBottomRef.current = true;
        const jumpToLatestMessage = () => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        };
        jumpToLatestMessage();
        requestAnimationFrame(jumpToLatestMessage);
        const timer = setTimeout(jumpToLatestMessage, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedGroupId, showMobileChat]);

  useEffect(() => {
    if (selectedGroupId) {
      markGroupAsRead(selectedGroupId);
    }
  }, [selectedGroupId, markGroupAsRead]);

  // Click outside to close menus
  useEffect(() => {
    const handler = () => {
      setMenuGroupId(null);
      setIsEmojiPickerOpen(false);
      setIsAttachPopoverOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Sorted groups ─────────────────────────────────────────────────────────
  const sortedGroups = useMemo(() => {
    return deduplicateDMsAndChannels([...qgroups])
      .filter((g) => {
        // Bảo mật Tin nhắn riêng 1-1: Chỉ hiển thị cho 2 người tham gia
        if (g.isDirect) {
          const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
          const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
          const membersList = (g.members || []).map((m) => String(m).trim().toLowerCase());
          const isParticipant =
            myEmail === cleanOwner ||
            myEmail === cleanPartner ||
            membersList.includes(myEmail);
          if (!isParticipant) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (g.name || '').toLowerCase().includes(q) ||
            (g.department || '').toLowerCase().includes(q) ||
            (g.code || '').toLowerCase().includes(q)
          );
        }
        if (filterTab === 'groups') return !g.isDirect;
        if (filterTab === 'friends') return Boolean(g.isDirect);
        if (filterTab === 'unread') {
          const msgs = g.messages || [];
          if (!msgs.length) return false;
          const last = msgs[msgs.length - 1];
          return (
            last.senderEmail?.toLowerCase() !== myEmail &&
            !(last.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const cleanMyEmail = myEmail.toLowerCase().trim();
        const aPinned = isConversationPinned(a.id, cleanMyEmail, a.pinnedBy);
        const bPinned = isConversationPinned(b.id, cleanMyEmail, b.pinnedBy);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return getGroupSortTime(b) - getGroupSortTime(a);
      });
  }, [qgroups, searchQuery, filterTab, myEmail]);

  // Chỉ kiểm tra khi đã có nhóm được chọn: nếu nhóm bị xóa/giải tán thì reset về chưa chọn
  useEffect(() => {
    if (selectedGroupId && qgroups.length > 0) {
      const existsInAll = qgroups.some(
        (g) => g.id === selectedGroupId || g.code === selectedGroupId
      );
      if (!existsInAll) {
        setSelectedGroupId('');
        setShowMobileChat(false);
      }
    }
  }, [qgroups, selectedGroupId]);

  const activeGroup = useMemo(
    () => qgroups.find((g) => g.id === selectedGroupId) ?? null,
    [qgroups, selectedGroupId]
  );

  const activeInfo = useMemo(
    () => (activeGroup ? resolveChatDisplayInfo(activeGroup, myEmail) : null),
    [activeGroup, myEmail]
  );

  // Khi có tin nhắn mới trong phòng chat đang mở: chỉ tự động cuộn nếu người dùng đang ở sát đáy
  const currentActiveMsgCount = activeGroup?.messages?.length || 0;
  const lastActiveMsgCountRef = useRef<number>(currentActiveMsgCount);
  useEffect(() => {
    if (currentActiveMsgCount > lastActiveMsgCountRef.current) {
      if (isUserNearBottomRef.current && chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    lastActiveMsgCountRef.current = currentActiveMsgCount;
  }, [currentActiveMsgCount]);

  const isCurrentUserMember = useMemo(() => {
    if (!activeGroup) return false;
    if (activeGroup.isDirect || activeGroup.type === 'direct') return true;
    const cleanMyEmail = myEmail.toLowerCase().trim();
    const members = (activeGroup.members || []).map((m: string) => m.toLowerCase().trim());
    const ownerEmail = (activeGroup.ownerEmail || '').toLowerCase().trim();
    return members.includes(cleanMyEmail) || ownerEmail === cleanMyEmail;
  }, [activeGroup, myEmail]);

  const pinnedMessages = useMemo(() => {
    return (activeGroup?.messages || []).filter((m) => m.isPinned);
  }, [activeGroup]);

  // Cuộc đàm thoại Huddle đang diễn ra trong phòng chat hiện tại
  const activeHuddleForCurrentChat = useMemo(() => {
    if (!activeGroup) return null;
    let roomKey = '';
    if (activeGroup.isDirect) {
      const raw = [activeGroup.ownerEmail, activeGroup.directPartnerEmail, ...(activeGroup.members || [])]
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase());
      const u = Array.from(new Set(raw)).sort();
      if (u.length >= 2) roomKey = `dm_${u.join('_')}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    } else {
      roomKey = (activeGroup.id || activeGroup.code || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }
    return activeHuddleRooms[roomKey] || (activeGroup.id && activeHuddleRooms[activeGroup.id.toLowerCase()]) || null;
  }, [activeGroup, activeHuddleRooms]);

  // Danh sách ID các phòng đang có Huddle hoạt động
  const activeHuddleRoomIds = useMemo(() => {
    return new Set(Object.keys(activeHuddleRooms));
  }, [activeHuddleRooms]);

  const totalInvitations = friendRequests.length + groupInvitations.length;

  // ── Khôi phục & lưu trữ bản nháp (Draft & Attachments) chống mất file/tin khi reload ──
  useEffect(() => {
    if (!selectedGroupId) return;
    try {
      const draftKey = `quizgen_draft_${myEmail}_${selectedGroupId}`;
      const saved = sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.text) setChatInput(parsed.text);
        if (parsed.attachments && Array.isArray(parsed.attachments)) {
          setSelectedAttachments(parsed.attachments);
        }
      }
    } catch {}
  }, [selectedGroupId, myEmail]);

  useEffect(() => {
    if (!selectedGroupId) return;
    try {
      const draftKey = `quizgen_draft_${myEmail}_${selectedGroupId}`;
      if (chatInput || selectedAttachments.length > 0) {
        const data = JSON.stringify({
          text: chatInput,
          attachments: selectedAttachments,
        });
        sessionStorage.setItem(draftKey, data);
        localStorage.setItem(draftKey, data);
      } else {
        sessionStorage.removeItem(draftKey);
        localStorage.removeItem(draftKey);
      }
    } catch {}
  }, [selectedGroupId, myEmail, chatInput, selectedAttachments]);

  // ── File Selection & Paste Support ─────────────────────────────────────────
  const MAX_ATTACHMENTS_COUNT = 5;
  const MAX_SINGLE_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const MAX_TOTAL_BATCH_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFilesSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;

    // 1. Giới hạn số lượng tệp tối đa (5 tệp trong 1 tin nhắn)
    if (selectedAttachments.length + files.length > MAX_ATTACHMENTS_COUNT) {
      onShowToast(
        'warning',
        'Quá số lượng tệp cho phép',
        `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS_COUNT} tệp trong 1 tin nhắn. Hiện tại bạn đã chọn ${selectedAttachments.length} tệp.`
      );
      return;
    }

    // 2. Giới hạn dung lượng từng tệp (tối đa 25MB mỗi tệp)
    for (const f of files) {
      if (f.size > MAX_SINGLE_FILE_SIZE) {
        const mb = (f.size / (1024 * 1024)).toFixed(1);
        onShowToast(
          'error',
          'Tệp vượt quá giới hạn 25MB',
          `Tệp "${f.name}" (${mb}MB) vượt quá dung lượng tối đa cho phép là 25MB.`
        );
        return;
      }
    }

    // 3. Giới hạn tổng dung lượng cả đợt (tối đa 50MB)
    const totalNewSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalNewSize > MAX_TOTAL_BATCH_SIZE) {
      const mbTotal = (totalNewSize / (1024 * 1024)).toFixed(1);
      onShowToast(
        'error',
        'Tổng dung lượng quá lớn',
        `Tổng dung lượng các tệp tải lên là ${mbTotal}MB, vượt quá mức tối đa 50MB mỗi đợt.`
      );
      return;
    }

    // 4. Hàng đợi tải tuần tự (Sequential Upload) để bảo vệ kết nối, tránh crash và tránh reload
    setIsUploadingAttachment(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

        const formattedSize =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        setUploadProgressText(`Đang tải (${i + 1}/${files.length}): ${file.name} (${formattedSize})...`);

        const formData = new FormData();
        formData.append('file', file);
        const resp = await apiClient.fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
          method: 'POST',
          body: formData,
        });

        let res: any = null;
        try {
          res = await resp.json();
        } catch {
          const rawText = await resp.text().catch(() => '');
          throw new Error(
            resp.status === 413
              ? `Tệp "${file.name}" vượt quá dung lượng cho phép của máy chủ.`
              : `Máy chủ phản hồi mã ${resp.status}: ${rawText.slice(0, 80) || 'Lỗi tải tệp'}`
          );
        }

        if (!resp.ok) {
          throw new Error(res?.detail || `Lỗi tải tệp ${file.name} (Mã ${resp.status})`);
        }

        if (res && res.fileUrl) {
          const newAtt = {
            type: (res.type || type) as 'textbook' | 'file' | 'image' | 'video' | 'audio',
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: res.name || file.name,
            size: res.size || formattedSize,
            fileUrl: res.fileUrl,
            fileType: res.fileType || file.type,
          };
          setSelectedAttachments((prev) => [...prev, newAtt]);
          successCount++;
        } else {
          throw new Error(res?.detail || `Không thể tải lên tệp ${file.name}`);
        }
      }

      onShowToast(
        'success',
        'Đã tải tệp lên thành công',
        files.length === 1
          ? `${files[0].name}`
          : `Đã gắn thành công ${successCount}/${files.length} tệp vào tin nhắn.`
      );
    } catch (err: any) {
      onShowToast('error', 'Lỗi tải tệp', err?.message || 'Không thể tải tệp lên máy chủ.');
    } finally {
      setIsUploadingAttachment(false);
      setUploadProgressText('');
    }
  };

  const handleFileSelect = async (file: File) => {
    return handleFilesSelect([file]);
  };

  const handleComposerPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const file = new File(
            [blob],
            `screenshot-${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}.png`,
            { type: blob.type }
          );
          handleFileSelect(file);
          onShowToast('info', 'Đã dán ảnh', 'Ảnh chụp màn hình đã được đính kèm.');
          break;
        }
      }
    }
  };

  // ── Rich Text Insertion ───────────────────────────────────────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = chatInput.substring(start, end);
    const replacement = prefix + (selected || 'nội dung') + suffix;
    const nextVal = chatInput.substring(0, start) + replacement + chatInput.substring(end);
    setChatInput(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 8));
    }, 50);
  };

  // ── Voice Recording Helpers ───────────────────────────────────────────────
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startVoiceRecording = async () => {
    try {
      // Tự động nhận diện Driver Micro tốt nhất (Realtek / USB / Mic Array, loại trừ Stereo Mix)
      const optimal = await getOptimalAudioDeviceId();
      if (optimal.label) {
        setActiveMicLabel(optimal.label);
      }

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (optimal.deviceId) {
        audioConstraints.deviceId = { exact: optimal.deviceId };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;

      // Cập nhật nhãn thực tế sau khi được cấp quyền
      const activeTrack = stream.getAudioTracks()[0];
      if (activeTrack?.label) {
        setActiveMicLabel(activeTrack.label);
        if (optimal.deviceId) {
          setPreferredAudioDeviceId(optimal.deviceId, activeTrack.label);
        }
      }

      // Ensure all audio tracks are active
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      // Real AudioContext and Analyser for dynamic live waveform visualization (without stream.clone())
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;
          liveWaveformSamplesRef.current = [];

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          const updateVisuals = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < freqData.length; i++) sum += freqData[i];
            const avg = sum / freqData.length;
            liveWaveformSamplesRef.current.push(avg);

            const bands = [
              Math.max(20, Math.min(100, Math.round((freqData[1] || 0) * 0.9))),
              Math.max(20, Math.min(100, Math.round((freqData[3] || 0) * 1.1))),
              Math.max(20, Math.min(100, Math.round((freqData[5] || 0) * 1.2))),
              Math.max(20, Math.min(100, Math.round((freqData[7] || 0) * 1.3))),
              Math.max(20, Math.min(100, Math.round((freqData[9] || 0) * 1.2))),
              Math.max(20, Math.min(100, Math.round((freqData[11] || 0) * 1.1))),
              Math.max(20, Math.min(100, Math.round((freqData[13] || 0) * 0.9))),
              Math.max(20, Math.min(100, Math.round((freqData[15] || 0) * 0.8))),
            ];
            setLiveMicLevels(bands);
            animFrameRef.current = requestAnimationFrame(updateVisuals);
          };
          animFrameRef.current = requestAnimationFrame(updateVisuals);
        }
      } catch (e) {
        console.warn('AudioContext not supported or blocked for live visualizer:', e);
      }

      // Detect best supported audio MIME type
      let mimeType = '';
      const candidateMimes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      for (const cand of candidateMimes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) {
          mimeType = cand;
          break;
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      onShowToast(
        'error',
        'Không thể ghi âm',
        'Vui lòng cấp quyền truy cập micro cho trình duyệt.'
      );
    }
  };

  const cancelVoiceRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserStreamRef.current?.getTracks().forEach((track) => track.stop());
    analyserStreamRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    liveWaveformSamplesRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    onShowToast('info', 'Đã hủy ghi âm', 'Đoạn ghi âm chưa được gửi.');
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingSeconds;
    const recorder = mediaRecorderRef.current;

    // Compute real physical waveform bars (30 samples) from live voice levels
    const samples = liveWaveformSamplesRef.current;
    const targetCount = 30;
    let finalWaveform: number[] = [];
    if (samples.length > 0) {
      const step = samples.length / targetCount;
      let maxVal = 0.01;
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.min(samples.length - 1, Math.floor(i * step));
        const val = samples[idx] || 0;
        finalWaveform.push(val);
        if (val > maxVal) maxVal = val;
      }
      finalWaveform = finalWaveform.map((v) => Math.max(18, Math.min(100, Math.round((v / maxVal) * 100))));
    } else {
      finalWaveform = [35, 50, 75, 90, 65, 45, 80, 100, 70, 55, 60, 85, 40, 35, 55, 80, 95, 65, 45, 75, 85, 60, 50, 40, 60, 75, 50, 35];
    }

    recorder.onstop = async () => {
      // Clean up AudioContext & MediaStream AFTER recorder has safely stopped
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserStreamRef.current?.getTracks().forEach((track) => track.stop());
      analyserStreamRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      const actualMime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
      audioChunksRef.current = [];
      liveWaveformSamplesRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size < 100) {
        onShowToast('warning', 'Ghi âm quá ngắn', 'Vui lòng nói rõ ràng hơn.');
        return;
      }

      try {
        onShowToast('info', 'Đang gửi ghi âm...', `Thời lượng: ${formatDuration(duration)}`);
        const ext = actualMime.includes('mp4') ? 'm4a' : actualMime.includes('ogg') ? 'ogg' : 'webm';
        const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: actualMime });
        const formData = new FormData();
        formData.append('file', audioFile);

        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
            method: 'POST',
            body: formData,
          })
          .then((r) => r.json());

        if (res && res.fileUrl && activeGroup) {
          const now = Date.now();
          const newMsg: QGroupMessage = {
            id: `msg-${now}`,
            senderEmail: myEmail,
            senderName: myName,
            senderTitle: currentUser?.academicTitle || 'GV',
            avatarColor: 'bg-slate-700',
            text: `🎙️ Tin nhắn thoại (${formatDuration(duration)})`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            isPinned: false,
            readBy: [myEmail],
            reactions: {},
            attachment: {
              type: 'audio',
              id: `att-${now}`,
              name: `Ghi âm (${formatDuration(duration)})`,
              fileUrl: res.fileUrl,
              size: res.size || `${Math.round(audioBlob.size / 1024)} KB`,
              duration: duration,
              waveform: finalWaveform,
            },
          };

          const updated = qgroups.map((g) =>
            g.id === activeGroup.id
              ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
              : g
          );
          applyGroups(updated);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

          const targetId = activeGroup.id || activeGroup.code;
          apiClient
            .fetch(
              `${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMsg),
              }
            )
            .catch(() => {});

          onShowToast('success', 'Đã gửi tin nhắn thoại', `Thời lượng: ${formatDuration(duration)}`);
        } else {
          throw new Error(res?.detail || 'Không thể lưu bản ghi âm');
        }
      } catch (err: any) {
        console.error('Error uploading voice recording:', err);
        onShowToast('error', 'Lỗi gửi tin nhắn thoại', err?.message || 'Không thể tải lên đoạn ghi âm.');
      }
    };

    try {
      if (recorder.state === 'recording') {
        recorder.requestData();
      }
    } catch (e) {}
    recorder.stop();
  };

  // Đổi nhanh sang micro tiếp theo (chỉ 1 click, không giao diện cồng kềnh)
  const handleCycleMic = async () => {
    try {
      const nextMic = await cycleToNextMicrophone();
      if (nextMic) {
        setActiveMicLabel(nextMic.label);
        onShowToast('info', 'Thiết bị âm thanh', `Đã chuyển sang: ${nextMic.label}`);
        // Nếu đang trong lúc ghi âm, kết nối tức thì sang micro mới
        if (isRecording) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: nextMic.deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            mediaStreamRef.current = newStream;
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              try {
                const newSource = audioContextRef.current.createMediaStreamSource(newStream);
                if (analyserRef.current) {
                  newSource.connect(analyserRef.current);
                }
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
  };

  // ── @Mention Candidate List ───────────────────────────────────────────────
  const mentionCandidates = useMemo(() => {
    if (!activeGroup) return [];
    const list: { id: string; tag: string; role: string; email?: string }[] = [];

    if (!activeGroup.isDirect) {
      list.push({
        id: 'all',
        tag: 'all',
        role: 'Thông báo cho tất cả thành viên trong nhóm (@all)',
      });
    }

    // Members of active group
    const memberEmails = activeGroup.members || [];
    memberEmails.forEach((email) => {
      const isOwner = email.toLowerCase() === (activeGroup.ownerEmail || '').toLowerCase();
      const isMe = email.toLowerCase() === myEmail.toLowerCase();
      let displayName = isOwner && activeGroup.ownerName ? activeGroup.ownerName : email.split('@')[0];
      if (activeGroup.isDirect && activeGroup.directPartnerName) {
        displayName = activeGroup.directPartnerName;
      }
      list.push({
        id: email,
        tag: displayName,
        role: isOwner ? 'Trưởng nhóm' : isMe ? 'Bạn' : 'Thành viên',
        email,
      });
    });

    if (!mentionSearch) return list;
    const q = mentionSearch.toLowerCase();
    return list.filter(
      (c) =>
        c.tag.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.role.toLowerCase().includes(q)
    );
  }, [activeGroup, myEmail, mentionSearch]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!chatInput.trim() && selectedAttachments.length === 0) || !activeGroup) return;
    if (!activeGroup.isDirect && !isCurrentUserMember) {
      onShowToast('warning', 'Không thể gửi tin', 'Thầy/Cô không còn là thành viên của kênh này.');
      return;
    }

    const now = Date.now();
    const newMsg: QGroupMessage = {
      id: `msg-${now}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'GV',
      avatarColor: 'bg-slate-700',
      text: chatInput.trim(),
      attachment: selectedAttachments.length > 0 ? (selectedAttachments[0] as any) : undefined,
      attachments: selectedAttachments.length > 0 ? (selectedAttachments as any) : undefined,
      replyTo: replyingToMessage
        ? {
            id: replyingToMessage.id,
            senderName: replyingToMessage.senderName,
            text: (replyingToMessage.text || 'Tệp đính kèm').slice(0, 80),
          }
        : undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      readBy: [myEmail],
    };

    const updated = qgroups.map((g) =>
      g.id === activeGroup.id
        ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
        : g
    );
    applyGroups(updated);
    setChatInput('');
    setSelectedAttachments([]);
    setReplyingToMessage(null);
    try {
      const draftKey = `quizgen_draft_${myEmail}_${selectedGroupId}`;
      sessionStorage.removeItem(draftKey);
      localStorage.removeItem(draftKey);
    } catch {}
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    const targetId = activeGroup.id || activeGroup.code;
    apiClient
      .fetch(
        `${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg),
        }
      )
      .catch(() => {});
  };

  // ── Hàm tra cứu danh tính tài khoản trên toàn hệ thống QuizGen / UTH ────
  const lookupAccount = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        return null;
      }

      // 1. Kiểm tra trực tiếp trong danh mục tài khoản động từ API (khớp email, tiền tố, hoặc họ tên)
      const dynamicUser = systemUsersList.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          u.email.toLowerCase().split('@')[0] === clean ||
          u.fullName.toLowerCase() === clean
      );
      if (dynamicUser) {
        return {
          email: dynamicUser.email,
          fullName: dynamicUser.fullName,
          academicTitle: dynamicUser.academicTitle || 'ThS.',
          department: dynamicUser.department || 'Khoa Công nghệ Thông tin',
          university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          role: 'lecturer',
        };
      }

      // 2. Danh mục tài khoản hệ thống & đồng nghiệp mẫu
      const localRegistered: Record<
        string,
        { fullName: string; academicTitle: string; department: string }
      > = {
        'mr.av1222005@gmail.com': { fullName: 'Vũ đẹp chai', academicTitle: 'KS.', department: 'Khoa Công nghệ Thông tin' },
        'avanimechannel@gmail.com': { fullName: 'Vũ Anh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'hieuhieu22112005@gmail.com': { fullName: 'Hieu Huynh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'daipqps37469@gmail.com': { fullName: 'Đại Phạm Quang', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'vuha3608@ut.edu.vn': { fullName: 'Vũ Hồ Anh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'nguyentann0804@gmail.com': { fullName: 'Nguyễn Văn Tân', academicTitle: 'TS.', department: 'Khoa Công nghệ Thông tin' },
        'ducngo.180305@gmail.com': { fullName: 'Ngô Phạm Công Đức', academicTitle: 'TS.', department: 'Khoa Công nghệ Thông tin' },
        'lieuthanhau@gmail.com': { fullName: 'Liêu Thanh Hậu', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'anhvu12022005@gmail.com': { fullName: 'Anhvu12022005', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'quizgen.ai.team@gmail.com': { fullName: 'Ban Quản trị QuizGen AI', academicTitle: 'Admin', department: 'Hệ thống Khảo thí UTH' },
        'hod.cntt@uth.edu.vn': { fullName: 'PGS. TS. Trưởng Khoa CNTT', academicTitle: 'PGS. TS.', department: 'Khoa Công nghệ Thông tin' },
        'gv.kinhte@uth.edu.vn': { fullName: 'TS. Giảng viên Kinh tế', academicTitle: 'TS.', department: 'Khoa Kinh tế Vận tải' },
      };

      for (const [em, info] of Object.entries(localRegistered)) {
        if (
          em.toLowerCase() === clean ||
          em.toLowerCase().split('@')[0] === clean ||
          info.fullName.toLowerCase() === clean
        ) {
          return {
            email: em,
            fullName: info.fullName,
            academicTitle: info.academicTitle,
            department: info.department,
            university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
            role: 'lecturer',
          };
        }
      }

      // 3. Nếu có @ và ., gọi API tra cứu chính xác từ auth-service
      if (clean.includes('@') && clean.includes('.')) {
        try {
          const res = await apiClient.fetch(
            `${API_BASE}/auth/users/lookup?email=${encodeURIComponent(clean)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.user) {
              return data.user as {
                id?: string;
                email: string;
                fullName: string;
                academicTitle?: string;
                department?: string;
                university?: string;
                role?: string;
              };
            }
          }
        } catch {}
      } else {
        // Nếu gõ vài ký tự / từ khóa, gọi API tìm kiếm gợi ý từ backend
        try {
          const res = await apiClient.fetch(
            `${API_BASE}/auth/users/search?q=${encodeURIComponent(clean)}`
          );
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              const matched = list.find(
                (u: any) =>
                  u.email.toLowerCase() === clean ||
                  u.email.toLowerCase().split('@')[0] === clean ||
                  u.fullName.toLowerCase() === clean
              ) || (list.length === 1 ? list[0] : null);
              if (matched) return matched;
            }
          }
        } catch {}
      }

      // 4. Tìm trong danh sách thành viên các nhóm/kênh hiện có
      const foundInGroups = qgroups.find((g) => {
        const members = (g.members || []).map((m) => String(m).toLowerCase());
        return (
          members.some((m) => m === clean || m.split('@')[0] === clean) ||
          g.ownerEmail?.toLowerCase() === clean
        );
      });

      if (foundInGroups) {
        const targetMember =
          (foundInGroups.members || []).find(
            (m) =>
              String(m).toLowerCase() === clean ||
              String(m).toLowerCase().split('@')[0] === clean
          ) || foundInGroups.ownerEmail;
        return {
          email: targetMember || clean,
          fullName: (targetMember || clean).split('@')[0],
          academicTitle: 'Giảng viên',
          department: foundInGroups.department || 'Khoa Chuyên Ngành',
          university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          role: 'lecturer',
        };
      }

      return null;
    },
    [qgroups, systemUsersList]
  );

  // ── Tra cứu cho modal Thêm thành viên vào kênh đang mở ───────────────────
  const handleLookupUser = useCallback(
    async (email: string) => {
      const clean = email.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setLookupStatus('idle');
        setLookedUpUser(null);
        return;
      }
      setLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setLookedUpUser(user);
        setLookupStatus('found');
      } else {
        if (clean.includes('@') && clean.includes('.')) {
          setLookedUpUser(null);
          setLookupStatus('not_found');
        } else {
          setLookedUpUser(null);
          setLookupStatus('idle');
        }
      }
    },
    [lookupAccount]
  );

  // ── Tra cứu cho modal Thêm bạn bè mới ─────────────────────────────────────
  const handleFriendLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setFriendLookupStatus('idle');
        setFriendLookedUpUser(null);
        return;
      }
      setFriendLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setFriendLookedUpUser(user);
        setFriendLookupStatus('found');
      } else {
        if (clean.includes('@') && clean.includes('.')) {
          setFriendLookedUpUser(null);
          setFriendLookupStatus('not_found');
        } else {
          setFriendLookedUpUser(null);
          setFriendLookupStatus('idle');
        }
      }
    },
    [lookupAccount]
  );

  // ── Tra cứu cho modal Tạo kênh học thuật mới ──────────────────────────────
  const handleCreateGroupMemberLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setCreateGroupLookupStatus('idle');
        setCreateGroupLookedUpUser(null);
        return;
      }
      setCreateGroupLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setCreateGroupLookedUpUser(user);
        setCreateGroupLookupStatus('found');
      } else {
        if (clean.includes('@') && clean.includes('.')) {
          setCreateGroupLookedUpUser(null);
          setCreateGroupLookupStatus('not_found');
        } else {
          setCreateGroupLookedUpUser(null);
          setCreateGroupLookupStatus('idle');
        }
      }
    },
    [lookupAccount]
  );

  // ── Chọn thành viên cho kênh Tạo mới ─────────────────────────────────────
  const handleAddMemberToNewGroup = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      if (clean === myEmail.toLowerCase()) {
        onShowToast('info', 'Thông báo', 'Bạn là Trưởng nhóm khởi tạo nên đã có sẵn trong kênh.');
        return;
      }
      if (createGroupSelectedMembers.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã có trong danh sách', `${memberName} (${clean}) đã được chọn.`);
        return;
      }
      setCreateGroupSelectedMembers((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setCreateGroupMemberInput('');
      setCreateGroupLookedUpUser(null);
      setCreateGroupLookupStatus('idle');
    },
    [myEmail, createGroupSelectedMembers, onShowToast]
  );

  // ── Hàng đợi chọn nhiều người trong modal Thêm thành viên vào kênh ───────
  const handleQueueDirectAddMember = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      if (!activeGroup) return;
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      const currentMembers = (activeGroup.members || []).map((m) => String(m).toLowerCase());
      if (currentMembers.includes(clean)) {
        onShowToast('info', 'Đã là thành viên', `${memberName} (${clean}) đã có trong kênh #${activeGroup.name}`);
        return;
      }
      if (directAddSelectedMembers.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã chọn', `${memberName} đã có trong danh sách chờ thêm.`);
        return;
      }
      setDirectAddSelectedMembers((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setDirectAddMemberEmail('');
      setLookedUpUser(null);
      setLookupStatus('idle');
    },
    [activeGroup, directAddSelectedMembers, onShowToast]
  );

  // ── Hàng đợi chọn nhiều người trong modal Thêm bạn bè ────────────────────
  const handleQueueFriendInvite = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      if (clean === myEmail.toLowerCase()) {
        onShowToast('warning', 'Không hợp lệ', 'Bạn không thể kết bạn với chính mình.');
        return;
      }
      if (selectedFriendsToInvite.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã chọn', `${memberName} đã có trong danh sách chờ kết bạn.`);
        return;
      }
      setSelectedFriendsToInvite((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setFriendEmailInput('');
      setFriendLookedUpUser(null);
      setFriendLookupStatus('idle');
    },
    [myEmail, selectedFriendsToInvite, onShowToast]
  );

  // Kiểm tra quan hệ bạn bè của 1 email bất kỳ
  const getFriendshipState = useCallback(
    (targetEmail: string) => {
      const target = targetEmail.trim().toLowerCase();
      if (target === myEmail.toLowerCase()) return { type: 'self' as const };

      // 1. Đã là bạn bè (đã có phòng DM 1-1)
      const isAlreadyFriend = qgroups.some((g) => {
        if (!g.isDirect) return false;
        const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
        const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
        const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
        return (
          (cleanOwner === target && cleanPartner === myEmail.toLowerCase()) ||
          (cleanPartner === target && cleanOwner === myEmail.toLowerCase()) ||
          (members.includes(target) && members.includes(myEmail.toLowerCase()))
        );
      });
      if (isAlreadyFriend) return { type: 'friend' as const };

      // 2. Lời mời đã gửi đi đang chờ duyệt
      const isPendingSent = sentFriendRequests.some(
        (r) => r.targetEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (isPendingSent) return { type: 'sent_pending' as const };

      // 3. Lời mời đối phương gửi đến đang chờ chấp nhận
      const incomingReq = friendRequests.find(
        (r) => r.senderEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (incomingReq) return { type: 'received_pending' as const, req: incomingReq };

      return { type: 'none' as const };
    },
    [myEmail, qgroups, sentFriendRequests, friendRequests]
  );

  // Đóng modal Thêm Bạn Bè và reset trạng thái
  const handleCloseAddFriendModal = useCallback(() => {
    setIsAddFriendOpen(false);
    setFriendEmailInput('');
    setFriendLookedUpUser(null);
    setFriendLookupStatus('idle');
  }, []);

  // ── Gửi lời mời chính thức vào kênh (Chờ đồng nghiệp bấm chấp nhận) ──────────
  const handleSendGroupInvitation = useCallback(
    async (targetEmail: string, targetName?: string) => {
      if (!activeGroup) return;
      const clean = targetEmail.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) =>
        String(m).toLowerCase()
      );
      if (currentMembers.includes(clean)) {
        onShowToast(
          'info',
          'Đã là thành viên',
          `${clean} đã có mặt trong kênh #${activeGroup.name}`
        );
        return;
      }
      const displayName = targetName || clean;
      const inv: QGroupInvitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: activeGroup.id,
        groupCode: activeGroup.code,
        groupName: activeGroup.name,
        department: activeGroup.department || 'Khoa Công nghệ Thông tin',
        inviterEmail: myEmail,
        inviterName: myName,
        targetEmail: clean,
        targetName: displayName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };

      // Đánh dấu ngay lập tức trên UI (0ms feedback) để nút chuyển sang "Đã mời"
      setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${activeGroup.id}:${clean}`));
      setSentGroupInvitations((prev) => [inv, ...prev.filter((x) => !(x.groupId === activeGroup.id && x.targetEmail.toLowerCase() === clean))]);

      try {
        await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inv),
        });
        onShowToast(
          'success',
          'Đã gửi lời mời tham gia',
          `Đã gửi lời mời tới ${displayName} (${clean}). Đồng nghiệp sẽ nhận được thông báo để chấp nhận do chưa kết bạn.`
        );
        setInviteEmailInput('');
        void fetchGroupInvitations();
      } catch {
        onShowToast('error', 'Lỗi kết nối', 'Không thể gửi lời mời nhóm.');
      }
    },
    [activeGroup, myEmail, myName, onShowToast, fetchGroupInvitations]
  );

  // Kiểm tra xem đồng nghiệp đã được mời vào kênh đang chọn hay chưa
  const isMemberInvitedToActiveChannel = useCallback(
    (targetEmail: string) => {
      if (!activeGroup) return false;
      const clean = targetEmail.trim().toLowerCase();
      const groupKey = `${activeGroup.id}:${clean}`;
      if (locallyInvitedGroupMembers.has(groupKey)) return true;
      return sentGroupInvitations.some(
        (inv) =>
          inv.groupId === activeGroup.id &&
          inv.targetEmail?.trim().toLowerCase() === clean &&
          inv.status === 'pending'
      );
    },
    [activeGroup, locallyInvitedGroupMembers, sentGroupInvitations]
  );

  // ── Thêm thành viên trực tiếp vào kênh đang mở (Chỉ khi đã là BẠN BÈ, chưa kết bạn -> gửi lời mời chờ duyệt) ────
  const handleAddUserToActiveChannel = useCallback(
    async (emailToAdd: string, displayName?: string) => {
      if (!activeGroup) return;
      const clean = emailToAdd.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) =>
        String(m).toLowerCase()
      );

      if (currentMembers.includes(clean)) {
        onShowToast(
          'info',
          'Đã là thành viên',
          `${clean} đã có mặt trong kênh #${activeGroup.name}`
        );
        return;
      }

      // KIỂM TRA QUAN HỆ BẠN BÈ: Nếu chưa kết bạn thì gửi lời mời chờ đồng ý
      const friendship = getFriendshipState(clean);
      if (friendship.type !== 'friend') {
        await handleSendGroupInvitation(clean, displayName || lookedUpUser?.fullName);
        setIsAddingMember(false);
        setIsDirectAddMemberOpen(false);
        setDirectAddMemberEmail('');
        setLookedUpUser(null);
        setLookupStatus('idle');
        return;
      }

      setIsAddingMember(true);
      const updatedMembers = [...(activeGroup.members || []), clean];
      const memberName = displayName || lookedUpUser?.fullName || clean;
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const announcementMsg: QGroupMessage = {
        id: `msg-${nowMs}`,
        senderEmail: 'system',
        senderName: 'Hệ Thống Q-Group',
        isSystem: true,
        timestamp: timeStr,
        text: `🎉 ${myName} đã thêm bạn bè ${memberName} (${clean}) vào kênh #${activeGroup.name}.`,
        readBy: [myEmail, clean],
      };
      const updatedMessages = [...(activeGroup.messages || []), announcementMsg];
      const updatedGroup = {
        ...activeGroup,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        messages: updatedMessages,
        updatedAt: nowMs,
      };

      const nextGroups = qgroups.map((g) =>
        g.id === activeGroup.id ? updatedGroup : g
      );
      applyGroups(nextGroups);

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/members`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: clean,
              name: memberName,
              inviterName: myName,
              group: updatedGroup,
            }),
          }
        );
      } catch {
        try {
          await apiClient.fetch(
            `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                members: updatedMembers,
                memberCount: updatedMembers.length,
                messages: updatedMessages,
                group: updatedGroup,
              }),
            }
          );
        } catch {}
      }

      // Luôn đồng bộ danh sách nhóm toàn diện lên server backend (bảo toàn tin nhắn thông báo)
      void syncGroupsToBackend(nextGroups);

      setIsAddingMember(false);
      setIsDirectAddMemberOpen(false);
      setDirectAddMemberEmail('');
      setLookedUpUser(null);
      setLookupStatus('idle');
      onShowToast(
        'success',
        'Đã thêm thành viên',
        `Đã thêm ${memberName} (${clean}) vào kênh #${activeGroup.name}`
      );
      void fetchQGroups();
    },
    [activeGroup, qgroups, lookedUpUser, myName, myEmail, applyGroups, fetchQGroups, syncGroupsToBackend, getFriendshipState, handleSendGroupInvitation, onShowToast]
  );

  // ── Thêm hàng loạt thành viên đã chọn vào kênh đang mở (Phân luồng: Bạn bè vào thẳng, Chưa kết bạn gửi lời mời) ────
  const handleBatchAddUsersToActiveChannel = useCallback(async () => {
    if (!activeGroup || directAddSelectedMembers.length === 0) return;
    setIsAddingMember(true);

    const friends = directAddSelectedMembers.filter((m) => getFriendshipState(m.email).type === 'friend');
    const nonFriends = directAddSelectedMembers.filter((m) => getFriendshipState(m.email).type !== 'friend');

    // 1. Gửi lời mời chờ duyệt cho đồng nghiệp chưa kết bạn
    for (const nf of nonFriends) {
      await handleSendGroupInvitation(nf.email, nf.fullName);
    }

    // 2. Thêm thẳng bạn bè đã kết nối
    if (friends.length > 0) {
      const newEmails = friends.map((m) => m.email.trim().toLowerCase());
      const updatedMembers = Array.from(new Set([...(activeGroup.members || []).map((m) => String(m).toLowerCase()), ...newEmails]));
      const memberNames = friends.map((m) => m.fullName).join(', ');
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const announcementMsg: QGroupMessage = {
        id: `msg-${nowMs}`,
        senderEmail: 'system',
        senderName: 'Hệ Thống Q-Group',
        isSystem: true,
        timestamp: timeStr,
        text: `🎉 ${myName} đã thêm ${friends.length} bạn bè (${memberNames}) vào kênh #${activeGroup.name}.`,
        readBy: [myEmail, ...newEmails],
      };
      const updatedMessages = [...(activeGroup.messages || []), announcementMsg];
      const updatedGroup = {
        ...activeGroup,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        messages: updatedMessages,
        updatedAt: nowMs,
      };
      const nextGroups = qgroups.map((g) => (g.id === activeGroup.id ? updatedGroup : g));
      applyGroups(nextGroups);
      void syncGroupsToBackend(nextGroups);
    }

    setIsAddingMember(false);
    setDirectAddSelectedMembers([]);
    setIsDirectAddMemberOpen(false);
    setDirectAddMemberEmail('');
    setLookedUpUser(null);
    setLookupStatus('idle');

    if (friends.length > 0 && nonFriends.length > 0) {
      onShowToast(
        'success',
        'Xử lý thành viên',
        `Đã thêm ${friends.length} bạn bè vào nhóm. Đã gửi lời mời tham gia tới ${nonFriends.length} đồng nghiệp chưa kết bạn (chờ đồng ý).`
      );
    } else if (friends.length > 0) {
      onShowToast('success', 'Đã thêm thành viên', `Đã thêm ${friends.length} bạn bè vào kênh #${activeGroup.name}`);
    } else if (nonFriends.length > 0) {
      onShowToast('info', 'Đã gửi lời mời tham gia', `Đã gửi lời mời tham gia tới ${nonFriends.length} đồng nghiệp chưa kết bạn (chờ đồng ý).`);
    }
    void fetchQGroups();
  }, [activeGroup, directAddSelectedMembers, getFriendshipState, handleSendGroupInvitation, myName, myEmail, qgroups, applyGroups, syncGroupsToBackend, fetchQGroups, onShowToast]);

  // ── Gửi lời mời hàng loạt cho các thành viên trong hàng đợi ─────────────
  const handleBatchSendGroupInvitations = useCallback(async () => {
    if (!activeGroup || directAddSelectedMembers.length === 0) return;
    for (const m of directAddSelectedMembers) {
      await handleSendGroupInvitation(m.email, m.fullName);
    }
    setDirectAddSelectedMembers([]);
    setIsDirectAddMemberOpen(false);
  }, [activeGroup, directAddSelectedMembers, handleSendGroupInvitation]);

  // ── Reaction Handlers (Persistent to DB) ──────────────────────────────────
  const handleToggleReaction = useCallback(
    async (msgId: string, emoji: string) => {
      if (!activeGroup) return;
      // 1. Optimistic Local Update
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          const currentReactions = { ...(m.reactions || {}) };
          const userList = currentReactions[emoji] || [];
          if (userList.includes(myEmail)) {
            currentReactions[emoji] = userList.filter((u) => u !== myEmail);
            if (currentReactions[emoji].length === 0) {
              delete currentReactions[emoji];
            }
          } else {
            currentReactions[emoji] = [...userList, myEmail];
          }
          return { ...m, reactions: currentReactions };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);

      // 2. Persist to Backend Microservice
      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/reaction`,
          {
            method: 'POST',
            body: JSON.stringify({ emoji, userEmail: myEmail }),
          }
        );
      } catch (err) {
        console.error('Failed to sync message reaction to backend:', err);
      }
    },
    [activeGroup, qgroups, myEmail, applyGroups]
  );

  // ── Start Reply ───────────────────────────────────────────────────────────
  const handleStartReply = useCallback((msg: QGroupMessage) => {
    setReplyingToMessage(msg);
    textareaRef.current?.focus();
  }, []);

  // ── Inline Edit Message (Persistent to DB) ────────────────────────────────
  const handleStartEditMessage = useCallback((msg: QGroupMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text || '');
  }, []);

  const handleSaveEditMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup || !editText.trim()) return;
      const textToSave = editText.trim();
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return { ...m, text: textToSave, isEdited: true };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      setEditingMessageId(null);
      setEditText('');
      onShowToast(
        'success',
        'Đã cập nhật',
        'Nội dung tin nhắn đã được chỉnh sửa.'
      );

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ text: textToSave }),
          }
        );
      } catch (err) {
        console.error('Failed to sync edited message to backend:', err);
      }
    },
    [activeGroup, qgroups, editText, applyGroups, onShowToast]
  );

  // ── Recall / Thu hồi tin nhắn (Persistent to DB) ──────────────────────────
  const handleRecallMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            text: 'Tin nhắn đã được thu hồi',
            isRecalled: true,
            attachment: undefined,
            sharedPost: undefined,
          };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast('info', 'Đã thu hồi', 'Tin nhắn của Thầy/Cô đã được thu hồi.');

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/recall`,
          { method: 'POST' }
        );
      } catch (err) {
        console.error('Failed to sync recalled message to backend:', err);
      }
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Delete / Xóa tin nhắn (In-App Confirm & Persistent to DB) ──────────────
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      if (!activeGroup) return;
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa tin nhắn',
        message: 'Bạn có chắc chắn muốn xóa tin nhắn này vĩnh viễn khỏi cuộc trò chuyện?',
        confirmText: 'Xóa tin nhắn',
        variant: 'danger',
        onConfirm: async () => {
          const updated = qgroups.map((g) => {
            if (g.id !== activeGroup.id) return g;
            const msgs = (g.messages || []).filter((m) => m.id !== msgId);
            return { ...g, messages: msgs };
          });
          applyGroups(updated);
          onShowToast(
            'info',
            'Đã xóa tin nhắn',
            'Tin nhắn đã được xóa khỏi cuộc trò chuyện.'
          );
          try {
            await apiClient.fetch(
              `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
              { method: 'DELETE' }
            );
          } catch (err) {
            console.error('Failed to sync deleted message to backend:', err);
          }
        },
      });
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Delete Single Attachment / Xóa riêng lẻ 1 ảnh hoặc 1 file khỏi chùm tệp ──
  const handleDeleteSingleAttachment = useCallback(
    (msgId: string, attIdentifier: string | number) => {
      if (!activeGroup) return;

      const targetMsg = (activeGroup.messages || []).find((m) => m.id === msgId);
      if (!targetMsg) return;

      const currentAttachments: any[] =
        targetMsg.attachments && targetMsg.attachments.length > 0
          ? targetMsg.attachments
          : targetMsg.attachment
          ? [targetMsg.attachment]
          : [];

      const targetAtt = currentAttachments.find(
        (att, idx) =>
          att.id === attIdentifier ||
          idx === attIdentifier ||
          `${targetMsg.id}-att-${idx}` === attIdentifier
      );
      const attName = targetAtt?.name || 'tệp này';

      setConfirmDialog({
        isOpen: true,
        title: 'Xóa tệp đính kèm',
        message: `Bạn có chắc chắn muốn xóa "${attName}" khỏi tin nhắn này?`,
        confirmText: 'Xóa tệp',
        variant: 'danger',
        onConfirm: async () => {
          // Lọc bỏ file/ảnh được chọn
          const remaining = currentAttachments.filter(
            (att, idx) =>
              att.id !== attIdentifier &&
              idx !== attIdentifier &&
              `${targetMsg.id}-att-${idx}` !== attIdentifier
          );

          // Nếu không còn tệp nào và văn bản cũng rỗng -> thu hồi toàn bộ tin nhắn
          const shouldRecall =
            remaining.length === 0 && (!targetMsg.text || targetMsg.text.trim() === '');

          const updated = qgroups.map((g) => {
            if (g.id !== activeGroup.id) return g;
            const msgs = (g.messages || []).map((m) => {
              if (m.id !== msgId) return m;
              if (shouldRecall) {
                return {
                  ...m,
                  text: 'Tin nhắn đã được thu hồi',
                  isRecalled: true,
                  attachment: undefined,
                  attachments: undefined,
                };
              }
              return {
                ...m,
                attachments: remaining,
                attachment: remaining[0] || undefined,
              };
            });
            return { ...g, messages: msgs };
          });

          applyGroups(updated);
          onShowToast('info', 'Đã xóa tệp', `Đã xóa 1 tệp đính kèm khỏi tin nhắn.`);

          try {
            if (shouldRecall) {
              await apiClient.fetch(
                `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/recall`,
                { method: 'POST' }
              );
            } else {
              await apiClient.fetch(
                `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ attachments: remaining }),
                }
              );
            }
          } catch (err) {
            console.error('Failed to sync deleted attachment to server:', err);
          }
        },
      });
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Pin / Ghim tin nhắn (Persistent to DB) ────────────────────────────────
  const handleTogglePinMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup) return;
      let nowPinned = false;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          nowPinned = !m.isPinned;
          return { ...m, isPinned: nowPinned };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast(
        'info',
        nowPinned ? 'Đã ghim tin nhắn' : 'Đã bỏ ghim',
        nowPinned
          ? 'Tin nhắn đã được ghim lên đầu cuộc trò chuyện'
          : 'Đã bỏ ghim tin nhắn'
      );

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/pin`,
          { method: 'POST' }
        );
      } catch (err) {
        console.error('Failed to sync pin status to backend:', err);
      }
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  const handleTogglePinConversation = useCallback(
    (group: QGroup) => {
      const cleanMyEmail = myEmail.toLowerCase().trim();
      const nowPinned = toggleConversationPin(group.id, cleanMyEmail, group.pinnedBy);
      const updated = qgroups.map((g) => {
        if (g.id !== group.id && g.code !== group.code) return g;
        const currentList = (g.pinnedBy || []).map((e) => e.toLowerCase());
        let nextPinnedBy: string[];
        if (nowPinned) {
          nextPinnedBy = Array.from(new Set([...currentList, cleanMyEmail]));
        } else {
          nextPinnedBy = currentList.filter((e) => e !== cleanMyEmail);
        }
        return {
          ...g,
          isPinned: nowPinned,
          pinnedBy: nextPinnedBy,
        };
      });
      applyGroups(updated);
      void syncGroupsToBackend(updated);
      onShowToast(
        'info',
        nowPinned ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại',
        nowPinned
          ? `"${group.name || group.directPartnerName}" được ghim lên đầu danh sách`
          : `Đã bỏ ghim "${group.name || group.directPartnerName}"`
      );
    },
    [qgroups, myEmail, applyGroups, syncGroupsToBackend, onShowToast]
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDeleteChat = useCallback(
    (group: QGroup) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa đoạn chat',
        message: `Bạn có chắc chắn muốn xóa đoạn chat "${group.name}"? Lịch sử tin nhắn sẽ bị xóa khỏi danh sách của bạn.`,
        confirmText: 'Xóa đoạn chat',
        variant: 'danger',
        onConfirm: async () => {
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          apiClient
            .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(group.id)}`, {
              method: 'DELETE',
            })
            .catch(() => {});
          onShowToast('info', 'Đã xóa đoạn chat', group.name);
        },
      });
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  // ── Hủy kết bạn (Unfriend) ────────────────────────────────────────────────
  const handleUnfriend = useCallback(
    (targetEmail: string, targetName?: string) => {
      const displayName = targetName || targetEmail;
      setConfirmDialog({
        isOpen: true,
        title: 'Hủy kết bạn',
        message: `Bạn có chắc chắn muốn hủy kết bạn với "${displayName}" (${targetEmail})? Hành động này sẽ xóa quan hệ bạn bè và đóng cuộc trò chuyện 1-1.`,
        confirmText: 'Hủy kết bạn',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/friends/unfriend`, {
              method: 'POST',
              body: JSON.stringify({ myEmail, targetEmail }),
            });
            const cleanTarget = targetEmail.trim().toLowerCase();
            const next = qgroups.filter((g) => {
              if (g.isDirect || g.type === 'direct') {
                const members = (g.members || []).map((m) => m.toLowerCase().trim());
                const cleanOwner = (g.ownerEmail || '').toLowerCase().trim();
                const cleanPartner = (g.directPartnerEmail || '').toLowerCase().trim();
                if (members.includes(cleanTarget) || cleanOwner === cleanTarget || cleanPartner === cleanTarget) {
                  return false;
                }
              }
              return true;
            });
            applyGroups(next);
            void syncGroupsToBackend(next);
            await fetchQGroups();
            await fetchFriendRequests();
            if (activeGroup && (activeGroup.isDirect || activeGroup.type === 'direct')) {
              setSelectedGroupId(next[0]?.id || '');
              setShowMobileChat(false);
            }
            setIsChannelDetailsOpen(false);
            onShowToast('success', 'Đã hủy kết bạn', `Đã hủy kết bạn với ${displayName}.`);
          } catch (err: any) {
            onShowToast('error', 'Lỗi', err?.message || 'Không thể hủy kết bạn.');
          }
        },
      });
    },
    [myEmail, qgroups, applyGroups, activeGroup, onShowToast]
  );

  const handleDisbandGroup = useCallback(
    async (group: QGroup) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Giải tán nhóm học thuật',
        message: `CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn giải tán nhóm "${group.name}"? Toàn bộ thành viên sẽ bị xóa khỏi nhóm và toàn bộ lịch sử trò chuyện sẽ biến mất vĩnh viễn.`,
        confirmText: 'Giải tán nhóm',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/qgroups/${group.id}/disband`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ownerEmail: myEmail }),
            });
          } catch {}
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          setIsChannelDetailsOpen(false);
          onShowToast('success', 'Đã giải tán nhóm', group.name);
        },
      });
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  const handleLeaveGroup = useCallback(
    async (group: QGroup) => {
      // Trong cuộc trò chuyện 1-1, không có hành động "rời khỏi nhóm", chỉ có xóa chat hoặc hủy kết bạn
      if (group.isDirect || group.type === 'direct') {
        handleDeleteChat(group);
        return;
      }

      const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
      // Nếu là Trưởng nhóm trong nhóm học thuật (không phải DM)
      if (isOwner && !group.isDirect) {
        const otherMembers = (group.members || []).filter(
          (m) => m.toLowerCase() !== myEmail.toLowerCase()
        );
        // Trường hợp 1: Chỉ có 1 mình trưởng nhóm trong nhóm
        if (otherMembers.length === 0) {
          setConfirmDialog({
            isOpen: true,
            title: 'Giải tán nhóm',
            message: `Bạn là thành viên duy nhất trong nhóm "${group.name}". Rời nhóm sẽ đồng thời giải tán nhóm vĩnh viễn. Bạn có đồng ý giải tán nhóm không?`,
            confirmText: 'Đồng ý giải tán',
            variant: 'danger',
            onConfirm: () => handleDisbandGroup(group),
          });
          return;
        }

        // Trường hợp 2: Có các thành viên khác -> Mở Modal Nhượng quyền Trưởng nhóm
        setTransferGroup(group);
        setSelectedNewOwner(otherMembers[0] || '');
        setTransferAlsoLeave(true); // Khi bấm rời nhóm thì mặc định là chuyển quyền & rời
        setIsTransferOwnerModalOpen(true);
        return;
      }

      // Thành viên bình thường rời nhóm
      setConfirmDialog({
        isOpen: true,
        title: 'Rời khỏi kênh',
        message: `Bạn có chắc chắn muốn rời khỏi kênh "${group.name}"? Bạn sẽ không thể gửi tin nhắn trừ khi được mời lại.`,
        confirmText: 'Rời khỏi kênh',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/qgroups/${group.id}/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userEmail: myEmail,
                userName: myName,
              }),
            });
          } catch {}
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          onShowToast('info', 'Đã rời khỏi nhóm', group.name);
        },
      });
    },
    [myEmail, myName, qgroups, applyGroups, selectedGroupId, handleDisbandGroup, handleDeleteChat, onShowToast]
  );

  const handleOpenTransferOwnership = useCallback(
    (group: QGroup, preselectedEmail?: string) => {
      const otherMembers = (group.members || []).filter(
        (m) => m.toLowerCase() !== myEmail.toLowerCase()
      );
      if (otherMembers.length === 0) {
        onShowToast(
          'info',
          'Chưa có thành viên khác',
          'Nhóm cần có ít nhất 1 thành viên khác để chuyển quyền Trưởng nhóm. Vui lòng mời giảng viên khác vào nhóm trước.'
        );
        return;
      }
      setTransferGroup(group);
      setSelectedNewOwner(
        preselectedEmail && otherMembers.some((m) => m.toLowerCase() === preselectedEmail.toLowerCase())
          ? preselectedEmail
          : otherMembers[0] || ''
      );
      setTransferAlsoLeave(false); // Mặc định chỉ chuyển quyền và vẫn ở lại nhóm
      setIsTransferOwnerModalOpen(true);
    },
    [myEmail, onShowToast]
  );

  const handleTransferOwnerAndLeave = useCallback(async () => {
    if (!transferGroup || !selectedNewOwner) return;
    setIsTransferringOwner(true);
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/${transferGroup.id}/transfer-owner`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentOwnerEmail: myEmail,
            currentOwnerName: myName,
            newOwnerEmail: selectedNewOwner,
            newOwnerName: selectedNewOwner.split('@')[0],
            alsoLeave: transferAlsoLeave,
          }),
        }
      );
      if (res.ok) {
        if (transferAlsoLeave) {
          addToBlacklist(myEmail, transferGroup.id, transferGroup.code);
          const next = qgroups.filter(
            (g) => g.id !== transferGroup.id && g.code !== transferGroup.code
          );
          applyGroups(next);
          if (selectedGroupId === transferGroup.id) {
            setSelectedGroupId(next[0]?.id || '');
          }
          onShowToast(
            'success',
            'Chuyển quyền thành công',
            `Đã chuyển quyền Trưởng nhóm cho ${selectedNewOwner} và rời khỏi nhóm.`
          );
        } else {
          // Vẫn ở lại nhóm với tư cách thành viên bình thường
          const next = qgroups.map((g) => {
            if (g.id === transferGroup.id || g.code === transferGroup.code) {
              return { ...g, ownerEmail: selectedNewOwner, ownerName: selectedNewOwner.split('@')[0] };
            }
            return g;
          });
          applyGroups(next);
          onShowToast(
            'success',
            'Chuyển quyền thành công',
            `Đã chuyển giao vai trò Trưởng nhóm cho ${selectedNewOwner}. Bạn vẫn là thành viên của nhóm.`
          );
        }
        setIsTransferOwnerModalOpen(false);
        setTransferGroup(null);
      } else {
        onShowToast('error', 'Lỗi', 'Không thể chuyển quyền trưởng nhóm.');
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Lỗi kết nối khi chuyển quyền.');
    } finally {
      setIsTransferringOwner(false);
    }
  }, [transferGroup, selectedNewOwner, transferAlsoLeave, myEmail, myName, qgroups, applyGroups, selectedGroupId, onShowToast]);

  const handleKickMember = useCallback(
    async (group: QGroup, targetEmail: string, targetName: string) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Loại thành viên',
        message: `Bạn có chắc chắn muốn loại "${targetName}" (${targetEmail}) ra khỏi kênh học thuật?`,
        confirmText: 'Loại khỏi kênh',
        variant: 'danger',
        onConfirm: async () => {
          // Cập nhật tức thì trên giao diện (Optimistic update 0ms)
          const filteredMembers = (group.members || []).filter(
            (m) => m.toLowerCase() !== targetEmail.toLowerCase()
          );
          const optimisticGroup = { ...group, members: filteredMembers };
          setDetailsGroup(optimisticGroup);
          applyGroups(qgroups.map((g) => (g.id === group.id ? optimisticGroup : g)));

          try {
            const res = await apiClient
              .fetch(`${API_BASE}/documents/qgroups/${group.id}/kick-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  targetEmail,
                  targetName,
                  adminName: myName,
                }),
              })
              .then((r) => r.json());

            if (res.status === 'success' && res.group) {
              const updated = qgroups.map((g) => (g.id === group.id ? res.group : g));
              applyGroups(updated);
              setDetailsGroup(res.group);
              onShowToast('success', 'Đã loại thành viên', `${targetName} đã rời khỏi nhóm.`);
            } else {
              // Khôi phục lại nếu máy chủ từ chối
              applyGroups(qgroups);
              setDetailsGroup(group);
              onShowToast('warning', 'Không thể loại thành viên', res.message || 'Lỗi thao tác');
            }
          } catch {
            applyGroups(qgroups);
            setDetailsGroup(group);
            onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu loại thành viên.');
          }
        },
      });
    },
    [myName, qgroups, applyGroups, onShowToast]
  );

  const handleRespondJoinRequest = useCallback(
    async (
      group: QGroup,
      requestId: string,
      targetEmail: string,
      action: 'approve' | 'reject'
    ) => {
      const cleanEmail = targetEmail.trim().toLowerCase();
      const updatedPending = (group.pendingRequests || []).filter(
        (r) => r.id !== requestId && r.email.toLowerCase() !== cleanEmail
      );
      const updatedMembers =
        action === 'approve'
          ? Array.from(new Set([...(group.members || []), cleanEmail]))
          : group.members || [];

      // 1. Optimistic Update ngay lập tức để yêu cầu biến mất tức thì trên modal & giao diện
      const optimisticGroup: QGroup = {
        ...group,
        pendingRequests: updatedPending,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        messages: (group.messages || []).map((m: any) => {
          if (
            m.isJoinRequest &&
            (m.joinRequestId === requestId || m.joinUserEmail?.toLowerCase() === cleanEmail)
          ) {
            return {
              ...m,
              isJoinRequestHandled: true,
              joinRequestStatus: action,
              text: `${action === 'approve' ? '✓ Đã phê duyệt' : '✕ Đã từ chối'} yêu cầu tham gia của ${
                m.joinUserName || cleanEmail
              }.`,
            };
          }
          return m;
        }),
      };

      const updated = qgroups.map((g) => (g.id === group.id ? optimisticGroup : g));
      applyGroups(updated);
      setDetailsGroup(optimisticGroup);

      if (action === 'approve') {
        onShowToast('success', 'Đã phê duyệt', 'Thành viên mới đã được thêm vào nhóm.');
      } else {
        onShowToast('info', 'Đã từ chối', 'Đã từ chối yêu cầu tham gia.');
      }

      // 2. Đồng bộ lên máy chủ
      try {
        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/${group.id}/respond-join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId,
              targetEmail: cleanEmail,
              action,
              adminName: myName,
            }),
          })
          .then((r) => r.json());

        if (res.status === 'success' && res.group) {
          const synced = qgroups.map((g) => (g.id === group.id ? res.group : g));
          applyGroups(synced);
          setDetailsGroup(res.group);
        }
      } catch {
        // Giữ trạng thái optimistic
      }
    },
    [myName, qgroups, applyGroups, onShowToast]
  );

  const handleSaveGroupSettings = useCallback(
    async (
      group: QGroup,
      name: string,
      dept: string,
      desc: string,
      joinPolicy: 'open' | 'approval_required' | 'invite_only'
    ) => {
      try {
        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/${group.id}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              department: dept,
              description: desc,
              joinPolicy,
              adminName: myName,
            }),
          })
          .then((r) => r.json());

        if (res.status === 'success' && res.group) {
          const updated = qgroups.map((g) => (g.id === group.id ? res.group : g));
          applyGroups(updated);
          onShowToast('success', 'Đã lưu cài đặt nhóm', name);
          setIsChannelDetailsOpen(false);
        }
      } catch {
        // Local fallback
        const updated = qgroups.map((g) =>
          g.id === group.id
            ? { ...g, name, department: dept, description: desc, joinPolicy }
            : g
        );
        applyGroups(updated);
        void syncGroupsToBackend(updated);
        onShowToast('success', 'Đã lưu cài đặt nhóm', name);
        setIsChannelDetailsOpen(false);
      }
    },
    [myName, qgroups, applyGroups, onShowToast]
  );

  const handleToggleMute = useCallback(
    (group: QGroup) => {
      const isNowMuted = toggleGroupMute(group.id, myEmail);
      const updated = qgroups.map((g) =>
        g.id === group.id ? { ...g, muted: isNowMuted } : g
      );
      applyGroups(updated);
      // KHÔNG ĐƯỢC syncGroupsToBackend(updated) vì mute là thiết lập cá nhân riêng của từng tài khoản!
      onShowToast(
        'info',
        'Âm thanh thông báo',
        isNowMuted
          ? 'Đã tắt chuông cuộc gọi và tin nhắn hội thoại này (vẫn nhận thông báo im lặng)'
          : 'Đã bật chuông thông báo hội thoại này'
      );
    },
    [qgroups, applyGroups, onShowToast, myEmail]
  );

  const handleSendFriendRequest = async (overrideEmail?: string) => {
    const email = (overrideEmail || friendEmailInput).trim().toLowerCase();
    if (!email) return;
    if (email === myEmail) {
      onShowToast('warning', 'Không hợp lệ', 'Bạn không thể kết bạn với chính mình.');
      return;
    }

    // Kiểm tra nếu đã là bạn bè / có phòng nhắn tin riêng 1-1
    const alreadyFriend = qgroups.some((g) => {
      if (!g.isDirect) return false;
      const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
      const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
      const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
      return (
        (cleanOwner === email && cleanPartner === myEmail) ||
        (cleanPartner === email && cleanOwner === myEmail) ||
        (members.includes(email) && members.includes(myEmail))
      );
    });
    if (alreadyFriend) {
      onShowToast('info', 'Đã là đồng nghiệp', `Thầy/Cô và ${email} đã kết nối bạn bè thành công trước đó.`);
      return;
    }

    // Kiểm tra nếu đã gửi lời mời đang chờ duyệt
    const alreadyPending = sentFriendRequests.some((r) => r.targetEmail?.trim().toLowerCase() === email && r.status === 'pending');
    if (alreadyPending) {
      onShowToast('info', 'Lời mời đang chờ duyệt', `Thầy/Cô đã gửi lời mời kết nối tới ${email} trước đó.`);
      return;
    }

    const req: FriendRequest = {
      id: `fr-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'ThS.',
      targetEmail: email,
      recipientEmail: email,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== 'already_friend') {
        setSentFriendRequests((prev) => [req, ...prev.filter((r) => r.targetEmail !== email)]);
        onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới: ${email}`);
        if (!overrideEmail) {
          setFriendEmailInput('');
          setFriendLookedUpUser(null);
          setFriendLookupStatus('idle');
          setIsAddFriendOpen(false);
        }
        void fetchFriendRequests();
      } else if (data.status === 'already_friend') {
        onShowToast('info', 'Đã là đồng nghiệp', data.message || `Đã kết nối với ${email}.`);
        if (!overrideEmail) {
          setIsAddFriendOpen(false);
        }
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
    }
  };

  const handleBatchSendFriendRequests = async () => {
    if (selectedFriendsToInvite.length === 0) return;
    const count = selectedFriendsToInvite.length;
    for (const m of selectedFriendsToInvite) {
      await handleSendFriendRequest(m.email);
    }
    setSelectedFriendsToInvite([]);
    handleCloseAddFriendModal();
    onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới ${count} đồng nghiệp.`);
  };

  const handleAcceptFriendRequest = async (req: FriendRequest) => {
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
        await fetchQGroups();
        onShowToast('success', 'Đã kết bạn thành công', req.senderName || req.senderEmail);
      }
    } catch {}
  };

  const handleRejectFriendRequest = async (req: FriendRequest) => {
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', userEmail: myEmail }),
        }
      );
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
      onShowToast('info', 'Đã từ chối', req.senderName || req.senderEmail);
    } catch {}
  };

  const handleAcceptGroupInv = async (inv: QGroupInvitation) => {
    try {
      removeFromBlacklist(myEmail, inv.groupId, inv.groupCode);
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      await fetchQGroups();
      setSelectedGroupId(inv.groupId);
      setShowMobileChat(true);
      setFilterTab('groups');
      onShowToast('success', 'Đã tham gia nhóm', inv.groupName);
    } catch {}
  };

  const handleRejectGroupInv = async (inv: QGroupInvitation) => {
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', userEmail: myEmail }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      onShowToast('info', 'Đã từ chối', inv.groupName);
    } catch {}
  };

  const handleInviteToGroup = async (group: QGroup) => {
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email || !group) return;
    const inv: QGroupInvitation = {
      id: `inv-${Date.now()}`,
      groupId: group.id,
      groupCode: group.code,
      groupName: group.name,
      department: group.department || 'Khoa Công nghệ Thông tin',
      inviterEmail: myEmail,
      inviterName: myName,
      targetEmail: email,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${group.id}:${email}`));
    setSentGroupInvitations((prev) => [inv, ...prev.filter((x) => !(x.groupId === group.id && x.targetEmail.toLowerCase() === email))]);
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      onShowToast('success', 'Đã gửi lời mời', `Đã mời ${email} vào nhóm.`);
      setInviteEmailInput('');
      void fetchGroupInvitations();
    } catch {}
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const now = Date.now();
    const code = `QGRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Tách thành viên: Đã kết bạn (vào thẳng nhóm) vs Chưa kết bạn (gửi lời mời chờ đồng ý)
    const confirmedFriends: typeof createGroupSelectedMembers = [];
    const unconfirmedMembers: typeof createGroupSelectedMembers = [];

    createGroupSelectedMembers.forEach((m) => {
      const state = getFriendshipState(m.email);
      if (state.type === 'friend') {
        confirmedFriends.push(m);
      } else {
        unconfirmedMembers.push(m);
      }
    });

    const friendEmails = confirmedFriends.map((m) => m.email.trim().toLowerCase());
    const initialMembers = Array.from(new Set([myEmail.toLowerCase(), ...friendEmails]));

    let systemNotice = `🎉 Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã phòng: ${code}`;
    if (confirmedFriends.length > 0) {
      const friendNames = confirmedFriends.map((m) => m.fullName).join(', ');
      systemNotice += ` • Thành viên kết nối: ${friendNames}.`;
    }
    if (unconfirmedMembers.length > 0) {
      const pendingNames = unconfirmedMembers.map((m) => m.fullName).join(', ');
      systemNotice += ` • Đã gửi lời mời tham gia tới: ${pendingNames} (chờ đồng ý do chưa kết bạn).`;
    }

    const group: QGroup = {
      id: `qg-${now}`,
      code,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description:
        newGroupDesc.trim() || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.',
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: 'approval_required',
      memberCount: initialMembers.length,
      members: initialMembers,
      pendingRequests: [],
      isDirect: false,
      updatedAt: now,
      messages: [
        {
          id: `msg-${now}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống QuizGen',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          text: systemNotice,
        },
      ],
    };
    const next = [group, ...qgroups];
    applyGroups(next);
    void syncGroupsToBackend(next);

    // Gửi lời mời tham gia nhóm tới các đồng nghiệp chưa kết bạn
    unconfirmedMembers.forEach((m) => {
      const cleanTarget = m.email.trim().toLowerCase();
      const inv: QGroupInvitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: group.id,
        groupCode: group.code,
        groupName: group.name,
        department: group.department || 'Khoa Chuyên Ngành',
        inviterEmail: myEmail,
        inviterName: myName,
        targetEmail: cleanTarget,
        targetName: m.fullName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };
      setSentGroupInvitations((prev) => [inv, ...prev]);
      setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${group.id}:${cleanTarget}`));
      void apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
    });

    setSelectedGroupId(group.id);
    setShowMobileChat(true);
    setIsCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDept('');
    setNewGroupDesc('');
    setCreateGroupSelectedMembers([]);
    setCreateGroupMemberInput('');
    setCreateGroupLookedUpUser(null);
    setCreateGroupLookupStatus('idle');

    if (unconfirmedMembers.length > 0 && confirmedFriends.length > 0) {
      onShowToast(
        'success',
        'Đã tạo nhóm thành công',
        `Đã thêm ${confirmedFriends.length} bạn bè vào nhóm. Đã gửi lời mời tham gia tới ${unconfirmedMembers.length} đồng nghiệp chưa kết bạn (chờ đồng ý).`
      );
    } else if (unconfirmedMembers.length > 0) {
      onShowToast(
        'success',
        'Đã tạo nhóm thành công',
        `Mã phòng: ${code}. Đã gửi lời mời tham gia tới ${unconfirmedMembers.length} đồng nghiệp (chờ đồng ý do chưa kết bạn).`
      );
    } else if (confirmedFriends.length > 0) {
      onShowToast(
        'success',
        'Đã tạo nhóm thành công',
        `Mã phòng: ${code} (đã thêm ${confirmedFriends.length} bạn bè vào nhóm)`
      );
    } else {
      onShowToast('success', 'Đã tạo nhóm', `Mã phòng: ${code}`);
    }
  };

  const handleJoinByCode = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) {
      onShowToast('warning', 'Chưa nhập mã', 'Vui lòng nhập mã phòng học thuật.');
      return;
    }
    try {
      const res = await apiClient
        .fetch(`${API_BASE}/documents/qgroups/${c}/join-by-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: myEmail,
            userName: myName,
            userTitle: currentUser?.academicTitle || 'ThS.',
          }),
        })
        .then(async (r) => {
          if (r.status === 404) return { status: 'not_found', message: `Không tìm thấy nhóm với mã ${c}.` };
          return r.json();
        });

      if (res.status === 'joined') {
        setIsCreateGroupOpen(false);
        const joinedGroup = res.group;
        const filtered = qgroups.filter((g) => g.id !== joinedGroup.id);
        const updated = [joinedGroup, ...filtered];
        applyGroups(updated);
        setSelectedGroupId(joinedGroup.id);
        setShowMobileChat(true);
        onShowToast('success', 'Tham gia nhóm thành công', res.message || `Chào mừng bạn đến với ${joinedGroup.name}`);
      } else if (res.status === 'already_member') {
        setIsCreateGroupOpen(false);
        setSelectedGroupId(res.group?.id || '');
        if (res.group?.id) setShowMobileChat(true);
        onShowToast('info', 'Bạn đã là thành viên', res.message || 'Bạn đã tham gia nhóm này trước đó.');
      } else if (res.status === 'pending_approval') {
        setIsCreateGroupOpen(false);
        onShowToast('info', 'Yêu cầu tham gia đã gửi', res.message);
      } else if (res.status === 'invite_only') {
        onShowToast('warning', 'Nhóm riêng tư', res.message);
      } else {
        onShowToast('warning', 'Không thể tham gia', res.message || `Mã ${c} không hợp lệ.`);
      }
    } catch {
      onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu tham gia nhóm.');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div
      className="flex-1 flex h-full overflow-hidden bg-[#f7f9fb] select-none"
      onClick={() => {
        setMenuGroupId(null);
        setIsEmojiPickerOpen(false);
        setIsAttachPopoverOpen(false);
      }}
    >
      {/* ====================================================================
          LEFT SIDEBAR: CONVERSATION LIST (SLACK WORKSPACE STYLE)
      ==================================================================== */}
      <div
        className={`md:w-72 lg:w-80 ${
          showMobileChat ? 'hidden md:flex' : 'flex w-full'
        } border-r border-slate-200 flex-col shrink-0 h-full transition-all duration-200`}
      >
        <ChannelSidebar
          sortedGroups={sortedGroups}
          selectedGroupId={selectedGroupId}
          myEmail={myEmail}
          activeHuddleRoomIds={activeHuddleRoomIds}
          menuGroupId={menuGroupId}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalInvitations={totalInvitations}
          friendRequests={friendRequests}
          sentFriendRequests={sentFriendRequests}
          groupInvitations={groupInvitations}
          onAcceptFriend={handleAcceptFriendRequest}
          onRejectFriend={handleRejectFriendRequest}
          onCancelFriend={handleCancelFriendRequest}
          onAcceptGroup={handleAcceptGroupInv}
          onRejectGroup={handleRejectGroupInv}
          onOpenAddFriend={() => setIsAddFriendOpen(true)}
          onOpenCreateGroup={() => {
            setGroupModalTab('create');
            setIsCreateGroupOpen(true);
          }}
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            setShowMobileChat(true);
            markGroupAsRead(groupId);
            setMenuGroupId(null);
          }}
          onToggleMenu={(groupId, e) => {
            e.stopPropagation();
            setMenuGroupId((prev) => (prev === groupId ? null : groupId));
          }}
          onViewProfile={(group) => {
            const info = resolveChatDisplayInfo(group, myEmail);
            setProfileEmail(info.partnerEmail || null);
            setProfileName(info.displayName);
            setMenuGroupId(null);
          }}
          onViewDetails={(group) => {
            setDetailsGroup(group);
            setChannelDetailsTab('about');
            setIsChannelDetailsOpen(true);
            setMenuGroupId(null);
          }}
          onMute={(group) => handleToggleMute(group)}
          onTogglePin={(group) => {
            handleTogglePinConversation(group);
            setMenuGroupId(null);
          }}
          onDeleteChat={(group) => handleHideGroup(group.id)}
          hiddenGroupIds={hiddenGroupIds}
          onUnhideGroup={handleUnhideGroup}
          onUnfriend={(group) => {
            const info = resolveChatDisplayInfo(group, myEmail);
            if (info.partnerEmail) {
              handleUnfriend(info.partnerEmail, info.displayName);
            }
          }}
          onLeaveGroup={(group) => handleLeaveGroup(group)}
          onTransferOwner={(group) => handleOpenTransferOwnership(group)}
          onDisbandGroup={(group) => handleDisbandGroup(group)}
          onCopyCode={(code) => {
            navigator.clipboard.writeText(code);
            onShowToast('info', 'Đã sao chép mã phòng', code);
            setMenuGroupId(null);
          }}
        />
      </div>

      {/* ====================================================================
          RIGHT CHAT PANEL (SLACK STYLE HEADER & RICH COMPOSER)
      ==================================================================== */}
      <div className={`flex-1 flex-col h-full overflow-hidden bg-white ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
        {activeGroup && activeInfo ? (
          <>
            {/* Slack Style Chat Header */}
            <ChatHeader
              activeGroup={activeGroup}
              activeInfo={activeInfo}
              myEmail={myEmail}
              isStarred={isStarred}
              isHuddleActive={Boolean(activeHuddleForCurrentChat && activeHuddleForCurrentChat.count > 0)}
              activeHuddleCount={activeHuddleForCurrentChat ? activeHuddleForCurrentChat.count : 0}
              onToggleStarred={() => {
                setIsStarred(!isStarred);
                onShowToast('info', isStarred ? 'Bỏ đánh dấu sao' : 'Đã đánh dấu sao kênh', activeGroup.name);
              }}
              onBackToMobileList={() => {
                setShowMobileChat(false);
                setSelectedGroupId('');
                try {
                  sessionStorage.removeItem('qgroup_selected_group_id');
                  localStorage.removeItem('qgroup_selected_group_id');
                } catch {}
              }}
              onOpenMobileMenu={onOpenMobileMenu}
              onOpenProfile={(email, name) => {
                setProfileEmail(email);
                setProfileName(name);
              }}
              onOpenDetails={(group, tab) => {
                setDetailsGroup(group);
                if (tab) setChannelDetailsTab(tab);
                setIsChannelDetailsOpen(true);
              }}
              onOpenDirectAddMember={() => {
                setDirectAddMemberEmail('');
                setLookedUpUser(null);
                setLookupStatus('idle');
                setIsDirectAddMemberOpen(true);
              }}
              onOpenHuddle={handleOpenHuddleWithAudioPrime}
              onToggleMute={(group) => handleToggleMute(group)}
              onTogglePinConversation={(group) => handleTogglePinConversation(group)}
              onOpenCanvas={() => onShowToast('info', 'Bảng ghi nhớ Canvas', 'Mở không gian làm việc ghi nhớ của kênh')}
              onOpenSummarize={() => setIsSummarizeModalOpen(true)}
              onOpenSharedMedia={() => setIsSharedMediaOpen(true)}
              onOpenChannelSettings={() => setIsChannelSettingsOpen(true)}
              onOpenTransferOwnership={(group) => handleOpenTransferOwnership(group)}
              onDeleteChat={(group) => handleDeleteChat(group)}
              onHideChat={(group) => handleHideGroup(group.id)}
              onUnfriend={(email, name) => handleUnfriend(email, name)}
              onDisbandGroup={(group) => handleDisbandGroup(group)}
              onLeaveGroup={(group) => handleLeaveGroup(group)}
              onShowToast={onShowToast}
            />

            {/* Active Huddle Banner in Channel/DM */}
            <ActiveHuddleBanner
              activeHuddle={activeHuddleForCurrentChat}
              isCurrentUserInHuddle={isHuddleOpen}
              onJoinHuddle={handleOpenHuddleWithAudioPrime}
            />

            {/* Pending Join Requests Alert Banner for Group Owner */}
            {(activeGroup.ownerEmail || '').toLowerCase() === myEmail.toLowerCase() &&
              (activeGroup.pendingRequests || []).length > 0 && (
                <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs animate-fade-in shadow-2xs">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold min-w-0">
                    <span className="flex h-2.5 w-2.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600" />
                    </span>
                    <span className="truncate">
                      Có <strong className="text-amber-950 font-extrabold">{(activeGroup.pendingRequests || []).length}</strong> yêu cầu xin gia nhập kênh <strong>#{activeGroup.name}</strong> cần duyệt.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsGroup(activeGroup);
                      setChannelDetailsTab('members');
                      setIsChannelDetailsOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-md bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer shadow-2xs"
                  >
                    Xem & Duyệt ngay
                  </button>
                </div>
              )}

            {/* Pinned Messages Bar */}
            <PinnedMessagesBar
              pinnedMessages={pinnedMessages}
              activePinnedIdx={activePinnedIdx}
              onNextPinned={() => setActivePinnedIdx((prev) => (prev + 1) % pinnedMessages.length)}
              onUnpin={(msgId) => handleTogglePinMessage(msgId)}
              onScrollToMessage={(msgId) => {
                const el = document.getElementById(`chat-msg-${msgId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-100/70');
                  setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-100/70');
                  }, 2500);
                }
              }}
            />

            {/* Message Stream (Slack Linear Flow) */}
            <div
              ref={chatContainerRef}
              onScroll={() => {
                if (chatContainerRef.current) {
                  const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                  isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight <= 120;
                }
              }}
              style={{ scrollBehavior: 'auto' }}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 bg-[#fcfdfe]"
            >
              {/* Channel Welcome Card */}
              {activeGroup.isDirect ? (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-3 max-w-xl mb-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => openUserProfile(activeInfo.partnerEmail, activeInfo.displayName)}
                      className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-[#008689] text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shadow-2xs"
                      title={`Xem hồ sơ của ${activeInfo.displayName}`}
                    >
                      {activeInfo.avatarInitials}
                    </div>
                    <div>
                      <h4
                        onClick={() => openUserProfile(activeInfo.partnerEmail, activeInfo.displayName)}
                        className="text-sm font-bold text-slate-900 hover:text-[#008689] flex items-center gap-1.5 cursor-pointer hover:underline transition-colors"
                        title={`Xem hồ sơ của ${activeInfo.displayName}`}
                      >
                        <span>@{activeInfo.displayName}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{activeInfo.partnerEmail}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    Đây là không gian trao đổi chuyên môn trực tiếp riêng tư giữa bạn và <strong>@{activeInfo.displayName}</strong> ({activeInfo.displayRoleOrMembers}). Toàn bộ tài liệu giáo trình và câu hỏi thi chia sẻ tại đây được đồng bộ hai chiều.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileEmail(activeInfo.partnerEmail || null);
                        setProfileName(activeInfo.displayName);
                        openUserProfile(activeInfo.partnerEmail, activeInfo.displayName);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Xem trang cá nhân</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-2.5 max-w-xl mb-4 shadow-2xs">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
                    <Hash className="w-5 h-5 text-slate-600" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Chào mừng bạn đến với kênh #{activeInfo.displayName}!
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeGroup.description ||
                      'Không gian trao đổi chuyên môn, chia sẻ giáo trình và đóng góp ma trận câu hỏi thi giữa các giảng viên trong bộ môn.'}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span>Mã phòng: <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{activeGroup.code}</strong></span>
                    <span>•</span>
                    <span>Chủ trì: <strong>{activeGroup.ownerName || 'TS. Hồ Anh Vũ'}</strong></span>
                  </div>
                </div>
              )}

              {/* Message Items (Slack Linear Row Layout) */}
              {(activeGroup.messages || []).map((msg) => {
                const isMe = msg.senderEmail?.toLowerCase() === myEmail;
                const isOwner = (activeGroup.ownerEmail || '').toLowerCase() === myEmail;
                if (msg.isSystem) {
                  const isJoinReq = (msg as any).isJoinRequest;
                  const isHandled = (msg as any).isJoinRequestHandled;

                  if (isJoinReq) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3 px-2">
                        <div className="max-w-md w-full p-3.5 rounded-2xl bg-amber-50/95 border border-amber-300 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                              <Shield className="w-3.5 h-3.5 text-amber-700" />
                              <span>Yêu cầu xin gia nhập kênh</span>
                            </span>
                            <span className="text-[10px] text-amber-800 font-mono">{msg.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {msg.text}
                          </p>
                          {isOwner && !isHandled ? (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRespondJoinRequest(
                                    activeGroup,
                                    (msg as any).joinRequestId,
                                    (msg as any).joinUserEmail,
                                    'approve'
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Duyệt ngay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRespondJoinRequest(
                                    activeGroup,
                                    (msg as any).joinRequestId,
                                    (msg as any).joinUserEmail,
                                    'reject'
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          ) : isHandled ? (
                            <div className="pt-1.5 border-t border-amber-200/70 text-[11px] font-bold flex items-center gap-1.5">
                              {(msg as any).joinRequestStatus === 'approve' ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Đã được Trưởng nhóm phê duyệt
                                </span>
                              ) : (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" /> Đã từ chối yêu cầu
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 border border-slate-200">
                        <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className="flex items-start gap-3 px-3 py-2 -mx-2 rounded-lg hover:bg-slate-100/70 transition-all duration-300 group relative select-text"
                  >
                    <div
                      onClick={() => {
                        const targetEmail = msg.senderEmail || (isMe ? myEmail : activeInfo?.partnerEmail);
                        const targetName = msg.senderName || (isMe ? myName : activeInfo?.displayName);
                        setProfileEmail(targetEmail || null);
                        setProfileName(targetName);
                        openUserProfile(targetEmail, targetName);
                      }}
                      className={`w-8 h-8 rounded-md text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs ${
                        isMe ? 'bg-slate-800' : 'bg-teal-700'
                      }`}
                      title={isMe ? 'Xem hồ sơ của bạn' : `Xem trang cá nhân của ${msg.senderName}`}
                    >
                      {initials(msg.senderName || msg.senderEmail || '')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          onClick={() => {
                            const targetEmail = msg.senderEmail || (isMe ? myEmail : activeInfo?.partnerEmail);
                            const targetName = msg.senderName || (isMe ? myName : activeInfo?.displayName);
                            setProfileEmail(targetEmail || null);
                            setProfileName(targetName);
                            openUserProfile(targetEmail, targetName);
                          }}
                          className="font-bold text-[13px] text-slate-900 hover:text-[#008689] hover:underline cursor-pointer transition-colors"
                          title={isMe ? 'Xem hồ sơ của bạn' : `Xem trang cá nhân của ${msg.senderName}`}
                        >
                          {msg.senderName || msg.senderEmail}
                        </span>
                        {msg.senderTitle && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {msg.senderTitle}
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1 rounded">
                            Bạn
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <span>{msg.timestamp}</span>
                          {msg.isEdited && (
                            <span className="text-[10px] text-slate-400 font-normal italic">
                              (đã chỉnh sửa)
                            </span>
                          )}
                          {msg.isPinned && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                              <Pin className="w-2.5 h-2.5" /> Ghim
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Reply Quote Banner (nếu đang trả lời 1 tin nhắn trước đó) */}
                      {msg.replyTo && !msg.isRecalled && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 my-1 pl-2 border-l-2 border-teal-500 bg-slate-50/70 py-0.5 rounded-r">
                          <Reply className="w-3 h-3 text-teal-600 shrink-0" />
                          <button
                            type="button"
                            onClick={() => openUserProfile(undefined, msg.replyTo?.senderName)}
                            className="font-semibold text-slate-700 hover:text-[#008689] hover:underline cursor-pointer transition-colors"
                            title={`Xem hồ sơ của ${msg.replyTo.senderName}`}
                          >
                            {msg.replyTo.senderName}:
                          </button>
                          <span className="truncate italic text-slate-600">&ldquo;{msg.replyTo.text}&rdquo;</span>
                        </div>
                      )}

                      {/* Trạng thái tin nhắn đã thu hồi */}
                      {msg.isRecalled ? (
                        <div className="text-[12px] text-slate-400 italic py-1 flex items-center gap-1.5 select-none">
                          <Undo2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Tin nhắn đã được thu hồi</span>
                        </div>
                      ) : editingMessageId === msg.id ? (
                        /* Chế độ Chỉnh sửa Tin nhắn trực tiếp (Inline Edit) */
                        <div className="mt-1 space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEditMessage(msg.id);
                              } else if (e.key === 'Escape') {
                                setEditingMessageId(null);
                              }
                            }}
                            className="w-full p-2.5 rounded-lg border border-teal-500 bg-white text-xs text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs leading-relaxed"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleSaveEditMessage(msg.id)}
                              className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer text-[11px] transition-colors"
                            >
                              Lưu thay đổi
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer text-[11px] transition-colors"
                            >
                              Hủy (Esc)
                            </button>
                            <span className="text-[10px] text-slate-400 ml-auto">Nhấn Enter để lưu</span>
                          </div>
                        </div>
                      ) : (
                        /* Text Message thông thường (Rich Formatted Markdown, Code & Links) */
                        msg.text && !msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
                          <div className="mt-1">
                            <FormattedMessageText text={msg.text} />
                          </div>
                        )
                      )}

                      {/* ─── LINKED ACADEMIC FORUM POST CARD (Thẻ hình chữ nhật liên kết trực tiếp bài viết Diễn Đàn) ─── */}
                      {!msg.isRecalled && (msg.sharedPost || (msg.text && msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]'))) && (() => {
                        const post = msg.sharedPost;
                        const legacy = !post && msg.text ? parseLegacyForumShare(msg.text) : null;
                        const tag = post?.tag || legacy?.tag || 'HọcThuật';
                        const author = post?.authorName || legacy?.authorName || 'Giảng viên UTH';
                        const authorTitle = post?.authorTitle || legacy?.authorTitle;
                        const department = post?.department || legacy?.department;
                        const content = post?.content || legacy?.content || '';
                        const attachmentName = post?.attachmentFileName || legacy?.attachmentFileName;
                        const attachmentSize = post?.attachmentFileSize || legacy?.attachmentFileSize;
                        const attachmentUrl = post?.attachmentUrl;
                        const imageUrl = post?.imageUrl;
                        const postTitle = post?.title;
                        const postId = post?.id || legacy?.id;

                        return (
                          <div className="mt-2.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs max-w-lg overflow-hidden transition-all hover:border-teal-400 hover:shadow-md">
                            {/* Card Header Bar */}
                            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Share2 className="w-3.5 h-3.5 text-teal-600" />
                                <span className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800">
                                  Bài viết Diễn đàn Học thuật UTH
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                #{tag}
                              </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-3.5 space-y-2.5">
                              {/* Post Title if available */}
                              {postTitle && (
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                                  {postTitle}
                                </h4>
                              )}

                              {/* Author metadata */}
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {initials(author)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {author}
                                    </span>
                                    {authorTitle && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        {authorTitle}
                                      </span>
                                    )}
                                  </div>
                                  {department && (
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {department}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Quotation text */}
                              <div className="p-2.5 rounded-xl bg-slate-50 border-l-2 border-teal-500 text-xs text-slate-700 italic leading-relaxed">
                                &ldquo;{content}&rdquo;
                              </div>

                              {/* Shared post image preview */}
                              {imageUrl && (
                                <div
                                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setPreviewMediaUrl({ url: imageUrl, name: postTitle || 'Ảnh bài viết' })}
                                  title="Bấm để xem ảnh phóng to"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={postTitle || 'Ảnh đính kèm'}
                                    className="w-full h-auto max-h-48 object-cover block"
                                  />
                                </div>
                              )}

                              {/* Attached document inside shared post */}
                              {attachmentName && (
                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-slate-800 truncate text-[11px]">
                                        {attachmentName}
                                      </p>
                                      {attachmentSize && (
                                        <p className="text-[9px] text-slate-400 font-mono">
                                          {attachmentSize} • Tệp học thuật đính kèm
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadFileSafely(attachmentName, attachmentUrl, onShowToast);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-teal-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    title="Tải tệp đính kèm về máy"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* Action Deep-link Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (postId) {
                                    sessionStorage.setItem('quizgen_focus_post_id', postId);
                                  }
                                  onNavigate('forum');
                                }}
                                className="w-full mt-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
                              >
                                <span>Xem bài viết trên Diễn Đàn</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Direct Attachment (Hỗ trợ Ảnh, Video, File máy tính & Giáo trình thư viện - Đơn hoặc Nhiều tệp) */}
                      {!msg.isRecalled && (msg.attachment || (msg.attachments && msg.attachments.length > 0)) && !msg.sharedPost && !msg.text?.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
                        <div className="mt-2.5 max-w-md space-y-2">
                          {((msg.attachments && msg.attachments.length > 0) ? msg.attachments : [msg.attachment!]).map((attItem, attIdx) => {
                            if (!attItem) return null;
                            const attKey = attItem.id || `${msg.id}-att-${attIdx}`;
                            return (
                              <div key={attKey}>
                                {attItem.type === 'image' && attItem.fileUrl ? (
                                  <div className="relative group inline-block max-w-sm rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50/50 shadow-xs transition-all hover:border-teal-400">
                                    <img
                                      src={attItem.fileUrl}
                                      alt={attItem.name || 'Ảnh đính kèm'}
                                      className="max-h-80 w-auto max-w-full object-contain rounded-2xl cursor-pointer hover:opacity-95 transition-opacity block"
                                      onClick={() => {
                                        if (attItem.fileUrl) {
                                          setPreviewMediaUrl({
                                            url: attItem.fileUrl,
                                            name: attItem.name || 'image.png',
                                          });
                                        }
                                      }}
                                    />
                                    {/* Hover Action Overlay (Chuẩn Slack Floating Action Toolbar) */}
                                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-lg px-1.5 py-1 gap-1 z-20 animate-fade-in">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadFileSafely(attItem.name || 'image.png', attItem.fileUrl, onShowToast);
                                        }}
                                        className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer transition-colors"
                                        title="Tải ảnh về máy"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      {(isMe || isOwner) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSingleAttachment(msg.id, attItem.id || attIdx);
                                          }}
                                          className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer transition-colors"
                                          title="Xóa riêng ảnh này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : attItem.type === 'video' && attItem.fileUrl ? (
                                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-2xs">
                                    <video
                                      src={attItem.fileUrl}
                                      controls
                                      className="max-h-72 w-full"
                                    />
                                    <div className="p-2.5 flex items-center justify-between text-xs bg-slate-900 text-white">
                                      <span className="truncate font-medium text-xs max-w-[200px]">{attItem.name}</span>
                                      <span className="text-[10px] text-slate-400">{attItem.size}</span>
                                    </div>
                                  </div>
                                ) : attItem.type === 'audio' && attItem.fileUrl ? (
                                  <div className="max-w-sm">
                                    <AudioMessagePlayer attachment={attItem} onShowToast={onShowToast} />
                                  </div>
                                ) : attItem.type === 'file' ? (
                                  <div
                                    onClick={() => {
                                      if (attItem.fileUrl) {
                                        setPreviewFile({
                                          url: attItem.fileUrl,
                                          name: attItem.name,
                                          size: attItem.size,
                                          type: attItem.fileType,
                                        });
                                      }
                                    }}
                                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer group transition-all"
                                    title={`Bấm để mở xem tệp ${attItem.name}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-700 group-hover:text-teal-700 transition-colors shrink-0">
                                        {getFileIcon(attItem.name)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 truncate transition-colors">
                                          {attItem.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          {attItem.size} • Bấm để xem tệp
                                        </p>
                                      </div>
                                    </div>
                                    {attItem.fileUrl && (
                                      <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadFileSafely(attItem.name, attItem.fileUrl, onShowToast);
                                          }}
                                          className="w-6 h-6 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0 flex items-center justify-center text-xs cursor-pointer"
                                          title="Tải tệp về máy"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        {isMe && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSingleAttachment(msg.id, attItem.id || attIdx);
                                            }}
                                            className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors shrink-0 flex items-center justify-center text-xs cursor-pointer"
                                            title="Xóa riêng tệp này"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Textbook Attachment */
                                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-left space-y-2 hover:border-teal-400 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                                        <BookOpen className="w-5 h-5 text-teal-700" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                          {attItem.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          {attItem.totalPages ? `${attItem.totalPages} trang • ` : ''}{attItem.size} • Giáo trình UTH
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển ${attItem.name} vào màn hình sinh đề AI`);
                                          onNavigate('generate');
                                        }}
                                        className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Dùng Sinh Đề Ngay</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Emoji Reaction Badges (Hiển thị các reaction đã thả) */}
                      {!msg.isRecalled && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            if (!users || users.length === 0) return null;
                            const hasReacted = users.includes(myEmail);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                                  hasReacted
                                    ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={users.join(', ')}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px]">{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Slack Floating Hover Action Bar (Chuẩn Slack: Cảm xúc, Trả lời, Sao chép, Ghim, Sửa, Thu hồi, Xóa) */}
                    {!msg.isRecalled && (
                      <div className="absolute right-2 -top-3 hidden group-hover:flex items-center bg-white border border-slate-200/90 rounded-xl shadow-lg px-1.5 py-1 gap-1 z-20 animate-fade-in">
                        {/* Emojis */}
                        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
                          {['👍', '❤️', '👏', '🎉', '💡'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
                              title={`Bày tỏ cảm xúc ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Reply in thread */}
                        <button
                          type="button"
                          onClick={() => handleStartReply(msg)}
                          className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                          title="Trả lời tin nhắn"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy text */}
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.text) {
                              navigator.clipboard.writeText(msg.text);
                              onShowToast('info', 'Đã sao chép tin nhắn', msg.text.slice(0, 30));
                            }
                          }}
                          className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                          title="Sao chép văn bản"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Pin message */}
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(msg.id)}
                          className={`w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-xs cursor-pointer ${
                            msg.isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title={msg.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit message (Chỉ tin nhắn của mình) */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleStartEditMessage(msg)}
                            className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                            title="Chỉnh sửa tin nhắn"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Xóa tin nhắn (Dành cho admin / chủ phòng / người gửi) - Chuẩn Slack/Teams */}
                        {(isMe || isOwner) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer"
                            title="Xóa tin nhắn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ================================================================
                SLACK RICH TEXT COMPOSER OR INACTIVE CHANNEL BANNER
            ================================================================ */}
            <div className="p-3 sm:px-4 sm:py-3 border-t border-slate-200 bg-white space-y-2">
              <ChatComposer
                isMemberOfChannel={Boolean(activeGroup.isDirect || isCurrentUserMember)}
                replyingToMessage={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
                selectedAttachments={selectedAttachments}
                selectedAttachment={selectedAttachment}
                onRemoveAttachment={(idx) =>
                  setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))
                }
                onClearAttachment={() => setSelectedAttachments([])}
                chatInput={chatInput}
                onChatInputChange={(val) => {
                  setChatInput(val);
                  const cursorPos = textareaRef.current?.selectionStart || val.length;
                  const textBefore = val.slice(0, cursorPos);
                  const atMatch = textBefore.match(/@([a-zA-Z0-9_\.\u00C0-\u1EF9]*)$/);
                  if (atMatch) {
                    setMentionSearch(atMatch[1]);
                    setIsMentionOpen(true);
                  } else {
                    setIsMentionOpen(false);
                    setMentionSearch(null);
                  }
                }}
                isMentionOpen={isMentionOpen}
                mentionCandidates={mentionCandidates}
                onSelectMentionCandidate={(c) => {
                  const cursorPos = textareaRef.current?.selectionStart || chatInput.length;
                  const textBefore = chatInput.slice(0, cursorPos);
                  const atIdx = textBefore.lastIndexOf('@');
                  if (atIdx !== -1) {
                    const beforeAt = chatInput.slice(0, atIdx);
                    const after = chatInput.slice(cursorPos);
                    setChatInput(`${beforeAt}@${c.tag} ${after}`);
                  } else {
                    setChatInput((prev) => `${prev}@${c.tag} `);
                  }
                  setIsMentionOpen(false);
                  setMentionSearch(null);
                }}
                onCloseMention={() => {
                  setIsMentionOpen(false);
                  setMentionSearch(null);
                }}
                onSend={() => handleSend()}
                onComposerPaste={handleComposerPaste}
                placeholder={
                  activeGroup.isDirect
                    ? `Nhắn tin tới ${activeGroup.directPartnerName || activeGroup.name}... (Enter để gửi)`
                    : `Nhắn tin trong #${activeGroup.name}... (Enter để gửi, Shift+Enter xuống dòng)`
                }
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                liveMicLevels={liveMicLevels}
                activeMicLabel={activeMicLabel}
                onCycleMic={handleCycleMic}
                onCancelRecording={cancelVoiceRecording}
                onStopAndSendRecording={stopAndSendVoiceRecording}
                onStartRecording={startVoiceRecording}
                onSelectFile={(f) => handleFileSelect(f)}
                onSelectFiles={handleFilesSelect}
                isUploading={isUploadingAttachment}
                uploadProgressText={uploadProgressText}
                onOpenTextbookModal={() => setIsTextbookModalOpen(true)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <MessageCircle className="w-14 h-14 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">Chưa chọn đoạn chat</p>
            <p className="text-xs max-w-xs">
              Chọn một người bạn hoặc nhóm từ danh sách bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODAL: THÊM THÀNH VIÊN VÀO KÊNH (SLACK DIRECT ADD MEMBER)
      ==================================================================== */}
      {isDirectAddMemberOpen && activeGroup && (
        <DirectAddMemberModal
          isOpen={isDirectAddMemberOpen}
          onClose={() => {
            setIsDirectAddMemberOpen(false);
            setDirectAddSelectedMembers([]);
            setDirectAddMemberEmail('');
            setLookedUpUser(null);
            setLookupStatus('idle');
          }}
          activeGroup={activeGroup}
          directAddMemberEmail={directAddMemberEmail}
          onDirectAddMemberEmailChange={setDirectAddMemberEmail}
          onLookupUser={handleLookupUser}
          lookupStatus={lookupStatus}
          lookedUpUser={lookedUpUser}
          onClearLookedUpUser={() => {
            setDirectAddMemberEmail('');
            setLookedUpUser(null);
            setLookupStatus('idle');
          }}
          directAddSelectedMembers={directAddSelectedMembers}
          setDirectAddSelectedMembers={setDirectAddSelectedMembers}
          onQueueDirectAddMember={handleQueueDirectAddMember}
          suggestedDirectAddDropdown={suggestedDirectAddDropdown}
          filteredFriends={filteredFriends}
          getFriendshipState={getFriendshipState}
          isMemberInvitedToActiveChannel={isMemberInvitedToActiveChannel}
          onAddUserToActiveChannel={handleAddUserToActiveChannel}
          onSendGroupInvitation={handleSendGroupInvitation}
          onBatchAddUsersToActiveChannel={handleBatchAddUsersToActiveChannel}
          onBatchSendGroupInvitations={handleBatchSendGroupInvitations}
          isAddingMember={isAddingMember}
          initials={(n) => initials(n || '')}
        />
      )}

      {/* ====================================================================
          MODAL: CHI TIẾT KÊNH (SLACK STYLE INFORMATIONAL MULTI-TAB)
      ==================================================================== */}
      {isChannelDetailsOpen && (detailsGroup || activeGroup) && (() => {
        const targetGroup = detailsGroup || activeGroup!;
        return (
          <ChannelDetailsModal
            group={targetGroup}
            myEmail={myEmail}
            activeTab={channelDetailsTab}
            onTabChange={setChannelDetailsTab}
            inviteEmail={inviteEmailInput}
            onInviteEmailChange={setInviteEmailInput}
            onInvite={() => void handleInviteToGroup(targetGroup)}
            onClose={() => {
              setIsChannelDetailsOpen(false);
              setDetailsGroup(null);
            }}
            onLeaveGroup={() => {
              setIsChannelDetailsOpen(false);
              setDetailsGroup(null);
              void handleLeaveGroup(targetGroup);
            }}
            onDeleteChat={() => {
              setIsChannelDetailsOpen(false);
              setDetailsGroup(null);
              handleDeleteChat(targetGroup);
            }}
            onUnfriend={(email, name) => {
              setIsChannelDetailsOpen(false);
              setDetailsGroup(null);
              handleUnfriend(email, name);
            }}
            onKickMember={(email, name) => {
              void handleKickMember(targetGroup, email, name);
            }}
            onRespondJoinRequest={(reqId, email, action) => {
              void handleRespondJoinRequest(targetGroup, reqId, email, action);
            }}
            onOpenProfile={(email, name) => {
              setProfileEmail(email);
              setProfileName(name);
            }}
            onTransferOwnershipToMember={(email) => {
              handleOpenTransferOwnership(targetGroup, email);
            }}
            onSaveSettings={(name, dept, desc, joinPolicy) => {
              void handleSaveGroupSettings(targetGroup, name, dept, desc, joinPolicy);
            }}
            onDisbandGroup={() => {
              setIsChannelDetailsOpen(false);
              setDetailsGroup(null);
              void handleDisbandGroup(targetGroup);
            }}
          />
        );
      })()}

      {/* ====================================================================
          MODAL: CÀI ĐẶT KÊNH (SLACK / TEAMS DEDICATED CHANNEL SETTINGS)
      ==================================================================== */}
      {isChannelSettingsOpen && activeGroup && (
        <ChannelSettingsModal
          group={activeGroup}
          myEmail={myEmail}
          onClose={() => setIsChannelSettingsOpen(false)}
          onSaveSettings={(name, dept, desc, joinPolicy) => {
            void handleSaveGroupSettings(activeGroup, name, dept, desc, joinPolicy);
            setIsChannelSettingsOpen(false);
          }}
          onTransferOwner={() => {
            setIsChannelSettingsOpen(false);
            const otherMembers = (activeGroup.members || []).filter(
              (m) => m.toLowerCase() !== myEmail.toLowerCase()
            );
            if (otherMembers.length === 0) {
              onShowToast('info', 'Chưa có thành viên khác', 'Nhóm cần có ít nhất 1 thành viên khác để nhượng quyền.');
              return;
            }
            setTransferGroup(activeGroup);
            setSelectedNewOwner(otherMembers[0] || '');
            setIsTransferOwnerModalOpen(true);
          }}
          onDisband={() => {
            setIsChannelSettingsOpen(false);
            void handleDisbandGroup(activeGroup);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: CHUYỂN QUYỀN TRƯỞNG NHÓM TRƯỚC KHI RỜI (SAFE LEADER EXIT)
      ==================================================================== */}
      {isTransferOwnerModalOpen && transferGroup && (
        <Modal
          onClose={() => setIsTransferOwnerModalOpen(false)}
          title="Chuyển Quyền Trưởng Nhóm"
          icon={<UserCheck className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bạn đang là Trưởng nhóm của "#{transferGroup.name}"</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Chỉ định một giảng viên trong nhóm tiếp nhận vai trò Trưởng nhóm học thuật. Bạn có thể chọn tiếp tục ở lại nhóm hoặc rời nhóm.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700">Chọn giảng viên kế nhiệm:</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {(transferGroup.members || [])
                  .filter((m) => m.toLowerCase() !== myEmail.toLowerCase())
                  .map((email) => (
                    <label
                      key={email}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedNewOwner.toLowerCase() === email.toLowerCase()
                          ? 'border-slate-900 bg-white text-slate-900 font-semibold ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials(email)}
                        </div>
                        <span className="truncate">{email}</span>
                      </div>
                      <input
                        type="radio"
                        name="newOwner"
                        checked={selectedNewOwner.toLowerCase() === email.toLowerCase()}
                        onChange={() => setSelectedNewOwner(email)}
                        className="text-slate-900"
                      />
                    </label>
                  ))}
              </div>
            </div>

            {/* Checkbox tùy chọn rời nhóm hoặc ở lại */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={transferAlsoLeave}
                onChange={(e) => setTransferAlsoLeave(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer mt-0.5"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Đồng thời rời khỏi nhóm sau khi chuyển quyền</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {transferAlsoLeave
                    ? 'Bạn sẽ chuyển quyền và rút khỏi kênh học thuật này.'
                    : 'Mặc định: Bạn vẫn ở lại nhóm với tư cách thành viên bình thường sau khi chuyển quyền.'}
                </p>
              </div>
            </label>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsTransferOwnerModalOpen(false);
                  void handleDisbandGroup(transferGroup);
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold text-xs hover:underline cursor-pointer"
              >
                Giải tán nhóm vĩnh viễn
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOwnerModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!selectedNewOwner || isTransferringOwner}
                  onClick={handleTransferOwnerAndLeave}
                  className={`px-4 py-2 rounded-lg disabled:opacity-40 font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                    transferAlsoLeave
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isTransferringOwner
                    ? 'Đang xử lý...'
                    : transferAlsoLeave
                    ? 'Chuyển quyền & Rời nhóm'
                    : 'Xác nhận Chuyển quyền Trưởng nhóm'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================================================
          MODAL: SLACK AI SUMMARIZER (TÓM TẮT CUỘC TRÒ CHUYỆN)
      ==================================================================== */}
      {isSummarizeModalOpen && activeGroup && (
        <AiSummarizeModal
          group={activeGroup}
          onClose={() => setIsSummarizeModalOpen(false)}
        />
      )}

      {/* ====================================================================
          MODAL: SLACK HUDDLE (THẢO LUẬN ÂM THANH NHANH)
      ==================================================================== */}
      {isHuddleOpen && activeGroup && (
        <HuddleCallModal
          group={activeGroup}
          currentUser={currentUser}
          onClose={() => {
            if (activeGroup) {
              const partner = (activeGroup.directPartnerEmail || '').toLowerCase().trim();
              const roomId = activeGroup.isDirect
                ? `dm_${[myEmail, partner].filter(Boolean).sort().join('_')}`
                : `room_${activeGroup.id || activeGroup.code}`;
              dismissedCallsRef.current[roomId] = Date.now() + 86400000;
            }
            setIncomingHuddleCall(null);
            setIsHuddleOpen(false);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: INCOMING HUDDLE CALL (ĐÃ ĐƯỢC CHUYỂN LÊN ROOT APP ĐỂ BÁO TRÊN MỌI MÀN HÌNH)
      ==================================================================== */}

      {/* ====================================================================
          OTHER MODALS: PUBLIC PROFILE, ADD FRIEND, CREATE GROUP
      ==================================================================== */}
      <PublicProfileModal
        isOpen={Boolean(profileEmail || profileName)}
        userEmail={profileEmail}
        userName={profileName}
        isFriend={isTargetFriend}
        hasSentRequest={hasTargetPendingRequest}
        onClose={() => {
          setProfileEmail(null);
          setProfileName(undefined);
        }}
        currentUser={currentUser}
        onStartDirectChat={(targetEmail) => {
          setProfileEmail(null);
          setProfileName(undefined);
          const target = (targetEmail || '').trim().toLowerCase();
          const dm = qgroups.find((g) => {
            if (!g.isDirect) return false;
            const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
            const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
            const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
            return cleanOwner === target || cleanPartner === target || members.includes(target);
          });
          if (dm) {
            setSelectedGroupId(dm.id);
            setShowMobileChat(true);
            setFilterTab('all');
          } else {
            onShowToast('info', 'Bắt đầu trò chuyện', `Chưa có đoạn chat riêng với ${targetEmail}`);
          }
        }}
        onSendFriendRequest={(email) => {
          void handleSendFriendRequest(email);
        }}
        onUnfriend={(email, name) => {
          setProfileEmail(null);
          setProfileName(undefined);
          handleUnfriend(email, name);
        }}
        onCancelFriendRequest={(email) => {
          const req = friendRequests.find(
            (r) =>
              r.senderEmail?.toLowerCase() === myEmail.toLowerCase() &&
              r.targetEmail?.toLowerCase() === email.toLowerCase()
          );
          if (req) {
            handleRejectFriendRequest(req);
          }
        }}
      />

      {isAddFriendOpen && (
        <FriendModal
          isOpen={isAddFriendOpen}
          onClose={handleCloseAddFriendModal}
          friendEmailInput={friendEmailInput}
          onFriendEmailInputChange={setFriendEmailInput}
          onFriendLookup={handleFriendLookup}
          friendLookupStatus={friendLookupStatus}
          friendLookedUpUser={friendLookedUpUser}
          onClearLookedUpUser={() => {
            setFriendEmailInput('');
            setFriendLookedUpUser(null);
            setFriendLookupStatus('idle');
          }}
          selectedFriendsToInvite={selectedFriendsToInvite}
          setSelectedFriendsToInvite={setSelectedFriendsToInvite}
          suggestedFriendsDropdown={suggestedFriendsDropdown}
          filteredColleaguesForFriend={filteredColleaguesForFriend}
          getFriendshipState={getFriendshipState}
          onQueueFriendInvite={handleQueueFriendInvite}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onBatchSendFriendRequests={handleBatchSendFriendRequests}
          initials={(n) => initials(n || '')}
        />
      )}

      {isCreateGroupOpen && (
        <CreateOrJoinGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => {
            setIsCreateGroupOpen(false);
            setCreateGroupSelectedMembers([]);
            setCreateGroupMemberInput('');
            setCreateGroupLookedUpUser(null);
            setCreateGroupLookupStatus('idle');
          }}
          groupModalTab={groupModalTab}
          setGroupModalTab={setGroupModalTab}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          newGroupDept={newGroupDept}
          setNewGroupDept={setNewGroupDept}
          newGroupDesc={newGroupDesc}
          setNewGroupDesc={setNewGroupDesc}
          createGroupSelectedMembers={createGroupSelectedMembers}
          setCreateGroupSelectedMembers={setCreateGroupSelectedMembers}
          createGroupMemberInput={createGroupMemberInput}
          setCreateGroupMemberInput={setCreateGroupMemberInput}
          onLookupMember={handleCreateGroupMemberLookup}
          createGroupLookupStatus={createGroupLookupStatus}
          createGroupLookedUpUser={createGroupLookedUpUser}
          onClearLookedUpUser={() => {
            setCreateGroupMemberInput('');
            setCreateGroupLookedUpUser(null);
            setCreateGroupLookupStatus('idle');
          }}
          suggestedCreateGroupDropdown={suggestedCreateGroupDropdown}
          filteredColleaguesForNewGroup={filteredColleaguesForNewGroup}
          getFriendshipState={getFriendshipState}
          onAddMemberToNewGroup={handleAddMemberToNewGroup}
          onCreateGroup={handleCreateGroup}
          joinCodeInput={joinCodeInput}
          setJoinCodeInput={setJoinCodeInput}
          onJoinByCode={handleJoinByCode}
          isJoiningCode={isJoiningCode}
          initials={(n) => initials(n || '')}
        />
      )}

      {/* Modern In-App Confirm Dialog */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Universal Document & Media Preview Modal with Zoom, Rotate, and Safe Download */}
      {previewFile && (
        <DocumentPreviewModal
          isOpen={Boolean(previewFile)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileSize={previewFile.size}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
          onDownload={() => {
            downloadFileSafely(previewFile.name, previewFile.url, onShowToast);
          }}
        />
      )}

      {/* Lightbox Media Zoom Modal */}
      <MediaLightboxModal
        previewMedia={previewMediaUrl}
        onClose={closePreviewMedia}
      />

      {/* Shared Media Drawer (Kho Lưu Trữ Phương Tiện 4 Tab) */}
      {activeGroup && (
        <SharedMediaDrawer
          isOpen={isSharedMediaOpen}
          onClose={() => setIsSharedMediaOpen(false)}
          group={activeGroup}
          myEmail={myEmail}
          onSelectImage={(file) => {
            setPreviewMediaUrl({
              url: file.url,
              name: file.name,
            });
          }}
          onUseTextbookForExam={(textbookName) => {
            onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển ${textbookName} vào phân hệ sinh đề thi`);
            onNavigate('generate');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Textbook Picker Modal */}
      {isTextbookModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsTextbookModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-700" />
                Kho Giáo Trình Thư Viện UTH
              </span>
              <button
                type="button"
                onClick={() => setIsTextbookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto space-y-2">
              {availableTextbooks.map((tb) => (
                <div
                  key={tb.id}
                  onClick={() => {
                    setSelectedAttachments((prev) => [
                      ...prev,
                      {
                        type: 'textbook',
                        id: tb.id,
                        name: tb.name,
                        size: tb.size,
                        totalPages: tb.totalPages,
                        authorName: tb.authorName,
                      },
                    ]);
                    setIsTextbookModalOpen(false);
                    onShowToast('info', 'Đã chọn giáo trình', tb.name);
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 cursor-pointer transition-all space-y-0.5"
                >
                  <p className="font-semibold text-slate-900 text-xs truncate">{tb.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {tb.totalPages} trang • {tb.size} • Tác giả: {tb.authorName}
                  </p>
                </div>
              ))}
              {availableTextbooks.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">Chưa có giáo trình nào trong thư viện.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Modal: React.FC<{
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ onClose, title, icon, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

