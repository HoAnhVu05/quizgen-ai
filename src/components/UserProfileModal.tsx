import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Key,
  RotateCw,
  Save,
  Check,
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updates: {
    fullName: string;
    academicTitle: string;
    department?: string;
    faculty?: string;
    university?: string;
  }) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
}

const ACADEMIC_TITLES = [
  { value: '', label: 'Không có' },
  { value: 'CN.', label: 'CN. (Cử nhân)' },
  { value: 'KS.', label: 'KS. (Kỹ sư)' },
  { value: 'ThS.', label: 'ThS. (Thạc sĩ)' },
  { value: 'TS.', label: 'TS. (Tiến sĩ)' },
  { value: 'PGS. TS.', label: 'PGS. TS. (Phó Giáo sư)' },
  { value: 'GS. TS.', label: 'GS. TS. (Giáo sư)' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'security'>('profile');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftFaculty, setDraftFaculty] = useState('');
  const [draftDept, setDraftDept] = useState('');
  const [draftUniversity, setDraftUniversity] = useState('');
  const [primarySubject, setPrimarySubject] = useState('Trí tuệ nhân tạo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDraftTitle(currentUser.academicTitle || '');
      setDraftName(currentUser.fullName || '');
      setDraftFaculty(currentUser.faculty || currentUser.department || 'Khoa Công nghệ thông tin');
      setDraftDept(currentUser.department || 'Bộ môn Khoa học máy tính');
      setDraftUniversity(currentUser.university || 'Trường Đại học Giao thông vận tải TP.HCM (UTH)');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleReverseName = () => {
    const parts = draftName.trim().split(/\s+/);
    if (parts.length > 1) {
      setDraftName(parts.reverse().join(' '));
      onShowToast('info', 'Đã đảo thứ tự Tên', 'Đã hoán đổi vị trí Họ và Tên phù hợp với format Việt Nam.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) {
      onShowToast('warning', 'Thiếu thông tin', 'Họ và tên giảng viên không được để trống.');
      return;
    }

    setIsSubmitting(true);
    try {
      onUpdateProfile({
        fullName: draftName.trim(),
        academicTitle: draftTitle.trim(),
        department: draftDept.trim(),
        faculty: draftFaculty.trim(),
        university: draftUniversity.trim(),
      });
      onShowToast(
        'success',
        'Cập nhật thành công',
        'Hồ sơ Giảng viên và thông tin học thuật đã được lưu an toàn.'
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = draftName
    ? draftName
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'GV';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header with UTH Teal Theme */}
        <div className="relative bg-gradient-to-r from-[#008689] via-[#007073] to-[#005a5c] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white text-[#008689] font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/30">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-[10px] text-white">
                ✓
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white truncate">
                  {draftTitle ? `${draftTitle} ` : ''}
                  {draftName || 'Giảng viên UTH'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {currentUser?.role === 'admin' ? 'Quản trị viên Hệ thống' : 'Giảng viên Học thuật'}
                </span>
              </div>
              <p className="text-xs text-teal-100 truncate mt-0.5">
                {currentUser?.email || 'giangvien@ut.edu.vn'}
              </p>
              <p className="text-[11px] text-teal-200/90 truncate mt-0.5">
                {draftFaculty} • {draftUniversity}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 -mb-2 border-b border-white/20">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'border-white text-white'
                  : 'border-transparent text-teal-200 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Hồ sơ & Học vị</span>
            </button>
            <button
              onClick={() => setActiveTab('academic')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'academic'
                  ? 'border-white text-white'
                  : 'border-transparent text-teal-200 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Khoa & Bộ môn</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'border-white text-white'
                  : 'border-transparent text-teal-200 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bảo mật & Quyền</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Academic Title Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Học vị / Học hàm Giảng viên
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACADEMIC_TITLES.map((t) => {
                    const isSelected = draftTitle === t.value;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setDraftTitle(t.value)}
                        className={`p-2 rounded-xl text-xs font-bold border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#e6f4f4] border-[#008689] text-[#006d70] shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span>{t.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#008689] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name with Name-Reverse Helper */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Họ và tên đầy đủ
                  </label>
                  <button
                    type="button"
                    onClick={handleReverseName}
                    className="text-xs font-semibold text-[#008689] hover:underline flex items-center gap-1"
                    title="Hoán đổi Tên - Họ (chuẩn Google OAuth)"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Đảo Họ ↔ Tên</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tên này sẽ hiển thị trên góc Header, trang duyệt đề thi và trang bìa đề thi xuất bản.
                </p>
              </div>

              {/* Email (Readonly with Verified Badge) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Email định danh tài khoản
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full pl-10 pr-28 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 cursor-not-allowed outline-none"
                  />
                  <div className="absolute right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã xác thực</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-4">
              {/* University */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Trường Đại học / Học viện
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    value={draftUniversity}
                    onChange={(e) => setDraftUniversity(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Khoa / Viện đào tạo
                </label>
                <input
                  type="text"
                  value={draftFaculty}
                  onChange={(e) => setDraftFaculty(e.target.value)}
                  placeholder="Ví dụ: Khoa Công nghệ thông tin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Bộ môn trực thuộc
                </label>
                <input
                  type="text"
                  value={draftDept}
                  onChange={(e) => setDraftDept(e.target.value)}
                  placeholder="Ví dụ: Bộ môn Khoa học máy tính"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Primary Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Học phần giảng dạy phụ trách chính
                </label>
                <select
                  value={primarySubject}
                  onChange={(e) => setPrimarySubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Trí tuệ nhân tạo">Trí tuệ nhân tạo & Học máy</option>
                  <option value="Vật lý đại cương">Vật lý đại cương & Kỹ thuật</option>
                  <option value="Giải tích & Toán cao cấp">Giải tích & Toán cao cấp</option>
                  <option value="Kinh tế vi mô">Kinh tế vi mô & Phân tích kinh doanh</option>
                  <option value="Cơ sở dữ liệu">Hệ quản trị cơ sở dữ liệu</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#008689]" />
                    <span className="text-xs font-bold text-slate-800">Cơ chế xác thực tài khoản</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {currentUser?.authProvider === 'google' ? 'Google OAuth 2.0' : 'Mật khẩu cục bộ (Bcrypt)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Tài khoản của bạn được bảo vệ qua hệ thống bảo mật cấp cổng API Gateway với phiên làm việc JWT có chữ ký điện tử an toàn.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Quyền hạn trong hệ thống</span>
                  <p className="text-xs font-bold text-slate-800">
                    {currentUser?.role === 'admin' ? 'Quản trị viên (Toàn quyền)' : 'Giảng viên (Khảo thí & Đề thi)'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Trạng thái bảo vệ 2 lớp</span>
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã kích hoạt bảo vệ</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008689] hover:bg-[#006d70] shadow-sm shadow-teal-700/20 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
