import type { QGroup } from '../../types';

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
        target.messages = newMsgs;
        target.updatedAt = Math.max(target.updatedAt || 0, g.updatedAt || 0);
      } else if (pairKey) {
        const clone = { ...g, isDirect: true, messages: [...(g.messages || [])] };
        dmMap.set(pairKey, clone);
        result.push(clone);
      } else {
        result.push(g);
      }
    } else {
      const key = (g.code || g.id || '').trim();
      if (!key || seenChannels.has(key)) continue;
      seenChannels.add(key);
      result.push(g);
    }
  }

  return result;
}
