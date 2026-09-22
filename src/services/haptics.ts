/**
 * Haptic Vibration Feedback Service
 * Provides tactile pulses for blind users when sweeping the sky or locking onto aircraft
 */

class HapticsService {
  private isEnabled: boolean = true;
  private lastVibeTime: number = 0;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  private canVibrate(): boolean {
    return this.isEnabled && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator;
  }

  /**
   * Gentle tick when sweeping sectors or changing compass alignment
   */
  public lightTick() {
    if (!this.canVibrate()) return;
    const now = Date.now();
    if (now - this.lastVibeTime < 150) return;
    this.lastVibeTime = now;
    try {
      navigator.vibrate(25);
    } catch {}
  }

  /**
   * Double pulse when an aircraft enters the field of view (~15 degrees)
   */
  public aircraftInSight() {
    if (!this.canVibrate()) return;
    const now = Date.now();
    if (now - this.lastVibeTime < 800) return;
    this.lastVibeTime = now;
    try {
      navigator.vibrate([60, 50, 60]);
    } catch {}
  }

  /**
   * Strong distinct pulse sequence when pointing directly at the aircraft (<6 degrees)
   */
  public targetLocked() {
    if (!this.canVibrate()) return;
    const now = Date.now();
    if (now - this.lastVibeTime < 1500) return;
    this.lastVibeTime = now;
    try {
      navigator.vibrate([100, 60, 140, 60, 200]);
    } catch {}
  }

  /**
   * Emergency / alert vibration
   */
  public alert() {
    if (!this.canVibrate()) return;
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch {}
  }
}

export const haptics = new HapticsService();
