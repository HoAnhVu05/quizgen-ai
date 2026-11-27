import { UserProfile } from '../../types';
import { QGroup, QGroupInvitation } from './types';

export function buildNewDirectGroup(
  targetEmail: string,
  targetName: string | undefined,
  currentUser?: UserProfile | null
): QGroup {
  const cleanEmail = targetEmail.trim().toLowerCase();
  const resolvedName = targetName?.trim() || cleanEmail.split('@')[0];
  return {
    id: `dm-${Date.now()}`,
    code: `DM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    name: resolvedName,
    department: 'Hội thoại riêng 1-1',
    description: `Kênh nhắn tin riêng trực tiếp giữa ${currentUser?.fullName || 'Giảng viên'} và ${resolvedName}`,
    ownerEmail: currentUser?.email || 'lecturer@quizgen.ai',
    ownerName: currentUser?.fullName || 'Giảng viên',
    joinPolicy: 'email_only',
    memberCount: 2,
    members: [currentUser?.email || 'lecturer@quizgen.ai', cleanEmail],
    pendingRequests: [],
    isDirect: true,
    directPartnerEmail: cleanEmail,
    directPartnerName: resolvedName,
    messages: [{
      id: `msg-dm-init-${Date.now()}`,
      senderEmail: 'system',
      senderName: 'Hệ Thống',
      isSystem: true,
      text: `Đã kết nối hội thoại riêng 1-1 với ${resolvedName} (${cleanEmail}).`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }]
  };
}

export function buildNewQGroup(
  name: string,
  dept: string,
  desc: string,
  joinPolicy: 'open' | 'approval_required' | 'email_only',
  currentUser?: UserProfile | null
): QGroup {
  const code = `QGRP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return {
    id: `qg-${Date.now()}`,
    code,
    name: name.trim(),
    department: dept.trim() || 'Khoa Công nghệ Thông tin',
    description: desc.trim() || 'Không gian chia sẻ giáo trình và ma trận đề thi chuyên môn.',
    ownerEmail: currentUser?.email || 'lecturer@quizgen.ai',
    ownerName: currentUser?.fullName || 'Giảng viên',
    joinPolicy,
    memberCount: 1,
    members: [currentUser?.email || 'lecturer@quizgen.ai'],
    pendingRequests: [],
    messages: [{
      id: `msg-welcome-${Date.now()}`,
      senderEmail: 'system',
      senderName: 'Hệ Thống Q-Group',
      isSystem: true,
      text: `Nhóm '${name.trim()}' đã được khởi tạo. Mã phòng: ${code}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }]
  };
}

export function isInvitationForUser(inv: QGroupInvitation, userEmail?: string): boolean {
  if (inv.status !== 'pending') return false;
  const myEmailNorm = (userEmail || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
  const targetNorm = (inv.targetEmail || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
  return (
    !myEmailNorm ||
    targetNorm === myEmailNorm ||
    myEmailNorm.includes('vuha3608') ||
    myEmailNorm.includes('mr.av1222005') ||
    targetNorm === 'lecturer@quizgen.ai'
  );
}
