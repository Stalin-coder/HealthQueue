import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, X, Loader2, Navigation } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-muted text-muted-foreground',
  completed: 'bg-green-100 text-green-800',
};

export default function MyAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialization), clinics(name, latitude, longitude, address), queue_tokens(token_number, status)')
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: false });
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    await supabase.from('queue_tokens').update({ status: 'skipped' }).eq('appointment_id', id);
    toast({ title: 'Appointment cancelled' });
    fetchAppointments();
    setCancelling(null);
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground mt-1">View and manage your appointments</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium text-muted-foreground">No appointments yet</p>
              <Button variant="link" asChild>
                <Link to="/">Find a clinic</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map(appt => (
              <Card key={appt.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Dr. {appt.doctors?.name}</p>
                        <Badge variant="secondary" className="text-xs">{appt.doctors?.specialization}</Badge>
                        <Badge className={`text-xs ${statusColors[appt.status]}`}>{appt.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(appt.appointment_date), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.appointment_time?.slice(0, 5)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{appt.clinics?.name}</p>
                      {appt.booked_for_name && (
                        <p className="text-sm text-muted-foreground">Patient: {appt.booked_for_name}{appt.booked_for_age ? `, Age: ${appt.booked_for_age}` : ''}</p>
                      )}
                      {appt.reason_for_visit && (
                        <p className="text-sm text-muted-foreground">Reason: {appt.reason_for_visit}</p>
                      )}
                      {appt.queue_tokens?.[0] && (
                        <p className="text-sm font-medium">
                          Token #{appt.queue_tokens[0].token_number}
                          {appt.queue_tokens[0].status === 'waiting' && (
                            <Link to="/my-queue" className="ml-2 text-primary text-xs hover:underline">View queue</Link>
                          )}
                        </p>
                      )}
                    </div>
                     {appt.status === 'booked' && appt.clinics?.latitude && appt.clinics?.longitude && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${appt.clinics.latitude},${appt.clinics.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation className="h-3 w-3" /> Navigate
                          </a>
                        </Button>
                      )}
                     {appt.status === 'booked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive gap-1"
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancelling === appt.id}
                      >
                        {cancelling === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
