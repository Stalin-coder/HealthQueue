import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Clock, TrendingUp, CheckCircle, Activity, BarChart3 } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export default function AdminAnalytics() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    completedToday: 0,
    waitingNow: 0,
    servingNow: 0,
    avgWaitMinutes: 0,
    peakHour: '',
    skippedToday: 0,
    checkedInToday: 0,
  });
  const [hourlyData, setHourlyData] = useState<{ hour: string; count: number }[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) return;

    const { data: tokens } = await supabase
      .from('queue_tokens')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('queue_date', today);

    if (!tokens) { setLoading(false); return; }

    const s = (t: any) => t.status as string;
    const completed = tokens.filter(t => s(t) === 'completed');
    const waiting = tokens.filter(t => s(t) === 'waiting' || s(t) === 'checked_in');
    const serving = tokens.filter(t => s(t) === 'serving' || s(t) === 'in_consultation');
    const skipped = tokens.filter(t => s(t) === 'skipped');
    const checkedIn = tokens.filter(t => s(t) === 'checked_in');

    // Average wait time (from created_at to called_at)
    const waitTimes = completed
      .filter(t => t.called_at && t.created_at)
      .map(t => differenceInMinutes(parseISO(t.called_at!), parseISO(t.created_at)));
    const avgWait = waitTimes.length > 0 ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;

    // Peak hour
    const hourCounts: Record<string, number> = {};
    tokens.forEach(t => {
      const hour = format(parseISO(t.created_at), 'HH');
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let peakHour = '';
    let peakCount = 0;
    Object.entries(hourCounts).forEach(([h, c]) => {
      if (c > peakCount) { peakCount = c; peakHour = h; }
    });

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const h = i.toString().padStart(2, '0');
      return { hour: `${h}:00`, count: hourCounts[h] || 0 };
    }).filter(h => h.count > 0);

    setStats({
      totalToday: tokens.length,
      completedToday: completed.length,
      waitingNow: waiting.length,
      servingNow: serving.length,
      avgWaitMinutes: avgWait,
      peakHour: peakHour ? `${peakHour}:00` : '—',
      skippedToday: skipped.length,
      checkedInToday: checkedIn.length,
    });
    setHourlyData(hourly);
    setLoading(false);
  }, [clinicId, today]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  useEffect(() => {
    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => fetchAnalytics())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAnalytics]);

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Today's clinic performance at a glance</p>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Patients Today" value={stats.totalToday} icon={Users} accent="text-primary" />
          <StatCard title="Avg Wait Time" value={`${stats.avgWaitMinutes} min`} icon={Clock} accent="text-blue-600" />
          <StatCard title="Peak Hour" value={stats.peakHour} icon={TrendingUp} accent="text-orange-600" />
          <StatCard title="Completed" value={stats.completedToday} icon={CheckCircle} accent="text-green-600" />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Currently Serving" value={stats.servingNow} icon={Activity} accent="text-green-600" />
          <StatCard title="Waiting Now" value={stats.waitingNow} icon={Clock} accent="text-blue-600" />
          <StatCard title="Checked In" value={stats.checkedInToday} icon={Users} accent="text-cyan-600" />
          <StatCard title="Skipped" value={stats.skippedToday} icon={BarChart3} accent="text-orange-600" />
        </div>

        {/* Hourly Breakdown */}
        {hourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hourly Patient Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40">
                {hourlyData.map(h => {
                  const maxCount = Math.max(...hourlyData.map(d => d.count));
                  const height = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{h.count}</span>
                      <div
                        className="w-full rounded-t-md bg-primary/70 transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{h.hour.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon, accent }: {
  title: string;
  value: string | number;
  icon: any;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
