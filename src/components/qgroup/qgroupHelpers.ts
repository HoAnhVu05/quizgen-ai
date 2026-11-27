import React from 'react';
import { FileText, File as FileIcon } from 'lucide-react';
import type { QGroup, QGroupMessage } from '../../types';

// ─── Legacy Forum Share Parser ──────────────────────────────────────────────
export const parseLegacyForumShare = (text: string) => {
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

export const initials = (name?: string | null) =>
  String(name || 'QG')
    .trim()
    .slice(0, 2)
    .toUpperCase();

export const formatTime = (ts: number): string => {
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

export const getGroupSortTime = (g: QGroup): number => {
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
export const getBlacklistKey = (email: string) =>
  `quizgen_deleted_qgroups_${(email || 'global').toLowerCase()}`;

export const getBlacklist = (email: string): Set<string> => {
  try {
    const saved = localStorage.getItem(getBlacklistKey(email));
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {}
  return new Set();
};

export const addToBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  ids.forEach((id) => id && bl.add(id));
  try {
    localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
  } catch {}
};

export const removeFromBlacklist = (email: string, ...ids: string[]) => {
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

export const isGroupMemberOrOwner = (g: QGroup, email: string): boolean => {
  if (!email || !g) return false;
  const clean = email.trim().toLowerCase();
  const owner = (g.ownerEmail || '').trim().toLowerCase();
  const partner = (g.directPartnerEmail || '').trim().toLowerCase();
  const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
  return owner === clean || partner === clean || members.includes(clean);
};

export const flattenGroups = (arr: unknown[]): QGroup[] => {
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

export const dedupMessages = (msgs: QGroupMessage[]): QGroupMessage[] => {
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

export const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return React.createElement(FileText, { className: 'w-5 h-5 text-blue-600' });
  }
  if (lower.endsWith('.pdf')) {
    return React.createElement(FileText, { className: 'w-5 h-5 text-rose-600' });
  }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    return React.createElement(FileText, { className: 'w-5 h-5 text-emerald-600' });
  }
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
    return React.createElement(FileText, { className: 'w-5 h-5 text-amber-600' });
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) {
    return React.createElement(FileIcon, { className: 'w-5 h-5 text-indigo-600' });
  }
  return React.createElement(FileIcon, { className: 'w-5 h-5 text-slate-600' });
};
