export interface Airport {
  code: string; // IATA (e.g. LHR, JFK)
  icao: string; // ICAO (e.g. EGLL, KJFK)
  name: string; // e.g. London Heathrow
  city: string;
  country: string;
}

export interface Aircraft {
  icao24: string;
  callsign: string;
  flightNumber: string;
  airline: string;
  airlineIata: string;
  aircraftModel: string;
  aircraftCategory: 'Commercial' | 'Cargo' | 'Regional' | 'Private Jet' | 'Military' | 'Helicopter';
  originCountry?: string;
  originAirport: Airport;
  destinationAirport: Airport;
  latitude: number;
  longitude: number;
  baroAltitude: number; // in feet
  geometricAltitude: number; // in feet
  velocity: number; // in knots
  trueTrack: number; // 0 to 360 degrees
  verticalRate: number; // feet per minute
  squawk: string;
  onGround: boolean;
  lastContact: number; // unix timestamp in seconds
  
  // Computed relative to user's location:
  distanceKm: number;
  distanceMiles: number;
  bearingDeg: number;
  bearingCardinal: string;
  clockPosition: string; // e.g. "2 o'clock"
  elevationAngleDeg: number; // degrees above horizon: 0° = horizon, 90° = directly overhead
  isOverhead: boolean; // close to user (< 25km or elevation > 25°)
  angularSeparationDeg?: number; // angular distance to phone pointing vector
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  locationName: string;
}

export interface DeviceOrientationState {
  heading: number; // 0-360 compass azimuth (North = 0)
  pitch: number; // Elevation angle (-90 to +90). 0 = level horizon, +90 = pointed straight up at sky
  roll: number;
  isAvailable: boolean;
  isCalibrated: boolean;
  permissionGranted: boolean;
}

export type UnitSystem = 'aviation' | 'metric' | 'imperial';

export interface AccessibilitySettings {
  voiceAnnouncements: boolean;
  speechRate: number; // 0.8 to 1.5
  speechPitch: number; // 0.8 to 1.2
  audioBeacon: boolean; // Sonar ping & pitch guidance
  audioVolume: number; // 0 to 1
  hapticFeedback: boolean; // Vibrate on lock
  unitSystem: UnitSystem;
  clockBearing: boolean; // Announce "at 2 o'clock" in addition to cardinal
  autoRefreshIntervalSec: number; // 5, 10, 30
}

export type AppTab = 'pointer' | 'list' | 'radar';
