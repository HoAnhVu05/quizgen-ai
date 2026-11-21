import React, { useMemo } from 'react';
import {
  Users,
  X,
  Plus,
  Hash,
  Search,
  Sparkles,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  UserPlus,
} from 'lucide-react';
import { isExcludedAdminAccount } from './chatUtils';

interface CreateOrJoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupModalTab: 'create' | 'join';
  setGroupModalTab: (tab: 'create' | 'join') => void;
  newGroupName: string;
  setNewGroupName: (val: string) => void;
  newGroupDept: string;
  setNewGroupDept: (val: string) => void;
  newGroupDesc: string;
  setNewGroupDesc: (val: string) => void;
  createGroupSelectedMembers: Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>;
  setCreateGroupSelectedMembers: React.Dispatch<
    React.SetStateAction<Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>>
  >;
  createGroupMemberInput: string;
  setCreateGroupMemberInput: (val: string) => void;
  onLookupMember: (val: string) => Promise<void>;
  createGroupLookupStatus: 'idle' | 'searching' | 'found' | 'not_found';
  createGroupLookedUpUser: any;
  onClearLookedUpUser: () => void;
  suggestedCreateGroupDropdown: Array<{ email: string; name: string; title?: string; dept?: string }>;
  filteredColleaguesForNewGroup: Array<{ email: string; name: string; title?: string; dept?: string }>;
  getFriendshipState: (email: string) => any;
  onAddMemberToNewGroup: (user: any) => void;
  onCreateGroup: () => void;
  joinCodeInput: string;
  setJoinCodeInput: (val: string) => void;
  onJoinByCode: (code: string) => Promise<void>;
  isJoiningCode: boolean;
  initials: (name?: string) => string;
}

export const CreateOrJoinGroupModal: React.FC<CreateOrJoinGroupModalProps> = ({
  isOpen,
  onClose,
  groupModalTab,
  setGroupModalTab,
  newGroupName,
  setNewGroupName,
  newGroupDept,
  setNewGroupDept,
  newGroupDesc,
  setNewGroupDesc,
  createGroupSelectedMembers,
  setCreateGroupSelectedMembers,
  createGroupMemberInput,
  setCreateGroupMemberInput,
  onLookupMember,
  createGroupLookupStatus,
  createGroupLookedUpUser,
  onClearLookedUpUser,
  suggestedCreateGroupDropdown,
  filteredColleaguesForNewGroup,
  getFriendshipState,
  onAddMemberToNewGroup,
  onCreateGroup,
  joinCodeInput,
  setJoinCodeInput,
  onJoinByCode,
  isJoiningCode,
  initials,
}) => {
  const safeColleagues = useMemo(() => {
    return (filteredColleaguesForNewGroup || []).filter(
      (f) => !isExcludedAdminAccount(f.email, f.name, f.title)
    );
  }, [filteredColleaguesForNewGroup]);

  const safeDropdown = useMemo(() => {
    return (suggestedCreateGroupDropdown || []).filter(
      (sug) => !isExcludedAdminAccount(sug.email, sug.name, sug.title)
    );
  }, [suggestedCreateGroupDropdown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl sm:max-w-xl lg:max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#008689]" />
              <span>Kênh Chuyên Môn Học Thuật</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Không gian làm việc chung: trao đổi, chia sẻ giáo trình và ma trận khảo thí UTH
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg select-none">
            <button
              type="button"
              onClick={() => setGroupModalTab('create')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                groupModalTab === 'create'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo kênh mới</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupModalTab('join')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                groupModalTab === 'join'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Nhập mã tham gia</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {groupModalTab === 'create' ? (
            /* TAB TẠO NHÓM MỚI */
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Tên kênh học thuật *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Bộ Môn Mạng & Hệ Điều Hành"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Khoa / Bộ môn</label>
                  <input
                    type="text"
                    value={newGroupDept}
                    onChange={(e) => setNewGroupDept(e.target.value)}
                    placeholder="VD: Khoa Công nghệ Thông tin"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Mô tả mục đích kênh</label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Trao đổi ngân hàng câu hỏi, chia sẻ giáo trình..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* THÊM THÀNH VIÊN VÀO KÊNH NGAY TẠI ĐÂY */}
              <div className="pt-2 border-t border-slate-200/80 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#008689]" />
                      <span>Thêm thành viên vào kênh:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Gõ @ để gợi ý tài khoản</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đồng nghiệp đã kết bạn sẽ vào thẳng nhóm. Đồng nghiệp chưa kết bạn sẽ nhận được lời mời tham gia (chờ đồng ý).
                  </p>
                </div>

                {/* CHIPS TRAY: DANH SÁCH THÀNH VIÊN ĐÃ CHỌN */}
                {createGroupSelectedMembers.length > 0 && (
                  <div className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5 text-teal-900 font-bold">
                        <Users className="w-3.5 h-3.5 text-[#008689]" />
                        <span>Đã chọn ({createGroupSelectedMembers.length} thành viên):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCreateGroupSelectedMembers([])}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {createGroupSelectedMembers.map((m) => {
                        const isFriend = getFriendshipState(m.email).type === 'friend';
                        return (
                          <span
                            key={m.email}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border text-xs font-semibold shadow-2xs animate-scale-up ${
                              isFriend
                                ? 'text-[#008689] border-teal-300'
                                : 'text-amber-800 border-amber-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0 ${
                                isFriend ? 'bg-[#008689]' : 'bg-amber-600'
                              }`}
                            >
                              {initials(m.fullName)}
                            </span>
                            <span className="truncate max-w-[140px]">{m.fullName}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-medium shrink-0 ${
                                isFriend
                                  ? 'bg-teal-50 text-[#008689]'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {isFriend ? 'Vào thẳng' : 'Chờ đồng ý'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCreateGroupSelectedMembers((prev) =>
                                  prev.filter((x) => x.email !== m.email)
                                )
                              }
                              className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* INPUT TÌM KIẾM / NHẬP EMAIL THÀNH VIÊN */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createGroupMemberInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateGroupMemberInput(val);
                      void onLookupMember(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && createGroupLookupStatus === 'found' && createGroupLookedUpUser) {
                        onAddMemberToNewGroup(createGroupLookedUpUser);
                      }
                    }}
                    placeholder="Gõ @đồng nghiệp hoặc nhập email giảng viên cần thêm..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all font-medium"
                  />
                  {createGroupLookupStatus === 'searching' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                    </div>
                  )}
                  {createGroupMemberInput && (
                    <button
                      type="button"
                      onClick={onClearLookedUpUser}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* AUTOCOMPLETE DROPDOWN GỢI Ý TỨC THÌ KHI GÕ TỪ KHÓA */}
                  {safeDropdown.length > 0 && !createGroupLookedUpUser && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-teal-200/90 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50/50 text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center justify-between border-b border-teal-100">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#008689]" />
                          <span>Gợi ý tài khoản phù hợp ({safeDropdown.length})</span>
                        </span>
                        <span className="text-[9px] font-normal text-teal-600">Nhấp để chọn nhanh</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                        {safeDropdown.map((sug) => {
                          const state = getFriendshipState(sug.email);
                          return (
                            <div
                              key={sug.email}
                              onClick={() => {
                                setCreateGroupMemberInput(sug.email);
                                void onLookupMember(sug.email);
                              }}
                              className="p-2.5 hover:bg-teal-50/70 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-[#008689] transition-colors">
                                  {initials(sug.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-800 truncate">{sug.name}</span>
                                    {sug.title && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                        {sug.title}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-teal-700 truncate font-mono font-medium">{sug.email}</p>
                                  {sug.dept && (
                                    <p className="text-[10px] text-slate-400 truncate">{sug.dept}</p>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {state.type === 'friend' ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Bạn bè • Vào thẳng</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Chờ đồng ý</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* THẺ TÀI KHOẢN TÌM THẤY (ĐÃ ĐĂNG KÝ HỆ THỐNG) */}
                {createGroupLookupStatus === 'found' && createGroupLookedUpUser && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        {initials(createGroupLookedUpUser.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">{createGroupLookedUpUser.fullName}</span>
                          {createGroupLookedUpUser.academicTitle && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                              {createGroupLookedUpUser.academicTitle}
                            </span>
                          )}
                          {(() => {
                            const isFriend = getFriendshipState(createGroupLookedUpUser.email).type === 'friend';
                            return (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border shrink-0 ${
                                  isFriend
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isFriend ? 'Bạn bè • Vào thẳng' : 'Chưa kết bạn • Chờ đồng ý'}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{createGroupLookedUpUser.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{createGroupLookedUpUser.department || 'Khoa Công nghệ Thông tin'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Tài khoản đã kích hoạt hệ thống</span>
                      </span>
                      {(() => {
                        const isSelected = createGroupSelectedMembers.some(
                          (m) => m.email.toLowerCase() === createGroupLookedUpUser.email.toLowerCase()
                        );
                        return isSelected ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCreateGroupSelectedMembers((prev) =>
                                prev.filter((x) => x.email.toLowerCase() !== createGroupLookedUpUser.email.toLowerCase())
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                            title="Đã chọn (Bấm để hủy chọn)"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã chọn</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAddMemberToNewGroup(createGroupLookedUpUser)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm vào kênh ({createGroupSelectedMembers.length + 1})</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* CẢNH BÁO TÀI KHOẢN CHƯA ĐĂNG KÝ / KHÔNG TỒN TẠI */}
                {createGroupLookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(createGroupMemberInput.trim()) && (
                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 text-xs text-rose-800 space-y-1">
                      <p className="font-bold">Người dùng không tồn tại trên hệ thống</p>
                      <p className="text-[11px] text-rose-600 leading-relaxed">
                        Địa chỉ email <strong>{createGroupMemberInput}</strong> chưa được dùng để đăng ký tài khoản QuizGen AI. Thầy/Cô vui lòng kiểm tra lại địa chỉ email hoặc mời đồng nghiệp đăng ký trước khi thêm vào kênh.
                      </p>
                    </div>
                  </div>
                )}

                {/* GỢI Ý ĐỒNG NGHIỆP TRONG TRƯỜNG */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Gợi ý Đồng nghiệp ({safeColleagues.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Bấm để chọn nhanh</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {safeColleagues.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-2.5 italic">
                        Không còn đồng nghiệp nào khác chưa chọn
                      </p>
                    ) : (
                      safeColleagues.map((f) => {
                        const isSelected = createGroupSelectedMembers.some((m) => m.email.toLowerCase() === f.email.toLowerCase());
                        return (
                          <div
                            key={f.email}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                              isSelected
                                ? 'bg-teal-50/60 border-teal-300'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {initials(f.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs text-slate-800 truncate">{f.name}</span>
                                  {f.title && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                      {f.title}
                                    </span>
                                  )}
                                  {(() => {
                                    const isFriend = getFriendshipState(f.email).type === 'friend';
                                    return (
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border shrink-0 ${
                                          isFriend
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}
                                      >
                                        {isFriend ? 'Bạn bè' : 'Chưa kết bạn'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate" title={f.email}>{f.email}</p>
                              </div>
                            </div>
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={() => setCreateGroupSelectedMembers((prev) => prev.filter((x) => x.email.toLowerCase() !== f.email.toLowerCase()))}
                                className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors shrink-0"
                                title="Đã chọn (Bấm để hủy chọn)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã chọn</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAddMemberToNewGroup({ email: f.email, fullName: f.name, academicTitle: f.title, department: f.dept })}
                                className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                title="Chọn thành viên"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB NHẬP MÃ THAM GIA */
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tham gia nhóm qua Mã phòng</span>
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Nhập mã phòng chuyên môn được đồng nghiệp hoặc Trưởng nhóm chia sẻ (ví dụ: <strong className="font-mono text-slate-800">QGRP-L6RUM</strong>).
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Mã phòng chuyên môn *</label>
                <div className="relative mt-1">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void onJoinByCode(joinCodeInput);
                      }
                    }}
                    placeholder="VD: QGRP-OS2026..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white font-mono font-bold text-slate-800 placeholder-slate-400 text-xs tracking-wider"
                  />
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-500 px-1">
                <p>• Kênh công khai: Bạn sẽ vào thẳng nhóm trò chuyện ngay lập tức.</p>
                <p>• Kênh cần phê duyệt: Yêu cầu sẽ được chuyển đến Trưởng nhóm để duyệt.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div>
            {groupModalTab === 'create' && createGroupSelectedMembers.length > 0 && (() => {
              const friendsCount = createGroupSelectedMembers.filter((m) => getFriendshipState(m.email).type === 'friend').length;
              const nonFriendsCount = createGroupSelectedMembers.length - friendsCount;
              return (
                <span className="text-[11px] text-teal-800 font-bold">
                  {friendsCount > 0 && `${friendsCount} bạn bè (vào thẳng)`}
                  {friendsCount > 0 && nonFriendsCount > 0 && ' • '}
                  {nonFriendsCount > 0 && `${nonFriendsCount} chờ đồng ý`}
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            {groupModalTab === 'create' ? (
              <button
                type="button"
                disabled={!newGroupName.trim()}
                onClick={onCreateGroup}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  Tạo kênh {createGroupSelectedMembers.length > 0 ? `(${createGroupSelectedMembers.length + 1} thành viên)` : ''}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!joinCodeInput.trim() || isJoiningCode}
                onClick={() => void onJoinByCode(joinCodeInput)}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tham gia kênh ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
