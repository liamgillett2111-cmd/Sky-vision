import React, { useState, useMemo } from 'react';
import { Aircraft, AccessibilitySettings } from '../types';
import { speechService } from '../services/speechService';
import { haptics } from '../services/haptics';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plane, 
  Volume2, 
  Compass, 
  ChevronRight, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles
} from 'lucide-react';

interface RadarListViewProps {
  aircraftList: Aircraft[];
  settings: AccessibilitySettings;
  onSelectAircraft: (aircraft: Aircraft) => void;
  onTrackWithSkyPointer: (aircraft: Aircraft) => void;
  onSetPoliteMessage: (msg: string) => void;
}

type FilterOption = 'all' | 'overhead' | 'cruising' | 'approach' | 'climbing' | 'descending' | 'emergency';
type SortOption = 'distance' | 'elevation' | 'altitude' | 'airline';

export const RadarListView: React.FC<RadarListViewProps> = ({
  aircraftList,
  settings,
  onSelectAircraft,
  onTrackWithSkyPointer,
  onSetPoliteMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('distance');

  // Filter and sort aircraft
  const filteredAircraft = useMemo(() => {
    let list = [...aircraftList];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        p.callsign.toLowerCase().includes(q) ||
        p.flightNumber.toLowerCase().includes(q) ||
        p.airline.toLowerCase().includes(q) ||
        p.aircraftModel.toLowerCase().includes(q) ||
        p.originAirport.city.toLowerCase().includes(q) ||
        p.originAirport.code.toLowerCase().includes(q) ||
        p.destinationAirport.city.toLowerCase().includes(q) ||
        p.destinationAirport.code.toLowerCase().includes(q) ||
        p.squawk.includes(q)
      );
    }

    // Category filter
    switch (activeFilter) {
      case 'overhead':
        list = list.filter((p) => p.isOverhead);
        break;
      case 'cruising':
        list = list.filter((p) => p.baroAltitude >= 25000);
        break;
      case 'approach':
        list = list.filter((p) => p.baroAltitude <= 10000);
        break;
      case 'climbing':
        list = list.filter((p) => p.verticalRate > 300);
        break;
      case 'descending':
        list = list.filter((p) => p.verticalRate < -300);
        break;
      case 'emergency':
        list = list.filter((p) => p.squawk === '7700' || p.squawk === '7600');
        break;
      case 'all':
      default:
        break;
    }

    // Sort order
    list.sort((a, b) => {
      if (sortBy === 'distance') {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'elevation') {
        return b.elevationAngleDeg - a.elevationAngleDeg;
      }
      if (sortBy === 'altitude') {
        return b.baroAltitude - a.baroAltitude;
      }
      if (sortBy === 'airline') {
        return a.airline.localeCompare(b.airline);
      }
      return 0;
    });

    return list;
  }, [aircraftList, searchQuery, activeFilter, sortBy]);

  const handleFilterChange = (filter: FilterOption, label: string) => {
    setActiveFilter(filter);
    haptics.lightTick();
    onSetPoliteMessage(`Filter changed to ${label}. Showing ${filteredAircraft.length} aircraft.`);
  };

  const handleSortChange = (sort: SortOption, label: string) => {
    setSortBy(sort);
    haptics.lightTick();
    onSetPoliteMessage(`Sorted by ${label}.`);
  };

  return (
    <section 
      aria-labelledby="radar-list-heading" 
      className="flex flex-col space-y-4 max-w-3xl mx-auto w-full pb-10"
    >
      {/* Header and Live Count */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 id="radar-list-heading" className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Plane className="w-6 h-6 text-amber-400" aria-hidden="true" />
            Flight Radar List
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Full airspace traffic with audio briefings, clock bearings, and altitude.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-semibold text-amber-300"
            aria-live="polite"
          >
            {filteredAircraft.length} flights detected
          </span>
        </div>
      </div>

      {/* Accessible Search Input */}
      <div className="relative">
        <label htmlFor="aircraft-search-input" className="sr-only">
          Search flights by number, airline, callsign, city, or aircraft model
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" aria-hidden="true" />
        </div>
        <input
          id="aircraft-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search flight, airline, destination (e.g. BA117, JFK, A350)..."
          className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 text-base"
        />
        {searchQuery && (
          <button
            id="btn-clear-search"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
            aria-label="Clear search input"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips - Large accessible touch targets */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" 
        role="toolbar" 
        aria-label="Filter aircraft categories"
      >
        <button
          id="filter-all"
          onClick={() => handleFilterChange('all', 'All Flights')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'all'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'all'}
        >
          All ({aircraftList.length})
        </button>

        <button
          id="filter-overhead"
          onClick={() => handleFilterChange('overhead', 'Directly Overhead')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'overhead'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'overhead'}
        >
          Directly Overhead
        </button>

        <button
          id="filter-cruising"
          onClick={() => handleFilterChange('cruising', 'High Cruising Flights')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'cruising'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'cruising'}
        >
          Cruising (&gt;25k ft)
        </button>

        <button
          id="filter-approach"
          onClick={() => handleFilterChange('approach', 'Low Altitude or Approach Flights')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'approach'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'approach'}
        >
          Approach / Low (&lt;10k ft)
        </button>

        <button
          id="filter-climbing"
          onClick={() => handleFilterChange('climbing', 'Climbing Flights')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'climbing'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'climbing'}
        >
          Climbing
        </button>

        <button
          id="filter-descending"
          onClick={() => handleFilterChange('descending', 'Descending Flights')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition min-h-[44px] ${
            activeFilter === 'descending'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
          aria-pressed={activeFilter === 'descending'}
        >
          Descending
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
        <span className="flex items-center gap-1 font-semibold text-slate-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          Sort by:
        </span>
        <div className="flex gap-2">
          <button
            id="sort-distance"
            onClick={() => handleSortChange('distance', 'Proximity')}
            className={`px-2 py-1 rounded ${sortBy === 'distance' ? 'bg-amber-400/20 text-amber-300 font-bold' : 'hover:text-white'}`}
            aria-pressed={sortBy === 'distance'}
          >
            Distance
          </button>
          <button
            id="sort-elevation"
            onClick={() => handleSortChange('elevation', 'Elevation in Sky')}
            className={`px-2 py-1 rounded ${sortBy === 'elevation' ? 'bg-amber-400/20 text-amber-300 font-bold' : 'hover:text-white'}`}
            aria-pressed={sortBy === 'elevation'}
          >
            Sky Elevation
          </button>
          <button
            id="sort-altitude"
            onClick={() => handleSortChange('altitude', 'Altitude')}
            className={`px-2 py-1 rounded ${sortBy === 'altitude' ? 'bg-amber-400/20 text-amber-300 font-bold' : 'hover:text-white'}`}
            aria-pressed={sortBy === 'altitude'}
          >
            Altitude
          </button>
          <button
            id="sort-airline"
            onClick={() => handleSortChange('airline', 'Airline')}
            className={`px-2 py-1 rounded ${sortBy === 'airline' ? 'bg-amber-400/20 text-amber-300 font-bold' : 'hover:text-white'}`}
            aria-pressed={sortBy === 'airline'}
          >
            Airline
          </button>
        </div>
      </div>

      {/* Flight Cards List */}
      <div 
        id="flights-list-container"
        className="space-y-3"
        role="region"
        aria-label="List of detected aircraft"
      >
        {filteredAircraft.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-base text-slate-300">
              No flights matched your filter or search query.
            </p>
            <button
              id="btn-reset-filters"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 bg-slate-800 text-amber-300 rounded-lg border border-slate-700 hover:bg-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredAircraft.map((plane) => {
            const isClimbing = plane.verticalRate > 300;
            const isDescending = plane.verticalRate < -300;

            const accessibleDescription = `${plane.airline}, Flight ${plane.flightNumber || plane.callsign}, model ${plane.aircraftModel}. Route from ${plane.originAirport.city} to ${plane.destinationAirport.city}. Bearing ${plane.bearingCardinal} at your ${plane.clockPosition}, ${plane.distanceMiles.toFixed(1)} miles away. Altitude ${plane.baroAltitude.toLocaleString()} feet, ${isClimbing ? 'climbing' : isDescending ? 'descending' : 'level'}. Elevation ${plane.elevationAngleDeg} degrees in the sky.`;

            return (
              <article
                key={plane.icao24}
                id={`flight-card-${plane.icao24}`}
                className={`bg-slate-900 border rounded-2xl p-4 transition-all hover:border-slate-700 ${
                  plane.isOverhead 
                    ? 'border-amber-400/60 bg-amber-950/10' 
                    : plane.squawk === '7700'
                    ? 'border-red-500 bg-red-950/20'
                    : 'border-slate-800'
                }`}
                aria-label={accessibleDescription}
              >
                {/* Header: Airline, Flight Number, Overhead Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">
                        {plane.airline}
                      </span>
                      {plane.isOverhead && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-full">
                          Overhead
                        </span>
                      )}
                      {plane.squawk === '7700' && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> 7700 Emergency
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-amber-400 flex items-center gap-2 mt-0.5">
                      <span>Flight {plane.flightNumber || plane.callsign}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300 font-normal">{plane.aircraftModel}</span>
                    </div>
                  </div>

                  {/* Clock position badge */}
                  <div className="text-right flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300">
                      {plane.clockPosition}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      {plane.bearingCardinal}
                    </span>
                  </div>
                </div>

                {/* Route Information */}
                <div className="mt-3 py-2 border-t border-b border-slate-800/80 flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-100">{plane.originAirport.code}</span>
                    <span className="text-xs text-slate-400">{plane.originAirport.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="w-8 border-t border-slate-700"></span>
                    <Plane className="w-4 h-4 text-amber-400 rotate-90" aria-hidden="true" />
                    <span className="w-8 border-t border-slate-700"></span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-slate-100">{plane.destinationAirport.code}</span>
                    <span className="text-xs text-slate-400">{plane.destinationAirport.city}</span>
                  </div>
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Altitude</span>
                    <span className="text-sm font-bold text-white flex items-center justify-center gap-1">
                      {plane.baroAltitude.toLocaleString()} ft
                      {isClimbing ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" aria-label="Climbing" />
                      ) : isDescending ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" aria-label="Descending" />
                      ) : (
                        <Minus className="w-3 h-3 text-slate-400" aria-label="Level flight" />
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Sky Elevation</span>
                    <span className="text-sm font-bold text-amber-300">
                      {plane.elevationAngleDeg}° angle
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Distance</span>
                    <span className="text-sm font-bold text-white">
                      {plane.distanceMiles.toFixed(1)} mi
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Audio Readout, Track with Pointer, View Full Telemetry */}
                <div className="mt-3 pt-2 flex items-center gap-2">
                  <button
                    id={`btn-read-brief-${plane.icao24}`}
                    onClick={() => speechService.announceFlightDetail(plane)}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-amber-400 active:text-slate-950 text-amber-300 rounded-xl border border-slate-700 text-sm font-semibold flex items-center justify-center gap-1.5 transition min-h-[46px]"
                    aria-label={`Listen to flight briefing for ${plane.airline} ${plane.flightNumber || plane.callsign}`}
                  >
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                    <span>Listen Briefing</span>
                  </button>

                  <button
                    id={`btn-pointer-track-${plane.icao24}`}
                    onClick={() => onTrackWithSkyPointer(plane)}
                    className="py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl border border-amber-500/40 text-sm font-semibold flex items-center justify-center gap-1.5 transition min-h-[46px]"
                    aria-label={`Track ${plane.airline} ${plane.flightNumber} using Sky Pointer`}
                  >
                    <Compass className="w-4 h-4" aria-hidden="true" />
                    <span>Aim to Sky</span>
                  </button>

                  <button
                    id={`btn-open-modal-${plane.icao24}`}
                    onClick={() => onSelectAircraft(plane)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center transition min-w-[46px] min-h-[46px]"
                    aria-label={`View complete telemetry details for ${plane.airline} ${plane.flightNumber || plane.callsign}`}
                  >
                    <ChevronRight className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
