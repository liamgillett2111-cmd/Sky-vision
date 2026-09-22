import React, { useState, useEffect, useRef } from 'react';
import { Aircraft, DeviceOrientationState, AccessibilitySettings } from '../types';
import { audioBeacon } from '../services/audioBeacon';
import { haptics } from '../services/haptics';
import { speechService } from '../services/speechService';
import { 
  Compass, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Target, 
  Plane, 
  ArrowUp, 
  RotateCw, 
  Info, 
  Navigation,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';

interface SkyPointerViewProps {
  aircraftList: Aircraft[];
  deviceOrientation: DeviceOrientationState;
  settings: AccessibilitySettings;
  onSelectAircraft: (aircraft: Aircraft) => void;
  onSetAssertiveMessage: (msg: string) => void;
  onSetPoliteMessage: (msg: string) => void;
  onManualHeadingChange?: (heading: number) => void;
  onManualPitchChange?: (pitch: number) => void;
}

export const SkyPointerView: React.FC<SkyPointerViewProps> = ({
  aircraftList,
  deviceOrientation,
  settings,
  onSelectAircraft,
  onSetAssertiveMessage,
  onSetPoliteMessage,
  onManualHeadingChange,
  onManualPitchChange,
}) => {
  const [lockedAircraft, setLockedAircraft] = useState<Aircraft | null>(null);
  const [nearestAircraft, setNearestAircraft] = useState<Aircraft | null>(null);
  const [minSeparation, setMinSeparation] = useState<number>(999);
  const [guidanceText, setGuidanceText] = useState<string>('Hold device up toward the sky.');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [showManualSensors, setShowManualSensors] = useState<boolean>(false);

  const lastAnnouncedIcao = useRef<string>('');
  const lastGuidanceSpokenTime = useRef<number>(0);

  // Compute closest plane to current device pointing vector
  useEffect(() => {
    if (aircraftList.length === 0) {
      setLockedAircraft(null);
      setNearestAircraft(null);
      setMinSeparation(999);
      setGuidanceText('No aircraft currently in radar range.');
      return;
    }

    // Sort by angular separation
    let closest: Aircraft | null = null;
    let smallestAngle = 999;

    for (const plane of aircraftList) {
      const sep = plane.angularSeparationDeg ?? 999;
      if (sep < smallestAngle) {
        smallestAngle = sep;
        closest = plane;
      }
    }

    setMinSeparation(smallestAngle);
    setNearestAircraft(closest);

    if (closest) {
      // Audio beacon proximity pulse
      if (settings.audioBeacon) {
        audioBeacon.updateSkyPointerProximity(smallestAngle);
      }

      // Check for Direct Lock (< 8 degrees)
      if (smallestAngle <= 8) {
        setLockedAircraft(closest);
        const lockText = `TARGET LOCKED: ${closest.airline || 'Flight'} ${closest.flightNumber || closest.callsign}, ${closest.aircraftModel}, overhead at ${closest.baroAltitude.toLocaleString()} ft.`;
        setGuidanceText(lockText);

        if (lastAnnouncedIcao.current !== closest.icao24) {
          lastAnnouncedIcao.current = closest.icao24;
          haptics.targetLocked();
          audioBeacon.playTargetLock();
          if (settings.voiceAnnouncements) {
            speechService.announceTargetLock(closest);
          }
          onSetAssertiveMessage(lockText);
        }
      } else if (smallestAngle <= 22) {
        // In sights
        setLockedAircraft(closest);
        haptics.aircraftInSight();
        
        // Guidance instructions
        const headingDiff = (closest.bearingDeg - deviceOrientation.heading + 540) % 360 - 180;
        const pitchDiff = closest.elevationAngleDeg - deviceOrientation.pitch;
        
        let guide = `Approaching target: ${closest.airline || ''} ${closest.flightNumber || closest.callsign}. `;
        if (Math.abs(headingDiff) > 4) {
          guide += headingDiff > 0 ? `Turn slightly right. ` : `Turn slightly left. `;
        }
        if (Math.abs(pitchDiff) > 4) {
          guide += pitchDiff > 0 ? `Tilt up higher. ` : `Tilt down slightly. `;
        }
        setGuidanceText(guide);
      } else {
        // Outside direct cone
        setLockedAircraft(null);
        lastAnnouncedIcao.current = '';

        // Guide user toward closest overhead flight
        const headingDiff = (closest.bearingDeg - deviceOrientation.heading + 540) % 360 - 180;
        const pitchDiff = closest.elevationAngleDeg - deviceOrientation.pitch;

        let guide = `Nearest plane: ${closest.airline || 'Flight'} ${closest.flightNumber || closest.callsign} (${closest.clockPosition}, ${closest.elevationAngleDeg}° elevation). `;
        if (Math.abs(headingDiff) > 10) {
          guide += headingDiff > 0 
            ? `Turn ${Math.round(headingDiff)}° right. ` 
            : `Turn ${Math.round(Math.abs(headingDiff))}° left. `;
        }
        if (Math.abs(pitchDiff) > 10) {
          guide += pitchDiff > 0 ? `Tilt up towards zenith.` : `Tilt down towards horizon.`;
        }
        setGuidanceText(guide);
      }
    }
  }, [aircraftList, deviceOrientation.heading, deviceOrientation.pitch, settings.audioBeacon, settings.voiceAnnouncements]);

  // Handle instant one-tap: "Identify Closest Overhead Flight"
  const handleIdentifyClosestOverhead = () => {
    if (aircraftList.length === 0) {
      const msg = 'No aircraft currently detected in your airspace.';
      onSetAssertiveMessage(msg);
      speechService.speak(msg, true);
      return;
    }

    // Prioritize highest elevation / lowest distance
    const sortedByOverhead = [...aircraftList].sort((a, b) => {
      // Prioritize high elevation angle
      if (b.elevationAngleDeg !== a.elevationAngleDeg) {
        return b.elevationAngleDeg - a.elevationAngleDeg;
      }
      return a.distanceKm - b.distanceKm;
    });

    const topPlane = sortedByOverhead[0];
    setLockedAircraft(topPlane);
    haptics.targetLocked();
    audioBeacon.playTargetLock();

    const announceMsg = `Identified overhead flight: ${topPlane.airline || 'Aircraft'} ${topPlane.flightNumber || topPlane.callsign}, flying from ${topPlane.originAirport.city} to ${topPlane.destinationAirport.city}. It is at ${topPlane.elevationAngleDeg} degrees elevation, ${topPlane.clockPosition}, altitude ${topPlane.baroAltitude.toLocaleString()} feet, ${topPlane.distanceMiles.toFixed(1)} miles away.`;
    
    setGuidanceText(announceMsg);
    onSetAssertiveMessage(announceMsg);
    speechService.speak(announceMsg, true);
  };

  // Speak turn guidance aloud
  const handleSpeakGuidance = () => {
    speechService.speak(guidanceText, true);
    onSetAssertiveMessage(guidanceText);
  };

  // Play audio ping test
  const handlePlayPing = () => {
    audioBeacon.playRadarPing(600);
    haptics.lightTick();
  };

  return (
    <section 
      aria-labelledby="sky-pointer-heading" 
      className="flex flex-col space-y-4 max-w-2xl mx-auto w-full pb-8"
    >
      {/* Visual & Screen Reader Heading */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div>
          <h1 id="sky-pointer-heading" className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" aria-hidden="true" />
            Sky Pointer (Point Device Up)
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Hold your phone pointing up towards passing aircraft to identify them with sound and speech.
          </p>
        </div>
        <button
          id="btn-play-ping-test"
          onClick={handlePlayPing}
          className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-amber-300 rounded-lg border border-slate-700 transition flex items-center justify-center min-w-[48px] min-h-[48px]"
          aria-label="Test Sonar Ping Audio Cue"
          title="Test Audio Ping"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Status Announcement Card - High Contrast & Large Targets */}
      <div 
        id="sky-pointer-status-card"
        className={`rounded-2xl p-6 border-2 transition-all ${
          minSeparation <= 8
            ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/40'
            : minSeparation <= 22
            ? 'bg-cyan-950/40 border-cyan-400'
            : 'bg-slate-900 border-slate-800'
        }`}
        role="region"
        aria-label="Sky Pointer Status and Target Lock"
      >
        {/* Lock status indicator badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span 
              className={`w-4 h-4 rounded-full ${
                minSeparation <= 8 
                  ? 'bg-amber-400 animate-ping' 
                  : minSeparation <= 22 
                  ? 'bg-cyan-400 animate-pulse' 
                  : 'bg-slate-600'
              }`} 
              aria-hidden="true"
            />
            <span className="text-base font-semibold tracking-wide uppercase text-slate-200">
              {minSeparation <= 8 ? 'Direct Target Lock' : minSeparation <= 22 ? 'Aircraft in Sight' : 'Sweeping Sky'}
            </span>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Separation: {minSeparation < 999 ? `${minSeparation}°` : '--'}
          </span>
        </div>

        {/* Big Guidance / Locked Flight Display */}
        {lockedAircraft ? (
          <div className="space-y-3">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-2xl font-black text-amber-300 leading-tight">
                {lockedAircraft.airline}
              </div>
              <div className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                <span>Flight {lockedAircraft.flightNumber || lockedAircraft.callsign}</span>
                <span className="text-xs font-normal px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/40">
                  {lockedAircraft.aircraftModel}
                </span>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center justify-between text-sm text-slate-200 py-1">
              <div className="font-semibold">
                {lockedAircraft.originAirport.city} ({lockedAircraft.originAirport.code})
              </div>
              <Plane className="w-4 h-4 text-amber-400 rotate-90" aria-hidden="true" />
              <div className="font-semibold text-right">
                {lockedAircraft.destinationAirport.city} ({lockedAircraft.destinationAirport.code})
              </div>
            </div>

            {/* Telemetry badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
                <div className="text-xs text-slate-400">Altitude</div>
                <div className="text-base font-bold text-white">
                  {lockedAircraft.baroAltitude.toLocaleString()} ft
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
                <div className="text-xs text-slate-400">Elevation in Sky</div>
                <div className="text-base font-bold text-amber-300">
                  {lockedAircraft.elevationAngleDeg}° above horizon
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
                <div className="text-xs text-slate-400">Distance</div>
                <div className="text-base font-bold text-white">
                  {lockedAircraft.distanceMiles.toFixed(1)} miles
                </div>
              </div>
            </div>

            {/* Quick Action to open full detail modal */}
            <div className="pt-3 flex flex-col sm:flex-row gap-2">
              <button
                id="btn-speak-locked-brief"
                onClick={() => speechService.announceFlightDetail(lockedAircraft)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 min-h-[52px] shadow-lg shadow-amber-500/20"
                aria-label={`Listen to full audio briefing for flight ${lockedAircraft.flightNumber || lockedAircraft.callsign}`}
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
                <span>Listen to Flight Briefing</span>
              </button>

              <button
                id="btn-view-locked-details"
                onClick={() => onSelectAircraft(lockedAircraft)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 px-4 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 min-h-[52px]"
                aria-label={`Open complete Flightradar telemetry for flight ${lockedAircraft.flightNumber || lockedAircraft.callsign}`}
              >
                <Info className="w-5 h-5 text-amber-400" aria-hidden="true" />
                <span>All Telemetry</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-amber-400">
              <ArrowUp className="w-8 h-8 animate-bounce" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-100">
                {guidanceText}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Tilt phone upwards like a camera. The sound beacon beeps faster as you get closer to a plane.
              </p>
            </div>

            <button
              id="btn-speak-guidance"
              onClick={handleSpeakGuidance}
              className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold py-3 px-4 rounded-xl border border-slate-700 flex items-center justify-center gap-2 min-h-[48px]"
              aria-label="Speak turn directions and sky guidance aloud"
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" />
              <span>Read Direction Guidance Aloud</span>
            </button>
          </div>
        )}
      </div>

      {/* One-Tap Accessibility Hero Action: "Identify Closest Overhead Flight" */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <button
          id="btn-instant-overhead-finder"
          onClick={handleIdentifyClosestOverhead}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-3 text-lg min-h-[56px] shadow-lg shadow-emerald-900/30"
          aria-label="Instant Identify: Tell me which plane is closest overhead right now"
        >
          <Sparkles className="w-6 h-6 text-emerald-200" aria-hidden="true" />
          <span>What's Overhead Right Now? (Instant Lookup)</span>
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">
          Finds and announces the highest overhead plane right above your GPS coordinates without needing to sweep.
        </p>
      </div>

      {/* Device Sensor Telemetry Card */}
      <div 
        id="device-telemetry-box"
        className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"
        role="region"
        aria-label="Device Compass and Tilt Status"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-200">Device Sensors</h2>
          </div>
          <button
            id="btn-toggle-manual-sensors"
            onClick={() => setShowManualSensors(!showManualSensors)}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 p-2"
            aria-expanded={showManualSensors}
            aria-controls="manual-sensor-controls"
          >
            {showManualSensors ? 'Hide Manual Sliders' : 'Manual Sliders (Desktop/Testing)'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Compass Heading</div>
            <div className="text-lg font-bold text-white font-mono">
              {Math.round(deviceOrientation.heading)}°
            </div>
            <div className="text-xs text-amber-400 font-medium mt-0.5">
              {deviceOrientation.heading >= 337.5 || deviceOrientation.heading < 22.5 ? 'North' :
               deviceOrientation.heading < 67.5 ? 'North-East' :
               deviceOrientation.heading < 112.5 ? 'East' :
               deviceOrientation.heading < 157.5 ? 'South-East' :
               deviceOrientation.heading < 202.5 ? 'South' :
               deviceOrientation.heading < 247.5 ? 'South-West' :
               deviceOrientation.heading < 292.5 ? 'West' : 'North-West'}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Sky Tilt (Pitch)</div>
            <div className="text-lg font-bold text-white font-mono">
              {Math.round(deviceOrientation.pitch)}°
            </div>
            <div className="text-xs text-cyan-400 font-medium mt-0.5">
              {deviceOrientation.pitch > 70 ? 'Zenith (Straight Up)' :
               deviceOrientation.pitch > 35 ? 'High Sky' :
               deviceOrientation.pitch > 15 ? 'Low Sky' : 'Horizon Level'}
            </div>
          </div>
        </div>

        {/* Manual orientation sliders for testing or if device lacks hardware compass */}
        {showManualSensors && (
          <div id="manual-sensor-controls" className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              Adjust azimuth heading and sky pitch manually if running in browser without mobile motion sensors:
            </p>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <label htmlFor="slider-manual-heading">Compass Heading (0° - 360°):</label>
                <span className="font-mono text-amber-400">{Math.round(deviceOrientation.heading)}°</span>
              </div>
              <input
                id="slider-manual-heading"
                type="range"
                min="0"
                max="360"
                value={Math.round(deviceOrientation.heading)}
                onChange={(e) => onManualHeadingChange && onManualHeadingChange(Number(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Manual Compass Heading in degrees"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <label htmlFor="slider-manual-pitch">Sky Tilt Pitch (0° Horizon to 90° Zenith):</label>
                <span className="font-mono text-cyan-400">{Math.round(deviceOrientation.pitch)}°</span>
              </div>
              <input
                id="slider-manual-pitch"
                type="range"
                min="0"
                max="90"
                value={Math.round(deviceOrientation.pitch)}
                onChange={(e) => onManualPitchChange && onManualPitchChange(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Manual Sky Tilt Pitch in degrees"
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Sector Summary List for TalkBack users */}
      <div 
        id="nearby-sky-sector-summary"
        className="bg-slate-900 border border-slate-800 rounded-xl p-4"
        role="region"
        aria-label="Overhead Aircraft in your sky sector"
      >
        <h2 className="text-base font-semibold text-slate-200 mb-2 flex items-center justify-between">
          <span>Top 3 Closest Overhead Planes</span>
          <span className="text-xs text-slate-400">Sorted by distance</span>
        </h2>

        <ul className="divide-y divide-slate-800" role="list">
          {aircraftList.slice(0, 3).map((plane, idx) => (
            <li key={plane.icao24} className="py-2.5 flex items-center justify-between">
              <div className="flex-1 pr-2">
                <button
                  id={`btn-sector-plane-${plane.icao24}`}
                  onClick={() => onSelectAircraft(plane)}
                  className="text-left group"
                  aria-label={`Select ${plane.airline} flight ${plane.flightNumber || plane.callsign}, at your ${plane.clockPosition}, ${plane.distanceMiles.toFixed(1)} miles away`}
                >
                  <div className="font-semibold text-slate-100 group-hover:text-amber-400">
                    {plane.airline} {plane.flightNumber || plane.callsign}
                  </div>
                  <div className="text-xs text-slate-400">
                    {plane.aircraftModel} • {plane.clockPosition} ({plane.bearingCardinal}) • {plane.elevationAngleDeg}° overhead
                  </div>
                </button>
              </div>

              <button
                id={`btn-listen-brief-${plane.icao24}`}
                onClick={() => speechService.announceFlightDetail(plane)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center transition"
                aria-label={`Listen to audio briefing for ${plane.airline} ${plane.flightNumber}`}
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
