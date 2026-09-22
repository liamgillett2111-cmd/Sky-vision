/**
 * Audio Beacon & Sonar Feedback System
 * Designed specifically for non-visual audio navigation and sky pointing
 */

class AudioBeaconService {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5;
  private activeToneOsc: OscillatorNode | null = null;
  private activeToneGain: GainNode | null = null;
  private lastPulseTime: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopContinuousTone();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Short radar ping chirp
   */
  public playRadarPing(pitchHz: number = 520) {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitchHz, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitchHz * 1.5, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Chime when phone locks directly onto an aircraft in the sky
   */
  public playTargetLock() {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High bright 2-tone chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(this.volume * 0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      gain2.gain.setValueAtTime(this.volume * 0.6, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.38);
    } catch {
      // Ignore audio error
    }
  }

  /**
   * Continuous or pulsed audio beacon as device points closer to aircraft.
   * separationDeg: 0 to 45 degrees.
   * As separation drops from 30° to 0°, tone frequency increases from 400Hz to 1100Hz,
   * and pulse rate increases from 1 per second to rapid machine-gun beep.
   */
  public updateSkyPointerProximity(separationDeg: number) {
    if (!this.isEnabled) return;
    if (separationDeg > 35) {
      // Out of range
      return;
    }

    const now = Date.now();
    // Calculate pulse interval: at 35° -> 1200ms, at 0° -> 140ms
    const factor = Math.max(0, Math.min(1, separationDeg / 35));
    const interval = 140 + factor * 1060;

    if (now - this.lastPulseTime >= interval) {
      this.lastPulseTime = now;
      const pitch = 1100 - factor * 700; // 400Hz up to 1100Hz
      const duration = 0.06;

      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        gain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Stop any continuous sound
   */
  public stopContinuousTone() {
    if (this.activeToneOsc) {
      try {
        this.activeToneOsc.stop();
        this.activeToneOsc.disconnect();
      } catch {}
      this.activeToneOsc = null;
      this.activeToneGain = null;
    }
  }
}

export const audioBeacon = new AudioBeaconService();
