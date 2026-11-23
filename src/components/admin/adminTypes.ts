export interface MicroserviceStatus {
  name: string;
  port: number;
  role: string;
  technology: string;
  status: 'healthy' | 'checking' | 'down';
  latencyMs?: number;
  details?: string;
}

export interface RealOverviewKPIs {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  adminsCount: number;
  hodCount: number;
  lecturerCount: number;
  totalDocuments: number;
  totalQuestionBank: number;
  totalApprovedExams: number;
  totalAudits: number;
  criticalAlerts: number;
  warningAlerts: number;
  tokenUsagePercent?: number;
  systemUptime?: string;
}

export interface ExamComplianceData {
  institution: string;
  academicYear: string;
  complianceScore: string;
  totalExamsAudited: number;
  totalQuestionsAudited: number;
  bloomDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
  };
  recentApprovals: Array<{
    examId: string;
    courseName: string;
    lecturer: string;
    durationMinutes: number;
    variantsCount: number;
    approvedBy: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PlanItem {
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
  is_popular: boolean;
  is_active: boolean;
  subscriber_count?: number;
}

export interface OrderItem {
  id: string;
  order_code: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  amount_vnd: number;
  payment_method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  qr_url?: string;
  transfer_content?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  paid_at?: string;
  bank_reference?: string;
  created_at: string;
  expires_at: string;
}

export interface PaymentOverviewData {
  kpis: {
    totalRevenueVnd: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    activeSubscribers: number;
  };
  plans: PlanItem[];
  orders: OrderItem[];
}
