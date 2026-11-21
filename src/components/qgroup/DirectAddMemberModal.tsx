import React from 'react';
import {
  UserPlus,
  X,
  Search,
  Sparkles,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Users,
} from 'lucide-react';
import { QGroup } from '../../types';

interface DirectAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: QGroup;
  directAddMemberEmail: string;
  onDirectAddMemberEmailChange: (val: string) => void;
  onLookupUser: (val: string) => Promise<void>;
  lookupStatus: 'idle' | 'searching' | 'found' | 'not_found';
  lookedUpUser: any;
  onClearLookedUpUser: () => void;
  directAddSelectedMembers: Array<{ email: string; fullName: string; academicTitle?: string }>;
  setDirectAddSelectedMembers: React.Dispatch<
    React.SetStateAction<Array<{ email: string; fullName: string; academicTitle?: string }>>
  >;
  onQueueDirectAddMember: (user: any) => void;
  suggestedDirectAddDropdown: Array<{ email: string; name: string; title?: string; dept?: string }>;
  filteredFriends: Array<{ email: string; name: string; title?: string; dept?: string }>;
  getFriendshipState: (email: string) => any;
  isMemberInvitedToActiveChannel: (email: string) => boolean;
  onAddUserToActiveChannel: (email: string, name?: string) => Promise<void>;
  onSendGroupInvitation: (email: string, name?: string) => Promise<void>;
  onBatchAddUsersToActiveChannel: () => Promise<void>;
  onBatchSendGroupInvitations: () => Promise<void>;
  isAddingMember: boolean;
  initials: (name?: string) => string;
}

export const DirectAddMemberModal: React.FC<DirectAddMemberModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  directAddMemberEmail,
  onDirectAddMemberEmailChange,
  onLookupUser,
  lookupStatus,
  lookedUpUser,
  onClearLookedUpUser,
  directAddSelectedMembers,
  setDirectAddSelectedMembers,
  onQueueDirectAddMember,
  suggestedDirectAddDropdown,
  filteredFriends,
  getFriendshipState,
  isMemberInvitedToActiveChannel,
  onAddUserToActiveChannel,
  onSendGroupInvitation,
  onBatchAddUsersToActiveChannel,
  onBatchSendGroupInvitations,
  isAddingMember,
  initials,
}) => {
  if (!isOpen || !activeGroup) return null;

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
              <UserPlus className="w-4 h-4 text-[#008689]" />
              <span>Thêm thành viên vào #{activeGroup.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gợi ý bạn bè, đồng nghiệp hoặc nhập email để thêm vào kênh
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* CHIPS TRAY: DANH SÁCH THÀNH VIÊN ĐÃ CHỌN (NẾU CÓ) */}
          {directAddSelectedMembers.length > 0 && (
            <div className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-teal-900 font-bold">
                  <Users className="w-3.5 h-3.5 text-[#008689]" />
                  <span>Đã chọn ({directAddSelectedMembers.length} đồng nghiệp):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDirectAddSelectedMembers([])}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {directAddSelectedMembers.map((m) => (
                  <span
                    key={m.email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-[#008689] border border-teal-300 text-xs font-semibold shadow-2xs animate-scale-up"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#008689] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {initials(m.fullName)}
                    </span>
                    <span className="truncate max-w-[140px]">{m.fullName}</span>
                    {m.academicTitle && (
                      <span className="text-[9px] font-normal text-teal-700 shrink-0">({m.academicTitle})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDirectAddSelectedMembers((prev) => prev.filter((x) => x.email !== m.email))}
                      className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Tìm kiếm đồng nghiệp hoặc nhập email:</span>
              <span className="text-[10px] text-slate-400 font-normal">Gõ @ để gợi ý tài khoản</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={directAddMemberEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  onDirectAddMemberEmailChange(val);
                  void onLookupUser(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && lookupStatus === 'found' && lookedUpUser) {
                    onQueueDirectAddMember(lookedUpUser);
                  }
                }}
                placeholder="Gõ @đồng nghiệp hoặc nhập email giảng viên..."
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all font-medium"
                autoFocus
              />
              {lookupStatus === 'searching' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                </div>
              )}
              {directAddMemberEmail && (
                <button
                  type="button"
                  onClick={onClearLookedUpUser}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* AUTOCOMPLETE DROPDOWN GỢI Ý TỨC THÌ KHI GÕ TỪ KHÓA */}
              {suggestedDirectAddDropdown.length > 0 && !lookedUpUser && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-teal-200/90 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50/50 text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center justify-between border-b border-teal-100">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#008689]" />
                      <span>Gợi ý tài khoản phù hợp ({suggestedDirectAddDropdown.length})</span>
                    </span>
                    <span className="text-[9px] font-normal text-teal-600">Nhấp để chọn nhanh</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {suggestedDirectAddDropdown.map((sug) => {
                      const state = getFriendshipState(sug.email);
                      return (
                        <div
                          key={sug.email}
                          onClick={() => {
                            onDirectAddMemberEmailChange(sug.email);
                            void onLookupUser(sug.email);
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
                                <span>Gửi lời mời</span>
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
          </div>

          {/* THẺ TÀI KHOẢN (NẾU NGƯỜI ĐÓ ĐÃ ĐĂNG KÝ TÀI KHOẢN) */}
          {lookupStatus === 'found' && lookedUpUser && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {initials(lookedUpUser.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">{lookedUpUser.fullName}</span>
                    {lookedUpUser.academicTitle && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                        {lookedUpUser.academicTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{lookedUpUser.email}</p>
                  <p className="text-[10px] text-slate-400 truncate">{lookedUpUser.department || 'Khoa Công nghệ Thông tin'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Tài khoản đã kích hoạt hệ thống</span>
                </span>
                {(() => {
                  const isUserSelected = directAddSelectedMembers.some(
                    (m) => m.email.toLowerCase() === lookedUpUser.email.toLowerCase()
                  );
                  const friendship = getFriendshipState(lookedUpUser.email);
                  const isFriend = friendship.type === 'friend';
                  const isAlreadyInChannel = (activeGroup.members || []).some(
                    (m) => String(m).trim().toLowerCase() === lookedUpUser.email.trim().toLowerCase()
                  );
                  const hasSentInvite = isMemberInvitedToActiveChannel(lookedUpUser.email);
                  return (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isAlreadyInChannel && (
                        isUserSelected ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDirectAddSelectedMembers((prev) =>
                                prev.filter((x) => x.email.toLowerCase() !== lookedUpUser.email.toLowerCase())
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
                            onClick={() => onQueueDirectAddMember(lookedUpUser)}
                            className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                            title="Chọn để thêm hàng loạt"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )
                      )}
                      {isAlreadyInChannel ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã tham gia</span>
                        </span>
                      ) : hasSentInvite ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[#008689] text-xs font-semibold select-none shadow-2xs">
                          <Check className="w-3.5 h-3.5 text-[#008689]" />
                          <span>Đã mời</span>
                        </span>
                      ) : isFriend ? (
                        <button
                          type="button"
                          onClick={() => void onAddUserToActiveChannel(lookedUpUser.email, lookedUpUser.fullName)}
                          disabled={isAddingMember}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold text-xs border border-teal-200 cursor-pointer transition-colors flex items-center gap-1.5"
                          title="Thêm ngay vào nhóm (đã là bạn bè)"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Thêm ngay</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onSendGroupInvitation(lookedUpUser.email, lookedUpUser.fullName)}
                          className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                          title="Gửi lời mời tham gia kênh"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Mời</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* CẢNH BÁO TÀI KHOẢN CHƯA ĐĂNG KÝ / KHÔNG TỒN TẠI (CHỈ KHI ĐÃ NHẬP ĐẦY ĐỦ DOMAIN EMAIL) */}
          {lookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(directAddMemberEmail.trim()) && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Người dùng không tồn tại trên hệ thống</p>
                <p className="text-[11px] text-rose-600 leading-relaxed">
                  Địa chỉ email <strong>{directAddMemberEmail}</strong> chưa được dùng để đăng ký tài khoản QuizGen AI. Thầy/Cô vui lòng kiểm tra lại địa chỉ email hoặc mời đồng nghiệp đăng ký trước khi thêm vào kênh.
                </p>
              </div>
            </div>
          )}

          {/* MỤC BẠN BÈ & ĐỒNG NGHIỆP: GỬI LỜI MỜI HOẶC THÊM TRỰC TIẾP */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Bạn bè & Đồng nghiệp ({filteredFriends.length})
              </span>
              <span className="text-[10px] text-slate-400">Gửi lời mời hoặc thêm trực tiếp</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredFriends.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3 italic">
                  Không tìm thấy đồng nghiệp phù hợp
                </p>
              ) : (
                filteredFriends.map((f) => {
                  const isAlreadyInChannel = (activeGroup.members || []).some(
                    (m) => String(m).trim().toLowerCase() === f.email.trim().toLowerCase()
                  );
                  const hasSentInvite = isMemberInvitedToActiveChannel(f.email);
                  const isSelected = directAddSelectedMembers.some(
                    (m) => m.email.toLowerCase() === f.email.toLowerCase()
                  );
                  const friendship = getFriendshipState(f.email);
                  const isFriend = friendship.type === 'friend';

                  return (
                    <div
                      key={f.email}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 truncate">{f.name}</span>
                            {f.title && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                {f.title}
                              </span>
                            )}
                            {isFriend && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Bạn bè
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate" title={f.email}>{f.email}</p>
                          {f.dept && (
                            <p className="text-[10px] text-slate-400 truncate">{f.dept}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isAlreadyInChannel && (
                          isSelected ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDirectAddSelectedMembers((prev) =>
                                  prev.filter((x) => x.email.toLowerCase() !== f.email.toLowerCase())
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
                              onClick={() => onQueueDirectAddMember(f)}
                              className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                              title="Chọn để thêm hàng loạt"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )
                        )}

                        {isAlreadyInChannel ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Đã tham gia</span>
                          </span>
                        ) : hasSentInvite ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[#008689] text-xs font-semibold select-none shadow-2xs">
                            <Check className="w-3.5 h-3.5 text-[#008689]" />
                            <span>Đã mời</span>
                          </span>
                        ) : isFriend ? (
                          <button
                            type="button"
                            onClick={() => void onAddUserToActiveChannel(f.email, f.name)}
                            disabled={isAddingMember}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold text-xs border border-teal-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Thêm ngay vào nhóm (đã là bạn bè)"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Thêm ngay</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void onSendGroupInvitation(f.email, f.name)}
                            className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="Gửi lời mời: Đồng nghiệp nhận thông báo và bấm Chấp nhận để vào"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Mời</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div>
            {directAddSelectedMembers.length > 0 && (
              <span className="text-[11px] text-teal-800 font-bold">
                Đã chọn {directAddSelectedMembers.length} đồng nghiệp
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setDirectAddSelectedMembers([]);
              }}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Đóng
            </button>
            {directAddSelectedMembers.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void onBatchSendGroupInvitations()}
                  className="px-3.5 py-2 rounded-lg bg-white border border-teal-600 text-[#008689] hover:bg-teal-50 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Gửi lời mời tham gia kênh cho tất cả người đã chọn"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi lời mời ({directAddSelectedMembers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onBatchAddUsersToActiveChannel()}
                  disabled={isAddingMember}
                  className="px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Thêm ngay tất cả người đã chọn vào kênh"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Thêm ngay ({directAddSelectedMembers.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
