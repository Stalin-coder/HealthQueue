import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, X, RefreshCw, Plus, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-muted text-muted-foreground',
  completed: 'bg-green-100 text-green-800',
};

export default function AdminAppointments() {
  const { clinicId, user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkinForm, setWalkinForm] = useState({ doctorId: '', patientName: '', phone: '', age: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchAppointments = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialization)')
      .eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: false })
      .limit(100);
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!clinicId) return;
    fetchAppointments();
    supabase.from('doctors').select('*').eq('clinic_id', clinicId).eq('is_active', true)
      .then(({ data }) => setDoctors(data || []));
  }, [clinicId]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Appointment cancelled' }); fetchAppointments(); }
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !rescheduleDate || !rescheduleTime) return;
    setSaving(true);
    const { error } = await supabase.from('appointments').update({
      appointment_date: rescheduleDate,
      appointment_time: rescheduleTime,
    }).eq('id', rescheduleId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Appointment rescheduled' }); fetchAppointments(); }
    setRescheduleId(null);
    setSaving(false);
  };

  const handleWalkin = async () => {
    if (!clinicId || !user || !walkinForm.doctorId) return;
    setSaving(true);

    const { data: appt, error: apptErr } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: walkinForm.doctorId,
      clinic_id: clinicId,
      appointment_date: today,
      appointment_time: format(new Date(), 'HH:mm:ss'),
      booked_for_name: walkinForm.patientName || null,
      booked_for_phone: walkinForm.phone || null,
      booked_for_age: walkinForm.age ? parseInt(walkinForm.age) : null,
      reason_for_visit: walkinForm.reason || null,
    }).select().single();

    if (apptErr) {
      toast({ title: 'Failed', description: apptErr.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Create queue token
    const { data: tokenNum } = await supabase.rpc('get_next_token_number', { _doctor_id: walkinForm.doctorId, _date: today });
    await supabase.from('queue_tokens').insert({
      appointment_id: appt.id,
      doctor_id: walkinForm.doctorId,
      clinic_id: clinicId,
      patient_id: user.id,
      token_number: tokenNum || 1,
      queue_date: today,
    });

    toast({ title: `Walk-in patient added with token #${tokenNum || 1}` });
    setWalkinOpen(false);
    setWalkinForm({ doctorId: '', patientName: '', phone: '', age: '', reason: '' });
    setSaving(false);
    fetchAppointments();
  };

  const filtered = filterStatus === 'all'
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <div className="flex gap-2">
            <Button onClick={() => setWalkinOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Walk-in Patient
            </Button>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No appointments found</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(appt => (
              <Card key={appt.id}>
                <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{appt.booked_for_name || 'Patient'}</p>
                      <Badge className={`text-xs ${statusColors[appt.status]}`}>{appt.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Dr. {appt.doctors?.name} · {appt.doctors?.specialization}</p>
                    {appt.reason_for_visit && <p className="text-xs text-muted-foreground">Reason: {appt.reason_for_visit}</p>}
                    {appt.booked_for_age && <span className="text-xs text-muted-foreground">Age: {appt.booked_for_age}</span>}
                    {appt.booked_for_phone && <span className="text-xs text-muted-foreground ml-2">Phone: {appt.booked_for_phone}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(appt.appointment_date), 'MMM d')}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{appt.appointment_time?.slice(0, 5)}</span>
                    {appt.status === 'booked' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setRescheduleId(appt.id); setRescheduleDate(appt.appointment_date); setRescheduleTime(appt.appointment_time?.slice(0, 5)); }}>
                          <RefreshCw className="h-3 w-3" /> Reschedule
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive" onClick={() => handleCancel(appt.id)}>
                          <X className="h-3 w-3" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleId} onOpenChange={() => setRescheduleId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>New Date</Label><Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></div>
            <div><Label>New Time</Label><Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} /></div>
            <Button onClick={handleReschedule} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reschedule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Walk-in Dialog */}
      <Dialog open={walkinOpen} onOpenChange={setWalkinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Walk-in Patient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Doctor</Label>
              <Select value={walkinForm.doctorId} onValueChange={v => setWalkinForm({ ...walkinForm, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Patient Name</Label><Input value={walkinForm.patientName} onChange={e => setWalkinForm({ ...walkinForm, patientName: e.target.value })} placeholder="Patient name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={walkinForm.phone} onChange={e => setWalkinForm({ ...walkinForm, phone: e.target.value })} placeholder="+91..." /></div>
              <div><Label>Age</Label><Input type="number" value={walkinForm.age} onChange={e => setWalkinForm({ ...walkinForm, age: e.target.value })} placeholder="Age" /></div>
            </div>
            <div><Label>Reason for Visit</Label><Input value={walkinForm.reason} onChange={e => setWalkinForm({ ...walkinForm, reason: e.target.value })} placeholder="Reason" /></div>
            <Button onClick={handleWalkin} disabled={saving || !walkinForm.doctorId} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Walk-in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
