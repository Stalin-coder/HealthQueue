import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toFiniteCoordinate } from '@/lib/distance';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface NearbyMapProps {
  userLocation: { lat: number; lng: number } | null;
  clinics: any[];
  formatDist: (km: number) => string;
  height?: number | string;
  onClinicSelect?: (clinicId: string) => void;
  navigatingTo?: { lat: number; lng: number } | null;
}

export default function NearbyMap({ userLocation, clinics, formatDist, height = 280, onClinicSelect, navigatingTo }: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: L.LatLngExpression = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [20.5937, 78.9629];

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(center, 13);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const points: L.LatLng[] = [];

    // User marker with pulse animation
    if (userLocation) {
      const userIcon = L.divIcon({
        html: `
          <div style="position:relative;width:20px;height:20px;">
            <div style="position:absolute;inset:-6px;background:hsl(221,83%,53%,0.15);border-radius:50%;animation:pulse 2s infinite;"></div>
            <div style="width:20px;height:20px;background:hsl(221,83%,53%);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
          </div>
          <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(2.5);opacity:0}}</style>
        `,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
        .bindPopup('<strong>📍 You are here</strong>')
        .addTo(map);
      points.push(L.latLng(userLocation.lat, userLocation.lng));
    }

    // Hospital markers
    clinics.forEach(clinic => {
      const clinicLat = toFiniteCoordinate(clinic.latitude);
      const clinicLng = toFiniteCoordinate(clinic.longitude);
      if (clinicLat === null || clinicLng === null) return;

      const waitColor = clinic.estimatedWaitMin === null ? '#6b7280'
        : clinic.estimatedWaitMin === 0 ? '#16a34a'
        : clinic.estimatedWaitMin <= 15 ? '#ca8a04'
        : '#ea580c';

      const hospitalIcon = L.divIcon({
        html: `
          <div style="position:relative;">
            <div style="width:36px;height:36px;background:white;border:2px solid ${waitColor};border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
              <span style="font-size:20px;">🏥</span>
            </div>
            <div style="position:absolute;-bottom:2px;right:-2px;background:${waitColor};color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">
              ${clinic.estimatedWaitMin === null ? '?' : clinic.estimatedWaitMin === 0 ? '0m' : clinic.estimatedWaitMin + 'm'}
            </div>
          </div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const distText = clinic.distance !== null ? `${formatDist(clinic.distance)} away` : '';
      const waitText = clinic.estimatedWaitMin === null ? '' : clinic.estimatedWaitMin === 0 ? '✅ No wait' : `⏱ ~${clinic.estimatedWaitMin} min wait`;
      const navLink = clinicLat && clinicLng
        ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${clinicLat},${clinicLng}" target="_blank" style="display:inline-block;background:#4285f4;color:white;padding:4px 10px;border-radius:6px;font-size:11px;text-decoration:none;margin-right:4px;">🧭 Navigate</a>`
        : '';

      const popup = `
        <div style="font-family:system-ui;min-width:180px;max-width:220px;">
          <strong style="font-size:13px;display:block;margin-bottom:4px;">${clinic.name}</strong>
          ${clinic.rating ? `<span style="font-size:11px;color:#16a34a;">⭐ ${Number(clinic.rating).toFixed(1)}</span>` : ''}
          ${distText ? `<span style="font-size:11px;color:#666;margin-left:6px;">📍 ${distText}</span>` : ''}
          ${waitText ? `<div style="font-size:11px;color:${waitColor};margin:4px 0;font-weight:600;">${waitText}</div>` : ''}
          <div style="display:flex;gap:4px;margin-top:8px;">
            ${navLink}
            <a href="/clinic/${clinic.id}" style="display:inline-block;background:hsl(221,83%,53%);color:white;padding:4px 10px;border-radius:6px;font-size:11px;text-decoration:none;">Join Queue</a>
          </div>
        </div>`;

      const marker = L.marker([clinicLat, clinicLng], { icon: hospitalIcon })
        .bindPopup(popup, { maxWidth: 240 })
        .addTo(map);

      if (onClinicSelect) {
        marker.on('click', () => onClinicSelect(clinic.id));
      }

      points.push(L.latLng(clinicLat, clinicLng));
    });

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
    }
  }, [userLocation, clinics, formatDist, onClinicSelect]);

  // Draw route line when navigating
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (navigatingTo && userLocation) {
      const coords: L.LatLngExpression[] = [
        [userLocation.lat, userLocation.lng],
        [navigatingTo.lat, navigatingTo.lng],
      ];
      routeLineRef.current = L.polyline(coords, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        dashArray: '12, 8',
      }).addTo(map);

      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 15 });
    }
  }, [navigatingTo, userLocation]);

  return (
    <div ref={containerRef} className="w-full" style={{ height }} />
  );
}
