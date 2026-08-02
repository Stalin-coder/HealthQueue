import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Phone, Clock, ArrowLeft, Calendar, Star, Users, Activity, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ClinicDetail() {
  const { id } = useParams();
  const [clinic, setClinic] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<Record<string, { serving: number | null; waiting: number }>>({});
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDow = new Date().getDay();

  useEffect(() => {
    const fetchAll = async () => {
      const [clinicRes, doctorsRes, tokensRes] = await Promise.all([
        supabase.from('clinics').select('*').eq('id', id!).single(),
        supabase.from('doctors').select('*').eq('clinic_id', id!).eq('is_active', true),
        supabase.from('queue_tokens').select('doctor_id, status, token_number')
          .eq('clinic_id', id!)
          .eq('queue_date', today)
          .in('status', ['waiting', 'checked_in', 'serving', 'in_consultation'] as any[]),
      ]);
      setClinic(clinicRes.data);
      const docs = doctorsRes.data || [];
      setDoctors(docs);

      // Fetch schedules for all doctors
      if (docs.length > 0) {
        const { data: scheds } = await supabase
          .from('doctor_schedules')
          .select('*')
          .in('doctor_id', docs.map((d: any) => d.id));
        setSchedules(scheds || []);
      }

      const qd: Record<string, { serving: number | null; waiting: number }> = {};
      (tokensRes.data || []).forEach((t: any) => {
        if (!qd[t.doctor_id]) qd[t.doctor_id] = { serving: null, waiting: 0 };
        if (t.status === 'serving' || t.status === 'in_consultation') qd[t.doctor_id].serving = t.token_number;
        if (t.status === 'waiting' || t.status === 'checked_in') qd[t.doctor_id].waiting++;
      });
      setQueueData(qd);
      setLoading(false);
    };
    fetchAll();
  }, [id, today]);

  useEffect(() => {
    const channel = supabase
      .channel(`clinic-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, async () => {
        const { data } = await supabase.from('queue_tokens').select('doctor_id, status, token_number')
          .eq('clinic_id', id!)
          .eq('queue_date', today)
          .in('status', ['waiting', 'checked_in', 'serving', 'in_consultation'] as any[]);
        const qd: Record<string, { serving: number | null; waiting: number }> = {};
        (data || []).forEach((t: any) => {
          if (!qd[t.doctor_id]) qd[t.doctor_id] = { serving: null, waiting: 0 };
          if (t.status === 'serving' || t.status === 'in_consultation') qd[t.doctor_id].serving = t.token_number;
          if (t.status === 'waiting' || t.status === 'checked_in') qd[t.doctor_id].waiting++;
        });
        setQueueData(qd);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, today]);

  if (loading) {
    return (
      <PatientLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            {[1, 2].map(i => <Card key={i}><CardContent className="py-16" /></Card>)}
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (!clinic) {
    return (
      <PatientLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Clinic not found</p>
          <Link to="/dashboard"><Button variant="link">Back to search</Button></Link>
        </div>
      </PatientLayout>
    );
  }

  const isClinicOpen = clinic.is_open !== false;

  const getDoctorSchedule = (docId: string) => {
    return schedules
      .filter((s: any) => s.doctor_id === docId && s.is_available)
      .sort((a: any, b: any) => a.day_of_week - b.day_of_week);
  };

  const isTodayAvailable = (docId: string) => {
    const todaySched = schedules.find((s: any) => s.doctor_id === docId && s.day_of_week === todayDow && s.is_available);
    return !!todaySched || schedules.filter((s: any) => s.doctor_id === docId).length === 0;
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" asChild>
          <Link to="/nearby">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{clinic.name}</h1>
            {clinic.rating && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(clinic.rating).toFixed(1)}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {clinic.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{clinic.address}</span>}
            {clinic.city && <span>{clinic.city}</span>}
            {clinic.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clinic.phone}</span>}
          </div>
          {clinic.description && <p className="mt-3 text-muted-foreground">{clinic.description}</p>}
        </div>

        {!isClinicOpen && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Clinic is currently closed</AlertTitle>
            <AlertDescription>
              This clinic is not accepting new patients at the moment. Please check back later or find another nearby clinic.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Available Doctors</h2>
          {doctors.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No doctors available</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {doctors.map(doc => {
                const q = queueData[doc.id] || { serving: null, waiting: 0 };
                const estWait = q.waiting * (doc.slot_duration_minutes || 15);
                const docSchedule = getDoctorSchedule(doc.id);
                const availableToday = isTodayAvailable(doc.id);

                return (
                  <Card key={doc.id} className={!availableToday ? 'opacity-70' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{doc.name}</CardTitle>
                          <CardDescription>
                            {doc.degree && <span className="text-xs mr-2">{doc.degree}</span>}
                            <Badge variant="secondary">{doc.specialization}</Badge>
                          </CardDescription>
                        </div>
                        {!availableToday && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">Unavailable Today</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Schedule info */}
                      {docSchedule.length > 0 ? (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {docSchedule.map((s: any) => (
                            <p key={s.day_of_week} className={s.day_of_week === todayDow ? 'font-semibold text-foreground' : ''}>
                              {DAYS[s.day_of_week].slice(0, 3)}: {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                              {s.break_start && s.break_end && <span className="text-muted-foreground/60"> (Break {s.break_start.slice(0, 5)}–{s.break_end.slice(0, 5)})</span>}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {doc.consultation_start.slice(0, 5)} - {doc.consultation_end.slice(0, 5)}
                          <span className="text-xs">({doc.slot_duration_minutes} min slots)</span>
                        </div>
                      )}

                      {/* Live queue info */}
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1 rounded-md bg-green-50 dark:bg-green-950/20 px-2 py-1">
                          <Activity className="h-3 w-3 text-green-600" />
                          Token: {q.serving ?? '—'}
                        </span>
                        <span className="flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/20 px-2 py-1">
                          <Users className="h-3 w-3 text-blue-600" />
                          {q.waiting} waiting
                        </span>
                        {q.waiting > 0 && (
                          <span className="flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950/20 px-2 py-1">
                            <Clock className="h-3 w-3 text-orange-600" />
                            ~{estWait} min
                          </span>
                        )}
                      </div>

                      {isClinicOpen ? (
                        <Button className="w-full gap-2" asChild>
                          <Link to={`/book/${doc.id}`}>
                            <Calendar className="h-4 w-4" /> Book Slot
                          </Link>
                        </Button>
                      ) : (
                        <Button className="w-full gap-2" disabled>
                          <XCircle className="h-4 w-4" /> Clinic Closed
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
