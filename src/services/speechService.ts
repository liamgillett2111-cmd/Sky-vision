import { Aircraft } from '../types';

/**
 * Text-to-Speech Engine tailored for Aviation and Screen Reader Accessibility
 */
class SpeechService {
  private isEnabled: boolean = true;
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private synth: SpeechSynthesis | null = null;
  private lastAnnouncedCallsign: string = '';
  private lastAnnouncementTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.6, Math.min(1.8, rate));
  }

  public setPitch(pitch: number) {
    this.speechPitch = Math.max(0.6, Math.min(1.5, pitch));
  }

  /**
   * Format callsign phonetically for clear screen reader pronunciation
   * e.g., "BAW117" -> "B A W 1 1 7"
   */
  public formatCallsignForSpeech(callsign: string): string {
    return callsign.split('').join(' ');
  }

  /**
   * Speak a text string with priority option
   */
  public speak(text: string, interrupt: boolean = false) {
    if (!this.isEnabled || !this.synth) return;

    if (interrupt) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;

    // Pick an English voice if available
    const voices = this.synth.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google') || v.lang === 'en-US' || v.lang === 'en-GB');
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    this.synth.speak(utterance);
  }

  /**
   * Clear all pending speech
   */
  public cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Speak an immediate lock-on announcement when user points at a plane in the sky
   */
  public announceTargetLock(plane: Aircraft) {
    const now = Date.now();
    // Don't repeat the exact same plane within 4 seconds unless it's a new lock
    if (this.lastAnnouncedCallsign === plane.callsign && now - this.lastAnnouncementTime < 4000) {
      return;
    }
    this.lastAnnouncedCallsign = plane.callsign;
    this.lastAnnouncementTime = now;

    const flightId = plane.airline 
      ? `${plane.airline}, flight ${plane.flightNumber || this.formatCallsignForSpeech(plane.callsign)}` 
      : `Aircraft ${this.formatCallsignForSpeech(plane.callsign)}`;
    
    const route = plane.originAirport && plane.destinationAirport
      ? `from ${plane.originAirport.city} to ${plane.destinationAirport.city}`
      : '';
    
    const altitude = `${Math.round(plane.baroAltitude).toLocaleString()} feet`;
    const elevation = `${plane.elevationAngleDeg} degrees in the sky`;
    const distance = `${plane.distanceMiles.toFixed(1)} miles away`;

    const message = `Target locked. ${flightId}. ${plane.aircraftModel}. ${route}. Altitude ${altitude}, ${elevation}, ${distance}.`;
    this.speak(message, true);
  }

  /**
   * Speak full comprehensive flight briefing (for TalkBack or detail modal)
   */
  public announceFlightDetail(plane: Aircraft) {
    const airline = plane.airline || 'Unknown Operator';
    const flight = plane.flightNumber ? `Flight ${plane.flightNumber}` : `Callsign ${this.formatCallsignForSpeech(plane.callsign)}`;
    const model = plane.aircraftModel || 'Commercial Aircraft';
    const route = plane.originAirport && plane.destinationAirport
      ? `flying from ${plane.originAirport.name}, ${plane.originAirport.city}, to ${plane.destinationAirport.name}, ${plane.destinationAirport.city}`
      : `registered in ${plane.originCountry}`;

    const altitude = `${Math.round(plane.baroAltitude).toLocaleString()} feet`;
    const speed = `${Math.round(plane.velocity)} knots, approximately ${Math.round(plane.velocity * 1.15)} miles per hour`;
    const climbState = plane.verticalRate > 300 
      ? `climbing at ${Math.round(plane.verticalRate)} feet per minute` 
      : plane.verticalRate < -300 
        ? `descending at ${Math.abs(Math.round(plane.verticalRate))} feet per minute` 
        : 'level flight';

    const position = `Bearing ${plane.bearingCardinal}, at your ${plane.clockPosition}, ${plane.distanceMiles.toFixed(1)} miles from your location, angled ${plane.elevationAngleDeg} degrees above the horizon.`;

    const squawkInfo = plane.squawk === '7700' 
      ? 'Warning: Transmitting squawk 7700 general emergency.' 
      : plane.squawk === '7600' 
        ? 'Warning: Transmitting squawk 7600 radio failure.' 
        : `Squawk code ${plane.squawk}.`;

    const fullBrief = `${airline} ${flight}. ${model}. ${route}. Currently at ${altitude}, ${climbState}, ground speed ${speed}. ${position} ${squawkInfo}`;
    this.speak(fullBrief, true);
  }
}

export const speechService = new SpeechService();
