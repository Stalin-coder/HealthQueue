import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heart, Users, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function LiveQueueDisplay() {
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get('clinic');
  const [clinicName, setClinicName] = useState('');
  const [doctorQueues, setDoctorQueues] = useState<any[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!clinicId) return;

    const [clinicRes, doctorsRes, tokensRes] = await Promise.all([
      supabase.from('clinics').select('name').eq('id', clinicId).single(),
      supabase.from('doctors').select('*').eq('clinic_id', clinicId).eq('is_active', true),
      supabase.from('queue_tokens').select('*, doctors(name)')
        .eq('clinic_id', clinicId)
        .eq('queue_date', today)
        .in('status', ['waiting', 'checked_in', 'serving', 'in_consultation'] as any[])
        .order('is_priority', { ascending: false })
        .order('token_number'),
    ]);

    setClinicName(clinicRes.data?.name || '');

    const doctors = doctorsRes.data || [];
    const tokens = tokensRes.data || [];

    const queues = doctors.map(doc => {
      const docTokens = tokens.filter((t: any) => t.doctor_id === doc.id);
      const serving = docTokens.find((t: any) => t.status === 'serving' || t.status === 'in_consultation');
      const waiting = docTokens.filter((t: any) => t.status === 'waiting' || t.status === 'checked_in');
      const next = waiting[0];
      return {
        doctor: doc,
        currentToken: serving?.token_number ?? null,
        nextToken: next?.token_number ?? null,
        waitingCount: waiting.length,
      };
    }).filter(q => q.currentToken !== null || q.waitingCount > 0);

    setDoctorQueues(queues);
  }, [clinicId, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('live-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Auto-refresh time
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <p className="text-muted-foreground text-lg">Add <code>?clinic=CLINIC_ID</code> to the URL to display the queue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{clinicName}</h1>
            <p className="text-muted-foreground">Live Queue Display</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl md:text-4xl font-bold font-mono tabular-nums">
            {format(time, 'HH:mm:ss')}
          </p>
          <p className="text-muted-foreground">{format(time, 'EEEE, MMMM d')}</p>
        </div>
      </div>

      {/* Queue Boards */}
      {doctorQueues.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-2xl text-muted-foreground">No active queues at the moment</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {doctorQueues.map(q => (
            <Card key={q.doctor.id} className="overflow-hidden">
              <div className="bg-primary/10 px-6 py-4">
                <h2 className="text-xl font-bold">{q.doctor.name}</h2>
                <p className="text-sm text-muted-foreground">{q.doctor.specialization}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Now Serving */}
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Now Serving</p>
                  <div className="flex items-center justify-center">
                    {q.currentToken ? (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/30">
                        <span className="text-4xl font-bold text-green-700 dark:text-green-400">
                          {q.currentToken}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted">
                        <span className="text-2xl text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next & Waiting */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
                    <Activity className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {q.nextToken ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Next</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-4">
                    <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold">{q.waitingCount}</p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
