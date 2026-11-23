/**
 * Bộ tạo âm thanh chuông gọi Huddle bằng Web Audio API Synthesizer
 * Không phụ thuộc file mp3 ngoài, hoạt động mượt mà trên cả máy tính và di động.
 */

class HuddleRingtoneManager {
  private ctx: AudioContext | null = null;
  private ringInterval: any = null;
  private isRinging: boolean = false;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Phát 1 tiếng chuông thông báo 'bính boong' (chime) duy nhất khi có người mở Huddle
   * Không lặp lại vô tận, êm dịu, chuẩn phong cách Slack/Discord
   */
  public playSingleNotificationChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.frequency.setValueAtTime(880.00, now); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Notification chime play error:', e);
    }
  }

  /**
   * Phát chuông cuộc gọi đến (Nhạc chuông điện thoại 2 nốt cao du dương)
   */
  public startIncomingRingtone(): void {
    if (this.isRinging) return;
    this.isRinging = true;

    const playDualTone = () => {
      if (!this.isRinging) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        // Chu kỳ rung 1: 2 nốt ngân 440Hz & 480Hz
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now); // E5

        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
        gain.gain.setValueAtTime(0.18, now + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        // Nốt tiếp theo
        osc1.frequency.setValueAtTime(783.99, now + 1.0); // G5
        osc2.frequency.setValueAtTime(1046.5, now + 1.0); // C6
        gain.gain.setValueAtTime(0.001, now + 1.0);
        gain.gain.linearRampToValueAtTime(0.18, now + 1.1);
        gain.gain.setValueAtTime(0.18, now + 1.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);
      } catch (e) {
        console.warn('Ringtone play error:', e);
      }
    };

    playDualTone();
    this.ringInterval = setInterval(playDualTone, 3000);
  }

  /**
   * Phát 1 tiếng báo nhẹ nhàng khi mở phòng Huddle (thay vì tút tút dồn dập trong lúc chờ)
   */
  public startOutgoingCallingTone(): void {
    // Chỉ phát 1 tiếng chime êm dịu lúc bắt đầu để xác nhận mic/phòng đã sẵn sàng
    this.playSingleNotificationChime();
  }

  /**
   * Dừng toàn bộ chuông
   */
  public stop(): void {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const ringtoneManager = new HuddleRingtoneManager();
