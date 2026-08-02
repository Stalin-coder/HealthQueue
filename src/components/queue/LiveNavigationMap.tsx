import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Clock, Locate, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LiveNavigationMapProps {
  clinicLat: number;
  clinicLng: number;
  clinicName: string;
  waitTimeMinutes?: number;
  onTravelDataUpdate?: (data: { distanceKm: number; travelMinutes: number; arrived: boolean }) => void;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTravelMinutes(distKm: number): number {
  return Math.round((distKm / 30) * 60);
}

function formatETA(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

type AlertLevel = 'success' | 'info' | 'warning' | 'urgent';

function getTravelAlert(distKm: number, travelMin: number, waitMin: number | undefined): { text: string; level: AlertLevel } | null {
  if (distKm < 0.2) return { text: "You have arrived near the hospital. ✅", level: 'success' };
  if (waitMin === undefined) return null;

  const buffer = waitMin - travelMin;

  if (travelMin >= waitMin) {
    return { text: "⚠️ You should start now to reach the hospital on time.", level: 'urgent' };
  }
  if (buffer <= 5) {
    return { text: "🚨 Please leave now. You may be late.", level: 'urgent' };
  }
  if (buffer <= 15) {
    return { text: "🕐 Your turn is approaching. Please get ready.", level: 'warning' };
  }
  if (buffer <= 30) {
    return { text: "📍 Getting closer to your turn. Plan your travel.", level: 'info' };
  }
  return null;
}

export default function LiveNavigationMap({ clinicLat, clinicLng, clinicName, waitTimeMinutes, onTravelDataUpdate }: LiveNavigationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [arrived, setArrived] = useState(false);

  const onTravelDataUpdateRef = useRef(onTravelDataUpdate);
  onTravelDataUpdateRef.current = onTravelDataUpdate;

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        setLocationError(false);
        const dist = haversineDistance(coords.lat, coords.lng, clinicLat, clinicLng);
        setDistance(dist);
        const isArrived = dist < 0.2;
        setArrived(isArrived);
        onTravelDataUpdateRef.current?.({ distanceKm: dist, travelMinutes: getTravelMinutes(dist), arrived: isArrived });
      },
      () => setLocationError(true),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [clinicLat, clinicLng]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [clinicLat, clinicLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const hospitalIcon = L.divIcon({
      className: 'custom-hospital-marker',
      html: `<div style="
        background: linear-gradient(135deg, hsl(221, 83%, 53%), hsl(262, 83%, 58%));
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(59,130,246,0.4);
        border: 3px solid white;
        font-size: 18px;
      ">🏥</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker([clinicLat, clinicLng], { icon: hospitalIcon })
      .addTo(map)
      .bindPopup(`<b>${clinicName}</b>`);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [clinicLat, clinicLng, clinicName]);

  // Update user marker and route
  useEffect(() => {
    if (!mapInstance.current || !userPos) return;
    const map = mapInstance.current;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="position:relative;">
        <div style="
          width: 18px; height: 18px; background: hsl(142, 71%, 45%);
          border-radius: 50%; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(34,197,94,0.5);
        "></div>
        <div style="
          position: absolute; top: -6px; left: -6px;
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(34,197,94,0.2);
          animation: pulse-ring 2s ease-out infinite;
        "></div>
      </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('📍 You are here');
    }

    const routeCoords: L.LatLngExpression[] = [
      [userPos.lat, userPos.lng],
      [clinicLat, clinicLng],
    ];

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(routeCoords);
    } else {
      routeLineRef.current = L.polyline(routeCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 8',
      }).addTo(map);
    }

    const bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [userPos, clinicLat, clinicLng]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinicLat},${clinicLng}`;
  const travelMin = distance !== null ? getTravelMinutes(distance) : null;
  const alert = distance !== null && travelMin !== null ? getTravelAlert(distance, travelMin, waitTimeMinutes) : null;

  return (
    <div className="rounded-xl overflow-hidden border bg-card">
      <div ref={mapRef} className="h-48 w-full relative z-0" />

      <div className="p-3 space-y-3">
        {/* Arrived banner */}
        {arrived && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-2.5 border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">You have arrived near the hospital!</p>
          </div>
        )}

        {/* Distance / Travel / Wait comparison */}
        {distance !== null && travelMin !== null && !arrived && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-2 text-center">
              <MapPin className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
              <p className="text-sm font-bold text-primary tabular-nums">{formatDist(distance)}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase">Distance</p>
            </div>
            <div className="rounded-lg bg-muted/50 border p-2 text-center">
              <Navigation className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
              <p className="text-sm font-bold tabular-nums">{formatETA(travelMin)}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase">Travel</p>
            </div>
            <div className="rounded-lg bg-muted/50 border p-2 text-center">
              <Clock className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
              <p className="text-sm font-bold tabular-nums">{waitTimeMinutes !== undefined ? `${waitTimeMinutes} min` : '—'}</p>
              <p className="text-[9px] text-muted-foreground font-medium uppercase">Wait</p>
            </div>
          </div>
        )}

        {/* Smart alert */}
        {alert && !arrived && (
          <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
            alert.level === 'urgent'
              ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
              : alert.level === 'warning'
              ? 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900'
              : 'text-primary bg-primary/5 border border-primary/10'
          }`}>
            {alert.level === 'urgent' || alert.level === 'warning'
              ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              : <MapPin className="h-3.5 w-3.5 shrink-0" />
            }
            {alert.text}
          </div>
        )}

        {locationError && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <Locate className="h-3 w-3" /> Location unavailable
          </span>
        )}

        {/* Navigation CTA */}
        {!arrived && (
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
              <Navigation className="h-4 w-4" />
              Start Navigation
            </Button>
          </a>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
