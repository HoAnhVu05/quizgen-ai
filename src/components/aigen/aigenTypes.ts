import { Question, BloomLevel } from '../../types';

export interface BloomDistribution {
  nhanBiet: number;
  thongHieu: number;
  vanDung: number;
  phanTich: number;
}

export interface GenerationHistoryRecord {
  id: string;
  jobId?: string;
  documentId: string;
  documentName: string;
  chapters: string[];
  bloomDistribution: BloomDistribution;
  totalQuestions: number;
  questions: Question[];
  createdAt: string;
  status: 'success' | 'failed' | 'completed';
}

export interface DocumentItem {
  id: string;
  name: string;
  status: string;
  totalPages: number;
  chaptersCount: number;
  isShared?: boolean;
}

export type GenerationPreset = 'giuaKy' | 'cuoiKy' | 'quiz15p';
