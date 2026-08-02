import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CheckCircle, SkipForward, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import QueueStatusCard from '@/components/queue/QueueStatusCard';

export default function MyQueue() {
  const { user } = useAuth();
  const [myTokens, setMyTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const notifiedRef = useRef<Set<string>>(new Set());

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchMyTokens = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('queue_tokens')
      .select('*, doctors(name, specialization, slot_duration_minutes), clinics(name, latitude, longitude)')
      .eq('patient_id', user.id)
      .eq('queue_date', today)
      .order('token_number');
    setMyTokens(data || []);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchMyTokens(); }, [fetchMyTokens]);

  useEffect(() => {
    const channel = supabase
      .channel('my-queue-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => {
        fetchMyTokens();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMyTokens]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Status</h1>
          <p className="text-muted-foreground mt-1">Track your live queue position & estimated wait time</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active tokens */}
            {myTokens.filter(t => ['waiting', 'checked_in', 'serving', 'in_consultation'].includes(t.status)).length > 0 ? (
              myTokens
                .filter(t => ['waiting', 'checked_in', 'serving', 'in_consultation'].includes(t.status))
                .map(token => (
                  <QueueStatusCard
                    key={token.id}
                    token={token}
                    today={today}
                    notifiedRef={notifiedRef}
                  />
                ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-semibold text-muted-foreground">No active queue tokens</p>
                </CardContent>
              </Card>
            )}

            {/* Completed / Skipped tokens */}
            {myTokens.filter(t => t.status === 'completed' || t.status === 'skipped').length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5" /> Today's Completed Visits
                </h2>
                <div className="space-y-2">
                  {myTokens
                    .filter(t => t.status === 'completed' || t.status === 'skipped')
                    .map(token => (
                      <Card key={token.id} className="border-muted">
                        <CardContent className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Stethoscope className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Dr. {token.doctors?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {token.doctors?.specialization} · {token.clinics?.name} · Token #{token.token_number}
                              </p>
                            </div>
                          </div>
                          <Badge className={token.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          }>
                            {token.status === 'completed' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                            ) : (
                              <><SkipForward className="h-3 w-3 mr-1" /> Skipped</>
                            )}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
