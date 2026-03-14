
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Navigation, MapPin, List, X, AlertTriangle, RefreshCw, Star, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useGeolocation, LatLng } from '../hooks/useGeolocation';
import {
  geocodeDestination,
  searchNearbyPlaces,
  getDirections,
  searchSuggestions,
  GeocodedLocation,
  NearbyPlace,
  DirectionsResult,
  SearchSuggestion,
} from '../services/mapsService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string;

const DEFAULT_CENTER: LatLng = { lat: 31.52, lng: 74.36 }; // Lahore fallback
const DEFAULT_ZOOM = 4;
const DESTINATION_ZOOM = 12;

const MapsPage: React.FC = () => {
  const { trips } = useTrips();
  const mapRef = useRef<MapRef>(null);

  // ── Trip selection ──────────────────────────────────────────────────────
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const activeTripId = selectedTripId || trips[0]?.id || '';
  const selectedTrip = trips.find((t) => t.id === activeTripId);
  const destination = selectedTrip?.destination || '';

  // ── Geocoding ─────────────────────────────────────────────────────────
  const [destLocation, setDestLocation] = useState<GeocodedLocation | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // ── Geolocation ───────────────────────────────────────────────────────
  const {
    position: userPosition,
    accuracy,
    error: geoError,
    retry: retryGeo,
  } = useGeolocation();

  // ── Search autocomplete ───────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<LatLng | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Nearby places ─────────────────────────────────────────────────────
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // ── Directions ────────────────────────────────────────────────────────
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  // ── UI ────────────────────────────────────────────────────────────────
  const [popupPlace, setPopupPlace] = useState<NearbyPlace | null>(null);
  const [showDestPopup, setShowDestPopup] = useState(false);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);

  // ── Viewport ──────────────────────────────────────────────────────────
  const initialCenter = destLocation
    ? { latitude: destLocation.lat, longitude: destLocation.lng }
    : { latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng };

  // ── Geocode destination when trip changes ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    setDestLocation(null);
    setGeocodeError(null);
    setNearbyPlaces([]);
    setDirections(null);
    setDirectionsError(null);
    setSearchValue('');
    setSelectedPlace(null);
    setPopupPlace(null);
    setShowDestPopup(false);

    if (!destination) return;

    const run = async () => {
      setGeocodingLoading(true);
      const result = await geocodeDestination(destination);
      if (cancelled) return;

      if (result) {
        setDestLocation(result);
        mapRef.current?.flyTo({
          center: [result.lng, result.lat],
          zoom: DESTINATION_ZOOM,
          duration: 1500,
        });

        // Fetch nearby places
        setNearbyLoading(true);
        const places = await searchNearbyPlaces({ lat: result.lat, lng: result.lng });
        if (!cancelled) {
          setNearbyPlaces(places);
          setNearbyLoading(false);
        }
      } else {
        setGeocodeError(`Could not find "${destination}" on the map.`);
      }
      if (!cancelled) setGeocodingLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [destination]);

  // ── Search with debounce ──────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const proximity = destLocation
        ? { lat: destLocation.lat, lng: destLocation.lng }
        : userPosition || undefined;
      const results = await searchSuggestions(value, proximity);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, [destLocation, userPosition]);

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSelectedPlace(suggestion.location);
    setSearchValue(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    mapRef.current?.flyTo({
      center: [suggestion.location.lng, suggestion.location.lat],
      zoom: 15,
      duration: 1000,
    });
  };

  // ── Directions ────────────────────────────────────────────────────────
  const handleGetDirections = async (to?: LatLng) => {
    const target = to || selectedPlace;
    const origin = userPosition;
    if (!origin) {
      setDirectionsError('Your location is not available. Enable GPS to get directions.');
      return;
    }
    if (!target && !destLocation) {
      setDirectionsError('No destination selected.');
      return;
    }

    setDirectionsLoading(true);
    setDirectionsError(null);

    const dest = target || { lat: destLocation!.lat, lng: destLocation!.lng };
    const result = await getDirections(origin, dest);

    if (result) {
      setDirections(result);
    } else {
      setDirectionsError('Could not calculate route. The locations may not be connected by roads.');
    }
    setDirectionsLoading(false);
  };

  const clearRoute = () => {
    setDirections(null);
    setDirectionsError(null);
  };

  // ── Fallback states ───────────────────────────────────────────────────

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4 border border-slate-100">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Mapbox Token Required</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Add your token to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> as{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">VITE_MAPBOX_PUBLIC_TOKEN</code> and restart
            the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <MapPin size={32} className="text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No trips yet. Create one to explore the map.</p>
      </div>
    );
  }

  const visibleNearby = bottomSheetExpanded ? nearbyPlaces : nearbyPlaces.slice(0, 2);

  // ── Accuracy circle GeoJSON ───────────────────────────────────────────
  const accuracyCircleData = userPosition && accuracy ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Point' as const,
      coordinates: [userPosition.lng, userPosition.lat],
    },
  } : null;

  return (
    <div className="h-full flex flex-col relative">
      {/* ── Full-screen map ─────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            ...initialCenter,
            zoom: destLocation ? DESTINATION_ZOOM : DEFAULT_ZOOM,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={() => { setPopupPlace(null); setShowDestPopup(false); setShowSuggestions(false); }}
        >
          {/* User location marker */}
          {userPosition && (
            <>
              <Marker latitude={userPosition.lat} longitude={userPosition.lng} anchor="center">
                <div className="relative">
                  <div className="w-4 h-4 bg-blue-500 border-[3px] border-white rounded-full shadow-lg" />
                  <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-30" />
                </div>
              </Marker>
              {accuracyCircleData && (
                <Source id="accuracy-circle" type="geojson" data={accuracyCircleData}>
                  <Layer
                    id="accuracy-circle-fill"
                    type="circle"
                    paint={{
                      'circle-radius': {
                        stops: [[0, 0], [20, accuracy! / 0.075]],
                        base: 2,
                      },
                      'circle-color': '#3b82f6',
                      'circle-opacity': 0.08,
                      'circle-stroke-color': '#3b82f6',
                      'circle-stroke-opacity': 0.25,
                      'circle-stroke-width': 1,
                    }}
                  />
                </Source>
              )}
            </>
          )}

          {/* Destination marker */}
          {destLocation && (
            <>
              <Marker
                latitude={destLocation.lat}
                longitude={destLocation.lng}
                anchor="bottom"
                onClick={(e) => { e.originalEvent.stopPropagation(); setShowDestPopup(true); }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div className="w-2 h-2 bg-indigo-600 rotate-45 -mt-1" />
                </div>
              </Marker>
              {showDestPopup && (
                <Popup
                  latitude={destLocation.lat}
                  longitude={destLocation.lng}
                  anchor="bottom"
                  offset={40}
                  closeOnClick={false}
                  onClose={() => setShowDestPopup(false)}
                >
                  <div className="pr-2">
                    <p className="font-bold text-sm">{selectedTrip.destination}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{destLocation.formattedAddress}</p>
                  </div>
                </Popup>
              )}
            </>
          )}

          {/* Selected search place marker */}
          {selectedPlace && (
            <Marker latitude={selectedPlace.lat} longitude={selectedPlace.lng} anchor="bottom">
              <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Search size={14} className="text-white" />
              </div>
            </Marker>
          )}

          {/* Nearby places markers */}
          {nearbyPlaces.map((place) => (
            <Marker
              key={place.placeId}
              latitude={place.location.lat}
              longitude={place.location.lng}
              anchor="center"
              onClick={(e) => { e.originalEvent.stopPropagation(); setPopupPlace(place); }}
            >
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                <Star size={12} className="text-white" />
              </div>
            </Marker>
          ))}

          {/* Nearby place popup */}
          {popupPlace && (
            <Popup
              latitude={popupPlace.location.lat}
              longitude={popupPlace.location.lng}
              anchor="bottom"
              offset={20}
              closeOnClick={false}
              onClose={() => setPopupPlace(null)}
            >
              <div className="pr-2 space-y-1">
                <p className="font-bold text-sm">{popupPlace.name}</p>
                {popupPlace.distanceText && (
                  <p className="text-xs text-gray-500">{popupPlace.distanceText} away</p>
                )}
                {popupPlace.vicinity && (
                  <p className="text-xs text-gray-400">{popupPlace.vicinity}</p>
                )}
                <button
                  onClick={() => handleGetDirections(popupPlace.location)}
                  className="text-xs text-indigo-600 font-semibold hover:underline mt-1"
                >
                  Get Directions
                </button>
              </div>
            </Popup>
          )}

          {/* Route polyline */}
          {directions && (
            <Source id="route" type="geojson" data={directions.routeGeoJSON}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#4f46e5',
                  'line-width': 5,
                  'line-opacity': 0.8,
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* ── Top overlay ─────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-20 space-y-2">
        {/* Trip selector */}
        {trips.length > 1 && (
          <select
            value={activeTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full bg-white/95 backdrop-blur-md border border-slate-100 py-2.5 px-4 rounded-2xl shadow-xl outline-none font-semibold text-sm text-slate-700"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {t.destination}
              </option>
            ))}
          </select>
        )}

        {/* Search bar */}
        <div className="relative">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-1.5 flex items-center border border-slate-100">
            <div className="p-2 text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={`Search in ${destination || 'the area'}...`}
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 font-medium w-full"
            />
            <button
              onClick={() => handleGetDirections()}
              disabled={directionsLoading}
              className="bg-indigo-600 text-white p-2.5 rounded-xl flex-shrink-0 disabled:opacity-50"
              title="Get Directions"
            >
              {directionsLoading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Navigation size={18} />
              )}
            </button>
          </div>

          {/* Search suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                >
                  <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS error banner */}
        {geoError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3 shadow-lg">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 font-medium">{geoError}</p>
            </div>
            <button onClick={retryGeo} className="text-amber-600 hover:text-amber-800 flex-shrink-0" title="Retry">
              <RefreshCw size={16} />
            </button>
          </div>
        )}

        {/* Geocode error banner */}
        {geocodeError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-3 shadow-lg">
            <AlertTriangle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-800 font-medium flex-1">{geocodeError}</p>
            <button onClick={() => setGeocodeError(null)} className="text-rose-400 hover:text-rose-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Directions error banner */}
        {directionsError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-3 shadow-lg">
            <AlertTriangle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-800 font-medium flex-1">{directionsError}</p>
            <button onClick={() => setDirectionsError(null)} className="text-rose-400 hover:text-rose-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Geocoding loading indicator */}
        {geocodingLoading && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg flex items-center gap-3 border border-slate-100">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-xs text-slate-600 font-medium">Finding {destination}...</p>
          </div>
        )}
      </div>

      {/* ── Directions info panel (top-right) ───────────────────────── */}
      {directions && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-slate-100 mt-[140px] max-w-[200px]">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">{directions.distanceText}</p>
            <p className="text-xs text-slate-500">{directions.durationText}</p>
          </div>
          <button
            onClick={clearRoute}
            className="mt-3 text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
          >
            <X size={12} /> Clear Route
          </button>
        </div>
      )}

      {/* ── Bottom sheet ────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[45vh] overflow-y-auto">
        <button
          onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
          className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 block"
        />

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-400" />
            <h3 className="text-base font-bold text-slate-800">Nearby Attractions</h3>
          </div>
          {nearbyPlaces.length > 2 && (
            <button
              onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
              className="text-indigo-600 text-xs font-semibold flex items-center gap-1"
            >
              {bottomSheetExpanded ? (
                <>Show Less <ChevronUp size={14} /></>
              ) : (
                <>Show All ({nearbyPlaces.length}) <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>

        {nearbyLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2 bg-slate-50 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleNearby.length > 0 ? (
          <div className="space-y-2">
            {visibleNearby.map((place) => (
              <div
                key={place.placeId}
                className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [place.location.lng, place.location.lat],
                    zoom: 15,
                    duration: 1000,
                  });
                  setPopupPlace(place);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
                    <MapPin size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{place.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {place.distanceText && (
                        <span className="text-xs text-slate-400 font-medium">{place.distanceText}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetDirections(place.location);
                  }}
                  disabled={directionsLoading}
                  className="bg-indigo-50 px-3 py-1.5 rounded-full text-[10px] font-bold text-indigo-600 uppercase flex-shrink-0 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  Directions
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">
            {geocodeError ? 'Destination not found — cannot search nearby.' : 'No nearby attractions found.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default MapsPage;
