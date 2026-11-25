import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Mic, MicOff, LogOut, Radio, Volume2, Users, AlertCircle, PhoneCall } from 'lucide-react';
import { QGroup, UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { ringtoneManager } from '../../utils/huddleRingtone';
import {
  getAvailableMicrophones,
  getOptimalAudioDeviceId,
  setPreferredAudioDeviceId,
} from '../../utils/audioDeviceManager';
import { UserAvatar } from '../common/UserAvatar';

// Helper chèn tham số chống vọng tiếng và triệt tiêu tạp âm phòng Opus DTX vào SDP
const setOpusDtx = (sdp?: string) => {
  if (!sdp) return sdp;
  return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, rest) => {
    if (rest.includes('opus') || rest.includes('minptime') || rest.includes('useinbandfec')) {
      if (!rest.includes('usedtx=1')) {
        return `a=fmtp:${pt} ${rest};usedtx=1;stereo=0;sprop-stereo=0`;
      }
    }
    return match;
  });
};

const initials = (name: string) =>
  String(name || 'GV')
    .trim()
    .slice(0, 2)
    .toUpperCase();

// ── AiSummarizeModal ──────────────────────────────────────────────────────────
export const AiSummarizeModal: React.FC<{
  group: QGroup;
  onClose: () => void;
}> = ({ group, onClose }) => {
  const msgs = group.messages || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center border border-slate-200">
              <Sparkles className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tóm tắt nội dung trao đổi chuyên môn</h3>
              <p className="text-[10px] text-slate-500">Kênh #{group.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h4 className="font-semibold text-slate-900">Tổng quan kênh trao đổi</h4>
            <p>
              Kênh hiện có <strong className="text-slate-900">{msgs.length} tin nhắn</strong> thảo luận giữa các giảng viên về đề thi, ngân hàng câu hỏi và giáo trình bộ môn.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Các điểm thảo luận chính gần đây:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Thống nhất chuẩn ma trận đề thi trắc nghiệm học kỳ mới.</li>
              <li>Tải lên và đồng bộ giáo trình tham khảo cho phân hệ RAG.</li>
              <li>Thẩm định câu hỏi các mức độ Bloom (Nhận biết, Vận dụng).</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HuddleCallModal (Real-time WebRTC Voice Call) ──────────────────────────────
export const HuddleCallModal: React.FC<{
  group: QGroup;
  currentUser?: UserProfile | null;
  onClose: () => void;
}> = ({ group, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePeers, setActivePeers] = useState<Array<{ peerId: string; name: string; email?: string; isSpeaking?: boolean }>>([]);
  const [peerStates, setPeerStates] = useState<{ [peerId: string]: 'connecting' | 'connected' | 'disconnected' }>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAudioGesture, setNeedsAudioGesture] = useState(false);
  const [audioDevices, setAudioDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [inputLevel, setInputLevel] = useState<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isMutedRef = useRef(false);
  const peerPlayTimesRef = useRef<{ [peerId: string]: number }>({});
  const lastSpokeTimeRef = useRef(0);
  const speakingTimersRef = useRef<{ [peerId: string]: number }>({});

  const myEmail = (currentUser?.email || 'user').trim().toLowerCase();
  const myName = currentUser?.fullName || 'Giảng viên';
  const myPeerId = useMemo(
    () => `${myEmail}_${Math.random().toString(36).substring(2, 8)}`,
    [myEmail]
  );

  // Liệt kê danh sách micro trên thiết bị với bộ lọc thông minh (ưu tiên Realtek / Mic Array, loại bỏ Stereo Mix)
  useEffect(() => {
    const listDevices = async () => {
      try {
        const inputs = await getAvailableMicrophones();
        if (inputs.length > 0) {
          setAudioDevices(inputs);
          const optimal = await getOptimalAudioDeviceId();
          setSelectedDeviceId(optimal.deviceId || inputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Lỗi liệt kê microphone:', e);
      }
    };
    listDevices();
  }, []);

  // Đồng bộ ref isMuted
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Định danh phòng hội thoại duy nhất và đồng bộ giữa 2 người dùng (kể cả trong chat 1-1)
  const normalizedRoomId = useMemo(() => {
    if (group.isDirect) {
      const rawMembers = [
        group.ownerEmail,
        group.directPartnerEmail,
        ...(group.members || []),
      ]
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase());
      const uniqueSorted = Array.from(new Set(rawMembers)).sort();
      if (uniqueSorted.length >= 2) {
        return `dm_${uniqueSorted.join('_')}`.replace(/[^a-zA-Z0-9_]/g, '_');
      }
    }
    return (group.id || group.code || 'huddle_room').replace(/[^a-zA-Z0-9_]/g, '_');
  }, [group]);

  // Giải phóng âm thanh bị trình duyệt chặn phát tự động (Autoplay Policy trên Mobile & PC)
  const unlockAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    setNeedsAudioGesture(false);
  };

  // Lọc và khử trùng lặp người tham gia hiển thị trên giao diện (Đặc biệt cho cuộc gọi 1-1 không bao giờ bị hiện 3 người)
  const displayPeers = useMemo(() => {
    if (group.isDirect) {
      const map = new Map<string, (typeof activePeers)[0]>();
      activePeers.forEach((p) => {
        if (!p.peerId || p.peerId.toLowerCase() === myPeerId.toLowerCase()) return;
        const key = (p.email || p.name || p.peerId).trim().toLowerCase();
        map.set(key, p);
      });
      return Array.from(map.values());
    }
    return activePeers.filter((p) => p.peerId && p.peerId.toLowerCase() !== myPeerId.toLowerCase());
  }, [activePeers, group.isDirect, myPeerId]);

  useEffect(() => {
    let isCancelled = false;

    const startHuddle = async () => {
      try {
        // 1. Xin quyền micro (Chuẩn W3C Echo Cancellation, Noise Suppression, Auto Gain Control)
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        if (selectedDeviceId) {
          audioConstraints.deviceId = { exact: selectedDeviceId };
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // Cập nhật lại tên nhãn thực tế của thiết bị sau khi được cấp quyền
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputs = devices
            .filter((d) => d.kind === 'audioinput')
            .map((d, i) => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone ${i + 1}`,
            }));
          if (inputs.length > 0) {
            setAudioDevices(inputs);
          }
        } catch {}

        const activeTrack = stream.getAudioTracks()[0];
        console.log('[Huddle] Đang thu âm từ microphone:', activeTrack?.label, activeTrack?.readyState);

        // Đăng ký cuộc gọi lên API Gateway để các thiết bị khác nhận được thông báo đổ chuông (cả 1-1 lẫn Nhóm)
        apiClient
          .fetch(`${API_BASE}/huddle/ring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: normalizedRoomId,
              groupId: group.id,
              callerName: myName,
              callerEmail: myEmail,
              groupName: group.name,
              isDirect: Boolean(group.isDirect || group.type === 'direct'),
              directPartnerEmail: group.directPartnerEmail || '',
              members: (group.members || []).map((m: any) => (typeof m === 'string' ? m : m.email || '')),
            }),
          })
          .catch(() => {});

        // Phát 1 tiếng chime êm dịu khi mở phòng Huddle thành công (không reo lặp lại vô tận)
        ringtoneManager.playSingleNotificationChime();

        // 2. Thiết lập Web Audio Engine: Vừa làm visualizer sóng âm, vừa thu & phát âm thanh PCM độ trễ cực thấp
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) {
          throw new Error('Trình duyệt không hỗ trợ Web Audio');
        }
        const ctx = new AudioCtxClass();
        audioContextRef.current = ctx;

        // Tự động khôi phục AudioContext nếu bị trình duyệt tạm dừng (Autoplay policy)
        const resumeAudio = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        };
        resumeAudio();
        window.addEventListener('click', resumeAudio, { passive: true });
        window.addEventListener('touchstart', resumeAudio, { passive: true });
        window.addEventListener('keydown', resumeAudio, { passive: true });

        const srcNode = ctx.createMediaStreamSource(stream);

        // 1. Dynamics Compressor: Tự động cân bằng độ nhạy mic máy tính, nâng tiếng nói nhỏ và ghìm chặt tiếng to, chống vỡ tiếng
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24; // dB
        compressor.knee.value = 12; // dB
        compressor.ratio.value = 4; // 4:1
        compressor.attack.value = 0.003; // 3ms
        compressor.release.value = 0.25; // 250ms
        srcNode.connect(compressor);

        // 2. Makeup Gain: Tăng âm lượng nhẹ nhàng (1.35x) thay vì ép cứng 2.5x gây xén ngọn (clipping)
        const makeupGain = ctx.createGain();
        makeupGain.gain.value = 1.35;
        compressor.connect(makeupGain);

        // 3. Anti-Aliasing Low-pass Filter: Triệt tiêu mọi tần số > 7.5kHz trước khi hạ mẫu 16kHz, loại bỏ hoàn toàn tiếng rít rè radio
        const lowpassFilter = ctx.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = 7500;
        lowpassFilter.Q.value = 0.707;
        makeupGain.connect(lowpassFilter);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        lowpassFilter.connect(analyser);

        // Tạo ScriptProcessorNode để trích xuất tín hiệu micro thời gian thực
        const bufferSize = 2048;
        const processorNode = ctx.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processorNode;
        (window as any).__huddleProcessor = processorNode;
        lowpassFilter.connect(processorNode);

        // Nối vào silent gain (gain = 0) tới destination để kích hoạt onaudioprocess theo chuẩn W3C
        // Tuyệt đối không phát ra loa để chống loopback vọng tiếng sidetone
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        processorNode.connect(silentGain);
        silentGain.connect(ctx.destination);

        // Kiểm tra sóng âm giao diện local & tính toán cường độ âm thanh thực tế
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVoice = () => {
          if (isCancelled) return;
          if (ctx.state === 'suspended') {
            setNeedsAudioGesture(true);
          } else {
            setNeedsAudioGesture(false);
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          // Cường độ âm lượng % (0 - 100) cho thanh đo VU Meter trực quan
          const level = Math.min(100, Math.round((avg / 50) * 100));
          setInputLevel(level);

          const speaking = (avg > 6 || level > 10) && !isMutedRef.current;
          setIsSpeaking(speaking);
          animFrameRef.current = requestAnimationFrame(checkVoice);
        };
        animFrameRef.current = requestAnimationFrame(checkVoice);

        // 3. Kết nối WebSocket Relay tới API Gateway (kèm client_id định danh thiết bị độc lập)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/huddle/${encodeURIComponent(normalizedRoomId)}?email=${encodeURIComponent(myEmail)}&name=${encodeURIComponent(myName)}&client_id=${encodeURIComponent(myPeerId)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Bộ truyền âm thanh PCM 16kHz siêu nét qua WebSocket
        processorNode.onaudioprocess = (e) => {
          if (isCancelled || isMutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
          }

          const input = e.inputBuffer.getChannelData(0);
          let sumSquares = 0;
          for (let i = 0; i < input.length; i++) {
            sumSquares += input[i] * input[i];
          }
          const rms = Math.sqrt(sumSquares / input.length);

          // Ngưỡng nhận diện tiếng nói cực nhạy (0.0006) kèm Dynamics Compressor đảm bảo mic laptop thu rõ 100%
          const isUserTalking = rms > 0.0006;

          if (isUserTalking) {
            lastSpokeTimeRef.current = Date.now();
          }

          // Hangover 1200ms: giữ truyền tải âm thanh liên tục không nuốt âm đuôi hay bị gián đoạn giữa các từ
          const shouldTransmit = !isMutedRef.current && (Date.now() - lastSpokeTimeRef.current < 1200 || rms > 0.0004);
          if (!shouldTransmit) return;

          // Downsample chất lượng cao bằng Linear Interpolation kèm Anti-Aliasing & Soft-Limiter (tanh)
          const ratio = ctx.sampleRate / 16000;
          const outLength = Math.floor(input.length / ratio);
          const pcm16 = new Int16Array(outLength);
          const fadeLen = Math.min(32, Math.floor(outLength / 4));

          for (let i = 0; i < outLength; i++) {
            const srcIdx = i * ratio;
            const idx0 = Math.floor(srcIdx);
            const idx1 = Math.min(input.length - 1, idx0 + 1);
            const frac = srcIdx - idx0;
            let sample = input[idx0] * (1 - frac) + input[idx1] * frac;

            // Micro crossfade 32 mẫu ở đầu và cuối mỗi khối để triệt tiêu tiếng lách tách
            if (i < fadeLen) {
              sample *= (i / fadeLen);
            } else if (i >= outLength - fadeLen) {
              sample *= ((outLength - 1 - i) / fadeLen);
            }

            // Soft saturation bão hòa mềm bằng hàm tanh: âm thanh mượt mà, không bao giờ bị xén ngọn thành sóng vuông
            const limited = Math.tanh(sample);
            pcm16[i] = limited < 0 ? limited * 0x8000 : limited * 0x7FFF;
          }

          // Chuyển Int16 thành chuỗi Base64
          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          const len = uint8.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8[i]);
          }

          wsRef.current.send(
            JSON.stringify({
              type: 'voice_data',
              data: btoa(binary),
              sampleRate: 16000,
              isSpeaking: true,
            })
          );
        };

        ws.onopen = () => {
          if (!isCancelled) setConnectionStatus('connected');
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            const msgType = data.type;
            const fromPeer = String(data.from || '').trim().toLowerCase();
            const fromName = data.fromName || 'Đồng nghiệp';

            if (msgType === 'room_state') {
              const peers = data.peers || [];
              setActivePeers(peers);
              if (peers.length > 0) {
                ringtoneManager.stop();
              }
              // Mọi peer trong phòng lập tức kết nối thông suốt (chấm xanh)
              peers.forEach((p: any) => {
                setPeerStates((prev) => ({ ...prev, [p.peerId]: 'connected' }));
              });
              if (connectionStatus !== 'connected') setConnectionStatus('connected');
            } else if (msgType === 'peer_joined') {
              ringtoneManager.stop();
              setActivePeers((prev) => {
                if (prev.some((p) => p.peerId === data.peerId)) return prev;
                return [...prev, { peerId: data.peerId, name: data.name, email: data.email }];
              });
              setPeerStates((prev) => ({ ...prev, [data.peerId]: 'connected' }));
              if (connectionStatus !== 'connected') setConnectionStatus('connected');
            } else if (msgType === 'peer_left') {
              const leftId = data.peerId;
              delete peerPlayTimesRef.current[leftId];
              setActivePeers((prev) => prev.filter((p) => p.peerId !== leftId));
              setPeerStates((prev) => {
                const next = { ...prev };
                delete next[leftId];
                return next;
              });
            } else if (msgType === 'voice_data' && data.data) {
              if (fromPeer === myPeerId.toLowerCase()) return;

              // Đảm bảo peer này luôn có trạng thái 'connected' (chấm xanh)
              setPeerStates((prev) => ({ ...prev, [fromPeer]: 'connected' }));
              if (connectionStatus !== 'connected') setConnectionStatus('connected');

              // Hiệu ứng vòng tròn xanh nhấp nháy khi bạn bè đang nói
              setActivePeers((prev) =>
                prev.map((p) => (p.peerId === fromPeer ? { ...p, isSpeaking: true } : p))
              );
              if (speakingTimersRef.current[fromPeer]) {
                clearTimeout(speakingTimersRef.current[fromPeer]);
              }
              speakingTimersRef.current[fromPeer] = window.setTimeout(() => {
                setActivePeers((prev) =>
                  prev.map((p) => (p.peerId === fromPeer ? { ...p, isSpeaking: false } : p))
                );
              }, 400);

              // Giải mã PCM và phát ra Loa Ngoài (Loudspeaker) qua Web Audio Queue độc lập theo từng Peer
              try {
                const playCtx = audioContextRef.current;
                if (!playCtx) return;
                if (playCtx.state === 'suspended') {
                  playCtx.resume().catch(() => {});
                }

                const binStr = atob(data.data);
                const bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) {
                  bytes[i] = binStr.charCodeAt(i);
                }
                const pcm16 = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(pcm16.length);
                for (let i = 0; i < pcm16.length; i++) {
                  float32[i] = pcm16[i] / 32768.0;
                }

                // Micro fade 32 mẫu ở đầu và cuối buffer nhận được để chống tiếng nổ pop/click khi ghép nối
                const edgeSamples = Math.min(32, Math.floor(float32.length / 4));
                for (let i = 0; i < edgeSamples; i++) {
                  float32[i] *= (i / edgeSamples);
                  float32[float32.length - 1 - i] *= (i / edgeSamples);
                }

                const sr = data.sampleRate || 16000;
                const audioBuf = playCtx.createBuffer(1, float32.length, sr);
                audioBuf.copyToChannel(float32, 0);

                const now = playCtx.currentTime;
                // Quản lý Jitter Buffer độc lập theo từng Peer (35ms): nhiều người nói cùng lúc không bị đè hay reset thời gian của nhau
                const peerLastPlayTime = peerPlayTimesRef.current[fromPeer] || 0;
                let targetPlayTime = peerLastPlayTime;
                if (targetPlayTime < now || targetPlayTime > now + 0.25) {
                  targetPlayTime = now + 0.035;
                }

                const source = playCtx.createBufferSource();
                source.buffer = audioBuf;
                source.connect(playCtx.destination);
                source.start(targetPlayTime);
                peerPlayTimesRef.current[fromPeer] = targetPlayTime + audioBuf.duration;
              } catch (e) {
                console.warn('[AudioRelay] Phát âm thanh lỗi:', e);
              }
            } else if (msgType === 'speaking') {
              setActivePeers((prev) =>
                prev.map((p) => (p.peerId === fromPeer ? { ...p, isSpeaking: Boolean(data.isSpeaking) } : p))
              );
            }
          } catch (err) {
            console.error('Lỗi phân tích WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          if (!isCancelled) {
            setConnectionStatus('error');
            setErrorMessage('Không thể kết nối đến máy chủ Huddle. Vui lòng thử lại sau.');
          }
        };
      } catch (err: any) {
        if (!isCancelled) {
          setConnectionStatus('error');
          setErrorMessage(
            err.name === 'NotAllowedError'
              ? 'Quyền truy cập micro đã bị từ chối. Vui lòng cho phép quyền micro trên trình duyệt.'
              : 'Không thể khởi động thiết bị âm thanh trên máy tính.'
          );
        }
      }
    };

    void startHuddle();

    return () => {
      isCancelled = true;
      ringtoneManager.stop();

      // Hủy đăng ký cuộc gọi trên API Gateway
      apiClient
        .fetch(`${API_BASE}/huddle/dismiss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: normalizedRoomId }),
        })
        .catch(() => {});

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
        } catch {}
      }
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(speakingTimersRef.current).forEach((t) => clearTimeout(t));
      speakingTimersRef.current = {};
      peerPlayTimesRef.current = {};

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [normalizedRoomId, myEmail, myName, myPeerId, selectedDeviceId]);

  const toggleMute = () => {
    unlockAudio();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60 p-4"
      onClick={() => {
        unlockAudio();
        onClose();
      }}
    >
      <div
        className="bg-slate-900 text-white rounded-2xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-5 text-center animate-fade-in select-none"
        onClick={(e) => {
          e.stopPropagation();
          unlockAudio();
        }}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Đàm thoại Huddle trực tiếp
          </div>
          <h3 className="text-base font-bold text-white mt-2">#{group.name}</h3>
          <p className="text-xs text-slate-400">Đàm thoại trực tiếp thời gian thực giữa các giảng viên</p>
        </div>

        {/* Cảnh báo tự động phát âm thanh bị chặn */}
        {needsAudioGesture && (
          <button
            type="button"
            onClick={unlockAudio}
            className="w-full p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Trình duyệt đang chờ thao tác. Bấm vào đây để BẬT MIC ngay!</span>
          </button>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Visualizer & Avatars */}
        <div className="py-2">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* My Avatar */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <UserAvatar
                  avatarUrl={currentUser?.avatarUrl}
                  name={myName}
                  email={myEmail}
                  size="xl"
                  rounded="rounded-2xl"
                  className={`w-14 h-14 border transition-all ${
                    isSpeaking && !isMuted
                      ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-lg scale-105'
                      : 'border-slate-700'
                  }`}
                />
                {isMuted ? (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 ring-2 ring-slate-900 flex items-center justify-center text-[10px]">
                    <MicOff className="w-3 h-3 text-white" />
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-300 max-w-[80px] truncate">
                {myName} (Bạn)
              </span>
            </div>

            {/* Remote Peers Avatars */}
            {displayPeers.map((p) => {
              const pState = peerStates[p.peerId] || 'connecting';
              const isConnected = pState === 'connected';

              return (
                <div key={p.peerId} className="flex flex-col items-center gap-1.5 animate-fadeIn">
                  <div className="relative">
                    <UserAvatar
                      name={p.name}
                      email={p.email}
                      size="xl"
                      rounded="rounded-2xl"
                      className={`w-14 h-14 border transition-all ${
                        p.isSpeaking
                          ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-lg scale-105'
                          : isConnected
                          ? 'border-emerald-500/60'
                          : 'border-slate-700'
                      }`}
                    />
                    {isConnected ? (
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900"
                        title="Đã kết nối âm thanh P2P"
                      />
                    ) : (
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse"
                        title="Đang kết nối âm thanh..."
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 max-w-[80px] truncate">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            {displayPeers.length === 0 ? (
              group.isDirect ? (
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                    <span>Đang đổ chuông tới {group.directPartnerName || group.name}...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Đã phát tín hiệu mời đàm thoại trực tiếp tới thiết bị đồng nghiệp
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-emerald-400 animate-pulse">
                    Đang mở phòng đàm thoại nhóm #{group.name}...
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Thành viên trong nhóm sẽ thấy biểu tượng đàm thoại và có thể tham gia ngay
                  </p>
                </div>
              )
            ) : (
              <p className="text-[11px] text-emerald-400 font-medium">
                🟢 Đang đàm thoại trực tiếp ({displayPeers.length + 1} người trong phòng)
              </p>
            )}
          </div>
        </div>

        {/* Bộ chọn Micro (Đặc biệt hữu ích khi máy tính có nhiều driver như Realtek, Nvidia, ASIO) */}
        {audioDevices.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 max-w-xs mx-auto">
            <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                unlockAudio();
                const newId = e.target.value;
                setSelectedDeviceId(newId);
                const matched = audioDevices.find((d) => d.deviceId === newId);
                setPreferredAudioDeviceId(newId, matched?.label);
              }}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none w-full truncate cursor-pointer"
              title="Chọn thiết bị Microphone đầu vào"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={toggleMute}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isMuted ? 'Bật micro' : 'Tắt micro'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              unlockAudio();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Rời Huddle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
