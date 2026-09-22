import React, { useEffect } from 'react';
import { Aircraft } from '../types';
import { speechService } from '../services/speechService';
import { haptics } from '../services/haptics';
import { 
  X, 
  Volume2, 
  Plane, 
  Compass, 
  AlertTriangle, 
  MapPin, 
  Gauge, 
  Navigation, 
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface FlightDetailModalProps {
  aircraft: Aircraft | null;
  onClose: () => void;
  onTrackWithSkyPointer: (aircraft: Aircraft) => void;
}

export const FlightDetailModal: React.FC<FlightDetailModalProps> = ({
  aircraft,
  onClose,
  onTrackWithSkyPointer,
}) => {
  useEffect(() => {
    // Keyboard Escape to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!aircraft) return null;

  const isClimbing = aircraft.verticalRate > 300;
  const isDescending = aircraft.verticalRate < -300;

  const handleReadAloud = () => {
    speechService.announceFlightDetail(aircraft);
  };

  const handleTrackInSky = () => {
    haptics.lightTick();
    onTrackWithSkyPointer(aircraft);
  };

  return (
    <div
      id="flight-detail-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flight-detail-title"
    >
      <div 
        id="flight-detail-modal-card"
        className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 space-y-5"
      >
        {/* Header with Close Button */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                ICAO: {aircraft.icao24}
              </span>
              {aircraft.squawk === '7700' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Squawk 7700
                </span>
              )}
            </div>
            <h2 id="flight-detail-title" className="text-2xl font-black text-amber-300 mt-1">
              {aircraft.airline}
            </h2>
            <div className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Flight {aircraft.flightNumber || aircraft.callsign}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{aircraft.aircraftModel}</span>
            </div>
          </div>

          <button
            id="btn-close-flight-modal"
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center justify-center min-w-[48px] min-h-[48px]"
            aria-label="Close Flight Detail Dialog"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Big Audio Readout Button for Screen Readers / Blind users */}
        <button
          id="btn-modal-read-aloud"
          onClick={handleReadAloud}
          className="w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2.5 text-base shadow-lg shadow-amber-400/20 min-h-[52px]"
          aria-label={`Read entire flight report for ${aircraft.airline} ${aircraft.flightNumber} aloud`}
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          <span>Read Full Flight Report Aloud</span>
        </button>

        {/* Route Details */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            Flight Route
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-xs text-slate-400">Departure</div>
              <div className="text-xl font-black text-white">{aircraft.originAirport.code}</div>
              <div className="text-sm font-medium text-slate-200">{aircraft.originAirport.city}</div>
              <div className="text-xs text-slate-400">{aircraft.originAirport.name}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Destination</div>
              <div className="text-xl font-black text-white">{aircraft.destinationAirport.code}</div>
              <div className="text-sm font-medium text-slate-200">{aircraft.destinationAirport.city}</div>
              <div className="text-xs text-slate-400">{aircraft.destinationAirport.name}</div>
            </div>
          </div>
        </div>

        {/* Proximity & Direction relative to user */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            Relative Position from You
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">Bearing</span>
              <span className="text-base font-bold text-amber-300 block">{aircraft.clockPosition}</span>
              <span className="text-xs text-slate-400">{aircraft.bearingCardinal} ({aircraft.bearingDeg}°)</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">Distance</span>
              <span className="text-base font-bold text-white block">{aircraft.distanceMiles.toFixed(1)} mi</span>
              <span className="text-xs text-slate-400">{aircraft.distanceKm.toFixed(1)} km</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">Sky Elevation</span>
              <span className="text-base font-bold text-cyan-300 block">{aircraft.elevationAngleDeg}° angle</span>
              <span className="text-xs text-slate-400">{aircraft.isOverhead ? 'Overhead' : 'Far Horizon'}</span>
            </div>
          </div>
        </div>

        {/* Live Flight Telemetry */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-emerald-400" />
            Live Aircraft Telemetry
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Altitude (Barometric):</span>
              <span className="font-bold text-white">{aircraft.baroAltitude.toLocaleString()} ft</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Ground Speed:</span>
              <span className="font-bold text-white">{Math.round(aircraft.velocity)} kts ({Math.round(aircraft.velocity * 1.15)} mph)</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Vertical Speed:</span>
              <span className="font-bold text-white flex items-center gap-1">
                {Math.round(aircraft.verticalRate)} fpm
                {isClimbing ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : isDescending ? (
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Flight Track Heading:</span>
              <span className="font-bold text-white">{aircraft.trueTrack}°</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Transponder Squawk:</span>
              <span className="font-mono font-bold text-amber-300">{aircraft.squawk}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Coordinates:</span>
              <span className="font-mono text-xs text-slate-300">{aircraft.latitude.toFixed(3)}, {aircraft.longitude.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Action Button: Aim to Sky */}
        <button
          id="btn-modal-point-sky"
          onClick={handleTrackInSky}
          className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold py-3.5 px-4 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 min-h-[50px]"
          aria-label={`Switch to Sky Pointer and aim device towards flight ${aircraft.flightNumber || aircraft.callsign}`}
        >
          <Compass className="w-5 h-5" aria-hidden="true" />
          <span>Aim Device to Sky for this Flight</span>
        </button>
      </div>
    </div>
  );
};
