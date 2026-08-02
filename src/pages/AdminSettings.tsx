import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, MapPin, Settings } from 'lucide-react';

export default function AdminSettings() {
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    description: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from('clinics')
      .select('name, address, city, phone, description, latitude, longitude')
      .eq('id', clinicId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name || '',
            address: data.address || '',
            city: data.city || '',
            phone: data.phone || '',
            description: data.description || '',
            latitude: data.latitude?.toString() || '',
            longitude: data.longitude?.toString() || '',
          });
        }
        setLoading(false);
      });
  }, [clinicId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);

    const { error } = await supabase
      .from('clinics')
      .update({
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone,
        description: form.description || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      })
      .eq('id', clinicId);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
    }
    setSaving(false);
  };

  const detectLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast({ title: 'Location detected' });
      },
      () => toast({ title: 'Could not detect location', variant: 'destructive' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!clinicId) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          No clinic found.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7" /> Clinic Settings
          </h1>
          <p className="text-muted-foreground mt-1">Update your clinic information</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Clinic Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>

                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>

                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your clinic..."
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Map Location</Label>
                    <Button type="button" variant="outline" size="sm" onClick={detectLocation} className="gap-1.5 text-xs">
                      <MapPin className="h-3 w-3" /> Detect
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
                    <Input placeholder="Longitude" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
