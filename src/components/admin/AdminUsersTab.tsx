import React, { useState } from 'react';
import {
  Crown,
  Eye,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { formatVietnameseDateTime } from '../../utils/dateUtils';
import { AdminGrantPlanModal, GrantPlanPayload } from './AdminGrantPlanModal';
import apiClient from '../../services/apiClient';
import { openUserProfile } from '../../utils/userProfileModalHelper';

export interface AdminUsersTabProps {
  usersList: UserProfile[];
  currentUser: UserProfile | null;
  isCurrentRootAdmin: boolean;
  isLoadingUserDetails?: boolean;
  setShowAddUserModal: (show: boolean) => void;
  handleOpenLockModal: (user: UserProfile) => void;
  handleUnlockUser: (user: UserProfile) => void;
  handleChangeRole: (user: UserProfile, newRole: UserRole) => void;
  handleDeleteUser: (user: UserProfile) => void;
  handleResetPassword: (user: UserProfile) => void;
  handleViewUserDetails: (user: UserProfile) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  usersList,
  currentUser,
  isCurrentRootAdmin,
  isLoadingUserDetails = false,
  setShowAddUserModal,
  handleOpenLockModal,
  handleUnlockUser,
  handleChangeRole,
  handleDeleteUser,
  handleResetPassword,
  handleViewUserDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'lecturer' | 'head_of_department'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [grantPlanUser, setGrantPlanUser] = useState<UserProfile | null>(null);

  const handleGrantPlanSubmit = async (payload: GrantPlanPayload) => {
    try {
      const res = await apiClient.post(`/admin/users/${payload.userId}/grant-plan`, {
        plan_tier: payload.planTier,
        duration_days: payload.durationDays,
        custom_quota_exams: payload.customQuotaExams,
        custom_quota_storage_mb: payload.customQuotaStorageMb,
        reason: payload.reason,
        actor_email: currentUser?.email || 'quizgen.ai.team@gmail.com',
      });
      const target = usersList.find((u) => u.id === payload.userId || u.email === payload.userEmail);
      if (target) {
        target.planTier = payload.planTier;
      }
      setGrantPlanUser(null);
      alert(`Đã cấp thành công gói ${payload.planTier.toUpperCase()} và đồng bộ đặc quyền sang CSDL hệ thống!`);
    } catch (err: any) {
      alert(`Lỗi cấp gói: ${err?.message || 'Không thể kết nối đến máy chủ.'}`);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
        <div className="space-y-4">
          {/* Users Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#008689]" />
                <span>Quản Lý Tài Khoản &amp; Phân Quyền Giảng Viên (auth.db)</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Giám sát {usersList.length} tài khoản thực tế; phân quyền vai trò RBAC (Admin, Trưởng bộ môn, Giảng viên), thực thi khóa tài khoản có hẹn giờ và kiểm tra chi tiết 360° hoạt động.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#da1c2d] hover:bg-[#b81725] text-white font-bold text-xs rounded-xl transition-all shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm Tài Khoản Mới</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo email, họ tên, khoa môn..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#008689] focus:bg-white transition-all"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#008689]"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                <option value="lecturer">Giảng viên (Lecturer)</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#008689]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Bị khóa (Tạm khóa / Vĩnh viễn)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#da1c2d] hover:bg-[#b81725] text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Tài Khoản Mới</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Người Dùng &amp; Email</th>
                    <th className="py-3 px-4">Đơn Vị &amp; Học Hàm</th>
                    <th className="py-3 px-4">Phân Quyền (RBAC)</th>
                    <th className="py-3 px-4">Gói Dịch Vụ</th>
                    <th className="py-3 px-4">Trạng Thái Truy Cập</th>
                    <th className="py-3 px-4 text-right">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuperAdmin = u.email.toLowerCase() === 'quizgen.ai.team@gmail.com';
                      const isLocked = u.status === 'locked';

                      return (
                        <tr key={u.id || u.email} className={`transition-colors ${isLocked ? 'bg-rose-50/30' : 'hover:bg-slate-50/70'}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                onClick={() => openUserProfile(u.email, u.fullName)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer hover:scale-105 transition-all shadow-2xs ${
                                  u.role === 'admin'
                                    ? 'bg-rose-50 text-[#da1c2d] border border-rose-200'
                                    : u.role === 'head_of_department'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-teal-50 text-[#008689] border border-teal-200'
                                }`}
                                title="Bấm để xem hồ sơ cá nhân"
                              >
                                {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : 'ND'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openUserProfile(u.email, u.fullName)}
                                    className="hover:text-[#008689] hover:underline cursor-pointer text-left transition-colors"
                                    title="Xem hồ sơ cá nhân"
                                  >
                                    {u.fullName}
                                  </button>
                                  {isSuperAdmin && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-[#da1c2d] font-semibold border border-rose-200">
                                      Super Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">
                              {u.academicTitle ? `${u.academicTitle} ` : ''}
                              {u.department || 'Khoa Công nghệ Thông tin'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {u.university || 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-[#da1c2d] border border-rose-200">
                                Super Admin Gốc
                              </span>
                            ) : u.role === 'admin' && !isCurrentRootAdmin ? (
                              <div className="flex items-center gap-1.5" title="Chỉ Quản trị viên chính gốc mới có quyền thay đổi vai trò của Admin này">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-[#da1c2d] border border-rose-200">
                                  Quản trị viên (Được cấp)
                                </span>
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                                className={`text-[11px] font-bold rounded-lg px-2 py-1 outline-none border transition-colors cursor-pointer ${
                                  u.role === 'admin'
                                    ? 'bg-rose-50 text-[#da1c2d] border-rose-200'
                                    : u.role === 'head_of_department'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-teal-50 text-[#008689] border-teal-200'
                                }`}
                              >
                                <option value="lecturer">Giảng viên (Lecturer)</option>
                                <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                                {isCurrentRootAdmin ? (
                                  <option value="admin">Quản trị viên (Admin)</option>
                                ) : (
                                  <option value="admin" disabled className="text-slate-400">
                                    Quản trị viên (Chỉ Admin gốc cấp)
                                  </option>
                                )}
                              </select>
                            )}
                          </td>

                          {/* Gói Dịch Vụ */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setGrantPlanUser(u)}
                              title="Bấm để cấp gói dịch vụ hoặc chỉnh sửa quota"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                                (u.planTier || '').toUpperCase() === 'ENTERPRISE'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : (u.planTier || '').toUpperCase() === 'PRO_YEAR'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                  : (u.planTier || '').toUpperCase() === 'PRO_MONTH' || (u.planTier || '').toUpperCase() === 'PRO'
                                  ? 'bg-teal-50 text-[#008689] border-teal-300'
                                  : (u.planTier || '').toUpperCase() === 'STANDARD'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              <span>{(u.planTier || 'FREE').toUpperCase()}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            {isLocked ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#da1c2d] border border-rose-200">
                                  <Lock className="w-3 h-3 text-[#da1c2d]" />
                                  <span>{u.lockType === 'temporary' ? 'Tạm khóa' : 'Khóa vĩnh viễn'}</span>
                                </span>
                                {u.lockReason && (
                                  <p className="text-[10px] text-slate-500 max-w-xs truncate" title={u.lockReason}>
                                    Lý do: {u.lockReason}
                                  </p>
                                )}
                                {u.lockedUntil && (
                                  <p className="text-[10px] text-amber-700 font-mono">
                                    Mở khóa: {formatVietnameseDateTime(u.lockedUntil)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Hoạt động
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View 360 User Activity Eye Button (Nút Con Mắt) */}
                              <button
                                onClick={() => handleViewUserDetails(u)}
                                disabled={isLoadingUserDetails}
                                title="Xem toàn bộ hồ sơ, tài liệu đã tải, lịch sử tạo câu hỏi, in đề, đăng nhập"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-[#008689] border border-teal-200 transition-colors shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#008689]" />
                                <span>Chi tiết</span>
                              </button>

                              {/* Grant Plan Button */}
                              <button
                                onClick={() => setGrantPlanUser(u)}
                                title="Cấp gói dịch vụ & Tùy biến quota"
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Pass */}
                              <button
                                onClick={() => handleResetPassword(u)}
                                title="Đặt lại mật khẩu thành Academic@2026"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Lock / Unlock Actions */}
                              {!isSuperAdmin && (
                                <>
                                  {isLocked ? (
                                    <button
                                      onClick={() => handleUnlockUser(u)}
                                      title="Mở khóa tài khoản ngay lập tức"
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                    >
                                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Mở khóa</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenLockModal(u)}
                                      title="Khóa tài khoản (Tạm khóa hoặc Vĩnh viễn)"
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-[#da1c2d] border border-rose-200 transition-colors"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-[#da1c2d]" />
                                      <span>Khóa</span>
                                    </button>
                                  )}

                                  {/* Delete user */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    title="Xóa tài khoản vĩnh viễn"
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#da1c2d] text-slate-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {grantPlanUser && (
            <AdminGrantPlanModal
              user={grantPlanUser}
              isOpen={!!grantPlanUser}
              onClose={() => setGrantPlanUser(null)}
              onGrantPlan={handleGrantPlanSubmit}
            />
          )}
        </div>

  );
};
