import React, { useState } from 'react';
import { Aircraft } from '../types';
import { audioBeacon } from '../services/audioBeacon';
import { speechService } from '../services/speechService';
import { haptics } from '../services/haptics';
import { Radar, Play, Volume2, Info, Compass, Plane } from 'lucide-react';

interface TactileRadarViewProps {
  aircraftList: Aircraft[];
  onSelectAircraft: (aircraft: Aircraft) => void;
  onSetPoliteMessage: (msg: string) => void;
}

export const TactileRadarView: React.FC<TactileRadarViewProps> = ({
  aircraftList,
  onSelectAircraft,
  onSetPoliteMessage,
}) => {
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [selectedTarget, setSelectedTarget] = useState<Aircraft | null>(null);

  // Maximum display radius in miles (e.g. 50 miles)
  const maxRangeMiles = 50;

  // Perform an acoustic audio radar sweep around the 360 compass!
  const handleAcousticRadarSweep = () => {
    if (isSweeping) return;
    setIsSweeping(true);
    haptics.lightTick();
    onSetPoliteMessage(`Commencing audio radar sweep across ${aircraftList.length} aircraft.`);

    // Sort aircraft by bearing clockwise from North (0 to 360)
    const sortedClockwise = [...aircraftList].sort((a, b) => a.bearingDeg - b.bearingDeg);

    // Play initial sweep chirp
    audioBeacon.playRadarPing(440);

    // Schedule audio pings according to clock angle
    sortedClockwise.forEach((plane, idx) => {
      const delay = (plane.bearingDeg / 360) * 2400; // 2.4s full sweep
      setTimeout(() => {
        // Pitch based on distance: closer plane = higher pitch (500Hz to 1100Hz)
        const distRatio = Math.max(0, Math.min(1, plane.distanceMiles / maxRangeMiles));
        const pitch = 1100 - distRatio * 600;
        audioBeacon.playRadarPing(pitch);
        haptics.lightTick();
      }, delay);
    });

    setTimeout(() => {
      setIsSweeping(false);
      const overheadCount = aircraftList.filter(p => p.isOverhead).length;
      const summary = `Radar sweep complete. ${aircraftList.length} total aircraft detected, ${overheadCount} directly overhead.`;
      speechService.speak(summary);
      onSetPoliteMessage(summary);
    }, 2800);
  };

  return (
    <section 
      aria-labelledby="tactile-radar-heading" 
      className="flex flex-col space-y-4 max-w-2xl mx-auto w-full pb-10"
    >
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 id="tactile-radar-heading" className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Radar className="w-6 h-6 text-amber-400" aria-hidden="true" />
            Tactile Audio Radar
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Polar radar with 360° acoustic sweep and interactive aircraft pins.
          </p>
        </div>

        <button
          id="btn-trigger-acoustic-sweep"
          onClick={handleAcousticRadarSweep}
          disabled={isSweeping}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition min-h-[46px] ${
            isSweeping
              ? 'bg-amber-500 text-slate-950 animate-pulse cursor-not-allowed'
              : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 shadow-md shadow-amber-400/20'
          }`}
          aria-label="Play 360-degree acoustic radar sweep"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          <span>{isSweeping ? 'Sweeping Sky...' : 'Play 360° Audio Sweep'}</span>
        </button>
      </div>

      {/* Visual / Tactile Radar Screen */}
      <div 
        id="polar-radar-screen"
        className="relative w-full aspect-square max-w-md mx-auto bg-slate-950 border-2 border-slate-800 rounded-full overflow-hidden shadow-2xl p-4 flex items-center justify-center"
        role="region"
        aria-label="Polar Radar Screen centered on your location"
      >
        {/* Radar concentric range rings */}
        <div className="absolute inset-4 rounded-full border border-emerald-900/60 pointer-events-none" />
        <div className="absolute inset-16 rounded-full border border-emerald-900/50 pointer-events-none" />
        <div className="absolute inset-28 rounded-full border border-emerald-800/40 pointer-events-none" />
        <div className="absolute inset-40 rounded-full border border-emerald-700/30 pointer-events-none" />

        {/* Crosshair axes */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-900/40 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-emerald-900/40 pointer-events-none" />

        {/* Sweep beam animation */}
        {isSweeping && (
          <div 
            className="absolute inset-0 rounded-full pointer-events-none origin-center animate-spin"
            style={{
              animationDuration: '2.4s',
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(16, 185, 129, 0.25) 30deg, transparent 35deg)',
            }}
          />
        )}

        {/* Center user location pin */}
        <div 
          className="absolute z-10 w-4 h-4 rounded-full bg-amber-400 ring-4 ring-amber-400/30 flex items-center justify-center"
          title="Your GPS Location"
          aria-label="Your GPS Location at center of radar"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
        </div>

        {/* Cardinal labels */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-400 pointer-events-none">N (0°)</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-400 pointer-events-none">S (180°)</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 pointer-events-none">E (90°)</span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 pointer-events-none">W (270°)</span>

        {/* Aircraft Pins plotted on radar */}
        {aircraftList.map((plane) => {
          // Normalize distance onto radius (radius = 50% minus padding)
          const clampedDist = Math.min(plane.distanceMiles, maxRangeMiles);
          const radiusPercent = (clampedDist / maxRangeMiles) * 44; // 0 to 44% from center
          const angleRad = (plane.bearingDeg - 90) * (Math.PI / 180);
          
          const x = 50 + radiusPercent * Math.cos(angleRad);
          const y = 50 + radiusPercent * Math.sin(angleRad);

          const isSelected = selectedTarget?.icao24 === plane.icao24;

          return (
            <button
              key={plane.icao24}
              id={`radar-pin-${plane.icao24}`}
              onClick={() => {
                setSelectedTarget(plane);
                haptics.lightTick();
                audioBeacon.playRadarPing(650);
                const desc = `${plane.airline} ${plane.flightNumber}, at your ${plane.clockPosition}, ${plane.distanceMiles.toFixed(1)} miles away, ${plane.elevationAngleDeg} degrees overhead.`;
                onSetPoliteMessage(desc);
              }}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute z-20 p-1.5 rounded-full transition-transform active:scale-125 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                isSelected 
                  ? 'bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-400/40 z-30' 
                  : plane.isOverhead
                  ? 'bg-amber-500/90 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-emerald-500/80 text-slate-950 hover:bg-emerald-400'
              }`}
              aria-label={`${plane.airline} ${plane.flightNumber || plane.callsign}, at ${plane.clockPosition}, ${plane.distanceMiles.toFixed(1)} miles`}
              title={`${plane.airline} ${plane.flightNumber}`}
            >
              <Plane 
                className="w-3.5 h-3.5" 
                style={{ transform: `rotate(${plane.trueTrack}deg)` }} 
                aria-hidden="true" 
              />
            </button>
          );
        })}
      </div>

      {/* Selected Radar Target Card */}
      {selectedTarget && (
        <div 
          id="radar-selected-target-card"
          className="bg-slate-900 border border-amber-400/80 rounded-xl p-4 space-y-3"
          role="region"
          aria-label={`Selected flight: ${selectedTarget.airline} ${selectedTarget.flightNumber}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-amber-300">
                {selectedTarget.airline} {selectedTarget.flightNumber || selectedTarget.callsign}
              </div>
              <div className="text-xs text-slate-400">
                {selectedTarget.aircraftModel} • {selectedTarget.originAirport.city} → {selectedTarget.destinationAirport.city}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700">
              {selectedTarget.clockPosition} ({selectedTarget.bearingCardinal})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Distance</span>
              <span className="font-bold text-white text-sm">{selectedTarget.distanceMiles.toFixed(1)} mi</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Altitude</span>
              <span className="font-bold text-white text-sm">{selectedTarget.baroAltitude.toLocaleString()} ft</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Sky Elevation</span>
              <span className="font-bold text-amber-300 text-sm">{selectedTarget.elevationAngleDeg}°</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              id="btn-radar-speak-brief"
              onClick={() => speechService.announceFlightDetail(selectedTarget)}
              className="flex-1 py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 transition min-h-[46px]"
              aria-label={`Listen to full flight report for ${selectedTarget.airline} ${selectedTarget.flightNumber}`}
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Listen Report</span>
            </button>

            <button
              id="btn-radar-open-telemetry"
              onClick={() => onSelectAircraft(selectedTarget)}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 text-sm flex items-center justify-center gap-1.5 transition min-h-[46px]"
              aria-label={`View full telemetry for ${selectedTarget.airline} ${selectedTarget.flightNumber}`}
            >
              <Info className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Full Telemetry</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
