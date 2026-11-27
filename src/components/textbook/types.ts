import { TextbookFile, ScreenId, UserSubscriptionInfo, UserProfile } from '../../types';

export interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  subscriptionInfo?: UserSubscriptionInfo | null;
  currentUser?: UserProfile | null;
  initialTab?: 'my' | 'library' | 'qgroup';
  onOpenPricingModal?: () => void;
}

export interface QGroupMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  senderTitle?: string;
  senderAvatarUrl?: string;
  avatarColor?: string;
  text?: string;
  timestamp: string;
  isSystem?: boolean;
  isPinned?: boolean;
  reactions?: Record<string, string[]>;
  attachment?: {
    type: 'textbook' | 'exam' | 'file' | 'image' | 'video' | 'audio';
    id: string;
    name: string;
    subject?: string;
    size?: string;
    fileUrl?: string;
    fileType?: string;
    totalPages?: number;
    questionCount?: number;
    durationMinutes?: number;
    authorName?: string;
  };
}

export interface QGroupPendingRequest {
  id: string;
  email: string;
  name: string;
  title?: string;
  requestedAt: string;
}

export interface QGroup {
  id: string;
  code: string;
  name: string;
  department: string;
  description: string;
  ownerEmail: string;
  ownerName: string;
  joinPolicy: 'open' | 'approval_required' | 'email_only';
  memberCount: number;
  members: string[];
  pendingRequests: QGroupPendingRequest[];
  messages: QGroupMessage[];
  pinnedMessageId?: string;
  isDirect?: boolean;
  directPartnerEmail?: string;
  directPartnerName?: string;
}

export interface QGroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  department: string;
  inviterName: string;
  inviterEmail: string;
  targetEmail: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}
