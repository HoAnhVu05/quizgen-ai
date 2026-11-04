export type ScreenId = 'dashboard' | 'upload' | 'generate' | 'review' | 'bank';
export type AuthScreenId = 'login' | 'register';

export type UserRole = 'lecturer' | 'head_of_department' | 'admin';

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
}

export type BloomLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Phân tích';
export type QuestionStatus = 'pending' | 'approved' | 'rejected';

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
  format: 'docx' | 'pdf' | 'qti';
}
