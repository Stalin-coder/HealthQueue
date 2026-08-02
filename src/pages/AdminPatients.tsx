import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, User, Phone, Calendar, FileText, History, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PatientRecord {
  patient_id: string;
  name: string;
  phone: string | null;
  age: number | null;
  visitCount: number;
  lastVisit: string | null;
}

export default function AdminPatients() {
  const { clinicId } = useAuth();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    fetchPatients();
  }, [clinicId]);

  const fetchPatients = async () => {
    if (!clinicId) return;

    // Get all appointments for this clinic to build patient list
    const { data: appts } = await supabase
      .from('appointments')
      .select('patient_id, booked_for_name, booked_for_phone, booked_for_age, appointment_date')
      .eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: false });

    if (!appts) { setLoading(false); return; }

    // Get profile data for unique patient IDs
    const uniqueIds = [...new Set(appts.map(a => a.patient_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .in('user_id', uniqueIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Build patient records
    const patientMap = new Map<string, PatientRecord>();
    for (const appt of appts) {
      const existing = patientMap.get(appt.patient_id);
      const profile = profileMap.get(appt.patient_id);
      if (existing) {
        existing.visitCount++;
        if (!existing.name || existing.name === 'Unknown') {
          existing.name = appt.booked_for_name || profile?.full_name || 'Unknown';
        }
        if (!existing.phone) {
          existing.phone = appt.booked_for_phone || profile?.phone || null;
        }
        if (!existing.age && appt.booked_for_age) {
          existing.age = appt.booked_for_age;
        }
      } else {
        patientMap.set(appt.patient_id, {
          patient_id: appt.patient_id,
          name: appt.booked_for_name || profile?.full_name || 'Unknown',
          phone: appt.booked_for_phone || profile?.phone || null,
          age: appt.booked_for_age || null,
          visitCount: 1,
          lastVisit: appt.appointment_date,
        });
      }
    }

    setPatients(Array.from(patientMap.values()));
    setLoading(false);
  };

  const openHistory = async (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);

    const { data } = await supabase
      .from('visit_history')
      .select('*, doctors(name)')
      .eq('patient_id', patient.patient_id)
      .order('visit_date', { ascending: false })
      .limit(20);

    setVisitHistory(data || []);
    setHistoryLoading(false);
  };

  const filtered = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.phone?.includes(s);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patient Records</h1>
            <p className="text-muted-foreground mt-1">{patients.length} patients total</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'No patients match your search' : 'No patient records yet'}
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(patient => (
              <Card key={patient.patient_id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {patient.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>
                        )}
                        {patient.age && <span>Age: {patient.age}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {patient.visitCount} visits</span>
                        {patient.lastVisit && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Last: {format(new Date(patient.lastVisit), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => openHistory(patient)}>
                    <History className="h-3.5 w-3.5" /> Visit History
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Visit History Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground">
            {selectedPatient?.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {selectedPatient.phone}</p>}
            {selectedPatient?.age && <p>Age: {selectedPatient.age}</p>}
            <p>{selectedPatient?.visitCount} total visits</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Visit History</h3>
            {historyLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : visitHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No visit history recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {visitHistory.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{format(new Date(v.visit_date), 'MMM d, yyyy')}</span>
                        {v.doctors?.name && <Badge variant="secondary" className="text-xs">Dr. {v.doctors.name}</Badge>}
                      </div>
                      {v.reason_for_visit && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {v.reason_for_visit}
                        </p>
                      )}
                      {v.diagnosis && <p className="text-xs"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
                      {v.notes && <p className="text-xs text-muted-foreground">Notes: {v.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
