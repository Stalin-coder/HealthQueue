import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PatientLayout from '@/components/PatientLayout';
import TriageAssistant from '@/components/queue/TriageAssistant';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, MapPin, Star, Clock, Users, Navigation,
  Stethoscope, LocateFixed, Loader2, Hospital, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { formatDistanceKm, getDistanceKm, toFiniteCoordinate } from '@/lib/distance';

const formatDist = formatDistanceKm;

export default function Index() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [locationLoading, setLocationLoading] = useState(true);
  const [clinics, setClinics] = useState<any[]>([]);
  const [queueCounts, setQueueCounts] = useState<Record<string, { waiting: number; serving: number | null }>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  const requestLocation = useCallback(() => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Current Location');
          setLocationLoading(false);
        },
        () => {
          setLocationName('Location unavailable');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationName('Location not supported');
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const fetchData = useCallback(async () => {
    const [clinicsRes, tokensRes] = await Promise.all([
      supabase.from('clinics')
        .select('*, doctors(id, name, specialization, is_active, slot_duration_minutes)')
        .eq('status', 'approved' as any)
        .eq('is_open', true),
      supabase.from('queue_tokens')
        .select('clinic_id, status, token_number')
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
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.doctors?.some((d: any) => 
          d.name.toLowerCase().includes(s) || 
          d.specialization.toLowerCase().includes(s)
        )
      );
    })
    .sort((a, b) => {
      // Sort by shortest wait time, then distance
      if (a.estimatedWaitMin !== null && b.estimatedWaitMin !== null) {
        if (a.estimatedWaitMin !== b.estimatedWaitMin) return a.estimatedWaitMin - b.estimatedWaitMin;
      }
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      return 0;
    });

  return (
    <PatientLayout>
      <div className="space-y-5">
        {/* Location Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your Location</p>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm">{locationName}</p>
                {locationLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={requestLocation} className="gap-1.5">
            <LocateFixed className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clinic, doctor, or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-12 text-base rounded-xl bg-muted/50 border-0 focus-visible:ring-2"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0" asChild>
            <Link to="/nearby">
              <MapPin className="h-3.5 w-3.5" /> Map View
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0" asChild>
            <Link to="/my-queue">
              <Clock className="h-3.5 w-3.5" /> My Queue
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 shrink-0" asChild>
            <Link to="/my-appointments">
              <Stethoscope className="h-3.5 w-3.5" /> Appointments
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full gap-1.5 shrink-0" asChild>
            <Link to="/register-clinic">
              <Hospital className="h-3.5 w-3.5" /> Register Clinic
            </Link>
          </Button>
        </div>

        {/* Triage Assistant */}
        <TriageAssistant onSelectSpecialty={setSearch} />

        {/* Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold">Nearby Clinics</h2>
            <p className="text-xs text-muted-foreground">Sorted by shortest wait time</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filtered.length} found
          </Badge>
        </div>

        {/* Clinic Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No clinics found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or check back later</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(clinic => (
              <Link key={clinic.id} to={`/clinic/${clinic.id}`}>
                <Card className="hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Distance Sidebar */}
                      <div className="flex flex-col items-center justify-center px-3 py-4 bg-muted/40 border-r min-w-[72px]">
                        {clinic.distance !== null ? (
                          <>
                            <Navigation className="h-4 w-4 text-primary mb-1" />
                            <span className="text-sm font-bold text-primary leading-tight">
                              {formatDist(clinic.distance)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">away</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground text-center">No GPS</span>
                          </>
                        )}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                                {clinic.name}
                              </h3>
                              {clinic.rating && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-green-100 dark:bg-green-950/30 px-1.5 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400 shrink-0">
                                  <Star className="h-3 w-3 fill-current" />
                                  {Number(clinic.rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {clinic.address}{clinic.city && ` · ${clinic.city}`}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0" />
                        </div>

                        {/* Wait Time Badge */}
                        {clinic.estimatedWaitMin !== null && (
                          <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 mt-2 text-xs font-semibold ${
                            clinic.estimatedWaitMin === 0
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : clinic.estimatedWaitMin <= 15
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                          }`}>
                            <Clock className="h-3.5 w-3.5" />
                            {clinic.estimatedWaitMin === 0 ? 'No wait' : `~${clinic.estimatedWaitMin} min wait`}
                          </div>
                        )}

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Stethoscope className="h-3 w-3" />
                            {clinic.activeDoctors.length} doctor{clinic.activeDoctors.length !== 1 ? 's' : ''}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3 text-blue-500" />
                            {clinic.queueInfo.waiting} in queue
                          </span>
                        </div>

                        {/* Specialties + CTA */}
                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          <div className="flex flex-wrap gap-1 min-w-0">
                            {Array.from(new Set(clinic.activeDoctors.map((d: any) => d.specialization)))
                              .slice(0, 3)
                              .map((spec: any) => (
                                <Badge key={spec} variant="outline" className="text-[10px] py-0 h-5">{spec}</Badge>
                              ))}
                          </div>
                          <span className="inline-flex items-center justify-center rounded-md text-xs font-medium h-7 px-3 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-none">
                            View Doctors
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
