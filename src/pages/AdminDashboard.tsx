import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users, Calendar, Clock, CheckCircle, Timer, Activity, ArrowRight, UserPlus, ListOrdered, Stethoscope, Power } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { clinicId } = useAuth();
  const [stats, setStats] = useState({
    doctors: 0,
    todayAppts: 0,
    waiting: 0,
    completed: 0,
    patientsToday: 0,
    avgWaitMin: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch clinic open status
    supabase.from('clinics').select('is_open').eq('id', clinicId).single()
      .then(({ data }) => {
        if (data) setIsOpen(data.is_open);
      });

    Promise.all([
      supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('appointment_date', today),
      supabase.from('queue_tokens').select('*').eq('clinic_id', clinicId).eq('queue_date', today),
    ]).then(([d, a, q]) => {
      const tokens = q.data || [];
      const waiting = tokens.filter(t => t.status === 'waiting' || t.status === 'checked_in').length;
      const completed = tokens.filter(t => t.status === 'completed').length;

      // Calculate average wait time from completed tokens
      const completedTokens = tokens.filter(t => t.status === 'completed' && t.called_at && t.created_at);
      let avgWait = 0;
      if (completedTokens.length > 0) {
        const totalWait = completedTokens.reduce((sum, t) => {
          return sum + differenceInMinutes(new Date(t.called_at!), new Date(t.created_at));
        }, 0);
        avgWait = Math.round(totalWait / completedTokens.length);
      }

      setStats({
        doctors: d.count || 0,
        todayAppts: a.count || 0,
        waiting,
        completed,
        patientsToday: tokens.length,
        avgWaitMin: avgWait,
      });
    });

    // Recent activity: last 8 queue token changes
    supabase
      .from('queue_tokens')
      .select('*, doctors(name)')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setRecentActivity(data || []));
  }, [clinicId]);

  // Realtime: listen for new appointment bookings
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel('admin-new-bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`,
        },
        async (payload: any) => {
          const appt = payload.new;

          // Fetch doctor name for the notification
          let doctorName = 'a doctor';
          const { data: doc } = await supabase
            .from('doctors')
            .select('name')
            .eq('id', appt.doctor_id)
            .single();
          if (doc) doctorName = `Dr. ${doc.name}`;

          // Fetch patient name
          let patientName = 'A patient';
          if (appt.booked_for_name) {
            patientName = appt.booked_for_name;
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', appt.patient_id)
              .single();
            if (profile?.full_name) patientName = profile.full_name;
          }

          // Play notification sound
          try {
            const ctx = new AudioContext();
            const playTone = (freq: number, start: number, dur: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = freq;
              osc.type = 'sine';
              gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
              osc.start(ctx.currentTime + start);
              osc.stop(ctx.currentTime + start + dur);
            };
            playTone(523, 0, 0.15);
            playTone(659, 0.15, 0.15);
            playTone(784, 0.3, 0.2);
          } catch {}

          // Show toast
          toast({
            title: '🔔 New Appointment Booked!',
            description: `${patientName} booked with ${doctorName} on ${appt.appointment_date} at ${appt.appointment_time?.slice(0, 5)}`,
          });

          // Update stats
          setStats(prev => ({
            ...prev,
            todayAppts: prev.todayAppts + 1,
            patientsToday: prev.patientsToday + 1,
            waiting: prev.waiting + 1,
          }));

          // Add to recent activity
          setRecentActivity(prev => {
            const newToken = {
              id: `new-${Date.now()}`,
              token_number: prev.length > 0 ? (prev[0]?.token_number || 0) + 1 : 1,
              status: 'waiting',
              doctors: doc ? { name: doc.name } : null,
              created_at: new Date().toISOString(),
            };
            return [newToken, ...prev].slice(0, 8);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const handleToggleOpen = async (open: boolean) => {
    if (!clinicId) return;
    setTogglingOpen(true);
    const { error } = await supabase
      .from('clinics')
      .update({ is_open: open })
      .eq('id', clinicId);
    
    if (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } else {
      setIsOpen(open);
      toast({ title: open ? 'Clinic is now Open' : 'Clinic is now Closed' });
    }
    setTogglingOpen(false);
  };

  const statCards = [
    { title: 'Patients Today', value: stats.patientsToday, icon: Users, color: 'text-primary' },
    { title: 'Waiting Now', value: stats.waiting, icon: Clock, color: 'text-orange-500' },
    { title: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Avg Wait Time', value: `${stats.avgWaitMin}m`, icon: Timer, color: 'text-blue-500' },
    { title: 'Appointments', value: stats.todayAppts, icon: Calendar, color: 'text-purple-500' },
    { title: 'Active Doctors', value: stats.doctors, icon: Stethoscope, color: 'text-primary' },
  ];

  const quickActions = [
    { label: 'Manage Queue', to: '/admin/queue', icon: ListOrdered },
    { label: 'View Appointments', to: '/admin/appointments', icon: Calendar },
    { label: 'Manage Doctors', to: '/admin/doctors', icon: Users },
    { label: 'Patient Records', to: '/admin/patients', icon: UserPlus },
  ];

  const statusLabel: Record<string, { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    waiting: { text: 'Joined', variant: 'outline' },
    checked_in: { text: 'Checked In', variant: 'secondary' },
    serving: { text: 'Serving', variant: 'default' },
    in_consultation: { text: 'In Consultation', variant: 'default' },
    completed: { text: 'Completed', variant: 'secondary' },
    skipped: { text: 'Skipped', variant: 'destructive' },
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of today's clinic activity</p>
          </div>
          <Card className={`${isOpen ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Power className={`h-5 w-5 ${isOpen ? 'text-green-600' : 'text-destructive'}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{isOpen ? 'Clinic Open' : 'Clinic Closed'}</span>
                <span className="text-xs text-muted-foreground">
                  {isOpen ? 'Accepting patients' : 'Not visible to patients'}
                </span>
              </div>
              <Switch
                checked={isOpen}
                onCheckedChange={handleToggleOpen}
                disabled={togglingOpen}
                className="ml-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {statCards.map(card => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <Link key={action.to} to={action.to}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex flex-col items-center gap-2 text-center">
                    <action.icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Activity
            </h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link to="/admin/queue">
                View Queue <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          {recentActivity.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No activity yet today. Queue tokens will appear here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(token => {
                const sl = statusLabel[token.status] || statusLabel.waiting;
                return (
                  <Card key={token.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                          #{token.token_number}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Token #{token.token_number}</p>
                          <p className="text-xs text-muted-foreground">{token.doctors?.name}</p>
                        </div>
                      </div>
                      <Badge variant={sl.variant}>{sl.text}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
