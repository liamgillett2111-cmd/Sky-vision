/**
 * Geolocation & Spherical Trigonometry for Aircraft Tracking and Sky Pointing
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Calculate Great Circle distance between two points using the Haversine formula (in km)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate initial forward bearing from user to aircraft in degrees (0 - 360°)
 */
export function calculateBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD;
  const Δλ = (lon2 - lon1) * DEG2RAD;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  const bearing = (θ * RAD2DEG + 360) % 360;
  return Math.round(bearing);
}

/**
 * Convert bearing in degrees to 16-point cardinal compass direction
 */
export function bearingToCardinal(deg: number): string {
  const cardinals = [
    'North', 'North-North-East', 'North-East', 'East-North-East',
    'East', 'East-South-East', 'South-East', 'South-South-East',
    'South', 'South-South-West', 'South-West', 'West-South-West',
    'West', 'West-North-West', 'North-West', 'North-North-West'
  ];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return cardinals[index];
}

/**
 * Convert bearing relative to user's heading (or True North if not heading-locked) to clock face (1-12 o'clock)
 */
export function bearingToClockPosition(bearingDeg: number, referenceHeading: number = 0): string {
  const relativeAngle = (bearingDeg - referenceHeading + 360) % 360;
  let hour = Math.round(relativeAngle / 30);
  if (hour === 0) hour = 12;
  return `${hour} o'clock`;
}

/**
 * Calculate elevation angle in degrees above the horizon.
 * 0° = on the horizon, 90° = directly overhead (zenith).
 * @param altitudeFeet Barometric or geometric altitude in feet
 * @param distanceKm Ground distance in kilometers
 */
export function calculateElevationAngle(altitudeFeet: number, distanceKm: number): number {
  const altitudeKm = (altitudeFeet * 0.3048) / 1000;
  // If plane is practically right above
  if (distanceKm < 0.05) return 90;
  const rad = Math.atan2(altitudeKm, distanceKm);
  return Math.min(90, Math.max(0, Math.round(rad * RAD2DEG)));
}

/**
 * Calculate the angular separation (in degrees) between the device's pointing vector
 * in the sky (phoneAzimuth, phoneElevation) and the aircraft's position (planeAzimuth, planeElevation).
 */
export function calculateAngularSeparation(
  phoneAzimuth: number,
  phoneElevation: number,
  planeAzimuth: number,
  planeElevation: number
): number {
  // Convert spherical coords to unit vector on sphere
  const pAz = phoneAzimuth * DEG2RAD;
  const pEl = Math.max(0, phoneElevation) * DEG2RAD;

  const tAz = planeAzimuth * DEG2RAD;
  const tEl = Math.max(0, planeElevation) * DEG2RAD;

  const x1 = Math.cos(pEl) * Math.sin(pAz);
  const y1 = Math.cos(pEl) * Math.cos(pAz);
  const z1 = Math.sin(pEl);

  const x2 = Math.cos(tEl) * Math.sin(tAz);
  const y2 = Math.cos(tEl) * Math.cos(tAz);
  const z2 = Math.sin(tEl);

  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angleRad = Math.acos(clampedDot);
  return Math.round(angleRad * RAD2DEG * 10) / 10;
}
