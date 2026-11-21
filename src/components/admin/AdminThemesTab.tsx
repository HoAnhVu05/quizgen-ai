import React from 'react';
import {
  Check,
  CheckCircle2,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SYSTEM_THEMES, SystemThemeId } from '../../types/theme';

export interface AdminThemesTabProps {
  currentTheme: any;
  activeThemeId: SystemThemeId;
  showParticles: boolean;
  toggleParticles: () => void;
  isLoadingTheme: boolean;
  themeLastUpdated: string | null;
  activatingThemeId: SystemThemeId | null;
  handleActivateTheme: (themeId: SystemThemeId) => Promise<void>;
}

export const AdminThemesTab: React.FC<AdminThemesTabProps> = ({
  currentTheme,
  activeThemeId,
  showParticles,
  toggleParticles,
  isLoadingTheme,
  themeLastUpdated,
  activatingThemeId,
  handleActivateTheme,
}) => {
  return (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                  style={{
                    background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`
                  }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Tùy Biến Giao Diện Hệ Thống &amp; Lễ Hội Toàn Trường</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-[#008689] border border-teal-200">
                      Real-time Sync &lt; 0.1s
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-3xl leading-relaxed mt-0.5">
                    Quản trị viên có toàn quyền lựa chọn diện mạo hệ thống theo 4 mùa trong năm và các đại lễ dân tộc (30/4, 2/9, Tết). Khi kích hoạt, toàn bộ máy tính Giảng viên, Sinh viên và Màn hình Đăng nhập/Đăng ký sẽ chuyển đổi đồng bộ ngay lập tức.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Status & Particle Ambient Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleParticles}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  showParticles
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title="Bật/Tắt hiệu ứng chuyển động nhẹ nhàng"
              >
                <Sparkles className={`w-3.5 h-3.5 ${showParticles ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Hiệu ứng hạt: {showParticles ? 'Đang Bật' : 'Đã Tắt'}</span>
              </button>

              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500">Đang chạy:</span>
                <strong className="text-slate-800 font-bold">{currentTheme.name}</strong>
              </div>
            </div>
          </div>

          {/* Active Theme Highlight Spotlight */}
          <div
            className="rounded-2xl p-5 border shadow-xs relative overflow-hidden transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors.primary}15, ${currentTheme.colors.accent}15)`,
              borderColor: `${currentTheme.colors.primary}40`,
            }}
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl filter drop-shadow-md shrink-0">
                  {currentTheme.seasonLabel}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/80 backdrop-blur-xs text-slate-800 shadow-2xs">
                      Giao Diện Đang Kích Hoạt Toàn Hệ Thống
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Cập nhật: {themeLastUpdated ? new Date(themeLastUpdated).toLocaleTimeString('vi-VN') : 'Mặc định khởi động'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">
                    {currentTheme.name} — <span className="font-semibold text-slate-700 text-sm">{currentTheme.tagline}</span>
                  </h4>
                  <p className="text-xs text-slate-600 italic">
                    &ldquo;{currentTheme.greetingTitle}&rdquo;
                  </p>
                </div>
              </div>

              {/* Badges of current theme */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-white/80 shadow-2xs text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }} />
                  <span className="text-[11px] font-mono text-slate-700">{currentTheme.colors.primary}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentTheme.colors.accent }} />
                  <span className="text-[11px] font-mono text-slate-700">{currentTheme.colors.accent}</span>
                </div>
                <div className="text-[11px] text-slate-600 px-2 py-1 font-medium">
                  {currentTheme.particleType === 'none' ? 'Không hạt' : `Hạt: ${currentTheme.particleType}`}
                </div>
              </div>
            </div>
          </div>

          {/* 7 Themes Interactive Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#008689]" />
                <span>Danh Mục 7 Giao Diện Học Thuật &amp; Lễ Hội (Chọn để Đổi Tức Thì)</span>
              </h4>
              <span className="text-xs text-slate-400">
                Nhấn &quot;Kích Hoạt Toàn Trường&quot; để áp dụng đồng loạt
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(Object.values(SYSTEM_THEMES) as Array<typeof SYSTEM_THEMES[keyof typeof SYSTEM_THEMES]>).map((thm) => {
                const isActive = thm.id === activeThemeId;
                const isActivating = activatingThemeId === thm.id;

                return (
                  <div
                    key={thm.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                      isActive
                        ? 'ring-2 ring-emerald-500 border-emerald-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Decorative Preview Header */}
                    <div
                      className="p-4 relative overflow-hidden h-28 flex flex-col justify-between border-b border-slate-100"
                      style={{ background: `linear-gradient(135deg, ${thm.colors.primary}20, ${thm.colors.accent}20)` }}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-xl filter drop-shadow-xs">{thm.seasonLabel}</span>
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Đang Dùng
                          </span>
                        )}
                      </div>

                      <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {thm.id.toUpperCase()}
                        </span>
                        <h5 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                          {thm.name}
                        </h5>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {thm.tagline}
                        </p>

                        {/* Visual stickers & badges description */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Sticker góc:</span>
                            <span className="font-medium text-slate-700 text-right truncate max-w-[170px]" title={thm.stickerDescription}>
                              {thm.hasStickerCorner ? 'Hoa & Phụ kiện lễ' : 'Chuẩn mực'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Logo Badge:</span>
                            <span className="font-medium text-slate-700 text-right truncate max-w-[170px]" title={thm.stickerDescription}>
                              {thm.hasLogoAccessory ? 'Biểu trưng mùa lễ' : 'Mặc định'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Hiệu ứng hạt:</span>
                            <span className="font-medium text-slate-700">
                              {thm.particleType === 'none' ? 'Không hạt' : `Bay nhẹ (${thm.particleType})`}
                            </span>
                          </div>
                        </div>

                        {/* Palette Color dots */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-slate-400">Bảng màu:</span>
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: thm.colors.primary }}
                            title={`Chủ đạo: ${thm.colors.primary}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: thm.colors.accent }}
                            title={`Điểm nhấn: ${thm.colors.accent}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: thm.colors.secondary }}
                            title={`Phụ: ${thm.colors.secondary}`}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-slate-100">
                        {isActive ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Đang Hoạt Động Toàn Trường</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateTheme(thm.id as SystemThemeId)}
                            disabled={isActivating || isLoadingTheme}
                            className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                            style={{
                              background: `linear-gradient(135deg, ${thm.colors.primary}, ${thm.colors.accent})`
                            }}
                          >
                            {isActivating ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang Đồng Bộ...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                <span>Kích Hoạt Toàn Trường</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture & Engineering Standards Note */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p>
                <strong>Tiêu chuẩn học thuật:</strong> Tất cả chuyển động hạt (particles) được lập trình giới hạn tối đa 8–12 phần tử, chu kỳ rơi chậm 10–16s với CSS Hardware Acceleration. Không gây mỏi mắt, không che khuất chữ trên đề thi, tự động tắt khi người dùng in ấn hoặc ấn nút Bật/Tắt hiệu ứng.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-400 shrink-0">
              CSDL: admin.db • Table: admin_configs
            </div>
          </div>
        </div>

  );
};
