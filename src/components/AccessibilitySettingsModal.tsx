import React from 'react';
import { AccessibilitySettings, UnitSystem, UserLocation } from '../types';
import { MAJOR_AIRPORT_HUBS } from '../services/flightDataService';
import { speechService } from '../services/speechService';
import { audioBeacon } from '../services/audioBeacon';
import { haptics } from '../services/haptics';
import { X, Volume2, Vibrate, Compass, MapPin, Sliders, ShieldCheck } from 'lucide-react';

interface AccessibilitySettingsModalProps {
  settings: AccessibilitySettings;
  userLocation: UserLocation;
  onUpdateSettings: (newSettings: AccessibilitySettings) => void;
  onSelectHub: (hubKey: string) => void;
  onClose: () => void;
}

export const AccessibilitySettingsModal: React.FC<AccessibilitySettingsModalProps> = ({
  settings,
  userLocation,
  onUpdateSettings,
  onSelectHub,
  onClose,
}) => {
  const handleToggleVoice = () => {
    const updated = { ...settings, voiceAnnouncements: !settings.voiceAnnouncements };
    onUpdateSettings(updated);
    speechService.setEnabled(updated.voiceAnnouncements);
    haptics.lightTick();
  };

  const handleSpeechRateChange = (rate: number) => {
    const updated = { ...settings, speechRate: rate };
    onUpdateSettings(updated);
    speechService.setRate(rate);
  };

  const handleToggleAudioBeacon = () => {
    const updated = { ...settings, audioBeacon: !settings.audioBeacon };
    onUpdateSettings(updated);
    audioBeacon.setEnabled(updated.audioBeacon);
    haptics.lightTick();
  };

  const handleVolumeChange = (vol: number) => {
    const updated = { ...settings, audioVolume: vol };
    onUpdateSettings(updated);
    audioBeacon.setVolume(vol);
  };

  const handleToggleHaptics = () => {
    const updated = { ...settings, hapticFeedback: !settings.hapticFeedback };
    onUpdateSettings(updated);
    haptics.setEnabled(updated.hapticFeedback);
    if (updated.hapticFeedback) {
      haptics.targetLocked();
    }
  };

  const handleToggleClockBearing = () => {
    const updated = { ...settings, clockBearing: !settings.clockBearing };
    onUpdateSettings(updated);
    haptics.lightTick();
  };

  const handleUnitChange = (unit: UnitSystem) => {
    const updated = { ...settings, unitSystem: unit };
    onUpdateSettings(updated);
    haptics.lightTick();
  };

  return (
    <div
      id="settings-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div 
        id="settings-modal-card"
        className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-amber-400" aria-hidden="true" />
            <h2 id="settings-dialog-title" className="text-xl font-bold text-white">
              Accessibility & Sound Options
            </h2>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center justify-center min-w-[48px] min-h-[48px]"
            aria-label="Close settings dialog"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Voice Announcer Settings */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-amber-400" />
                Spoken Voice Announcements
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically speaks when overhead aircraft are targeted or locked.
              </p>
            </div>
            <button
              id="btn-toggle-voice"
              onClick={handleToggleVoice}
              className={`px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] transition ${
                settings.voiceAnnouncements
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              aria-pressed={settings.voiceAnnouncements}
            >
              {settings.voiceAnnouncements ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {settings.voiceAnnouncements && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <label htmlFor="slider-speech-rate">Speech Rate ({settings.speechRate.toFixed(1)}x):</label>
              </div>
              <input
                id="slider-speech-rate"
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => handleSpeechRateChange(Number(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Speech rate slider"
              />
            </div>
          )}
        </div>

        {/* Audio Sonar Beacon */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                Acoustic Sonar Beacon
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plays continuous pitch-shifting tones that speed up when pointing at a plane.
              </p>
            </div>
            <button
              id="btn-toggle-audio-beacon"
              onClick={handleToggleAudioBeacon}
              className={`px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] transition ${
                settings.audioBeacon
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              aria-pressed={settings.audioBeacon}
            >
              {settings.audioBeacon ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {settings.audioBeacon && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <label htmlFor="slider-audio-vol">Audio Beacon Volume ({Math.round(settings.audioVolume * 100)}%):</label>
              </div>
              <input
                id="slider-audio-vol"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.audioVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Audio beacon volume slider"
              />
            </div>
          )}
        </div>

        {/* Haptic Feedback */}
        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <Vibrate className="w-5 h-5 text-emerald-400" />
              Haptic Vibration Pulses
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distinct vibration pattern when an aircraft is locked in the sky.
            </p>
          </div>
          <button
            id="btn-toggle-haptics"
            onClick={handleToggleHaptics}
            className={`px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] transition ${
              settings.hapticFeedback
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            aria-pressed={settings.hapticFeedback}
          >
            {settings.hapticFeedback ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Airspace Hub / Location Selection */}
        <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Radar Airspace Location
          </div>
          <p className="text-xs text-slate-400">
            Currently tracking: <strong className="text-amber-300">{userLocation.locationName}</strong>
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {Object.entries(MAJOR_AIRPORT_HUBS).map(([key, hub]) => (
              <button
                key={key}
                id={`btn-hub-${key}`}
                onClick={() => {
                  onSelectHub(key);
                  haptics.lightTick();
                }}
                className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition min-h-[44px] ${
                  userLocation.locationName.includes(hub.city) || (key === 'CURRENT' && userLocation.locationName === 'Local Area')
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        <button
          id="btn-done-settings"
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl border border-slate-700 transition flex items-center justify-center min-h-[48px]"
        >
          Done & Return to Radar
        </button>
      </div>
    </div>
  );
};
