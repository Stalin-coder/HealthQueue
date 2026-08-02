import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PatientLayout from '@/components/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Hospital, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const registrationSchema = z.object({
  clinicName: z.string().trim().min(2, 'Clinic name must be at least 2 characters').max(100),
  doctorName: z.string().trim().min(2, 'Doctor name must be at least 2 characters').max(100),
  phone: z.string().trim().min(7, 'Phone number is required').max(20),
  email: z.string().trim().email('Invalid email address'),
  address: z.string().trim().min(5, 'Address is required').max(300),
  city: z.string().trim().min(2, 'City is required').max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  specialization: z.string().trim().min(2, 'Specialty is required').max(100),
  description: z.string().trim().max(500).optional(),
});

export default function ClinicRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [form, setForm] = useState({
    clinicName: '',
    doctorName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    specialization: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setDetectingLocation(false);
      },
      () => {
        toast({ title: 'Could not detect location', variant: 'destructive' });
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = registrationSchema.safeParse({
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({ title: 'Please log in first', variant: 'destructive' });
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Create clinic with pending status
      const { error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: parsed.data.clinicName,
          phone: parsed.data.phone,
          address: parsed.data.address,
          city: parsed.data.city,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          description: parsed.data.description || null,
          admin_user_id: user.id,
          status: 'pending' as any,
        });

      if (clinicError) throw clinicError;

      // Note: Role will be automatically updated to clinic_admin when the platform admin approves the clinic.
      // Doctor can be added from the clinic dashboard after approval.

      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PatientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Registration Submitted!</h2>
              <p className="text-muted-foreground">
                Your clinic registration is under review. You'll get access to the admin dashboard once approved.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </PatientLayout>
    );
  }

  const field = (key: string, label: string, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        placeholder={placeholder}
        value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <PatientLayout>
      <div className="max-w-2xl mx-auto py-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Hospital className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Register Your Clinic</CardTitle>
            <CardDescription>
              Fill in your clinic details. Your registration will be reviewed before activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {field('clinicName', 'Clinic Name', 'text', 'Apollo Clinic')}
                {field('doctorName', 'Primary Doctor Name', 'text', 'Dr. Sharma')}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {field('phone', 'Phone Number', 'tel', '+91 98765 43210')}
                {field('email', 'Email Address', 'email', 'clinic@example.com')}
              </div>
              {field('address', 'Address', 'text', '123 Main Street')}
              {field('city', 'City', 'text', 'Chennai')}
              {field('specialization', 'Primary Specialty', 'text', 'General Medicine')}
              
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Brief description of your clinic..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Map Location</Label>
                  <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={detectingLocation} className="gap-1.5 text-xs">
                    {detectingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    Detect Location
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      placeholder="Latitude"
                      value={form.latitude}
                      onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    />
                    {errors.latitude && <p className="text-xs text-destructive mt-1">{errors.latitude}</p>}
                  </div>
                  <div>
                    <Input
                      placeholder="Longitude"
                      value={form.longitude}
                      onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    />
                    {errors.longitude && <p className="text-xs text-destructive mt-1">{errors.longitude}</p>}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hospital className="h-4 w-4" />}
                Submit Registration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
}
