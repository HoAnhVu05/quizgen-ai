/**
 * QuizGen AI - Universal Multi-Part Exam Blueprint & Assessment Types
 * Hỗ trợ đa dạng loại câu hỏi: Trắc nghiệm đơn, Câu hỏi chùm (Reading Passage),
 * Đúng/Sai 4 ý (Bộ GD&ĐT), Nhiều đáp án đúng, Trả lời ngắn, Ghép đôi.
 */

import { BloomLevel, QuestionOption } from './index';

export type QuestionType =
  | 'SINGLE_CHOICE'       // Trắc nghiệm 4 lựa chọn chọn 1 đáp án đúng
  | 'GROUP_PASSAGE'       // Câu hỏi chùm theo Bài đọc / Tình huống thực tế / Ca bệnh
  | 'TRUE_FALSE_GROUP'    // Trắc nghiệm Đúng/Sai 4 ý độc lập (Chuẩn Bộ GD&ĐT 2025)
  | 'MULTIPLE_RESPONSE'   // Trắc nghiệm nhiều phương án đúng (Chọn tất cả ý đúng)
  | 'SHORT_ANSWER'        // Trả lời ngắn / Điền số tính toán
  | 'MATCHING';           // Ghép đôi / Nối cột tương ứng

export interface TrueFalseStatement {
  id: string;
  label: string;          // a, b, c, d
  text: string;           // Nội dung nhận định
  isCorrect: boolean;     // true = Đúng, false = Sai
  explanation?: string;   // Lời giải thích riêng cho ý này
}

export interface PassageData {
  id: string;
  title: string;          // Tiêu đề bài đọc hoặc tình huống (Case study)
  content: string;        // Toàn bộ nội dung văn bản bài đọc
  hasImage?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  audioUrl?: string;      // Tùy chọn file nghe âm thanh (cho môn Ngoại ngữ)
}

export interface MatchingPair {
  id: string;
  leftText: string;
  rightText: string;
}

export interface ExamSection {
  id: string;
  order: number;
  title: string;          // Ví dụ: "PHẦN I: TRẮC NGHIỆM ĐƠN"
  instruction: string;    // Lời dặn dò thí sinh: "Thí sinh trả lời từ câu 1 đến câu 20..."
  questionType: QuestionType;
  scorePerQuestion: number;
  totalQuestions: number;
  questions: any[];       // Danh sách câu hỏi thuộc phần này
  passageData?: PassageData; // Nếu là phần câu hỏi chùm
  bloomDistribution?: Partial<Record<BloomLevel, number>>;
}

export interface ExamBlueprint {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalScore: number;
  sections: ExamSection[];
  createdAt?: string;
}

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  shortDesc: string;
  iconName: string;
  badgeColor: string;
  recommendedSubjects: string[];
}

export const QUESTION_TYPES_CATALOG: QuestionTypeMeta[] = [
  {
    type: 'GROUP_PASSAGE',
    label: 'Câu hỏi chùm theo Bài đọc / Tình huống',
    shortDesc: '1 đoạn văn bản / kịch bản chung, bên dưới là chùm 3 – 5 câu hỏi phân tích.',
    iconName: 'BookOpen',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    recommendedSubjects: ['Tiếng Anh', 'Ngoại ngữ', 'Kinh tế', 'Luật', 'Y Dược', 'Văn học']
  },
  {
    type: 'SINGLE_CHOICE',
    label: 'Trắc nghiệm đơn (4 lựa chọn A, B, C, D)',
    shortDesc: 'Dạng chuẩn mực chọn 1 đáp án đúng duy nhất, hỗ trợ công thức Toán LaTeX và sơ đồ.',
    iconName: 'CheckCircle2',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    recommendedSubjects: ['Tất cả các môn học', 'STEM', 'Kỹ thuật', 'Xã hội']
  },
  {
    type: 'TRUE_FALSE_GROUP',
    label: 'Trắc nghiệm Đúng / Sai 4 ý (Bộ GD&ĐT 2025)',
    shortDesc: '1 đề dẫn kèm 4 nhận định a, b, c, d độc lập để thí sinh đánh giá Đúng hoặc Sai.',
    iconName: 'Scale',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    recommendedSubjects: ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý']
  },
  {
    type: 'MULTIPLE_RESPONSE',
    label: 'Trắc nghiệm nhiều đáp án đúng',
    shortDesc: 'Chọn tất cả các phương án đúng trong các mệnh đề cho trước.',
    iconName: 'CheckSquare',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    recommendedSubjects: ['Y Dược', 'Khoa học Máy tính', 'Luật học', 'Quản trị']
  },
  {
    type: 'SHORT_ANSWER',
    label: 'Trả lời ngắn / Điền số tính toán',
    shortDesc: 'Yêu cầu thí sinh tự tính toán và điền con số hoặc từ ngữ chính xác.',
    iconName: 'Hash',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    recommendedSubjects: ['Toán học', 'Kế toán', 'Vật lý', 'Hóa học']
  },
  {
    type: 'MATCHING',
    label: 'Ghép đôi / Nối cột tương ứng',
    shortDesc: 'Nối các khái niệm hoặc công thức ở Cột A tương ứng với Cột B.',
    iconName: 'GitFork',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    recommendedSubjects: ['Ngoại ngữ', 'Sinh học', 'Lịch sử', 'Công nghệ']
  }
];

export interface ExamTemplatePreset {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  sections: Omit<ExamSection, 'id' | 'questions'>[];
}

export const EXAM_PRESETS: ExamTemplatePreset[] = [
  {
    id: 'preset_gd_dt_2025',
    name: 'Mẫu chuẩn Bộ GD&ĐT 2025 (THPT)',
    description: 'Cấu trúc 3 phần chuẩn khảo thí: Trắc nghiệm đơn + Đúng/Sai 4 ý + Trả lời ngắn.',
    targetAudience: 'Toán, Lý, Hóa, Sinh, Sử, Địa (THPT)',
    sections: [
      {
        order: 1,
        title: 'PHẦN I: CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN',
        instruction: 'Thí sinh trả lời từ câu 1 đến câu 18. Mỗi câu hỏi chỉ chọn một phương án.',
        questionType: 'SINGLE_CHOICE',
        scorePerQuestion: 0.25,
        totalQuestions: 18
      },
      {
        order: 2,
        title: 'PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG / SAI',
        instruction: 'Thí sinh trả lời từ câu 19 đến câu 22. Trong mỗi ý a), b), c), d), thí sinh chọn Đúng hoặc Sai.',
        questionType: 'TRUE_FALSE_GROUP',
        scorePerQuestion: 1.0,
        totalQuestions: 4
      },
      {
        order: 3,
        title: 'PHẦN III: CÂU TRẢ LỜI NGẮN / ĐIỀN SỐ',
        instruction: 'Thí sinh trả lời từ câu 23 đến câu 28. Điền kết quả số học vào ô trống.',
        questionType: 'SHORT_ANSWER',
        scorePerQuestion: 0.25,
        totalQuestions: 6
      }
    ]
  },
  {
    id: 'preset_language_vstep',
    name: 'Mẫu chuẩn Ngoại ngữ / VSTEP / IELTS',
    description: 'Kết hợp trắc nghiệm ngữ pháp và câu hỏi chùm đọc hiểu văn bản dài.',
    targetAudience: 'Tiếng Anh, Ngôn ngữ & Ngoại ngữ',
    sections: [
      {
        order: 1,
        title: 'PART I: VOCABULARY & GRAMMAR IN CONTEXT',
        instruction: 'Choose the best option (A, B, C or D) to complete each sentence.',
        questionType: 'SINGLE_CHOICE',
        scorePerQuestion: 0.25,
        totalQuestions: 15
      },
      {
        order: 2,
        title: 'PART II: READING COMPREHENSION PASSAGE',
        instruction: 'Read the following academic passage and answer the questions that follow.',
        questionType: 'GROUP_PASSAGE',
        scorePerQuestion: 0.5,
        totalQuestions: 10
      }
    ]
  },
  {
    id: 'preset_university_mcq',
    name: 'Mẫu Đề thi Đại học & Chuyên ngành',
    description: '100% Trắc nghiệm 4 lựa chọn bao quát các mức độ Bloom.',
    targetAudience: 'Mọi môn học bậc Đại học & Cao đẳng',
    sections: [
      {
        order: 1,
        title: 'PHẦN THI TRẮC NGHIỆM ĐÁNH GIÁ CHUẨN ĐẦU RA',
        instruction: 'Thí sinh làm bài trong 60 phút. Chọn phương án chính xác nhất cho mỗi câu hỏi.',
        questionType: 'SINGLE_CHOICE',
        scorePerQuestion: 0.25,
        totalQuestions: 40
      }
    ]
  }
];
