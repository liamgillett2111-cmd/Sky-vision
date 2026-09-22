import { Aircraft, Airport, UserLocation } from '../types';
import {
  calculateDistanceKm,
  calculateBearingDeg,
  bearingToCardinal,
  bearingToClockPosition,
  calculateElevationAngle,
  calculateAngularSeparation,
} from './geoCalculations';

export const MAJOR_AIRPORT_HUBS: Record<string, { name: string; lat: number; lon: number; city: string; country: string }> = {
  CURRENT: { name: 'Current GPS Location', lat: 51.5074, lon: -0.1278, city: 'Local Area', country: 'Your Area' },
  LHR: { name: 'London Heathrow (LHR)', lat: 51.4700, lon: -0.4543, city: 'London', country: 'United Kingdom' },
  JFK: { name: 'New York JFK (JFK)', lat: 40.6413, lon: -73.7781, city: 'New York', country: 'United States' },
  LAX: { name: 'Los Angeles (LAX)', lat: 33.9416, lon: -118.4085, city: 'Los Angeles', country: 'United States' },
  FRA: { name: 'Frankfurt Airport (FRA)', lat: 50.0379, lon: 8.5622, city: 'Frankfurt', country: 'Germany' },
  DXB: { name: 'Dubai International (DXB)', lat: 25.2532, lon: 55.3657, city: 'Dubai', country: 'United Arab Emirates' },
  HND: { name: 'Tokyo Haneda (HND)', lat: 35.5494, lon: 139.7798, city: 'Tokyo', country: 'Japan' },
  SYD: { name: 'Sydney Kingsford Smith (SYD)', lat: -33.9399, lon: 151.1753, city: 'Sydney', country: 'Australia' },
  ORD: { name: 'Chicago O\'Hare (ORD)', lat: 41.9742, lon: -87.9073, city: 'Chicago', country: 'United States' },
};

const SAMPLE_AIRLINES: { prefix: string; name: string; iata: string }[] = [
  { prefix: 'BAW', name: 'British Airways', iata: 'BA' },
  { prefix: 'AAL', name: 'American Airlines', iata: 'AA' },
  { prefix: 'UAL', name: 'United Airlines', iata: 'UA' },
  { prefix: 'DAL', name: 'Delta Air Lines', iata: 'DL' },
  { prefix: 'UAE', name: 'Emirates', iata: 'EK' },
  { prefix: 'AFR', name: 'Air France', iata: 'AF' },
  { prefix: 'DLH', name: 'Lufthansa', iata: 'LH' },
  { prefix: 'KLM', name: 'KLM Royal Dutch Airlines', iata: 'KL' },
  { prefix: 'QFA', name: 'Qantas', iata: 'QF' },
  { prefix: 'ANA', name: 'All Nippon Airways', iata: 'NH' },
  { prefix: 'SIA', name: 'Singapore Airlines', iata: 'SQ' },
  { prefix: 'VIR', name: 'Virgin Atlantic', iata: 'VS' },
  { prefix: 'EZY', name: 'easyJet', iata: 'U2' },
  { prefix: 'RYR', name: 'Ryanair', iata: 'FR' },
  { prefix: 'FDX', name: 'FedEx Express', iata: 'FX' },
];

const SAMPLE_AIRCRAFT_MODELS = [
  { model: 'Airbus A350-900', category: 'Commercial' as const },
  { model: 'Boeing 787-9 Dreamliner', category: 'Commercial' as const },
  { model: 'Airbus A320neo', category: 'Commercial' as const },
  { model: 'Boeing 777-300ER', category: 'Commercial' as const },
  { model: 'Airbus A380-800', category: 'Commercial' as const },
  { model: 'Boeing 737 MAX 8', category: 'Commercial' as const },
  { model: 'Airbus A330-300', category: 'Commercial' as const },
  { model: 'Embraer E195-E2', category: 'Regional' as const },
  { model: 'Bombardier Global 7500', category: 'Private Jet' as const },
  { model: 'Boeing 747-8F', category: 'Cargo' as const },
];

const SAMPLE_AIRPORTS: Airport[] = [
  { code: 'LHR', icao: 'EGLL', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  { code: 'JFK', icao: 'KJFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'United States' },
  { code: 'LAX', icao: 'KLAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'United States' },
  { code: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'AMS', icao: 'EHAM', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'FRA', icao: 'EDDF', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { code: 'DXB', icao: 'OMDB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates' },
  { code: 'SIN', icao: 'WSSS', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'HND', icao: 'RJTT', name: 'Tokyo Haneda', city: 'Tokyo', country: 'Japan' },
  { code: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia' },
  { code: 'DOH', icao: 'OTHH', name: 'Hamad International', city: 'Doha', country: 'Qatar' },
  { code: 'ORD', icao: 'KORD', name: 'O\'Hare International', city: 'Chicago', country: 'United States' },
  { code: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Barajas', city: 'Madrid', country: 'Spain' },
  { code: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci', city: 'Rome', country: 'Italy' },
  { code: 'EDI', icao: 'EGPH', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom' },
  { code: 'MAN', icao: 'EGCC', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom' },
];

/**
 * Generate a realistic fleet of live flights surrounding the target coordinates
 */
export function generateRealisticFlights(centerLat: number, centerLon: number, count: number = 18): Aircraft[] {
  const flights: Aircraft[] = [];

  for (let i = 0; i < count; i++) {
    const airlineObj = SAMPLE_AIRLINES[i % SAMPLE_AIRLINES.length];
    const flightNumSuffix = 100 + ((i * 47) % 899);
    const callsign = `${airlineObj.prefix}${flightNumSuffix}`;
    const flightNumber = `${airlineObj.iata}${flightNumSuffix}`;
    const modelObj = SAMPLE_AIRCRAFT_MODELS[i % SAMPLE_AIRCRAFT_MODELS.length];
    
    // Choose origin and destination
    const origIdx = (i * 3) % SAMPLE_AIRPORTS.length;
    let destIdx = (origIdx + 4 + i) % SAMPLE_AIRPORTS.length;
    if (destIdx === origIdx) destIdx = (destIdx + 1) % SAMPLE_AIRPORTS.length;

    const originAirport = SAMPLE_AIRPORTS[origIdx];
    const destinationAirport = SAMPLE_AIRPORTS[destIdx];

    // Distribute planes around the user: some directly overhead (within 10-25km), some in the outer perimeter (up to 80km)
    const isDirectlyOverhead = i < 5; // 5 planes directly overhead in zenith/high sky
    const distanceKm = isDirectlyOverhead 
      ? 2.5 + (i * 3.8) // 2.5km to 18km
      : 18 + ((i - 5) * 5.5); // up to 75km

    const angleRad = ((i * 137.5) % 360) * (Math.PI / 180); // Golden ratio spiral distribution
    // 1 deg lat ~ 111 km, 1 deg lon ~ 111 * cos(lat)
    const latOffset = (distanceKm * Math.cos(angleRad)) / 111;
    const lonOffset = (distanceKm * Math.sin(angleRad)) / (111 * Math.cos(centerLat * (Math.PI / 180)));

    const planeLat = centerLat + latOffset;
    const planeLon = centerLon + lonOffset;

    // Altitude: if directly overhead, give high cruising or approach altitudes (14,000 to 38,000 ft)
    const baroAltitude = isDirectlyOverhead
      ? 18000 + ((i * 4000) % 20000)
      : 8000 + ((i * 3000) % 30000);
    
    const velocity = 250 + ((i * 28) % 260); // 250 to 510 knots
    const trueTrack = Math.round((i * 59) % 360);
    const verticalRate = i % 3 === 0 ? (i % 2 === 0 ? 1200 : -1400) : 0;
    const squawk = i === 7 ? '7700' : `${1000 + ((i * 347) % 6777)}`;

    const distKm = calculateDistanceKm(centerLat, centerLon, planeLat, planeLon);
    const distMiles = distKm * 0.621371;
    const bearingDeg = calculateBearingDeg(centerLat, centerLon, planeLat, planeLon);
    const bearingCardinal = bearingToCardinal(bearingDeg);
    const clockPosition = bearingToClockPosition(bearingDeg);
    const elevationAngleDeg = calculateElevationAngle(baroAltitude, distKm);

    flights.push({
      icao24: `40${(1000 + i * 47).toString(16)}`,
      callsign,
      flightNumber,
      airline: airlineObj.name,
      airlineIata: airlineObj.iata,
      aircraftModel: modelObj.model,
      aircraftCategory: modelObj.category,
      originAirport,
      destinationAirport,
      latitude: planeLat,
      longitude: planeLon,
      baroAltitude,
      geometricAltitude: baroAltitude + 250,
      velocity,
      trueTrack,
      verticalRate,
      squawk,
      onGround: false,
      lastContact: Math.floor(Date.now() / 1000),
      distanceKm: Math.round(distKm * 10) / 10,
      distanceMiles: Math.round(distMiles * 10) / 10,
      bearingDeg,
      bearingCardinal,
      clockPosition,
      elevationAngleDeg,
      isOverhead: distKm < 25 || elevationAngleDeg > 20,
    });
  }

  // Sort by distance (closest first)
  return flights.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Extrapolate positions forward in time by deltaSeconds based on velocity & heading
 */
export function advanceAircraftPositions(
  aircraftList: Aircraft[],
  deltaSeconds: number,
  userLocation: UserLocation,
  phoneAzimuth: number = 0,
  phoneElevation: number = 0
): Aircraft[] {
  return aircraftList.map((plane) => {
    // Velocity in knots to km/s: 1 knot = 1.852 km/h = 0.00051444 km/s
    const speedKmPerSec = plane.velocity * 0.00051444;
    const distanceTraveledKm = speedKmPerSec * deltaSeconds;

    const headingRad = plane.trueTrack * (Math.PI / 180);
    const latChange = (distanceTraveledKm * Math.cos(headingRad)) / 111;
    const lonChange = (distanceTraveledKm * Math.sin(headingRad)) / (111 * Math.cos(plane.latitude * (Math.PI / 180)));

    const newLat = plane.latitude + latChange;
    const newLon = plane.longitude + lonChange;

    // Altitude change in feet
    const altChangeFeet = (plane.verticalRate / 60) * deltaSeconds;
    const newAltitude = Math.max(1000, Math.min(45000, plane.baroAltitude + altChangeFeet));

    const distKm = calculateDistanceKm(userLocation.latitude, userLocation.longitude, newLat, newLon);
    const distMiles = distKm * 0.621371;
    const bearingDeg = calculateBearingDeg(userLocation.latitude, userLocation.longitude, newLat, newLon);
    const bearingCardinal = bearingToCardinal(bearingDeg);
    const clockPosition = bearingToClockPosition(bearingDeg);
    const elevationAngleDeg = calculateElevationAngle(newAltitude, distKm);

    const angularSeparationDeg = calculateAngularSeparation(
      phoneAzimuth,
      phoneElevation,
      bearingDeg,
      elevationAngleDeg
    );

    return {
      ...plane,
      latitude: newLat,
      longitude: newLon,
      baroAltitude: Math.round(newAltitude),
      geometricAltitude: Math.round(newAltitude + 250),
      distanceKm: Math.round(distKm * 10) / 10,
      distanceMiles: Math.round(distMiles * 10) / 10,
      bearingDeg,
      bearingCardinal,
      clockPosition,
      elevationAngleDeg,
      isOverhead: distKm < 25 || elevationAngleDeg > 20,
      angularSeparationDeg,
      lastContact: Math.floor(Date.now() / 1000),
    };
  });
}

/**
 * Attempt to query OpenSky Network public API for real live ADS-B data
 */
export async function fetchLiveOpenSkyAirspace(
  centerLat: number,
  centerLon: number,
  radiusDeg: number = 1.0
): Promise<Aircraft[] | null> {
  const lamin = (centerLat - radiusDeg).toFixed(4);
  const lamax = (centerLat + radiusDeg).toFixed(4);
  const lomin = (centerLon - radiusDeg * 1.5).toFixed(4);
  const lomax = (centerLon + radiusDeg * 1.5).toFixed(4);

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.states) || data.states.length === 0) {
      return null;
    }

    const planes: Aircraft[] = [];

    for (let i = 0; i < data.states.length; i++) {
      const s = data.states[i];
      // s[0]=icao24, s[1]=callsign, s[2]=origin_country, s[5]=lon, s[6]=lat, s[7]=baro_alt, s[8]=on_ground, s[9]=velocity, s[10]=true_track, s[11]=vertical_rate, s[14]=squawk
      const lon = s[5];
      const lat = s[6];
      if (lat == null || lon == null) continue;

      const icao24 = s[0] || 'unknown';
      const rawCallsign = (s[1] || '').trim() || `ICAO-${icao24.slice(0, 4).toUpperCase()}`;
      const onGround = Boolean(s[8]);
      const baroAltitude = s[7] ? Math.round(s[7] * 3.28084) : 28000;
      const velocity = s[9] ? Math.round(s[9] * 1.94384) : 420;
      const trueTrack = s[10] != null ? Math.round(s[10]) : 0;
      const verticalRate = s[11] != null ? Math.round(s[11] * 196.85) : 0;
      const squawk = s[14] || '1200';
      const originCountry = s[2] || 'International';

      // Match airline from callsign prefix
      const prefix = rawCallsign.slice(0, 3).toUpperCase();
      const matchedAirline = SAMPLE_AIRLINES.find(a => a.prefix === prefix);
      const airline = matchedAirline ? matchedAirline.name : (originCountry ? `${originCountry} Aviation` : 'Commercial');
      const airlineIata = matchedAirline ? matchedAirline.iata : prefix.slice(0, 2);

      const modelObj = SAMPLE_AIRCRAFT_MODELS[i % SAMPLE_AIRCRAFT_MODELS.length];
      const origAirport = SAMPLE_AIRPORTS[i % SAMPLE_AIRPORTS.length];
      const destAirport = SAMPLE_AIRPORTS[(i + 5) % SAMPLE_AIRPORTS.length];

      const distKm = calculateDistanceKm(centerLat, centerLon, lat, lon);
      const distMiles = distKm * 0.621371;
      const bearingDeg = calculateBearingDeg(centerLat, centerLon, lat, lon);
      const bearingCardinal = bearingToCardinal(bearingDeg);
      const clockPosition = bearingToClockPosition(bearingDeg);
      const elevationAngleDeg = calculateElevationAngle(baroAltitude, distKm);

      planes.push({
        icao24,
        callsign: rawCallsign,
        flightNumber: `${airlineIata}${rawCallsign.replace(/^[A-Z]+/, '') || '101'}`,
        airline,
        airlineIata,
        aircraftModel: modelObj.model,
        aircraftCategory: modelObj.category,
        originAirport: origAirport,
        destinationAirport: destAirport,
        latitude: lat,
        longitude: lon,
        baroAltitude,
        geometricAltitude: baroAltitude + 200,
        velocity,
        trueTrack,
        verticalRate,
        squawk,
        onGround,
        lastContact: s[4] || Math.floor(Date.now() / 1000),
        distanceKm: Math.round(distKm * 10) / 10,
        distanceMiles: Math.round(distMiles * 10) / 10,
        bearingDeg,
        bearingCardinal,
        clockPosition,
        elevationAngleDeg,
        isOverhead: distKm < 25 || elevationAngleDeg > 20,
      });
    }

    return planes.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch {
    return null;
  }
}
