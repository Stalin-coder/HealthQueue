import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Stethoscope, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function VisitHistory() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('visit_history')
      .select('*, doctors(name, specialization), clinics(name)')
      .eq('patient_id', user.id)
      .order('visit_date', { ascending: false })
      .then(({ data }) => {
        setVisits(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visit History</h1>
          <p className="text-muted-foreground mt-1">Your past consultations and diagnoses</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : visits.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="font-semibold text-lg text-muted-foreground">No visit history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Completed consultations will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visits.map(visit => (
              <Card key={visit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold">Dr. {visit.doctors?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {visit.doctors?.specialization} · {visit.clinics?.name}
                        </p>
                        {visit.reason_for_visit && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Reason:</span> {visit.reason_for_visit}
                          </p>
                        )}
                        {visit.diagnosis && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <FileText className="h-3.5 w-3.5 mt-0.5 text-primary" />
                            <p className="text-sm">
                              <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                            </p>
                          </div>
                        )}
                        {visit.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">{visit.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(visit.visit_date), 'dd MMM yyyy')}
                    </Badge>
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
