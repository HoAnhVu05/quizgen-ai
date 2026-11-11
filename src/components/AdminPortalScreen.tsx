import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  KeyRound,
  RefreshCw,
  Trash2,
  UserCheck,
  Database,
  Eye
} from 'lucide-react';
import { UserProfile, SecurityAuditLog, ScreenId } from '../types';

interface AdminPortalScreenProps {
  currentUser: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
}

const DEFAULT_SYSTEM_ACCOUNTS: UserProfile[] = [
  {
    id: 'admin-uth-001',
    fullName: 'Quản trị viên Hệ thống UTH',
    email: 'admin@ut.edu.vn',
    academicTitle: 'ThS.',
    department: 'Trung tâm Quản trị Hệ thống & An ninh mạng',
    faculty: 'Trung tâm Quản trị Hệ thống & An ninh mạng',
    university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
    role: 'admin',
    roleLabel: 'Quản trị Hệ thống',
    status: 'active',
  },
  {
    id: 'lec-001',
    fullName: 'Nguyễn Văn Hùng',
    email: 'lecturer@vnu.edu.vn',
    academicTitle: 'TS.',
    department: 'Khoa Kinh tế & Quản trị',
    faculty: 'Khoa Kinh tế & Quản trị',
    university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
    role: 'lecturer',
    roleLabel: 'Giảng viên',
    status: 'active',
  },
];

const DEFAULT_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'audit-init-1',
    timestamp: '11/11/2026 08:30:12',
    actorEmail: 'admin@ut.edu.vn',
    action: 'SYSTEM_STARTUP_CHECK',
    detail: 'Khởi động cụm 8 Microservices & kiểm tra kết nối Vector DB Qdrant: 100% Healthy.',
    severity: 'info',
    ipAddress: '10.0.14.22 (Internal Gateway)',
  },
  {
    id: 'audit-init-2',
    timestamp: '11/11/2026 09:15:44',
    actorEmail: 'lecturer@vnu.edu.vn',
    action: 'RAG_DOCUMENT_INDEXED',
    detail: 'Đã băm nhỏ và lập chỉ mục Vector cho giáo trình GiaoTrinh_KinhTeViMo_2025.pdf (42 chunks).',
    severity: 'info',
    ipAddress: '172.16.8.105',
  },
];

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({
  currentUser,
  onNavigate,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'infrastructure' | 'security'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // 2FA PIN Config State
  const [currentPin, setCurrentPin] = useState(
    () => localStorage.getItem('quizgen_admin_2fa_pin') || '246810'
  );
  const [newPinDraft, setNewPinDraft] = useState('');

  const loadUsersAndLogs = () => {
    try {
      const registered: UserProfile[] = JSON.parse(
        localStorage.getItem('quizgen_registered_users') || '[]'
      );
      const mergedMap = new Map<string, UserProfile>();
      DEFAULT_SYSTEM_ACCOUNTS.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));
      registered.forEach((u) => {
        if (u && u.email) {
          mergedMap.set(u.email.toLowerCase(), {
            ...u,
            status: u.status || 'active',
          });
        }
      });
      setUsersList(Array.from(mergedMap.values()));
    } catch {
      setUsersList(DEFAULT_SYSTEM_ACCOUNTS);
    }

    try {
      const savedLogs: SecurityAuditLog[] = JSON.parse(
        localStorage.getItem('quizgen_security_audit_logs') || '[]'
      );
      setAuditLogs([...savedLogs, ...DEFAULT_AUDIT_LOGS]);
    } catch {
      setAuditLogs(DEFAULT_AUDIT_LOGS);
    }
  };

  useEffect(() => {
    loadUsersAndLogs();
  }, []);

  const persistUserUpdate = (updatedUser: UserProfile, actionLabel: string) => {
    const nextList = usersList.map((u) =>
      u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
    );
    setUsersList(nextList);

    try {
      const registered: Array<UserProfile & { password?: string }> = JSON.parse(
        localStorage.getItem('quizgen_registered_users') || '[]'
      );
      const existsIdx = registered.findIndex(
        (u) => u.email.toLowerCase() === updatedUser.email.toLowerCase()
      );
      if (existsIdx >= 0) {
        registered[existsIdx] = { ...registered[existsIdx], ...updatedUser };
      } else {
        registered.push(updatedUser);
      }
      localStorage.setItem('quizgen_registered_users', JSON.stringify(registered));

      const logs: SecurityAuditLog[] = JSON.parse(
        localStorage.getItem('quizgen_security_audit_logs') || '[]'
      );
      const newEntry: SecurityAuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toLocaleString('vi-VN'),
        actorEmail: currentUser?.email || 'admin@ut.edu.vn',
        action: 'ADMIN_USER_PERMISSION_UPDATE',
        detail: `${actionLabel} cho tài khoản ${updatedUser.email}`,
        severity: updatedUser.status === 'locked' ? 'warning' : 'info',
        ipAddress: '127.0.0.1 (Admin Console)',
      };
      logs.unshift(newEntry);
      localStorage.setItem('quizgen_security_audit_logs', JSON.stringify(logs.slice(0, 100)));
      setAuditLogs([newEntry, ...auditLogs]);
    } catch {}
  };

  const handleToggleLockUser = (target: UserProfile) => {
    if (target.email.toLowerCase() === 'admin@ut.edu.vn') {
      onShowToast(
        'warning',
        'Không thể khóa Super Admin',
        'Tài khoản Quản trị viên gốc (admin@ut.edu.vn) được bảo vệ cấp hệ thống.'
      );
      return;
    }
    const nextStatus = target.status === 'locked' ? 'active' : 'locked';
    const updated: UserProfile = { ...target, status: nextStatus };
    persistUserUpdate(
      updated,
      nextStatus === 'locked' ? 'Khóa tạm thời tài khoản' : 'Mở khóa tài khoản'
    );
    onShowToast(
      nextStatus === 'locked' ? 'warning' : 'success',
      nextStatus === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
      `Tài khoản ${target.email} hiện ở trạng thái: ${
        nextStatus === 'locked' ? 'Tạm khóa' : 'Hoạt động'
      }.`
    );
  };

  const handleToggleAdminRole = (target: UserProfile) => {
    if (target.email.toLowerCase() === 'admin@ut.edu.vn') return;
    const nextRole = target.role === 'admin' ? 'lecturer' : 'admin';
    const updated: UserProfile = {
      ...target,
      role: nextRole,
      roleLabel: nextRole === 'admin' ? 'Quản trị Hệ thống' : 'Giảng viên',
    };
    persistUserUpdate(
      updated,
      nextRole === 'admin'
        ? 'Nâng quyền lên Quản trị viên Hệ thống (yêu cầu 2FA khi đăng nhập)'
        : 'Chuyển quyền về Giảng viên'
    );
    onShowToast(
      'info',
      'Đã cập nhật phân quyền',
      `Tài khoản ${target.fullName} (${target.email}) đã chuyển sang quyền: ${updated.roleLabel}.`
    );
  };

  const handleUpdate2FAPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPinDraft.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      onShowToast('warning', 'Mã PIN không hợp lệ', 'Mã khóa bảo mật 2FA phải gồm đúng 6 chữ số.');
      return;
    }
    localStorage.setItem('quizgen_admin_2fa_pin', cleaned);
    setCurrentPin(cleaned);
    setNewPinDraft('');
    onShowToast(
      'success',
      'Đã đổi Mã Bảo Mật 2FA Admin',
      `Mã PIN xác thực cấp 2 mới (${cleaned}) đã có hiệu lực cho lần đăng nhập tiếp theo.`
    );
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalAlertsCount = auditLogs.filter((l) => l.severity === 'critical').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f7f9fb]">
      {/* Top Admin Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#da1c2d] bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cổng Quản Trị Hệ Thống & Bảo Mật 2FA (System Admin Portal)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 pt-1">
            Trung tâm Quản trị Tài khoản, Hạ tầng AI & Nhật ký An ninh
          </h2>
          <p className="text-sm text-slate-500 max-w-2xl">
            Quản lý danh sách tài khoản Giảng viên, cấu hình khóa bảo mật 2 lớp (2FA PIN), giám sát cụm 8 Microservices và kiểm toán truy cập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
          >
            <Eye className="w-4 h-4 text-[#008689]" />
            Xem thử Giao diện Làm đề của Giảng viên
          </button>
          <button
            onClick={loadUsersAndLogs}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#008689] hover:bg-[#006d70] text-white font-semibold text-xs rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* 4 Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Tổng Tài khoản Hệ thống
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#e6f4f4] text-[#008689] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-800">{usersList.length}</span>
            <p className="text-xs text-slate-400 mt-1">
              {usersList.filter((u) => u.role === 'lecturer').length} Giảng viên ·{' '}
              {usersList.filter((u) => u.role === 'admin').length} Quản trị viên
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Khiên Bảo mật Admin 2FA
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-800">Đang bật</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                PIN: {currentPin}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Khóa tự động 60s nếu sai quá 3 lần</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Cụm 8 Microservices & AI
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">100% Healthy</span>
            <p className="text-xs text-slate-400 mt-1">Quota Gemini 2.5: 84,500 tokens</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Cảnh báo An ninh (Audit)
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                criticalAlertsCount > 0
                  ? 'bg-rose-50 text-[#da1c2d]'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-800">{auditLogs.length} bản ghi</span>
            <p className="text-xs text-slate-400 mt-1">
              {criticalAlertsCount > 0
                ? `${criticalAlertsCount} cảnh báo xâm nhập 2FA bị chặn`
                : '0 cảnh báo xâm nhập trái phép'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs inside Admin Portal */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center gap-2">
        {[
          {
            id: 'users',
            label: `1. Quản lý Tài khoản Giảng viên (${usersList.length})`,
            icon: Users,
          },
          {
            id: 'security',
            label: `2. Nhật ký An ninh & Cấu hình Khóa 2FA (${auditLogs.length})`,
            icon: ShieldCheck,
          },
          {
            id: 'infrastructure',
            label: '3. Giám sát Hạ tầng AI & 8 Microservices',
            icon: Cpu,
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#008689] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 px-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh sách Tài khoản Giảng viên & Quản trị viên
              </h3>
              <p className="text-xs text-slate-500">
                Mọi tài khoản Giảng viên tự đăng ký bên ngoài đều hiển thị tại đây. Admin có thể khóa/mở khóa hoặc phân quyền.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, email, khoa..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#008689]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                  <th className="py-3 px-5">Họ và Tên / Học vị</th>
                  <th className="py-3 px-4">Email đăng nhập</th>
                  <th className="py-3 px-4">Khoa / Đơn vị</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-5 text-right">Thao tác Quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const isSuperAdmin = u.email.toLowerCase() === 'admin@ut.edu.vn';
                  const isLocked = u.status === 'locked';
                  return (
                    <tr key={u.email} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {u.academicTitle ? `${u.academicTitle} ` : ''}
                        {u.fullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.department || u.faculty || 'Khoa Công nghệ Thông tin'}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#da1c2d] border border-rose-200">
                            <ShieldCheck className="w-3 h-3" />
                            Quản trị Hệ thống (2FA)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4f4] text-[#008689] border border-[#008689]/25">
                            <UserCheck className="w-3 h-3" />
                            Giảng viên
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Lock className="w-3 h-3" />
                            Đang khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        {!isSuperAdmin ? (
                          <>
                            <button
                              onClick={() => handleToggleAdminRole(u)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                            >
                              {u.role === 'admin' ? 'Hạ về Giảng viên' : 'Cấp quyền Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleLockUser(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                isLocked
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-rose-50 text-[#da1c2d] border border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Mở khóa</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Khóa TK</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">
                            Tài khoản Gốc (Protected)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY AUDIT LOGS & 2FA PIN CONFIG */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 2FA PIN Configuration Card */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-[#da1c2d] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Cấu hình Mã Khóa Bảo Mật 2FA
                </h3>
                <p className="text-[11px] text-slate-500">
                  Lớp bảo vệ thứ 2 khi đăng nhập tài khoản Admin
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mã PIN 2FA hiện tại:</span>
                <code className="font-mono font-bold text-sm text-[#008689] bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  {currentPin}
                </code>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Khi bất kỳ ai đăng nhập bằng email Admin, hệ thống buộc phải nhập đúng 6 số này ở Bước 2. Nhập sai 3 lần sẽ bị khóa 60 giây.
              </p>
            </div>

            <form onSubmit={handleUpdate2FAPin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đặt Mã PIN 2FA mới (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newPinDraft}
                  onChange={(e) => setNewPinDraft(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 6 chữ số mới (VD: 246810)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:border-[#008689]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#008689] hover:bg-[#006d70] text-white font-bold text-xs transition-colors"
              >
                Cập nhật Mã Bảo Mật 2FA
              </button>
            </form>
          </div>

          {/* Right: Security Audit Logs Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nhật ký Kiểm toán & Cảnh báo Xâm nhập (Audit Logs)
                </h3>
                <p className="text-xs text-slate-500">
                  Ghi nhận tự động mọi lượt đăng nhập, xác thực 2FA và thay đổi phân quyền
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('quizgen_security_audit_logs');
                  setAuditLogs(DEFAULT_AUDIT_LOGS);
                  onShowToast('info', 'Đã làm sạch nhật ký tạm', 'Đã xóa các bản ghi log phát sinh.');
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa log tạm
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 flex items-start justify-between gap-4 text-xs ${
                    log.severity === 'critical'
                      ? 'bg-rose-50/70'
                      : log.severity === 'warning'
                      ? 'bg-amber-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          log.severity === 'critical'
                            ? 'bg-[#da1c2d] text-white'
                            : log.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {log.actorEmail}
                      </span>
                      <span className="text-slate-400">• {log.ipAddress}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{log.detail}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI & MICROSERVICES INFRASTRUCTURE */}
      {activeTab === 'infrastructure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: '1. API Gateway (:8000)',
              desc: 'Điều phối định tuyến & CORS Proxy',
              latency: '12ms',
              status: 'Healthy',
            },
            {
              name: '2. Auth & 2FA Service (:8001)',
              desc: 'Xác thực JWT, Google OAuth & Khiên 2FA',
              latency: '18ms',
              status: 'Healthy',
            },
            {
              name: '3. Document Parser (:8002)',
              desc: 'Bóc tách PDF/DOCX & chia chương mục',
              latency: '45ms',
              status: 'Healthy',
            },
            {
              name: '4. RAG Vector Service (:8003)',
              desc: 'Qdrant Vector Embedding & Semantic Search',
              latency: '34ms',
              status: 'Healthy',
            },
            {
              name: '5. AI Question Generator (:8004)',
              desc: 'Gemini 2.5 Flash + Ma trận nhận thức Bloom',
              latency: '420ms',
              status: 'Healthy',
            },
            {
              name: '6. Academic Review Service (:8005)',
              desc: 'Đối soát trích dẫn trang sách gốc (Grounding)',
              latency: '22ms',
              status: 'Healthy',
            },
            {
              name: '7. Exam Shuffler (:8006)',
              desc: 'Thuật toán hoán vị Fisher-Yates 4 mã đề',
              latency: '9ms',
              status: 'Healthy',
            },
            {
              name: '8. OMR & QTI Exporter (:8007)',
              desc: 'Kết xuất Word, PDF + Phiếu OMR 50 câu & QTI 2.1',
              latency: '64ms',
              status: 'Healthy',
            },
          ].map((svc, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Database className="w-4 h-4 text-[#008689]" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {svc.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">{svc.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1">{svc.desc}</p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Độ trễ trung bình</span>
                <span className="font-mono font-semibold text-slate-700">{svc.latency}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
