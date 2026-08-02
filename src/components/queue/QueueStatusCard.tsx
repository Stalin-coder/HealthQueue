import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Clock, Hash, Users, CircleDot, Activity, CheckCircle, SkipForward, UserCheck, Loader2, MapPin, Stethoscope, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import LiveNavigationMap from './LiveNavigationMap';
import TravelCoach from './TravelCoach';
import TravelAlarmDialog from './TravelAlarmDialog';
import { useAlarm } from '@/hooks/useAlarm';

const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  waiting: { label: 'Waiting', variant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  checked_in: { label: 'Checked In', variant: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: UserCheck },
  serving: { label: 'Your Turn!', variant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: Activity },
  in_consultation: { label: 'In Consultation', variant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: Activity },
  completed: { label: 'Completed', variant: 'bg-muted text-muted-foreground', icon: CheckCircle },
  skipped: { label: 'Skipped', variant: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: SkipForward },
};

interface QueueStatusCardProps {
  token: any;
  today: string;
  notifiedRef: React.MutableRefObject<Set<string>>;
}

export default function QueueStatusCard({ token, today, notifiedRef }: QueueStatusCardProps) {
  const navigate = useNavigate();
  const [checkingIn, setCheckingIn] = useState(false);
  const [queueData, setQueueData] = useState<{
    currentServing: number | null;
    patientsAhead: number;
  }>({ currentServing: null, patientsAhead: 0 });
  const [travelData, setTravelData] = useState<{ distanceKm: number; travelMinutes: number; arrived: boolean } | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const alarm = useAlarm();

  const fetchQueueData = useCallback(async () => {
    const [servingRes, waitingRes] = await Promise.all([
      supabase
        .from('queue_tokens')
        .select('token_number')
        .eq('doctor_id', token.doctor_id)
        .eq('queue_date', today)
        .in('status', ['serving', 'in_consultation'] as any[])
        .maybeSingle(),
      supabase
        .from('queue_tokens')
        .select('id, token_number, status, is_priority')
        .eq('doctor_id', token.doctor_id)
        .eq('queue_date', today)
        .in('status', ['waiting', 'checked_in'] as any[])
        .order('is_priority', { ascending: false })
        .order('token_number'),
    ]);

    const currentServing = servingRes.data?.token_number ?? null;
    const waitingList = waitingRes.data || [];
    const ahead = waitingList.filter((t: any) =>
      (t.is_priority && !token.is_priority) || t.token_number < token.token_number
    );

    const patientsAhead = ahead.length;
    setQueueData({ currentServing, patientsAhead });

    // Timed notifications
    const slotMin = token.doctors?.slot_duration_minutes || 15;
    const estSeconds = patientsAhead * slotMin * 60;

    if ((token.status === 'waiting' || token.status === 'checked_in')) {
      if (estSeconds <= 900 && estSeconds > 300 && !notifiedRef.current.has(token.id + '-15min')) {
        notifiedRef.current.add(token.id + '-15min');
        sendNotification('🕐 15 minutes left', `About 15 min until your turn with Dr. ${token.doctors?.name}`, 'warning');
      }
      if (estSeconds <= 300 && estSeconds > 0 && !notifiedRef.current.has(token.id + '-5min')) {
        notifiedRef.current.add(token.id + '-5min');
        sendNotification('⚡ 5 minutes left!', `Almost your turn! Get ready for Dr. ${token.doctors?.name}`, 'urgent');
      }
      if (patientsAhead <= 2 && patientsAhead > 0 && !notifiedRef.current.has(token.id + '-near')) {
        notifiedRef.current.add(token.id + '-near');
        sendNotification('🔔 Your turn is near!', `${patientsAhead} patient(s) ahead for Dr. ${token.doctors?.name}`, 'warning');
      }
    }

    if ((token.status === 'serving' || token.status === 'in_consultation') && !notifiedRef.current.has(token.id + '-serving')) {
      notifiedRef.current.add(token.id + '-serving');
      sendNotification('✅ It\'s your turn!', `Please proceed to Dr. ${token.doctors?.name}`, 'urgent');
    }
  }, [token, today, notifiedRef]);

  // Smart distance-based notifications
  useEffect(() => {
    if (!travelData || token.status === 'serving' || token.status === 'in_consultation') return;
    const slotMin = token.doctors?.slot_duration_minutes || 15;
    const waitMin = queueData.patientsAhead * slotMin;
    const { travelMinutes, distanceKm, arrived } = travelData;
    const buffer = waitMin - travelMinutes;
    const id = token.id;

    // Arrival notification
    if (arrived && !notifiedRef.current.has(id + '-arrived')) {
      notifiedRef.current.add(id + '-arrived');
      sendNotification('📍 Arrived!', 'You have arrived near the hospital.', 'info');
      return;
    }

    // Start travel alert: travel time >= wait time
    if (travelMinutes >= waitMin && !notifiedRef.current.has(id + '-start-now')) {
      notifiedRef.current.add(id + '-start-now');
      sendNotification('🚗 Start traveling now!', 'You should leave now to reach the hospital on time.', 'urgent');
    }

    // Urgent: buffer <= 5 min
    if (buffer <= 5 && buffer > 0 && !notifiedRef.current.has(id + '-urgent')) {
      notifiedRef.current.add(id + '-urgent');
      sendNotification('🚨 Please leave now!', 'You may be late if you don\'t leave immediately.', 'urgent');
    }

    // Early reminder: buffer <= 15 min
    if (buffer <= 15 && buffer > 5 && !notifiedRef.current.has(id + '-early-reminder')) {
      notifiedRef.current.add(id + '-early-reminder');
      sendNotification('🕐 Get ready to leave', 'Your turn is approaching. Please prepare to travel.', 'warning');
    }

    // Late warning: travel time > remaining wait
    if (travelMinutes > waitMin && !notifiedRef.current.has(id + '-late-warning')) {
      notifiedRef.current.add(id + '-late-warning');
      sendNotification('⚠️ You are likely late', 'Your travel time exceeds your remaining wait time. Please hurry.', 'urgent');
    }
  }, [travelData, queueData.patientsAhead, token, notifiedRef]);

  const triggerHapticFeedback = (level: 'light' | 'medium' | 'heavy') => {
    if (!('vibrate' in navigator)) return;
    const patterns: Record<string, number[]> = {
      light: [100],
      medium: [200, 100, 200],
      heavy: [300, 100, 300, 100, 300],
    };
    navigator.vibrate(patterns[level]);
  };

  const playAlertSound = (level: 'info' | 'warning' | 'urgent') => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (level === 'urgent') {
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        setTimeout(() => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 1100;
          g2.gain.value = 0.3;
          o2.start(); o2.stop(ctx.currentTime + 0.15);
          setTimeout(() => {
            const o3 = ctx.createOscillator();
            const g3 = ctx.createGain();
            o3.connect(g3); g3.connect(ctx.destination);
            o3.frequency.value = 1320;
            g3.gain.value = 0.3;
            o3.start(); o3.stop(ctx.currentTime + 0.2);
          }, 200);
        }, 200);
      } else if (level === 'warning') {
        osc.frequency.value = 660;
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        setTimeout(() => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 880;
          g2.gain.value = 0.2;
          o2.start(); o2.stop(ctx.currentTime + 0.2);
        }, 250);
      } else {
        osc.frequency.value = 520;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // AudioContext not available
    }
  };

  const sendNotification = (title: string, body: string, alertLevel: 'info' | 'warning' | 'urgent' = 'info') => {
    toast({ title, description: body });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`MedQueue - ${title}`, { body });
    }
    playAlertSound(alertLevel);
    if (alertLevel === 'urgent') triggerHapticFeedback('heavy');
    else if (alertLevel === 'warning') triggerHapticFeedback('medium');
    else triggerHapticFeedback('light');
  };

  useEffect(() => { fetchQueueData(); }, [fetchQueueData]);

  useEffect(() => {
    const channel = supabase
      .channel(`patient-queue-${token.doctor_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => {
        fetchQueueData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchQueueData, token.doctor_id]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    await supabase.from('queue_tokens').update({
      status: 'checked_in' as any,
      checked_in_at: new Date().toISOString(),
    }).eq('id', token.id);
    toast({ title: '✅ Checked in!', description: 'You have been checked in at the clinic.' });
    setCheckingIn(false);
  };

  const handleTravelDataUpdate = useCallback((data: { distanceKm: number; travelMinutes: number; arrived: boolean }) => {
    setTravelData(data);
  }, []);

  const slotMin0 = token.doctors?.slot_duration_minutes || 15;
  const waitMin0 = queueData.patientsAhead * slotMin0;

  // Trigger the repeating alarm when it is time to leave
  useEffect(() => {
    if (!travelData || travelData.arrived) return;
    if (token.status === 'serving' || token.status === 'in_consultation') return;
    const buffer = waitMin0 - travelData.travelMinutes;
    const key = token.id + '-alarm';
    if (buffer <= 5 && !notifiedRef.current.has(key)) {
      notifiedRef.current.add(key);
      alarm.start(
        buffer <= 0
          ? 'Your travel time is longer than your remaining wait. Leave immediately!'
          : `Only ~${buffer} min of spare time left. Leave now to reach on time.`
      );
    }
  }, [travelData, waitMin0, token.status, token.id, notifiedRef, alarm]);

  const cfg = statusConfig[token.status] || statusConfig.waiting;
  const StatusIcon = cfg.icon;
  const isServing = token.status === 'serving' || token.status === 'in_consultation';
  const slotDuration = token.doctors?.slot_duration_minutes || 15;
  const estimatedSeconds = isServing ? 0 : queueData.patientsAhead * slotDuration * 60;
  const waitTimeMinutes = isServing ? 0 : queueData.patientsAhead * slotDuration;

  return (
    <Card className={`overflow-hidden transition-all ${isServing ? 'border-green-500 ring-2 ring-green-500/20 shadow-lg shadow-green-500/10' : 'hover:shadow-md'}`}>
      {/* Doctor info header */}
      <div className="bg-muted/30 px-5 py-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Dr. {token.doctors?.name}</h3>
              <p className="text-sm text-muted-foreground">{token.doctors?.specialization} · {token.clinics?.name}</p>
            </div>
          </div>
          <Badge className={`${cfg.variant} gap-1`}>
            <StatusIcon className="h-3 w-3" /> {cfg.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Countdown timer */}
        <div className="flex justify-center py-3">
          <CountdownTimer totalSeconds={estimatedSeconds} isServing={isServing} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
            <Hash className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">#{token.token_number}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Your Token</p>
          </div>
          <div className="rounded-xl bg-muted/50 border p-3 text-center">
            <CircleDot className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold">{queueData.currentServing ? `#${queueData.currentServing}` : '—'}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Now Serving</p>
          </div>
          <div className="rounded-xl bg-muted/50 border p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold">{isServing ? '0' : queueData.patientsAhead}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Ahead</p>
          </div>
        </div>

        {token.is_priority && (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            ⚡ Priority Patient
          </Badge>
        )}

        {/* Check In */}
        {token.status === 'waiting' && (
          <Button onClick={handleCheckIn} disabled={checkingIn} className="w-full gap-2">
            {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Check In at Clinic
          </Button>
        )}

        {/* Live Navigation Map with smart alerts */}
        {token.clinics?.latitude && token.clinics?.longitude ? (
          <LiveNavigationMap
            clinicLat={token.clinics.latitude}
            clinicLng={token.clinics.longitude}
            clinicName={token.clinics.name || 'Clinic'}
            waitTimeMinutes={waitTimeMinutes}
            onTravelDataUpdate={handleTravelDataUpdate}
          />
        ) : (
          <Button variant="outline" onClick={() => navigate('/nearby')} className="w-full gap-2">
            <MapPin className="h-4 w-4" /> Open Map
          </Button>
        )}

        {/* AI travel coach */}
        {!isServing && (
          <TravelCoach
            context={{
              doctorName: token.doctors?.name,
              clinicName: token.clinics?.name,
              tokenNumber: token.token_number,
              patientsAhead: queueData.patientsAhead,
              waitMinutes: waitTimeMinutes,
              distanceKm: travelData?.distanceKm ?? null,
              travelMinutes: travelData?.travelMinutes ?? null,
              arrived: travelData?.arrived ?? false,
              status: token.status,
            }}
            onAdvice={setAiAdvice}
          />
        )}

        <TravelAlarmDialog
          open={alarm.ringing}
          reason={alarm.reason}
          advice={aiAdvice}
          navigationUrl={
            token.clinics?.latitude && token.clinics?.longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${token.clinics.latitude},${token.clinics.longitude}`
              : undefined
          }
          onDismiss={alarm.stop}
        />
      </CardContent>
    </Card>
  );
}
