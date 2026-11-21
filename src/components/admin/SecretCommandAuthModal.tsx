import React, { useState, useEffect, useRef } from 'react';
import {
  Fingerprint,
  Camera,
  KeyRound,
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import apiClient, { API_BASE } from '../../services/apiClient';

interface SecretCommandAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authMethod: 'biometric' | 'camera' | 'pin', snapshotDataUrl?: string) => void;
  userEmail?: string;
  userName?: string;
}

export const SecretCommandAuthModal: React.FC<SecretCommandAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userEmail = 'admin@quizgen.ai',
  userName = 'Hồ Anh Vũ',
}) => {
  // Ưu tiên Vân tay làm phương thức mặc định
  const [activeTab, setActiveTab] = useState<'biometric' | 'camera' | 'pin'>('biometric');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Biometric platform status & passkey registration check
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState<boolean>(() => {
    return !!localStorage.getItem('quizgen_passkey_cred_id');
  });
  const [isPlatformBiometricAvailable, setIsPlatformBiometricAvailable] = useState<boolean | null>(null);

  // Multi-angle face state
  const [isEnrollingMode, setIsEnrollingMode] = useState(false);
  const [currentAngleStep, setCurrentAngleStep] = useState<1 | 2 | 3>(1);
  const [completedAngles, setCompletedAngles] = useState<number[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  // Reset PIN and verify device biometric on open
  useEffect(() => {
    if (isOpen) {
      setPinDigits(['', '', '', '', '', '']);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsAuthenticating(false);
      setActiveTab('biometric'); // Luôn ưu tiên mở tab Vân tay
      setHasRegisteredPasskey(!!localStorage.getItem('quizgen_passkey_cred_id'));

      // Kiểm tra xem máy có hỗ trợ cảm biến sinh trắc học tích hợp (Fingerprint/Face)
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => setIsPlatformBiometricAvailable(available))
          .catch(() => setIsPlatformBiometricAvailable(false));
      } else {
        setIsPlatformBiometricAvailable(false);
      }

      void checkFaceStatus();
    } else {
      setPinDigits(['', '', '', '', '', '']);
      stopCamera();
    }
  }, [isOpen]);

  const checkFaceStatus = async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/face-status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          if (!data.enrolled || data.angleCount < 3) {
            setIsEnrollingMode(true);
            setCompletedAngles(data.angles || []);
            const nextStep = ([1, 2, 3].find((a) => !(data.angles || []).includes(a)) || 1) as 1 | 2 | 3;
            setCurrentAngleStep(nextStep);
          } else {
            setIsEnrollingMode(false);
            setCompletedAngles(data.angles || [1, 2, 3]);
          }
        }
      }
    } catch {}
  };

  // Manage Camera stream only when camera tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  // Focus PIN input when switching to PIN tab
  useEffect(() => {
    if (isOpen && activeTab === 'pin') {
      setPinDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setErrorMsg('Không thể mở camera. Vui lòng cấp quyền camera hoặc chuyển sang xác thực bằng Mã PIN.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Chụp ảnh vuông tâm và lật gương chuẩn, tối ưu kích thước 320x320 siêu nhẹ (~25KB)
  const takeSnapshot = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 640;

    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    const TARGET_SIZE = 320;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    ctx.translate(TARGET_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.82);
  };

  // 1. Quét xác thực khuôn mặt (Chặt chẽ, chống fake)
  const handleVerifyFace = async () => {
    const snapshot = takeSnapshot();
    if (!snapshot) {
      setErrorMsg('Không thể chụp ảnh từ camera.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/verify-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: snapshot }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMsg(data.message || 'Xác thực khuôn mặt quản trị viên thành công.');
        setTimeout(() => {
          stopCamera();
          setIsAuthenticating(false);
          onSuccess('camera', snapshot);
        }, 400);
      } else {
        throw new Error(data.message || 'Khuôn mặt không trùng khớp với quản trị viên.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsAuthenticating(false);
      if (err.name === 'AbortError') {
        setErrorMsg('Quá thời gian phản hồi máy chủ. Vui lòng bấm thử lại.');
      } else if (err.message && err.message.includes('Failed to fetch')) {
        setErrorMsg('Đường truyền mạng bị gián đoạn. Vui lòng bấm thử lại.');
      } else {
        setErrorMsg(err.message || 'Xác thực khuôn mặt thất bại.');
      }
    }
  };

  // 2. Chụp từng góc độ khi đăng ký (Multi-Angle)
  const handleCaptureAngle = async (angle: 1 | 2 | 3) => {
    const snapshot = takeSnapshot();
    if (!snapshot) {
      setErrorMsg('Không thể chụp ảnh từ camera.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/enroll-angle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle, image: snapshot }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        const nextCompleted = Array.from(new Set([...completedAngles, angle]));
        setCompletedAngles(nextCompleted);

        if (angle < 3) {
          const nextStep = (angle + 1) as 1 | 2 | 3;
          setCurrentAngleStep(nextStep);
          setSuccessMsg(`Đã lưu góc ${angle}/3 thành công. Hãy chuyển sang góc tiếp theo.`);
          setIsAuthenticating(false);
        } else {
          setSuccessMsg('Đã hoàn tất nạp 3 góc khuôn mặt!');
          setTimeout(() => {
            setIsEnrollingMode(false);
            stopCamera();
            setIsAuthenticating(false);
            onSuccess('camera', snapshot);
          }, 600);
        }
      } else {
        throw new Error(data.message || 'Không thể nhận diện khuôn mặt ở góc này.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setErrorMsg(err.message || 'Lỗi chụp góc khuôn mặt.');
    }
  };

  // 3. Đặt lại toàn bộ dữ liệu khuôn mặt
  const handleResetFace = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/reset-face`, { method: 'POST' });
      const data = await res.json();
      setIsAuthenticating(false);
      setCompletedAngles([]);
      setCurrentAngleStep(1);
      setIsEnrollingMode(true);
      setSuccessMsg(data.message || 'Đã sẵn sàng đăng ký 3 góc độ mới.');
    } catch {
      setIsAuthenticating(false);
      setErrorMsg('Không thể đặt lại dữ liệu khuôn mặt.');
    }
  };

  // 4. Quét Vân tay Phần Cứng Bằng WebAuthn Native của Điện Thoại
  const handleNativeBiometric = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAuthenticating(true);

    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error('Trình duyệt hoặc thiết bị này không hỗ trợ WebAuthn sinh trắc học.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const storedCredId = localStorage.getItem('quizgen_passkey_cred_id');

      // NẾU ĐÃ CÓ KHÓA ĐĂNG KÝ TRÊN MÁY NÀY -> GỌI XÁC THỰC (GET)
      if (storedCredId && hasRegisteredPasskey) {
        try {
          const rawId = Uint8Array.from(atob(storedCredId), (c) => c.charCodeAt(0));
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              allowCredentials: [
                {
                  id: rawId,
                  type: 'public-key',
                },
              ],
              userVerification: 'preferred',
              timeout: 60000,
            },
          });
          if (assertion) {
            setSuccessMsg('Xác thực vân tay thành công.');
            setTimeout(() => {
              setIsAuthenticating(false);
              onSuccess('biometric');
            }, 300);
            return;
          }
        } catch (getErr: any) {
          console.warn('Get assertion failed:', getErr);
          // Nếu khóa cũ không hợp lệ hoặc bị xóa trên máy, xóa cache và yêu cầu kích hoạt lại
          localStorage.removeItem('quizgen_passkey_cred_id');
          setHasRegisteredPasskey(false);
          setIsAuthenticating(false);
          setErrorMsg('Khóa vân tay cũ không tồn tại trên thiết bị. Vui lòng bấm để liên kết vân tay mới.');
          return;
        }
      }

      // NẾU CHƯA CÓ KHÓA -> TẠO KHÓA MỚI VỚI VÂN TAY (CREATE)
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const newCred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'QuizGen AI Remote',
          },
          user: {
            id: userId,
            name: userEmail,
            displayName: userName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (newCred) {
        const b64Id = btoa(String.fromCharCode(...new Uint8Array(newCred.rawId)));
        localStorage.setItem('quizgen_passkey_cred_id', b64Id);
        setHasRegisteredPasskey(true);
        setSuccessMsg('Đã liên kết và xác thực vân tay thành công.');
        setTimeout(() => {
          setIsAuthenticating(false);
          onSuccess('biometric');
        }, 300);
      } else {
        throw new Error('Cảm biến vân tay không phản hồi.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      console.warn('WebAuthn operation error:', err);
      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (errName === 'NotAllowedError') {
        setErrorMsg('Thao tác vân tay đã bị hủy hoặc hết thời gian.');
      } else {
        setErrorMsg(`Cảm biến chưa kích hoạt (${errMsg || errName || 'Chưa nhận phản hồi'}). Bạn có thể dùng Quét mặt hoặc Mã PIN.`);
      }
    }
  };

  // Đặt lại liên kết vân tay
  const handleResetPasskey = () => {
    localStorage.removeItem('quizgen_passkey_cred_id');
    setHasRegisteredPasskey(false);
    setErrorMsg(null);
    setSuccessMsg('Đã làm mới liên kết vân tay. Hãy bấm nút để đăng ký vân tay mới.');
  };

  // 5. Nhập Mã PIN 6 số
  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    const digits = rawVal.split('');
    const newArr = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newArr[i] = d;
    });
    setPinDigits(newArr);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (rawVal.length === 6) {
      setIsAuthenticating(true);
      try {
        const res = await apiClient.fetch(`${API_BASE}/agent-bridge/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: rawVal }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          setSuccessMsg('Xác thực mã PIN thành công.');
          setTimeout(() => {
            setIsAuthenticating(false);
            setPinDigits(['', '', '', '', '', '']);
            onSuccess('pin');
          }, 300);
        } else {
          throw new Error(data.message || 'Mã PIN không chính xác.');
        }
      } catch (err: any) {
        setIsAuthenticating(false);
        setErrorMsg(err.message || 'Mã PIN không chính xác.');
        setTimeout(() => {
          setPinDigits(['', '', '', '', '', '']);
        }, 500);
      }
    }
  };

  const handleModalClose = () => {
    setPinDigits(['', '', '', '', '', '']);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  const currentPinStr = pinDigits.join('');

  const angleLabels: Record<1 | 2 | 3, { title: string; hint: string }> = {
    1: { title: 'Nhìn thẳng', hint: 'Hướng khuôn mặt trực diện vào tâm camera' },
    2: { title: 'Nghiêng trái nhẹ', hint: 'Xoay mặt sang trái khoảng 15–20 độ' },
    3: { title: 'Nghiêng phải nhẹ', hint: 'Xoay mặt sang phải khoảng 15–20 độ' },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-200 font-sans"
    >
      <div className="relative max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col text-zinc-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-200 mb-2.5">
            <ShieldCheck className="w-5 h-5 text-zinc-300" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Xác thực Quản trị viên</h2>
          <p className="text-xs text-zinc-400">Hệ thống bảo mật đa phương thức</p>
        </div>

        {/* 3 Tabs: Vân tay (Ưu tiên) | Khuôn mặt | Mã PIN */}
        <div className="flex rounded-xl bg-zinc-900/80 p-1 mb-5 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('biometric');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'biometric' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Vân tay</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'camera' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Khuôn mặt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setErrorMsg(null);
              setSuccessMsg(null);
              setPinDigits(['', '', '', '', '', '']);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pin' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Mã PIN</span>
          </button>
        </div>

        {/* TAB 1: VÂN TAY (ƯU TIÊN HÀNG ĐẦU • NATIVE WEBAUTHN) */}
        {activeTab === 'biometric' && (
          <div className="flex flex-col items-center justify-center py-3 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
              <Fingerprint className="w-8 h-8 stroke-[1.5]" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-300 font-medium">
                Cảm biến sinh trắc học thiết bị
              </p>
              <p className="text-[11px] text-zinc-500">
                {isPlatformBiometricAvailable === false
                  ? 'Trình duyệt/thiết bị này có thể yêu cầu mở khóa qua màn hình bảo vệ'
                  : 'Sử dụng vân tay hoặc xác thực bảo mật của điện thoại'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNativeBiometric}
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kết nối cảm biến máy...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>{hasRegisteredPasskey ? 'Quét vân tay để mở khóa' : 'Kích hoạt & Quét vân tay máy'}</span>
                </>
              )}
            </button>

            {hasRegisteredPasskey && (
              <button
                type="button"
                onClick={handleResetPasskey}
                disabled={isAuthenticating}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Đặt lại liên kết vân tay thiết bị
              </button>
            )}
          </div>
        )}

        {/* TAB 2: KHUÔN MẶT (CHẶT CHẼ, CHỐNG FAKE) */}
        {activeTab === 'camera' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Viewfinder: strictly square, horizontally mirrored like selfie mirror */}
            <div className="relative w-52 h-52 aspect-square rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Angle guidance badge when enrolling */}
              {isEnrollingMode ? (
                <div className="absolute top-2 left-2 right-2 px-2 py-1 bg-black/75 backdrop-blur-xs rounded-lg text-center z-10">
                  <span className="text-[11px] font-medium text-white">
                    Góc {currentAngleStep}/3: {angleLabels[currentAngleStep].title}
                  </span>
                </div>
              ) : (
                /* Apple Face ID Laser Brackets & Scanner */
                <>
                  <div className="absolute inset-4 pointer-events-none z-10">
                    {/* 4 Face ID Corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  </div>
                  
                  {/* Subtle pulsing scanline */}
                  <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse pointer-events-none z-10" />

                  {/* Face ID Verified Overlay */}
                  {isAuthenticating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-20 animate-in zoom-in-95 duration-200">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold text-emerald-300 tracking-wide uppercase">ĐÃ XÁC THỰC FACE ID</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* If In Enrolling Mode: 3 Steps Progress */}
            {isEnrollingMode ? (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-center gap-2">
                  {([1, 2, 3] as const).map((ang) => {
                    const isDone = completedAngles.includes(ang);
                    const isCur = currentAngleStep === ang;
                    return (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => setCurrentAngleStep(ang)}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium border text-center transition-all ${
                          isDone
                            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                            : isCur
                            ? 'bg-zinc-800 border-zinc-600 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isDone ? `✓ Góc ${ang}` : `Góc ${ang}`}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-zinc-400 text-center">
                  {angleLabels[currentAngleStep].hint}
                </p>

                <button
                  type="button"
                  onClick={() => handleCaptureAngle(currentAngleStep)}
                  disabled={!cameraActive || isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu mẫu khuôn mặt...</span>
                    </>
                  ) : (
                    <span>Lưu mẫu góc {currentAngleStep} ({angleLabels[currentAngleStep].title})</span>
                  )}
                </button>
              </div>
            ) : (
              /* Normal Verification Mode - BẤM 1 CÁI VÀO LIỀN TỨC THÌ */
              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={handleVerifyFace}
                  disabled={!cameraActive || isAuthenticating}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Đang đối soát FaceNet AI...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Quét xác thực khuôn mặt</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-zinc-500 text-center">
                  Căn chỉnh khuôn mặt vào khung và bấm nút để vào hệ thống ngay
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MÃ PIN (NO AUTOFILL / ZERO PERSISTENCE) */}
        {activeTab === 'pin' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-5">
            {/* 6 Dots Indicator */}
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < currentPinStr.length;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      isFilled ? 'bg-white scale-110' : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Numeric input with explicit anti-autofill attributes */}
            <div className="relative w-full">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPinStr}
                onChange={handlePinChange}
                disabled={isAuthenticating}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="admin_secret_pin_otp"
                id="admin_secret_pin_otp"
                data-lpignore="true"
                data-form-type="other"
                placeholder="Nhập 6 chữ số bí mật..."
                className="w-full py-2.5 px-4 text-center rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm tracking-widest focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                autoFocus
              />
            </div>

            <p className="text-[11px] text-zinc-500">Mã PIN bảo mật quản trị gồm 6 chữ số</p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
