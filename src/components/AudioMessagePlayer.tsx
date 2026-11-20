import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, Mic } from 'lucide-react';

interface AudioMessagePlayerProps {
  attachment: {
    fileUrl?: string;
    name?: string;
    size?: string;
    duration?: number;
    waveform?: number[];
  };
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({ attachment, onShowToast }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [waveform, setWaveform] = useState<number[]>(
    attachment.waveform && attachment.waveform.length > 0
      ? attachment.waveform
      : [35, 50, 75, 90, 65, 45, 80, 100, 70, 55, 60, 85, 40, 35, 55, 80, 95, 65, 45, 75, 85, 60, 50, 40, 60, 75, 50, 35]
  );

  // Extract real waveform from PCM audio data if not pre-computed
  useEffect(() => {
    if (attachment.waveform && attachment.waveform.length > 0) {
      setWaveform(attachment.waveform);
      return;
    }
    if (!attachment.fileUrl) return;

    let isMounted = true;
    fetch(attachment.fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.arrayBuffer();
      })
      .then((buf) => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioCtx.decodeAudioData(buf);
      })
      .then((audioBuffer) => {
        if (!isMounted) return;
        const channelData = audioBuffer.getChannelData(0);
        const barCount = 30;
        const blockSize = Math.floor(channelData.length / barCount);
        if (blockSize <= 0) return;
        const peaks: number[] = [];
        let maxVal = 0.001;
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j]);
          }
          const avg = sum / blockSize;
          peaks.push(avg);
          if (avg > maxVal) maxVal = avg;
        }
        const normalized = peaks.map((p) => Math.max(18, Math.min(100, Math.round((p / maxVal) * 100))));
        setWaveform(normalized);
      })
      .catch((err) => {
        console.warn('Real waveform decode notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [attachment.fileUrl, attachment.waveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.error('Audio playback error', e);
          setIsPlaying(false);
          onShowToast('error', 'Không thể phát âm thanh', 'Trình duyệt bị chặn phát âm thanh hoặc tệp chưa tải xong.');
        });
      }
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!attachment.fileUrl) return;
    const rawUrl = attachment.fileUrl;
    const dlUrl = rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'download=true';
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = attachment.name || 'voice_recording.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('info', 'Đang tải đoạn ghi âm...', attachment.name || 'Ghi âm');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-3 rounded-2xl bg-gradient-to-r from-teal-50/80 to-slate-50 border border-teal-200/80 shadow-2xs max-w-sm w-full select-none"
    >
      {attachment.fileUrl && (
        <audio
          ref={audioRef}
          src={attachment.fileUrl}
          preload="auto"
          playsInline
        />
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause circular button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-all"
          title={isPlaying ? 'Tạm dừng' : 'Phát ghi âm'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Center waveform and track */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1 text-teal-800">
              <Mic className="w-3 h-3 text-teal-600" />
              <span>{attachment.name || 'Tin nhắn thoại'}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Interactive Waveform / Slider */}
          <div className="relative h-6 flex items-center gap-0.5 cursor-pointer">
            <div className="absolute inset-0 flex items-center gap-0.5 pointer-events-none">
              {waveform.map((h, i) => {
                const barProgress = (i / waveform.length) * 100;
                const isPassed = barProgress <= progressPercent;
                return (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isPassed ? 'bg-teal-600' : 'bg-slate-300'
                    }`}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Speed toggle and download */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleSpeed}
            className="px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-200/80 text-[10px] font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Tải đoạn ghi âm về máy"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
