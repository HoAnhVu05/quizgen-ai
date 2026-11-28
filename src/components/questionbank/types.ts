import { Question, BloomLevel } from '../../types';

export interface SavedExamItem {
  id: string;
  title: string;
  subject: string;
  faculty?: string;
  university?: string;
  durationMinutes: number;
  examCodeCount: number;
  examCodes: string[];
  questionCount: number;
  questions?: Question[];
  createdAt: string;
  format?: string;
}

export interface ExamVariantQuestion {
  id: string;
  question: string;
  bloomLevel: BloomLevel;
  chapter: string;
  explanation: string;
  options: Array<{ id: string; label: string; text: string; isCorrect: boolean }>;
  correctLabel: string;
  hasImage?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  hasFormula?: boolean;
  questionType?: string;
  shortAnswer?: string | number;
  correctAnswerId?: string;
  correctAnswerIds?: string[];
  sectionId?: string;
  passageData?: {
    id: string;
    title: string;
    content: string;
    hasImage?: boolean;
    imageUrl?: string;
    imageCaption?: string;
  };
  statements?: Array<{
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  sectionTitle?: string;
}

export const BLOOM_ORDER: BloomLevel[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'];

export const BLOOM_STYLE: Record<
  BloomLevel,
  { label: string; en: string; bg: string; color: string; border: string; barColor: string }
> = {
  'Nhận biết': {
    label: 'Nhận biết',
    en: 'Remember',
    bg: 'bg-sky-50',
    color: 'text-sky-700',
    border: 'border-sky-200',
    barColor: 'bg-sky-500',
  },
  'Thông hiểu': {
    label: 'Thông hiểu',
    en: 'Understand',
    bg: 'bg-[#e6f4f4]',
    color: 'text-[#008689]',
    border: 'border-[#b2d8d8]',
    barColor: 'bg-[#008689]',
  },
  'Vận dụng': {
    label: 'Vận dụng',
    en: 'Apply',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
    border: 'border-amber-200',
    barColor: 'bg-amber-500',
  },
  'Phân tích': {
    label: 'Phân tích',
    en: 'Analyze',
    bg: 'bg-rose-50',
    color: 'text-rose-700',
    border: 'border-rose-200',
    barColor: 'bg-rose-500',
  },
};

// Deterministic seeded shuffle per exam code so 101, 102, 103, 104 have distinct question & option orders
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
