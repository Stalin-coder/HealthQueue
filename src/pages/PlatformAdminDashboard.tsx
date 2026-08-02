import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PlatformAdminLayout from '@/components/PlatformAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Hospital, Stethoscope, Users, Activity, Loader2, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalClinics: number;
  pendingClinics: number;
  approvedClinics: number;
  rejectedClinics: number;
  activeDoctors: number;
  patientsToday: number;
  queueActivity: number;
}

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [clinicsRes, doctorsRes, appointmentsRes, queueRes] = await Promise.all([
        supabase.from('clinics').select('status'),
        supabase.from('doctors').select('id').eq('is_active', true),
        supabase.from('appointments').select('id').eq('appointment_date', today),
        supabase.from('queue_tokens').select('id').eq('queue_date', today),
      ]);

      const clinics = clinicsRes.data || [];
      setStats({
        totalClinics: clinics.length,
        pendingClinics: clinics.filter(c => c.status === 'pending').length,
        approvedClinics: clinics.filter(c => c.status === 'approved').length,
        rejectedClinics: clinics.filter(c => c.status === 'rejected').length,
        activeDoctors: doctorsRes.data?.length || 0,
        patientsToday: appointmentsRes.data?.length || 0,
        queueActivity: queueRes.data?.length || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <PlatformAdminLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </PlatformAdminLayout>
    );
  }

  const cards = [
    { label: 'Total Clinics', value: stats?.totalClinics ?? 0, icon: Hospital, color: 'text-primary' },
    { label: 'Pending Approval', value: stats?.pendingClinics ?? 0, icon: Clock, color: 'text-yellow-600' },
    { label: 'Approved Clinics', value: stats?.approvedClinics ?? 0, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Rejected Clinics', value: stats?.rejectedClinics ?? 0, icon: XCircle, color: 'text-destructive' },
    { label: 'Active Doctors', value: stats?.activeDoctors ?? 0, icon: Stethoscope, color: 'text-accent' },
    { label: 'Patients Today', value: stats?.patientsToday ?? 0, icon: Users, color: 'text-primary' },
    { label: 'Queue Tokens Today', value: stats?.queueActivity ?? 0, icon: Activity, color: 'text-accent' },
  ];

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor all clinics, doctors, and patient activity across the platform.</p>
        </div>

        {(stats?.pendingClinics ?? 0) > 0 && (
          <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <Bell className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              {stats!.pendingClinics} clinic{stats!.pendingClinics > 1 ? 's' : ''} awaiting approval
            </AlertTitle>
            <AlertDescription className="flex items-center gap-2 mt-1">
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">New clinic registrations need your review.</span>
              <Button size="sm" variant="outline" className="text-xs" asChild>
                <Link to="/platform-admin/clinics">Review Now</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(card => (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PlatformAdminLayout>
  );
}
