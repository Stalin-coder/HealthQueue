import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Navigation, X, MapPin, Clock, AlertTriangle, Locate, CheckCircle2 } from 'lucide-react';
import { getDistanceKm } from '@/lib/distance';

interface NavigationOverlayProps {
  clinicName: string;
  clinicLat: number;
  clinicLng: number;
  distanceKm: number | null;
  onClose: () => void;
  onUserLocationUpdate?: (pos: { lat: number; lng: number }) => void;
}

function formatETA(distKm: number): string {
  const minutes = Math.round((distKm / 30) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDist(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)}m`;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export default function NavigationOverlay({
  clinicName, clinicLat, clinicLng, distanceKm: initialDistance, onClose, onUserLocationUpdate,
}: NavigationOverlayProps) {
  const [liveDistance, setLiveDistance] = useState<number | null>(initialDistance);
  const [startDistance, setStartDistance] = useState<number | null>(initialDistance);
  const [arrived, setArrived] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinicLat},${clinicLng}`;

  // Live GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = getDistanceKm(pos.coords.latitude, pos.coords.longitude, clinicLat, clinicLng);
        setLiveDistance(dist);
        if (startDistance === null) setStartDistance(dist);
        onUserLocationUpdate?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });

        // Arrived threshold: within 100m
        if (dist < 0.1) setArrived(true);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [clinicLat, clinicLng, onUserLocationUpdate, startDistance]);

  const dist = liveDistance ?? initialDistance;
  const progress = startDistance && dist !== null && startDistance > 0
    ? Math.min(100, Math.max(0, ((startDistance - dist) / startDistance) * 100))
    : 0;

  // Contextual message
  const getMessage = () => {
    if (arrived) return { text: "You've arrived! 🎉", type: 'success' as const };
    if (dist === null) return null;
    if (dist > 10) return { text: '🚗 Start driving now to reach on time', type: 'warning' as const };
    if (dist > 5) return { text: '🚗 You\'re on your way — keep going!', type: 'warning' as const };
    if (dist > 1) return { text: '📍 Getting closer — almost there!', type: 'info' as const };
    if (dist > 0.3) return { text: '🏥 Hospital is nearby — look around!', type: 'info' as const };
    if (dist > 0.1) return { text: '🚶 Just a short walk away!', type: 'success' as const };
    return { text: "You've arrived! 🎉", type: 'success' as const };
  };

  const message = getMessage();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[600] bg-background/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
      {/* Close button */}
      <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header with live indicator */}
      <div className="flex items-center gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 relative">
          <span className="text-lg">🏥</span>
          <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{clinicName}</h3>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Locate className="h-3 w-3" />
            <span>Live tracking</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {dist !== null && !arrived && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>You</span>
            <span>{clinicName}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-center text-muted-foreground">
            {progress > 0 ? `${Math.round(progress)}% of the way there` : 'Tracking your movement...'}
          </p>
        </div>
      )}

      {/* Arrived state */}
      {arrived && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 rounded-xl p-3 border border-green-200 dark:border-green-900">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">You've arrived!</p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">Head inside for your consultation</p>
          </div>
        </div>
      )}

      {/* Distance & ETA - live updating */}
      {dist !== null && !arrived && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-primary/5 rounded-lg px-3 py-2.5 flex-1">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-base font-bold text-primary tabular-nums">{formatDist(dist)}</p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2.5 flex-1">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-base font-bold tabular-nums">{formatETA(dist)}</p>
              <p className="text-[10px] text-muted-foreground">ETA</p>
            </div>
          </div>
        </div>
      )}

      {/* Contextual message */}
      {message && !arrived && (
        <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
          message.type === 'warning'
            ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20'
            : message.type === 'success'
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20'
            : 'text-primary bg-primary/5'
        }`}>
          {message.type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Navigate button */}
      {!arrived && (
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full gap-2 h-11 text-sm font-semibold">
            <Navigation className="h-4 w-4" />
            Open Google Maps
          </Button>
        </a>
      )}
    </div>
  );
}
