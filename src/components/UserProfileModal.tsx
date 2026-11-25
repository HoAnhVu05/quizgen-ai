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
  Phone,
  Briefcase,
  Hash,
  MapPin,
  FileText,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { UserAvatar } from './common/UserAvatar';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
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
  const [draftStaffId, setDraftStaffId] = useState('');
  const [draftPosition, setDraftPosition] = useState('');
  const [draftFaculty, setDraftFaculty] = useState('');
  const [draftDept, setDraftDept] = useState('');
  const [draftUniversity, setDraftUniversity] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftOffice, setDraftOffice] = useState('');
  const [draftSubjects, setDraftSubjects] = useState('');
  const [draftResearch, setDraftResearch] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setDraftTitle(currentUser.academicTitle || '');
      setDraftName(currentUser.fullName || '');
      setDraftStaffId(currentUser.staffId || '');
      setDraftPosition(currentUser.academicPosition || '');
      setDraftFaculty(currentUser.faculty || currentUser.department || '');
      setDraftDept(currentUser.department || '');
      setDraftUniversity(currentUser.university || '');
      setDraftPhone(currentUser.phoneNumber || '');
      setDraftOffice(currentUser.officeRoom || '');
      setDraftSubjects(currentUser.primarySubjects || '');
      setDraftResearch(currentUser.researchInterests || '');
      setDraftBio(currentUser.bio || '');
      setDraftAvatarUrl(currentUser.avatarUrl || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Định dạng không hợp lệ', 'Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('warning', 'Tệp quá lớn', 'Kích thước ảnh đại diện tối đa là 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setDraftAvatarUrl(optimizedDataUrl);
          onShowToast('info', 'Đã tải ảnh lên', 'Ảnh đã sẵn sàng. Nhấn "Lưu thay đổi" để đồng bộ toàn hệ thống.');
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    // Reset file input để có thể chọn lại cùng 1 file nếu muốn
    e.target.value = '';
  };

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
        staffId: draftStaffId.trim(),
        academicPosition: draftPosition.trim(),
        department: draftDept.trim(),
        faculty: draftFaculty.trim(),
        university: draftUniversity.trim(),
        phoneNumber: draftPhone.trim(),
        officeRoom: draftOffice.trim(),
        primarySubjects: draftSubjects.trim(),
        researchInterests: draftResearch.trim(),
        bio: draftBio.trim(),
        avatarUrl: draftAvatarUrl.trim(),
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
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
            <div
              className="relative group/topavatar cursor-pointer shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Nhấp để tải lên ảnh đại diện mới"
            >
              <UserAvatar
                avatarUrl={draftAvatarUrl}
                name={draftName || currentUser?.fullName}
                email={currentUser?.email}
                size="xl"
                rounded="rounded-2xl"
                className="shadow-lg border-2 border-white/60 ring-2 ring-white/20 group-hover/topavatar:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover/topavatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5">
                <Camera className="w-5 h-5" />
                <span>Đổi ảnh</span>
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white shadow-xs"
                title="Tải lên ảnh mới"
              >
                <Camera className="w-3.5 h-3.5" />
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
              {(draftFaculty || draftUniversity) ? (
                <p className="text-[11px] text-teal-200/90 truncate mt-0.5">
                  {[draftFaculty, draftUniversity].filter(Boolean).join(' • ')}
                </p>
              ) : null}
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
          {/* Ẩn input file tải ảnh */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarFileChange}
          />

          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Avatar Upload & Synchronization Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/70 via-slate-50 to-teal-50/40 border border-teal-200/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="relative group/cardavatar cursor-pointer shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      title="Nhấp để thay đổi ảnh đại diện"
                    >
                      <UserAvatar
                        avatarUrl={draftAvatarUrl}
                        name={draftName || currentUser?.fullName}
                        email={currentUser?.email}
                        size="lg"
                        rounded="rounded-2xl"
                        className="shadow-md border-2 border-white ring-2 ring-teal-500/20 group-hover/cardavatar:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/cardavatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>Ảnh đại diện người dùng</span>
                        {draftAvatarUrl ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            Ảnh tùy chỉnh
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                            Tự động theo tên
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Avatar được đồng bộ nhất quán 100% trên toàn ứng dụng: Trang cá nhân, Diễn đàn, Q-Group chat, Huddle...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-[#008689] hover:bg-[#007073] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{draftAvatarUrl ? 'Thay đổi ảnh' : 'Tải ảnh lên'}</span>
                    </button>
                    {draftAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftAvatarUrl('');
                          onShowToast('info', 'Đã đặt lại', 'Ảnh đại diện sẽ hiển thị mặc định theo tên viết tắt.');
                        }}
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs transition-colors cursor-pointer"
                        title="Xóa ảnh tùy chỉnh, quay về avatar mặc định theo tên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

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

              {/* Full Name & Staff ID Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Họ và tên đầy đủ (*)
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
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã số Giảng viên / Cán bộ
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      value={draftStaffId}
                      onChange={(e) => setDraftStaffId(e.target.value)}
                      placeholder="Ví dụ: GV2024-001"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-mono font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Position & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chức vụ / Vị trí học thuật
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      value={draftPosition}
                      onChange={(e) => setDraftPosition(e.target.value)}
                      placeholder="Ví dụ: Giảng viên chính, Trưởng Bộ môn..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại liên hệ
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="tel"
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-mono font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Email (Readonly with Verified Badge) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email định danh tài khoản
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

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiểu sử & Giới thiệu học thuật
                </label>
                <textarea
                  rows={2}
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  placeholder="Ví dụ: Giảng viên có kinh nghiệm nghiên cứu và giảng dạy chuyên sâu..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs text-slate-800 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-4">
              {/* University & Office */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      placeholder="Ví dụ: ĐH Giao thông Vận tải TP.HCM"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phòng làm việc / Lab
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="text"
                      value={draftOffice}
                      onChange={(e) => setDraftOffice(e.target.value)}
                      placeholder="Ví dụ: P. A2-304, Lab AI"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Bộ môn trực thuộc
                  </label>
                  <input
                    type="text"
                    value={draftDept}
                    onChange={(e) => setDraftDept(e.target.value)}
                    placeholder="Ví dụ: Bộ môn Kỹ thuật Phần mềm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Primary Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Học phần giảng dạy phụ trách chính
                </label>
                <input
                  type="text"
                  value={draftSubjects}
                  onChange={(e) => setDraftSubjects(e.target.value)}
                  placeholder="Ví dụ: Trí tuệ Nhân tạo, Học máy, Cấu trúc Dữ liệu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Research Interests */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  5. Hướng nghiên cứu chuyên sâu
                </label>
                <input
                  type="text"
                  value={draftResearch}
                  onChange={(e) => setDraftResearch(e.target.value)}
                  placeholder="Ví dụ: Large Language Models, Natural Language Processing, AI trong giáo dục..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-800 outline-none"
                />
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
