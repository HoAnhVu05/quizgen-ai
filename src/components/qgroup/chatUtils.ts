import type { QGroup } from '../../types';
import { getUserAvatarUrl } from '../../utils/avatarHelper';

// ─── Direct Partner Resolution for Dual-Sided DM Rooms ──────────────────────
export interface ResolvedChatInfo {
  displayName: string;
  displayEmail?: string;
  partnerEmail?: string;
  avatarUrl?: string;
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
    const avt = (group as any).directPartnerAvatarUrl || getUserAvatarUrl(cleanPartnerEmail, name) || undefined;
    return {
      displayName: name,
      displayEmail: cleanPartnerEmail,
      partnerEmail: cleanPartnerEmail,
      avatarUrl: avt,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  // If I am the recipient -> Partner is the owner!
  if (cleanMyEmail !== cleanOwnerEmail && cleanOwnerEmail) {
    const name = group.ownerName || cleanOwnerEmail.split('@')[0];
    const avt = (group as any).ownerAvatarUrl || getUserAvatarUrl(cleanOwnerEmail, name) || undefined;
    return {
      displayName: name,
      displayEmail: cleanOwnerEmail,
      partnerEmail: cleanOwnerEmail,
      avatarUrl: avt,
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
    const avt = (group as any).directPartnerAvatarUrl || (group as any).ownerAvatarUrl || getUserAvatarUrl(otherEmail, name) || undefined;
    return {
      displayName: name,
      displayEmail: otherEmail,
      partnerEmail: otherEmail,
      avatarUrl: avt,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  const fbEmail = group.directPartnerEmail || group.ownerEmail;
  const avt = (group as any).directPartnerAvatarUrl || (group as any).ownerAvatarUrl || getUserAvatarUrl(fbEmail, group.name) || undefined;
  return {
    displayName: group.name,
    displayEmail: fbEmail,
    partnerEmail: fbEmail,
    avatarUrl: avt,
    displayRoleOrMembers: 'Tin nhắn riêng 1-1',
    isDirect: true,
    avatarInitials: (group.name || 'DM').slice(0, 2).toUpperCase(),
  };
}

/**
 * Flatten multi-attachment messages so each image/file acts as an independent message
 * with full Slack actions (reactions, reply, pin, delete) and clean per-item management.
 */
export function flattenGroupMessages(messages: any[]): any[] {
  if (!messages || !Array.isArray(messages)) return [];
  const flattened: any[] = [];
  for (const m of messages) {
    if (!m) continue;
    if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 1 && !m.isRecalled) {
      const hasText = !!(m.text && m.text.trim());
      if (hasText) {
        flattened.push({
          ...m,
          attachments: undefined,
          attachment: undefined,
        });
        m.attachments.forEach((att: any, idx: number) => {
          flattened.push({
            ...m,
            id: `${m.id}-att-${idx}`,
            text: '',
            replyTo: undefined,
            attachment: att,
            attachments: [att],
            reactions: undefined,
            isPinned: false,
          });
        });
      } else {
        m.attachments.forEach((att: any, idx: number) => {
          flattened.push({
            ...m,
            id: idx === 0 ? m.id : `${m.id}-att-${idx}`,
            text: '',
            attachment: att,
            attachments: [att],
            reactions: idx === 0 ? m.reactions : undefined,
            isPinned: idx === 0 ? m.isPinned : false,
          });
        });
      }
    } else {
      flattened.push(m);
    }
  }
  return flattened;
}

/**
 * Deduplicates and merges direct messages between the same pair of participants.
 * Combines all messages from duplicate DM channels into a single room.
 */
export function deduplicateDMsAndChannels(groups: QGroup[]): QGroup[] {
  const result: QGroup[] = [];
  const seenChannels = new Set<string>();
  const dmMap = new Map<string, QGroup>();

  for (const g of groups) {
    if (!g) continue;
    const isDM = Boolean(g.isDirect) || (g.id && g.id.startsWith('dm-')) || Boolean(g.directPartnerEmail);
    if (isDM) {
      const raw = g.members || [g.ownerEmail, g.directPartnerEmail];
      const participants = Array.from(
        new Set(raw.map((m) => String(m).trim().toLowerCase()).filter(Boolean))
      ).sort();
      const p1 = (g.ownerEmail || '').trim().toLowerCase();
      const p2 = (g.directPartnerEmail || '').trim().toLowerCase();
      const keyParts = (p1 && p2) ? [p1, p2].sort() : participants;
      const pairKey = keyParts.join('<->');

      if (pairKey && dmMap.has(pairKey)) {
        const target = dmMap.get(pairKey)!;
        // Merge messages & retain latest info
        const existingIds = new Set((target.messages || []).map((m) => m.id));
        const newMsgs = [...(target.messages || [])];
        for (const m of g.messages || []) {
          if (m.id && !existingIds.has(m.id)) {
            newMsgs.push(m);
            existingIds.add(m.id);
          }
        }
        target.messages = flattenGroupMessages(newMsgs);
        target.updatedAt = Math.max(target.updatedAt || 0, g.updatedAt || 0);
      } else if (pairKey) {
        const clone = { ...g, isDirect: true, messages: flattenGroupMessages(g.messages || []) };
        dmMap.set(pairKey, clone);
        result.push(clone);
      } else {
        result.push({ ...g, messages: flattenGroupMessages(g.messages || []) });
      }
    } else {
      const key = (g.code || g.id || '').trim();
      if (!key || seenChannels.has(key)) continue;
      seenChannels.add(key);
      result.push({ ...g, messages: flattenGroupMessages(g.messages || []) });
    }
  }

  return result;
}

/**
 * Helper to identify Admin / Super Admin / System management accounts that should NEVER
 * be exposed in public teacher colleague suggestions, friend requests, or channel additions.
 */
export function isExcludedAdminAccount(
  email?: string | null,
  fullName?: string | null,
  academicTitle?: string | null,
  role?: string | null
): boolean {
  const e = (email || '').trim().toLowerCase();
  const n = (fullName || '').toLowerCase();
  const t = (academicTitle || '').toLowerCase();
  const r = (role || '').toLowerCase();

  if (
    e === 'quizgen.ai.team@gmail.com' ||
    e === 'admin@uth.edu.vn' ||
    e === 'admin@quizgen.ai' ||
    e.startsWith('admin@') ||
    e.includes('admin')
  ) {
    return true;
  }
  if (r === 'admin' || r === 'super_admin' || r === 'root_admin') return true;
  if (t === 'admin' || t === 'quản trị viên') return true;
  if (n.includes('ban quản trị') || n.includes('quản trị viên') || n.includes('admin')) return true;

  return false;
}

