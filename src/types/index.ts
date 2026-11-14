export type ScreenId = 'dashboard' | 'upload' | 'generate' | 'review' | 'bank' | 'admin_portal';
export type AuthScreenId = 'login' | 'register';

export type UserRole = 'lecturer' | 'head_of_department' | 'admin';

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  ipAddress: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  academicTitle?: string;
  department?: string;
  faculty?: string;
  university?: string;
  role: UserRole;
  roleLabel?: string;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  status?: 'active' | 'locked';
  lockType?: 'temporary' | 'permanent';
  lockReason?: string;
  lockedUntil?: string;
  lockedAt?: string;
  twoFactorVerified?: boolean;
  planTier?: 'FREE' | 'PRO_MONTH' | 'PRO_YEAR' | 'ENTERPRISE' | string;
  planExpiresAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  price_vnd: number;
  duration_days: number;
  max_documents: number;
  max_questions_month: number;
  max_exams_month: number;
  allow_qti_export: boolean;
  allow_full_bloom: boolean;
  features: string[];
  is_popular?: boolean;
}

export interface UserSubscriptionInfo {
  user_id: string;
  plan_code: string;
  plan_name: string;
  status: string;
  is_free: boolean;
  starts_at?: string;
  expires_at?: string;
  quotas: {
    max_documents: number;
    documents_used: number;
    max_questions_month: number;
    questions_used_month: number;
    max_exams_month: number;
    exams_used_month: number;
    allow_qti_export: boolean;
    allow_full_bloom: boolean;
  };
}

export interface OrderData {
  order_id: string;
  order_code: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  amount_vnd: number;
  transfer_content: string;
  bank_info: {
    bank_name: string;
    account_no: string;
    account_name: string;
  };
  qr_url: string;
  countdown_seconds: number;
  expires_at: string;
}

export type BloomLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Phân tích';
export type QuestionStatus =
  | 'pending'
  | 'submitted_to_hod'
  | 'approved'
  | 'rejected'
  | 'locked_for_exam';

export interface SourceChunk {
  id: string;
  pageNumber: number;
  chapter: string;
  textSnippet: string;
  relevanceScore: number;
}

export interface QuestionOption {
  id: string;
  label: string; // A, B, C, D
  text: string;
}

export interface Question {
  id: string;
  sourceChunkId: string;
  textbookName: string;
  chapter: string;
  bloomLevel: BloomLevel;
  question: string;
  options: QuestionOption[];
  correctAnswerId: string;
  explanation: string;
  confidenceScore: number;
  status: QuestionStatus;
  createdAt: string;
  hodFeedback?: string;
  examCodes?: string[];
  hasFormula?: boolean;
  hasImage?: boolean;
  imageUrl?: string;
  imageCaption?: string;
}

export interface TextbookFile {
  id: string;
  name: string;
  size: string;
  totalPages: number;
  chaptersCount: number;
  status: 'uploading' | 'extracting' | 'embedding' | 'ready' | 'error';
  progress: number;
  uploadedAt: string;
  chunksPreview?: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface ExamExportConfig {
  universityName: string;
  facultyName: string;
  subjectName: string;
  examTitle: string;
  durationMinutes: number;
  examCodeCount: number; // e.g. 4 mã đề (101, 102, 103, 104)
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  includeAnswerKey: boolean;
  includeExplanation: boolean;
  includeOmrSheet?: boolean;
  baseExamCode?: number;
  format: 'docx' | 'pdf' | 'qti' | 'zip';
}
