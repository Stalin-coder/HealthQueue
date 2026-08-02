import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Play, CheckCircle, SkipForward, Loader2, Hash, Users, Activity, Clock, AlertTriangle, UserCheck, Plus } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string }> = {
  waiting: { label: 'Waiting', color: 'bg-blue-100 text-blue-800' },
  checked_in: { label: 'Checked In', color: 'bg-cyan-100 text-cyan-800' },
  serving: { label: 'Serving', color: 'bg-green-100 text-green-800' },
  in_consultation: { label: 'In Consultation', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Done', color: 'bg-muted text-muted-foreground' },
  skipped: { label: 'Skipped', color: 'bg-orange-100 text-orange-800' },
};

export default function AdminQueue() {
  const { clinicId } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const today = selectedDate;

  useEffect(() => {
    if (!clinicId) return;
    supabase.from('doctors').select('*').eq('clinic_id', clinicId).eq('is_active', true)
      .then(({ data }) => setDoctors(data || []));
  }, [clinicId]);

  const fetchTokens = useCallback(async () => {
    if (!clinicId) return;
    let query = supabase
      .from('queue_tokens')
      .select('*, doctors(name, slot_duration_minutes), appointments(reason_for_visit, booked_for_name, booked_for_age, booked_for_phone)')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)
      .order('is_priority', { ascending: false })
      .order('token_number');

    if (selectedDoctor !== 'all') {
      query = query.eq('doctor_id', selectedDoctor);
    }

    const { data } = await query;
    setTokens(data || []);
    setLoading(false);
  }, [clinicId, selectedDoctor, today]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => fetchTokens())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTokens]);

  const callNext = async (doctorId: string) => {
    const doctorTokens = tokens.filter(t => t.doctor_id === doctorId);
    // Priority: checked_in patients first, then waiting with check-in, then by token number
    const checkedIn = doctorTokens.filter(t => t.status === 'checked_in');
    const waiting = doctorTokens.filter(t => t.status === 'waiting');
    const next = checkedIn.length > 0
      ? checkedIn.sort((a, b) => (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0) || a.token_number - b.token_number)[0]
      : waiting.sort((a, b) => (b.is_priority ? 1 : 0) - (a.is_priority ? 1 : 0) || a.token_number - b.token_number)[0];

    if (!next) { toast({ title: 'No patients waiting' }); return; }

    // Complete current serving/in_consultation
    const serving = doctorTokens.find(t => t.status === 'serving' || t.status === 'in_consultation');
    if (serving) {
      const { error: compErr } = await supabase.from('queue_tokens').update({ status: 'completed' as any, completed_at: new Date().toISOString() }).eq('id', serving.id);
      if (compErr) { toast({ title: 'Failed to complete current patient', description: compErr.message, variant: 'destructive' }); return; }
      await supabase.from('appointments').update({ status: 'completed' as any }).eq('id', serving.appointment_id);
    }

    const { error: callErr } = await supabase.from('queue_tokens').update({ status: 'in_consultation' as any, called_at: new Date().toISOString() }).eq('id', next.id);
    if (callErr) { toast({ title: 'Failed to call next patient', description: callErr.message, variant: 'destructive' }); return; }
    toast({ title: `✅ Calling token #${next.token_number}${next.is_priority ? ' (Priority)' : ''}`, description: serving ? `Token #${serving.token_number} marked as completed` : undefined });
  };

  const markCompleted = async (tokenId: string, appointmentId: string) => {
    await supabase.from('queue_tokens').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', tokenId);
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId);
    toast({ title: 'Patient marked as completed' });
  };

  const skipPatient = async (tokenId: string) => {
    await supabase.from('queue_tokens').update({ status: 'skipped' }).eq('id', tokenId);
    toast({ title: 'Patient skipped' });
  };

  const activeStatuses = ['waiting', 'checked_in', 'serving', 'in_consultation'];
  const waitingTokens = tokens.filter(t => t.status === 'waiting' || t.status === 'checked_in');
  const servingTokens = tokens.filter(t => t.status === 'serving' || t.status === 'in_consultation');
  const doneTokens = tokens.filter(t => t.status === 'completed' || t.status === 'skipped');

  const getDoctorStats = (doctorId: string) => {
    const dt = tokens.filter(t => t.doctor_id === doctorId);
    return {
      serving: dt.find(t => t.status === 'serving' || t.status === 'in_consultation'),
      waiting: dt.filter(t => t.status === 'waiting' || t.status === 'checked_in'),
      completed: dt.filter(t => t.status === 'completed'),
      total: dt.length,
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
            <p className="text-muted-foreground mt-1">Manage patient queues in real-time</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-[160px]"
            />
            <AddPriorityDialog doctors={doctors} clinicId={clinicId} today={today} />
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Doctor summary cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {doctors.filter(d => selectedDoctor === 'all' || d.id === selectedDoctor).map(doc => {
            const stats = getDoctorStats(doc.id);
            return (
              <Card key={doc.id} className="border-primary/20">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">{doc.specialization}</p>
                    </div>
                    <Button onClick={() => callNext(doc.id)} className="gap-2 shrink-0">
                      <Play className="h-4 w-4" /> Call Next
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2">
                      <Activity className="h-4 w-4 mx-auto text-green-600 mb-1" />
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">
                        {stats.serving ? `#${stats.serving.token_number}` : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Serving</p>
                    </div>
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2">
                      <Users className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{stats.waiting.length}</p>
                      <p className="text-[10px] text-muted-foreground">Waiting</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <CheckCircle className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm font-bold">{stats.completed.length}</p>
                      <p className="text-[10px] text-muted-foreground">Done</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {servingTokens.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-600">
                  <Activity className="h-5 w-5" /> Currently Serving
                </h2>
                <div className="space-y-2">
                  {servingTokens.map(token => (
                    <TokenRow key={token.id} token={token} onComplete={() => markCompleted(token.id, token.appointment_id)} onSkip={() => skipPatient(token.id)} showActions />
                  ))}
                </div>
              </div>
            )}

            {waitingTokens.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Waiting ({waitingTokens.length})
                </h2>
                <div className="space-y-2">
                  {waitingTokens.map(token => (
                    <TokenRow key={token.id} token={token} onSkip={() => skipPatient(token.id)} showActions />
                  ))}
                </div>
              </div>
            )}

            {doneTokens.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Completed / Skipped ({doneTokens.length})
                </h2>
                <div className="space-y-2">
                  {doneTokens.map(token => (
                    <TokenRow key={token.id} token={token} />
                  ))}
                </div>
              </div>
            )}

            {tokens.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No queue tokens for today</CardContent></Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AddPriorityDialog({ doctors, clinicId, today }: { doctors: any[]; clinicId: string | null; today: string }) {
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleAdd = async () => {
    if (!doctorId || !clinicId || !user) return;
    setSubmitting(true);

    // Create a walk-in appointment
    const { data: appt, error: apptErr } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: doctorId,
      clinic_id: clinicId,
      appointment_date: today,
      appointment_time: format(new Date(), 'HH:mm:ss'),
    }).select().single();

    if (apptErr) {
      toast({ title: 'Failed to add priority patient', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { data: tokenNum } = await supabase.rpc('get_next_token_number', { _doctor_id: doctorId, _date: today });

    await supabase.from('queue_tokens').insert({
      appointment_id: appt.id,
      doctor_id: doctorId,
      clinic_id: clinicId,
      patient_id: user.id,
      token_number: tokenNum || 1,
      queue_date: today,
      is_priority: true,
    });

    toast({ title: `Priority patient added with token #${tokenNum || 1}` });
    setOpen(false);
    setPatientName('');
    setDoctorId('');
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Emergency
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Priority / Emergency Patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Patient Name (optional note)</Label>
            <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Emergency walk-in" />
          </div>
          <Button onClick={handleAdd} disabled={!doctorId || submitting} className="w-full gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Priority Patient
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TokenRow({ token, onComplete, onSkip, showActions }: {
  token: any;
  onComplete?: () => void;
  onSkip?: () => void;
  showActions?: boolean;
}) {
  const cfg = statusConfig[token.status] || statusConfig.waiting;
  const patientName = token.appointments?.booked_for_name || 'Patient';
  const patientAge = token.appointments?.booked_for_age;
  const patientPhone = token.appointments?.booked_for_phone;
  const reason = token.appointments?.reason_for_visit;

  return (
    <Card>
      <CardContent className="py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${token.is_priority ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' : 'bg-primary/10 text-primary'}`}>
            #{token.token_number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">Token #{token.token_number}</p>
              {token.is_priority && <Badge className="bg-orange-100 text-orange-800 text-[10px]">Priority</Badge>}
              <Badge className={cfg.color + ' text-xs'}>{cfg.label}</Badge>
              {token.status === 'checked_in' && <UserCheck className="h-3.5 w-3.5 text-cyan-600" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {token.doctors?.name}
              {patientName && <> · <span className="font-medium text-foreground">{patientName}</span></>}
              {patientAge && <> · Age: {patientAge}</>}
              {patientPhone && <> · {patientPhone}</>}
            </p>
            {reason && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">Reason:</span> {reason}
              </p>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-2">
            {(token.status === 'serving' || token.status === 'in_consultation') && onComplete && (
              <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={onComplete}>
                <CheckCircle className="h-3.5 w-3.5" /> Done
              </Button>
            )}
            {(token.status === 'waiting' || token.status === 'checked_in' || token.status === 'serving' || token.status === 'in_consultation') && onSkip && (
              <Button size="sm" variant="outline" className="gap-1 text-orange-500" onClick={onSkip}>
                <SkipForward className="h-3.5 w-3.5" /> Skip
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
