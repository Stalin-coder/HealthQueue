import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Search, LocateFixed, Loader2, Hospital, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import HospitalCard from '@/components/nearby/HospitalCard';
import NavigationOverlay from '@/components/nearby/NavigationOverlay';
import { formatDistanceKm, getDistanceKm, toFiniteCoordinate } from '@/lib/distance';

const NearbyMap = lazy(() => import('@/components/nearby/NearbyMap'));
const formatDist = formatDistanceKm;

export default function NearbyHospitals() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);
  const [clinics, setClinics] = useState<any[]>([]);
  const [queueCounts, setQueueCounts] = useState<Record<string, { waiting: number; serving: number | null }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [maxDistance, setMaxDistance] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [autoExpandedRadius, setAutoExpandedRadius] = useState(false);
  const [sortBy, setSortBy] = useState<'wait' | 'distance' | 'rating'>('distance');
  const [listExpanded, setListExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [navigatingClinic, setNavigatingClinic] = useState<any>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const requestLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        (err) => {
          setLocationError(
            err.code === 1 ? 'Location access denied. Enable it in browser settings.' :
            err.code === 2 ? 'Unable to determine location.' :
            'Location request timed out.'
          );
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation not supported.');
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const fetchData = useCallback(async () => {
    const [clinicsRes, tokensRes] = await Promise.all([
      supabase.from('clinics').select('*, doctors(id, name, specialization, is_active, slot_duration_minutes)')
        .eq('status', 'approved' as any)
        .eq('is_open', true),
      supabase.from('queue_tokens').select('clinic_id, status, token_number')
        .eq('queue_date', today)
        .in('status', ['waiting', 'checked_in', 'serving', 'in_consultation'] as any[]),
    ]);

    setClinics(clinicsRes.data || []);

    const counts: Record<string, { waiting: number; serving: number | null }> = {};
    (tokensRes.data || []).forEach((t: any) => {
      if (!counts[t.clinic_id]) counts[t.clinic_id] = { waiting: 0, serving: null };
      if (t.status === 'waiting' || t.status === 'checked_in') counts[t.clinic_id].waiting++;
      if (t.status === 'serving' || t.status === 'in_consultation') counts[t.clinic_id].serving = t.token_number;
    });
    setQueueCounts(counts);
    setLoading(false);
  }, [today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allSpecialties = Array.from(new Set(
    clinics.flatMap(c => (c.doctors || []).filter((d: any) => d.is_active).map((d: any) => d.specialization))
  )).sort();

  const enriched = clinics.map(c => {
    const activeDoctors = (c.doctors || []).filter((d: any) => d.is_active);
    const queueInfo = queueCounts[c.id] || { waiting: 0, serving: null };
    const avgSlot = activeDoctors.length > 0
      ? Math.round(activeDoctors.reduce((sum: number, d: any) => sum + (d.slot_duration_minutes || 15), 0) / activeDoctors.length)
      : 15;
    const estimatedWaitMin = activeDoctors.length > 0 ? queueInfo.waiting * avgSlot : null;

    const clinicLat = toFiniteCoordinate(c.latitude);
    const clinicLng = toFiniteCoordinate(c.longitude);

    return {
      ...c,
      latitude: clinicLat,
      longitude: clinicLng,
      distance: userLocation && clinicLat !== null && clinicLng !== null
        ? getDistanceKm(userLocation.lat, userLocation.lng, clinicLat, clinicLng)
        : null,
      queueInfo,
      activeDoctors,
      estimatedWaitMin,
    };
  });

  const filtered = enriched
    .filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (![c.name, c.address, c.city].some(v => v?.toLowerCase().includes(s)) &&
            !c.doctors?.some((d: any) => d.name.toLowerCase().includes(s) || d.specialization.toLowerCase().includes(s)))
          return false;
      }
      if (maxDistance !== 'all' && c.distance !== null && c.distance > Number(maxDistance)) return false;
      if (specialtyFilter !== 'all' && !c.doctors?.some((d: any) => d.is_active && d.specialization === specialtyFilter)) return false;
      if (ratingFilter !== 'all' && (!c.rating || Number(c.rating) < Number(ratingFilter))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'wait') {
        const wa = a.estimatedWaitMin ?? 9999;
        const wb = b.estimatedWaitMin ?? 9999;
        if (wa !== wb) return wa - wb;
      } else if (sortBy === 'rating') {
        const ra = Number(a.rating) || 0;
        const rb = Number(b.rating) || 0;
        if (ra !== rb) return rb - ra;
      }
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });

  useEffect(() => {
    if (!loading && userLocation && !autoExpandedRadius && filtered.length === 0 && clinics.length > 0) {
      const distances = [15, 25, 50, 100];
      const currentIndex = distances.indexOf(Number(maxDistance));
      if (currentIndex < distances.length - 1) {
        setMaxDistance(String(distances[currentIndex + 1]));
        setAutoExpandedRadius(true);
      } else if (maxDistance !== 'all') {
        setMaxDistance('all');
        setAutoExpandedRadius(true);
      }
    }
  }, [filtered.length, userLocation, loading, clinics.length, maxDistance, autoExpandedRadius]);

  return (
    <PatientLayout>
      <div className="space-y-0 -mx-4 -mt-6">
        {/* Full-width Map */}
        <div className="relative">
          {/* Location status overlay */}
          <div className="absolute top-3 left-3 z-[500]">
            {locationLoading ? (
              <Badge className="bg-background/90 text-foreground shadow-lg backdrop-blur-sm border gap-1.5 px-3 py-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Detecting...
              </Badge>
            ) : userLocation ? (
              <Badge className="bg-background/90 text-foreground shadow-lg backdrop-blur-sm border gap-1.5 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live
              </Badge>
            ) : (
              <Button size="sm" onClick={requestLocation} className="shadow-lg gap-1.5 h-8 text-xs">
                <LocateFixed className="h-3.5 w-3.5" /> Enable GPS
              </Button>
            )}
          </div>

          {/* Search overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] w-[min(90%,400px)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals, doctors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 text-sm bg-background/95 backdrop-blur-sm shadow-lg border"
              />
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center bg-muted/30" style={{ height: listExpanded ? 250 : 450 }}>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <NearbyMap
              userLocation={userLocation}
              clinics={filtered}
              formatDist={formatDist}
              height={navigatingClinic ? 500 : listExpanded ? 250 : 450}
              navigatingTo={navigatingClinic ? { lat: navigatingClinic.latitude, lng: navigatingClinic.longitude } : null}
            />
          </Suspense>

          {/* Navigation Overlay */}
          {navigatingClinic && (
            <NavigationOverlay
              clinicName={navigatingClinic.name}
              clinicLat={navigatingClinic.latitude}
              clinicLng={navigatingClinic.longitude}
              distanceKm={navigatingClinic.distance}
              onClose={() => setNavigatingClinic(null)}
              onUserLocationUpdate={(pos) => setUserLocation(pos)}
            />
          )}
        </div>

        {/* Draggable List Panel */}
        {!navigatingClinic && <div
          ref={listRef}
          className="relative bg-background rounded-t-2xl -mt-4 z-[400] border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        >
          {/* Handle bar */}
          <div
            className="flex justify-center pt-2 pb-1 cursor-pointer"
            onClick={() => setListExpanded(!listExpanded)}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-bold text-base">
                  {filtered.length} Hospital{filtered.length !== 1 ? 's' : ''} Nearby
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {userLocation ? 'Sorted by distance' : 'Enable location for distance'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setListExpanded(!listExpanded)}
              >
                {listExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Filters (collapsible) */}
          {showFilters && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Nearest</SelectItem>
                  <SelectItem value="wait">Shortest Wait</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={maxDistance} onValueChange={setMaxDistance}>
                <SelectTrigger className="w-[110px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="2">2 km</SelectItem>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                </SelectContent>
              </Select>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {allSpecialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[100px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="4.5">4.5+</SelectItem>
                  <SelectItem value="4">4.0+</SelectItem>
                  <SelectItem value="3.5">3.5+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hospital List */}
          <div
            className="px-4 pb-6 overflow-y-auto"
            style={{ maxHeight: listExpanded ? 'calc(100vh - 350px)' : 300 }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Finding hospitals...</p>
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-semibold">No hospitals found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setMaxDistance('all'); setRatingFilter('all'); setSpecialtyFilter('all'); setSearch(''); }}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filtered.map(clinic => (
                  <HospitalCard key={clinic.id} clinic={clinic} formatDist={formatDist} onNavigate={(c) => setNavigatingClinic(c)} />
                ))}
              </div>
            )}
          </div>
        </div>}
      </div>
    </PatientLayout>
  );
}
