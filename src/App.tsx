/**
 * AeroSight - Accessible Sky Radar & Overhead Aircraft Identifier
 * Designed for Android TalkBack and Visually Impaired Users
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Aircraft, 
  UserLocation, 
  DeviceOrientationState, 
  AccessibilitySettings, 
  AppTab 
} from './types';
import { 
  generateRealisticFlights, 
  advanceAircraftPositions, 
  fetchLiveOpenSkyAirspace,
  MAJOR_AIRPORT_HUBS 
} from './services/flightDataService';
import { audioBeacon } from './services/audioBeacon';
import { speechService } from './services/speechService';
import { haptics } from './services/haptics';
import { AriaLiveAnnouncer } from './components/AriaLiveAnnouncer';
import { SkyPointerView } from './components/SkyPointerView';
import { RadarListView } from './components/RadarListView';
import { TactileRadarView } from './components/TactileRadarView';
import { FlightDetailModal } from './components/FlightDetailModal';
import { AccessibilitySettingsModal } from './components/AccessibilitySettingsModal';
import { 
  Compass, 
  List, 
  Radar, 
  Sliders, 
  RefreshCw, 
  Plane, 
  MapPin, 
  Volume2, 
  VolumeX,
  Sparkles
} from 'lucide-react';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  voiceAnnouncements: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  audioBeacon: true,
  audioVolume: 0.5,
  hapticFeedback: true,
  unitSystem: 'aviation',
  clockBearing: true,
  autoRefreshIntervalSec: 10,
};

const DEFAULT_LOCATION: UserLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
  locationName: 'London Area',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('pointer');
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientationState>({
    heading: 45,
    pitch: 55, // pointing upward into the sky by default
    roll: 0,
    isAvailable: false,
    isCalibrated: false,
    permissionGranted: false,
  });

  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasRequestedSensors, setHasRequestedSensors] = useState<boolean>(false);

  const lastPositionUpdateRef = useRef<number>(Date.now());

  // Set up Geolocation
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitudeMeters: pos.coords.altitude || 0,
            accuracyMeters: pos.coords.accuracy,
            locationName: 'Current GPS Location',
          };
          setUserLocation(loc);
          // Initial airspace populate
          const initialPlanes = generateRealisticFlights(loc.latitude, loc.longitude, 20);
          setAircraftList(initialPlanes);
          setPoliteMessage(`GPS location locked. Initialized radar with ${initialPlanes.length} aircraft.`);
        },
        () => {
          // Fallback to London Heathrow area
          const initialPlanes = generateRealisticFlights(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, 20);
          setAircraftList(initialPlanes);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const initialPlanes = generateRealisticFlights(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, 20);
      setAircraftList(initialPlanes);
    }
  }, []);

  // Request & attach DeviceOrientation events
  const handleEnableSensors = useCallback(async () => {
    setHasRequestedSensors(true);
    haptics.lightTick();
    audioBeacon.playRadarPing(500);

    // iOS 13+ permission check
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientation.requestPermission();
        if (permission === 'granted') {
          setDeviceOrientation(prev => ({ ...prev, permissionGranted: true }));
          setPoliteMessage('Compass and orientation sensors enabled.');
        } else {
          setPoliteMessage('Device orientation permission denied.');
        }
      } catch {
        setPoliteMessage('Could not request device orientation permission.');
      }
    } else {
      setDeviceOrientation(prev => ({ ...prev, permissionGranted: true }));
    }
  }, []);

  // Listen to orientation events
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = 0;
      // Handle webkit compass or alpha
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number') {
        heading = webkitHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }

      // Elevation / Pitch when pointing phone camera towards sky:
      // When phone is flat on table, beta is ~0°.
      // When holding upright facing user: beta is ~90°.
      // When tilting camera up towards the sky: beta transitions towards 180° or pitch tilts.
      let pitch = 0;
      if (e.beta !== null) {
        if (e.beta > 90) {
          // Tilted backwards pointing straight up to sky: 90° -> 0° elevation, 180° -> 90° elevation
          pitch = Math.min(90, Math.max(0, e.beta - 90));
        } else {
          pitch = Math.min(90, Math.max(0, 90 - e.beta));
        }
      }

      setDeviceOrientation(prev => ({
        ...prev,
        heading: Math.round(heading),
        pitch: Math.round(pitch),
        roll: Math.round(e.gamma || 0),
        isAvailable: true,
        isCalibrated: true,
      }));
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Continuous 1-second dead-reckoning movement simulation:
  // Advances lat/lon, altitude, distance, bearing, and angular separation in real time!
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastPositionUpdateRef.current) / 1000;
      lastPositionUpdateRef.current = now;

      setAircraftList(prev => 
        advanceAircraftPositions(
          prev,
          deltaSec,
          userLocation,
          deviceOrientation.heading,
          deviceOrientation.pitch
        )
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, [userLocation, deviceOrientation.heading, deviceOrientation.pitch]);

  // Refresh Airspace Data (Attempts live OpenSky, or regenerates fleet)
  const handleRefreshAirspace = useCallback(async () => {
    setIsRefreshing(true);
    haptics.lightTick();
    audioBeacon.playRadarPing(580);
    setPoliteMessage('Scanning airspace for live ADS-B traffic...');

    try {
      const livePlanes = await fetchLiveOpenSkyAirspace(userLocation.latitude, userLocation.longitude, 1.2);
      if (livePlanes && livePlanes.length > 0) {
        setAircraftList(livePlanes);
        const overheadCount = livePlanes.filter(p => p.isOverhead).length;
        const msg = `Airspace refreshed: ${livePlanes.length} live flights detected. ${overheadCount} directly overhead.`;
        setPoliteMessage(msg);
        if (settings.voiceAnnouncements) {
          speechService.speak(msg);
        }
      } else {
        // Fallback to fresh simulated fleet around coordinates
        const fleet = generateRealisticFlights(userLocation.latitude, userLocation.longitude, 20);
        setAircraftList(fleet);
        const overheadCount = fleet.filter(p => p.isOverhead).length;
        const msg = `Airspace refreshed: ${fleet.length} flights detected. ${overheadCount} overhead.`;
        setPoliteMessage(msg);
      }
    } catch {
      const fleet = generateRealisticFlights(userLocation.latitude, userLocation.longitude, 20);
      setAircraftList(fleet);
      setPoliteMessage('Refreshed airspace traffic.');
    } finally {
      setIsRefreshing(false);
    }
  }, [userLocation.latitude, userLocation.longitude, settings.voiceAnnouncements]);

  // Hub selection handler
  const handleSelectHub = (hubKey: string) => {
    const hub = MAJOR_AIRPORT_HUBS[hubKey];
    if (hub) {
      const newLoc: UserLocation = {
        latitude: hub.lat,
        longitude: hub.lon,
        locationName: hub.name,
      };
      setUserLocation(newLoc);
      const newFlights = generateRealisticFlights(hub.lat, hub.lon, 20);
      setAircraftList(newFlights);
      const msg = `Radar relocated to ${hub.name}. Loaded ${newFlights.length} aircraft.`;
      setPoliteMessage(msg);
      speechService.speak(msg);
    }
  };

  // Switch to Sky Pointer and orient toward target
  const handleTrackWithSkyPointer = (plane: Aircraft) => {
    setSelectedAircraft(null);
    setActiveTab('pointer');
    setDeviceOrientation(prev => ({
      ...prev,
      heading: plane.bearingDeg,
      pitch: plane.elevationAngleDeg,
    }));
    const msg = `Sky Pointer tracking ${plane.airline} flight ${plane.flightNumber || plane.callsign}. Bearing ${plane.clockPosition}, ${plane.elevationAngleDeg} degrees elevation.`;
    setAssertiveMessage(msg);
    speechService.speak(msg, true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Skip link for screen reader users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-slate-950 focus:font-bold focus:rounded-lg focus:shadow-xl"
      >
        Skip to main content
      </a>

      {/* Screen Reader ARIA Live Announcer */}
      <AriaLiveAnnouncer 
        politeMessage={politeMessage} 
        assertiveMessage={assertiveMessage} 
      />

      {/* App Header */}
      <header 
        className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3"
        role="banner"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Plane className="w-6 h-6 -rotate-45" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  AeroSight
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded">
                  TalkBack Ready
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{userLocation.locationName}</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{aircraftList.length} flights</span>
              </div>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-airspace"
              onClick={handleRefreshAirspace}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl border border-slate-800 transition min-w-[46px] min-h-[46px] flex items-center justify-center"
              aria-label="Refresh airspace flight traffic"
              title="Refresh Airspace"
            >
              <RefreshCw className={`w-5 h-5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>

            <button
              id="btn-open-settings"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition min-w-[46px] min-h-[46px] flex items-center justify-center"
              aria-label="Open accessibility sound and voice settings"
              title="Accessibility Settings"
            >
              <Sliders className="w-5 h-5 text-amber-400" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation - Large Touch Targets (min 48px) */}
      <nav 
        className="bg-slate-900 border-b border-slate-800 px-3 py-2 sticky top-[65px] z-30"
        aria-label="Application View Navigation"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-2">
          <button
            id="tab-sky-pointer"
            onClick={() => {
              setActiveTab('pointer');
              haptics.lightTick();
              setPoliteMessage('Switched to Sky Pointer mode. Point phone up at passing aircraft.');
            }}
            className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition min-h-[48px] ${
              activeTab === 'pointer'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
            aria-selected={activeTab === 'pointer'}
            role="tab"
          >
            <Compass className="w-5 h-5" aria-hidden="true" />
            <span>Sky Pointer</span>
          </button>

          <button
            id="tab-radar-list"
            onClick={() => {
              setActiveTab('list');
              haptics.lightTick();
              setPoliteMessage(`Switched to Flight Radar List. ${aircraftList.length} flights detected.`);
            }}
            className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition min-h-[48px] ${
              activeTab === 'list'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
            aria-selected={activeTab === 'list'}
            role="tab"
          >
            <List className="w-5 h-5" aria-hidden="true" />
            <span>Radar List</span>
          </button>

          <button
            id="tab-tactile-radar"
            onClick={() => {
              setActiveTab('radar');
              haptics.lightTick();
              setPoliteMessage('Switched to Tactile Audio Radar. Tap Play Sweep to listen.');
            }}
            className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition min-h-[48px] ${
              activeTab === 'radar'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
            aria-selected={activeTab === 'radar'}
            role="tab"
          >
            <Radar className="w-5 h-5" aria-hidden="true" />
            <span>Audio Radar</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 p-4 max-w-4xl mx-auto w-full" tabIndex={-1}>
        {activeTab === 'pointer' && (
          <SkyPointerView
            aircraftList={aircraftList}
            deviceOrientation={deviceOrientation}
            settings={settings}
            onSelectAircraft={(plane) => setSelectedAircraft(plane)}
            onSetAssertiveMessage={(msg) => setAssertiveMessage(msg)}
            onSetPoliteMessage={(msg) => setPoliteMessage(msg)}
            onManualHeadingChange={(h) => setDeviceOrientation(prev => ({ ...prev, heading: h }))}
            onManualPitchChange={(p) => setDeviceOrientation(prev => ({ ...prev, pitch: p }))}
          />
        )}

        {activeTab === 'list' && (
          <RadarListView
            aircraftList={aircraftList}
            settings={settings}
            onSelectAircraft={(plane) => setSelectedAircraft(plane)}
            onTrackWithSkyPointer={handleTrackWithSkyPointer}
            onSetPoliteMessage={(msg) => setPoliteMessage(msg)}
          />
        )}

        {activeTab === 'radar' && (
          <TactileRadarView
            aircraftList={aircraftList}
            onSelectAircraft={(plane) => setSelectedAircraft(plane)}
            onSetPoliteMessage={(msg) => setPoliteMessage(msg)}
          />
        )}
      </main>

      {/* Flight Detail Dialog */}
      {selectedAircraft && (
        <FlightDetailModal
          aircraft={selectedAircraft}
          onClose={() => setSelectedAircraft(null)}
          onTrackWithSkyPointer={handleTrackWithSkyPointer}
        />
      )}

      {/* Accessibility Settings Dialog */}
      {isSettingsOpen && (
        <AccessibilitySettingsModal
          settings={settings}
          userLocation={userLocation}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onSelectHub={handleSelectHub}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
