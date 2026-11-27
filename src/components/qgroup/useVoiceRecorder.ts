import { useState, useRef } from 'react';
import type { QGroup, QGroupMessage, UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import {
  getOptimalAudioDeviceId,
  cycleToNextMicrophone,
  setPreferredAudioDeviceId,
} from '../../utils/audioDeviceManager';

interface UseVoiceRecorderParams {
  activeGroup: QGroup | null;
  qgroups: QGroup[];
  applyGroups: (groups: QGroup[]) => void;
  myEmail: string;
  myName: string;
  currentUser?: UserProfile | null;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useVoiceRecorder({
  activeGroup,
  qgroups,
  applyGroups,
  myEmail,
  myName,
  currentUser,
  chatEndRef,
  onShowToast,
}: UseVoiceRecorderParams) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeMicLabel, setActiveMicLabel] = useState<string>('');
  const [liveMicLevels, setLiveMicLevels] = useState<number[]>([30, 50, 80, 60, 40, 70, 50, 30]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveWaveformSamplesRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startVoiceRecording = async () => {
    try {
      const optimal = await getOptimalAudioDeviceId();
      if (optimal.label) {
        setActiveMicLabel(optimal.label);
      }

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (optimal.deviceId) {
        audioConstraints.deviceId = { exact: optimal.deviceId };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;

      const activeTrack = stream.getAudioTracks()[0];
      if (activeTrack?.label) {
        setActiveMicLabel(activeTrack.label);
        if (optimal.deviceId) {
          setPreferredAudioDeviceId(optimal.deviceId, activeTrack.label);
        }
      }

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;
          liveWaveformSamplesRef.current = [];

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          const updateVisuals = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 0; i < freqData.length; i++) sum += freqData[i];
            const avg = sum / freqData.length;
            liveWaveformSamplesRef.current.push(avg);

            const bands = [
              Math.max(20, Math.min(100, Math.round((freqData[1] || 0) * 0.9))),
              Math.max(20, Math.min(100, Math.round((freqData[3] || 0) * 1.1))),
              Math.max(20, Math.min(100, Math.round((freqData[5] || 0) * 1.2))),
              Math.max(20, Math.min(100, Math.round((freqData[7] || 0) * 1.3))),
              Math.max(20, Math.min(100, Math.round((freqData[9] || 0) * 1.2))),
              Math.max(20, Math.min(100, Math.round((freqData[11] || 0) * 1.1))),
              Math.max(20, Math.min(100, Math.round((freqData[13] || 0) * 0.9))),
              Math.max(20, Math.min(100, Math.round((freqData[15] || 0) * 0.8))),
            ];
            setLiveMicLevels(bands);
            animFrameRef.current = requestAnimationFrame(updateVisuals);
          };
          animFrameRef.current = requestAnimationFrame(updateVisuals);
        }
      } catch (e) {
        console.warn('AudioContext not supported or blocked for live visualizer:', e);
      }

      let mimeType = '';
      const candidateMimes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      for (const cand of candidateMimes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) {
          mimeType = cand;
          break;
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      onShowToast(
        'error',
        'Không thể ghi âm',
        'Vui lòng cấp quyền truy cập micro cho trình duyệt.'
      );
    }
  };

  const cancelVoiceRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserStreamRef.current?.getTracks().forEach((track) => track.stop());
    analyserStreamRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    liveWaveformSamplesRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    onShowToast('info', 'Đã hủy ghi âm', 'Đoạn ghi âm chưa được gửi.');
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingSeconds;
    const recorder = mediaRecorderRef.current;

    const samples = liveWaveformSamplesRef.current;
    const targetCount = 30;
    let finalWaveform: number[] = [];
    if (samples.length > 0) {
      const step = samples.length / targetCount;
      let maxVal = 0.01;
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.min(samples.length - 1, Math.floor(i * step));
        const val = samples[idx] || 0;
        finalWaveform.push(val);
        if (val > maxVal) maxVal = val;
      }
      finalWaveform = finalWaveform.map((v) => Math.max(18, Math.min(100, Math.round((v / maxVal) * 100))));
    } else {
      finalWaveform = [35, 50, 75, 90, 65, 45, 80, 100, 70, 55, 60, 85, 40, 35, 55, 80, 95, 65, 45, 75, 85, 60, 50, 40, 60, 75, 50, 35];
    }

    recorder.onstop = async () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserStreamRef.current?.getTracks().forEach((track) => track.stop());
      analyserStreamRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      const actualMime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
      audioChunksRef.current = [];
      liveWaveformSamplesRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size < 100) {
        onShowToast('warning', 'Ghi âm quá ngắn', 'Vui lòng nói rõ ràng hơn.');
        return;
      }

      try {
        onShowToast('info', 'Đang gửi ghi âm...', `Thời lượng: ${formatDuration(duration)}`);
        const ext = actualMime.includes('mp4') ? 'm4a' : actualMime.includes('ogg') ? 'ogg' : 'webm';
        const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: actualMime });
        const formData = new FormData();
        formData.append('file', audioFile);

        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
            method: 'POST',
            body: formData,
          })
          .then((r) => r.json());

        if (res && res.fileUrl && activeGroup) {
          const now = Date.now();
          const newMsg: QGroupMessage = {
            id: `msg-${now}`,
            senderEmail: myEmail,
            senderName: myName,
            senderTitle: currentUser?.academicTitle || 'GV',
            senderAvatarUrl: currentUser?.avatarUrl || '',
            avatarColor: 'bg-slate-700',
            text: `🎙️ Tin nhắn thoại (${formatDuration(duration)})`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            isPinned: false,
            readBy: [myEmail],
            reactions: {},
            attachment: {
              type: 'audio',
              id: `att-${now}`,
              name: `Ghi âm (${formatDuration(duration)})`,
              fileUrl: res.fileUrl,
              size: res.size || `${Math.round(audioBlob.size / 1024)} KB`,
              duration: duration,
              waveform: finalWaveform,
            },
          };

          const updated = qgroups.map((g) =>
            g.id === activeGroup.id
              ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
              : g
          );
          applyGroups(updated);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

          const targetId = activeGroup.id || activeGroup.code;
          apiClient
            .fetch(
              `${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMsg),
              }
            )
            .catch(() => {});

          onShowToast('success', 'Đã gửi tin nhắn thoại', `Thời lượng: ${formatDuration(duration)}`);
        } else {
          throw new Error(res?.detail || 'Không thể lưu bản ghi âm');
        }
      } catch (err: any) {
        console.error('Error uploading voice recording:', err);
        onShowToast('error', 'Lỗi gửi tin nhắn thoại', err?.message || 'Không thể tải lên đoạn ghi âm.');
      }
    };

    try {
      if (recorder.state === 'recording') {
        recorder.requestData();
      }
    } catch (e) {}
    recorder.stop();
  };

  const handleCycleMic = async () => {
    try {
      const nextMic = await cycleToNextMicrophone();
      if (nextMic) {
        setActiveMicLabel(nextMic.label);
        onShowToast('info', 'Thiết bị âm thanh', `Đã chuyển sang: ${nextMic.label}`);
        if (isRecording) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: nextMic.deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            mediaStreamRef.current = newStream;
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              try {
                const newSource = audioContextRef.current.createMediaStreamSource(newStream);
                if (analyserRef.current) {
                  newSource.connect(analyserRef.current);
                }
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
  };

  return {
    isRecording,
    recordingSeconds,
    activeMicLabel,
    liveMicLevels,
    startVoiceRecording,
    cancelVoiceRecording,
    stopAndSendVoiceRecording,
    handleCycleMic,
  };
}
