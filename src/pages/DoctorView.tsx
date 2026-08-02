import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Clock, Hash, Activity, FileText, Phone, History } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorView() {
  const { clinicId } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [upcomingPatients, setUpcomingPatients] = useState<any[]>([]);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!clinicId) return;
    supabase.from('doctors').select('*').eq('clinic_id', clinicId).eq('is_active', true)
      .then(({ data }) => {
        setDoctors(data || []);
        if (data && data.length > 0) setSelectedDoctor(data[0].id);
        setLoading(false);
      });
  }, [clinicId]);

  const fetchQueue = useCallback(async () => {
    if (!selectedDoctor) return;

    const { data: tokens } = await supabase
      .from('queue_tokens')
      .select('*, appointments(reason_for_visit, booked_for_name, booked_for_age, booked_for_phone)')
      .eq('doctor_id', selectedDoctor)
      .eq('queue_date', today)
      .order('is_priority', { ascending: false })
      .order('token_number');

    const all = tokens || [];
    const serving = all.find((t: any) => t.status === 'serving' || t.status === 'in_consultation');
    const waiting = all.filter((t: any) => t.status === 'waiting' || t.status === 'checked_in');

    setCurrentPatient(serving || null);
    setUpcomingPatients(waiting);

    // Fetch visit history for current patient
    if (serving) {
      const { data: history } = await supabase
        .from('visit_history' as any)
        .select('*, doctors(name)')
        .eq('patient_id', serving.patient_id)
        .order('visit_date', { ascending: false })
        .limit(10);
      setVisitHistory(history || []);
    } else {
      setVisitHistory([]);
    }
  }, [selectedDoctor, today]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    if (!selectedDoctor) return;
    const channel = supabase
      .channel(`doctor-view-${selectedDoctor}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => fetchQueue())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDoctor, fetchQueue]);

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AdminLayout>;
  }

  const patientName = currentPatient?.appointments?.booked_for_name || 'Patient';
  const patientAge = currentPatient?.appointments?.booked_for_age;
  const patientPhone = currentPatient?.appointments?.booked_for_phone;
  const reason = currentPatient?.appointments?.reason_for_visit;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctor View</h1>
            <p className="text-muted-foreground mt-1">Patient details for consultation</p>
          </div>
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(d => <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Current Patient */}
        <Card className={currentPatient ? 'border-green-500 ring-2 ring-green-500/20' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" /> Current Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPatient ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <Hash className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold text-primary">#{currentPatient.token_number}</p>
                    <p className="text-[11px] text-muted-foreground">Token</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold">{patientName || 'Unknown'}</p>
                    <p className="text-[11px] text-muted-foreground">Name</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold">{patientAge || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">Age</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <Phone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold truncate">{patientPhone || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">Phone</p>
                  </div>
                </div>
                {reason && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" /> Reason for Visit
                    </p>
                    <p className="text-sm mt-1">{reason}</p>
                  </div>
                )}

                {/* Visit History */}
                {visitHistory.length > 0 && (
                  <div>
                    <Separator className="my-3" />
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" /> Previous Visits
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {visitHistory.map((v: any) => (
                        <div key={v.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{format(new Date(v.visit_date), 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">Dr. {v.doctors?.name}</span>
                          </div>
                          {v.reason_for_visit && <p className="text-xs text-muted-foreground mt-0.5">Reason: {v.reason_for_visit}</p>}
                          {v.diagnosis && <p className="text-xs mt-0.5">Diagnosis: {v.diagnosis}</p>}
                          {v.notes && <p className="text-xs text-muted-foreground mt-0.5">Notes: {v.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No patient currently being served</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Upcoming Patients ({upcomingPatients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No patients waiting</p>
            ) : (
              <div className="space-y-2">
                {upcomingPatients.map((token: any) => {
                  const name = token.appointments?.booked_for_name || 'Patient';
                  const age = token.appointments?.booked_for_age;
                  const visitReason = token.appointments?.reason_for_visit;
                  return (
                    <div key={token.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md font-bold text-sm ${token.is_priority ? 'bg-orange-100 text-orange-700' : 'bg-primary/10 text-primary'}`}>
                          #{token.token_number}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {name || 'Patient'}
                            {age && <span className="text-muted-foreground font-normal"> · Age: {age}</span>}
                          </p>
                          {visitReason && <p className="text-xs text-muted-foreground">{visitReason}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {token.is_priority && <Badge className="bg-orange-100 text-orange-800 text-[10px]">Priority</Badge>}
                        <Badge className={`text-[10px] ${token.status === 'checked_in' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800'}`}>
                          {token.status === 'checked_in' ? 'Checked In' : 'Waiting'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
