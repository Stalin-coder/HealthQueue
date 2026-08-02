import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Loader2, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateTimeSlots(start: string, end: string, duration: number, breakStart?: string, breakEnd?: string) {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let current = sh * 60 + sm;
  const endMin = eh * 60 + em;

  const bsMin = breakStart ? breakStart.split(':').map(Number).reduce((h, m) => h * 60 + m) : null;
  const beMin = breakEnd ? breakEnd.split(':').map(Number).reduce((h, m) => h * 60 + m) : null;

  while (current + duration <= endMin) {
    // Skip break time
    if (bsMin !== null && beMin !== null && current >= bsMin && current < beMin) {
      current = beMin;
      continue;
    }
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    current += duration;
  }
  return slots;
}

export default function BookAppointment() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const [bookingFor, setBookingFor] = useState<'myself' | 'other'>('myself');
  const [otherName, setOtherName] = useState('');
  const [otherPhone, setOtherPhone] = useState('');
  const [otherAge, setOtherAge] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('doctors').select('*, clinics(id, name)').eq('id', doctorId!).single(),
      supabase.from('doctor_schedules').select('*').eq('doctor_id', doctorId!),
    ]).then(([docRes, schedRes]) => {
      setDoctor(docRes.data);
      setSchedules(schedRes.data || []);
      setLoading(false);
    });
  }, [doctorId]);

  // Get schedule for selected date
  const getScheduleForDate = (d: Date) => {
    const dow = d.getDay();
    return schedules.find((s: any) => s.day_of_week === dow && s.is_available);
  };

  // Check if a date has an available schedule
  const isDateDisabled = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today || d > addDays(new Date(), 30)) return true;
    // If no schedules exist at all, fall back to allowing any date
    if (schedules.length === 0) return false;
    const sched = getScheduleForDate(d);
    return !sched;
  };

  useEffect(() => {
    if (!date || !doctorId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    supabase.from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        setBookedSlots(data?.map(a => a.appointment_time.slice(0, 5)) || []);
      });
  }, [date, doctorId]);

  const handleBook = async () => {
    if (!date || !selectedSlot || !doctor || !user) return;
    if (bookingFor === 'other' && !otherName.trim()) {
      toast({ title: 'Please enter patient name', variant: 'destructive' });
      return;
    }

    setBooking(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    const insertData: any = {
      patient_id: user.id,
      doctor_id: doctor.id,
      clinic_id: doctor.clinic_id,
      appointment_date: dateStr,
      appointment_time: selectedSlot + ':00',
      reason_for_visit: reasonForVisit.trim() || null,
    };

    if (bookingFor === 'other') {
      insertData.booked_for_name = otherName.trim();
      insertData.booked_for_phone = otherPhone.trim() || null;
      insertData.booked_for_age = otherAge ? parseInt(otherAge) : null;
    }

    const { data: appt, error } = await supabase.from('appointments').insert(insertData).select().single();
    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
      setBooking(false);
      return;
    }

    const { data: tokenNum } = await supabase.rpc('get_next_token_number', {
      _doctor_id: doctor.id,
      _date: dateStr,
    });

    await supabase.from('queue_tokens').insert({
      appointment_id: appt.id,
      doctor_id: doctor.id,
      clinic_id: doctor.clinic_id,
      patient_id: user.id,
      token_number: tokenNum || 1,
      queue_date: dateStr,
    });

    setBooking(false);
    const nameLabel = bookingFor === 'other' ? ` for ${otherName}` : '';
    toast({ title: 'Appointment booked!', description: `Token #${tokenNum || 1}${nameLabel}` });
    navigate('/my-appointments');
  };

  if (loading) {
    return <PatientLayout><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div></PatientLayout>;
  }

  if (!doctor) {
    return <PatientLayout><div className="text-center py-12 text-muted-foreground">Doctor not found</div></PatientLayout>;
  }

  // Build time slots based on schedule for selected date
  const currentSchedule = date ? getScheduleForDate(date) : null;
  const timeSlots = date
    ? currentSchedule
      ? generateTimeSlots(
          currentSchedule.start_time.slice(0, 5),
          currentSchedule.end_time.slice(0, 5),
          doctor.slot_duration_minutes,
          currentSchedule.break_start?.slice(0, 5),
          currentSchedule.break_end?.slice(0, 5),
        )
      : schedules.length === 0
        ? generateTimeSlots(doctor.consultation_start, doctor.consultation_end, doctor.slot_duration_minutes)
        : []
    : [];

  // Find next available day for display
  const nextAvailableDay = schedules.length > 0
    ? schedules.filter((s: any) => s.is_available).map((s: any) => DAYS[s.day_of_week]).join(', ')
    : null;

  return (
    <PatientLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" asChild>
          <Link to={`/clinic/${doctor.clinic_id}`}><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Book Appointment</h1>
          <p className="text-muted-foreground mt-1">
            Dr. {doctor.name} · <Badge variant="secondary">{doctor.specialization}</Badge>
            {doctor.clinics && <span> · {doctor.clinics.name}</span>}
          </p>
        </div>

        {/* Schedule info */}
        {schedules.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-900/30">
            <CardContent className="py-3 flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200">Doctor Schedule</p>
                <div className="mt-1 space-y-0.5 text-blue-700 dark:text-blue-300">
                  {schedules.filter((s: any) => s.is_available).map((s: any) => (
                    <p key={s.day_of_week}>
                      <span className="font-medium">{DAYS[s.day_of_week]}</span>:{' '}
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      {s.break_start && s.break_end && (
                        <span className="text-blue-500"> (Break: {s.break_start.slice(0, 5)} – {s.break_end.slice(0, 5)})</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Details & Booking For */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Reason for Visit</Label>
              <Input value={reasonForVisit} onChange={e => setReasonForVisit(e.target.value)} placeholder="e.g., Fever, Follow-up, General checkup" />
            </div>

            <RadioGroup value={bookingFor} onValueChange={(v) => setBookingFor(v as 'myself' | 'other')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="myself" id="myself" />
                <Label htmlFor="myself">Myself</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Someone Else</Label>
              </div>
            </RadioGroup>

            {bookingFor === 'other' && (
              <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
                <div>
                  <Label>Patient Name *</Label>
                  <Input value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={otherPhone} onChange={e => setOtherPhone(e.target.value)} placeholder="Phone" />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={otherAge} onChange={e => setOtherAge(e.target.value)} placeholder="Age" min="0" max="150" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
              {schedules.length > 0 && (
                <CardDescription>Only available days are selectable</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setSelectedSlot(null); }}
                disabled={isDateDisabled}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Time</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {doctor.slot_duration_minutes} min per slot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!date ? (
                <p className="text-sm text-muted-foreground text-center py-8">Select a date first</p>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="font-medium text-sm">Doctor unavailable on this day</p>
                  {nextAvailableDay && (
                    <p className="text-xs text-muted-foreground mt-1">Available: {nextAvailableDay}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map(slot => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = selectedSlot === slot;
                    return (
                      <Button
                        key={slot}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={isBooked ? 'opacity-40 line-through' : ''}
                      >
                        {slot}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {date && selectedSlot && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')} at {selectedSlot}</p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {doctor.name}
                    {bookingFor === 'other' && otherName && ` · For: ${otherName}`}
                  </p>
                </div>
              </div>
              <Button type="button" onClick={handleBook} disabled={booking} className="gap-2">
                {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Booking'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PatientLayout>
  );
}
