export type ScreenId = 'dashboard' | 'upload' | 'generate' | 'review' | 'bank' | 'admin_portal';
export type AuthScreenId = 'login' | 'register' | 'profile_setup';

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
  profileCompleted?: boolean;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  status?: 'active' | 'locked';
  twoFactorVerified?: boolean;
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
