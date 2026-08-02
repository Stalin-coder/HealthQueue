import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, Save } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleRow {
  id?: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  is_available: boolean;
  dirty?: boolean;
}

export default function AdminSchedules() {
  const { clinicId } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    supabase.from('doctors').select('*').eq('clinic_id', clinicId).order('name')
      .then(({ data }) => {
        setDoctors(data || []);
        if (data && data.length > 0) setSelectedDoctor(data[0].id);
        setLoading(false);
      });
  }, [clinicId]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedDoctor) return;
    const { data } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', selectedDoctor)
      .order('day_of_week');

    // Build full week, filling in defaults for missing days
    const existing = new Map((data || []).map((s: any) => [s.day_of_week, s]));
    const full: ScheduleRow[] = [];
    for (let d = 0; d < 7; d++) {
      const ex = existing.get(d);
      if (ex) {
        full.push({
          id: ex.id,
          doctor_id: selectedDoctor,
          day_of_week: d,
          start_time: ex.start_time?.slice(0, 5) || '09:00',
          end_time: ex.end_time?.slice(0, 5) || '17:00',
          break_start: ex.break_start?.slice(0, 5) || '',
          break_end: ex.break_end?.slice(0, 5) || '',
          is_available: ex.is_available,
        });
      } else {
        full.push({
          doctor_id: selectedDoctor,
          day_of_week: d,
          start_time: '09:00',
          end_time: '17:00',
          break_start: '',
          break_end: '',
          is_available: d >= 1 && d <= 5, // Mon-Fri default
        });
      }
    }
    setSchedules(full);
  }, [selectedDoctor]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const updateDay = (dayIndex: number, field: keyof ScheduleRow, value: any) => {
    setSchedules(prev => prev.map(s =>
      s.day_of_week === dayIndex ? { ...s, [field]: value, dirty: true } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of schedules) {
      const payload: any = {
        doctor_id: s.doctor_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        break_start: s.break_start || null,
        break_end: s.break_end || null,
        is_available: s.is_available,
      };

      if (s.id) {
        await supabase.from('doctor_schedules').update(payload).eq('id', s.id);
      } else {
        await supabase.from('doctor_schedules').insert(payload);
      }
    }
    toast({ title: 'Schedule saved successfully' });
    setSaving(false);
    fetchSchedules();
  };

  const selectedDoc = doctors.find(d => d.id === selectedDoctor);

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctor Schedules</h1>
            <p className="text-muted-foreground mt-1">Define weekly availability for each doctor</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        {selectedDoc && (
          <Card className="border-primary/20">
            <CardContent className="py-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{selectedDoc.name}</p>
                <p className="text-sm text-muted-foreground">{selectedDoc.specialization}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Grid */}
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.day_of_week} className={!s.is_available ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Day + toggle */}
                  <div className="flex items-center gap-3 sm:w-40 shrink-0">
                    <Switch
                      checked={s.is_available}
                      onCheckedChange={(v) => updateDay(s.day_of_week, 'is_available', v)}
                    />
                    <div>
                      <p className="font-medium">{DAYS[s.day_of_week]}</p>
                      <Badge variant={s.is_available ? 'default' : 'secondary'} className="text-[10px]">
                        {s.is_available ? 'Available' : 'Off'}
                      </Badge>
                    </div>
                  </div>

                  {s.is_available && (
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      {/* Working hours */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Hours:</Label>
                        <Input
                          type="time"
                          value={s.start_time}
                          onChange={e => updateDay(s.day_of_week, 'start_time', e.target.value)}
                          className="w-[120px] h-8 text-sm"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          value={s.end_time}
                          onChange={e => updateDay(s.day_of_week, 'end_time', e.target.value)}
                          className="w-[120px] h-8 text-sm"
                        />
                      </div>

                      {/* Break */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Break:</Label>
                        <Input
                          type="time"
                          value={s.break_start}
                          onChange={e => updateDay(s.day_of_week, 'break_start', e.target.value)}
                          className="w-[120px] h-8 text-sm"
                          placeholder="None"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          value={s.break_end}
                          onChange={e => updateDay(s.day_of_week, 'break_end', e.target.value)}
                          className="w-[120px] h-8 text-sm"
                          placeholder="None"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
