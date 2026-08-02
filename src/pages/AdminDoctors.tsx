import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function AdminDoctors() {
  const { clinicId } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', degree: '', specialization: 'General', consultation_start: '09:00', consultation_end: '17:00', slot_duration_minutes: 15 });
  const [saving, setSaving] = useState(false);

  const fetchDoctors = async () => {
    if (!clinicId) return;
    const { data } = await supabase.from('doctors').select('*').eq('clinic_id', clinicId).order('name');
    setDoctors(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, [clinicId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', degree: '', specialization: 'General', consultation_start: '09:00', consultation_end: '17:00', slot_duration_minutes: 15 });
    setDialogOpen(true);
  };

  const openEdit = (doc: any) => {
    setEditing(doc);
    setForm({
      name: doc.name,
      degree: doc.degree || '',
      specialization: doc.specialization,
      consultation_start: doc.consultation_start.slice(0, 5),
      consultation_end: doc.consultation_end.slice(0, 5),
      slot_duration_minutes: doc.slot_duration_minutes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('doctors').update(form).eq('id', editing.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Doctor updated' });
    } else {
      const { error } = await supabase.from('doctors').insert({ ...form, clinic_id: clinicId });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Doctor added' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchDoctors();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('doctors').delete().eq('id', id);
    toast({ title: 'Doctor removed' });
    fetchDoctors();
  };

  const handleToggleActive = async (doc: any) => {
    await supabase.from('doctors').update({ is_active: !doc.is_active }).eq('id', doc.id);
    fetchDoctors();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Doctor</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : doctors.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No doctors yet. Add your first doctor.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {doctors.map(doc => (
              <Card key={doc.id} className={!doc.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{doc.name}</CardTitle>
                      {doc.degree && <p className="text-xs text-muted-foreground">{doc.degree}</p>}
                      <Badge variant="secondary" className="mt-1">{doc.specialization}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {doc.consultation_start.slice(0, 5)} - {doc.consultation_end.slice(0, 5)} · {doc.slot_duration_minutes}min slots
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleToggleActive(doc)}>
                    {doc.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Degree</label>
                <Input value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} placeholder="MBBS, MD" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Specialization</label>
                <Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="General" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input type="time" value={form.consultation_start} onChange={e => setForm({ ...form, consultation_start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input type="time" value={form.consultation_end} onChange={e => setForm({ ...form, consultation_end: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slot Duration (minutes)</label>
                <Input type="number" value={form.slot_duration_minutes} onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) || 15 })} />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving || !form.name}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Doctor'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
