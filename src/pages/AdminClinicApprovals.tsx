import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Hospital, MapPin, Phone, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PendingClinic {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  status: string;
  created_at: string;
  admin_user_id: string | null;
}

export default function AdminClinicApprovals() {
  const [clinics, setClinics] = useState<PendingClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState('pending');

  const fetchClinics = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClinics(data as unknown as PendingClinic[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClinics(); }, []);

  const updateStatus = async (clinicId: string, status: 'approved' | 'rejected') => {
    setActionLoading(clinicId);
    const { error } = await supabase
      .from('clinics')
      .update({ status: status as any })
      .eq('id', clinicId);

    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Clinic ${status}` });
      fetchClinics();
    }
    setActionLoading(null);
  };

  const filtered = clinics.filter(c => {
    if (tab === 'pending') return (c.status as string) === 'pending';
    if (tab === 'approved') return (c.status as string) === 'approved';
    if (tab === 'rejected') return (c.status as string) === 'rejected';
    return true;
  });

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3" /> Pending</Badge>;
    if (status === 'approved') return <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
    return <Badge variant="outline" className="gap-1 text-destructive border-red-300 bg-red-50"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinic Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and manage clinic registrations</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pending ({clinics.filter(c => (c.status as string) === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Approved ({clinics.filter(c => (c.status as string) === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> Rejected ({clinics.filter(c => (c.status as string) === 'rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No {tab} clinics found.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(clinic => (
                  <Card key={clinic.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Hospital className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold">{clinic.name}</h3>
                            {statusBadge(clinic.status as string)}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {clinic.address}{clinic.city ? `, ${clinic.city}` : ''}
                          </div>
                          {clinic.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" /> {clinic.phone}
                            </div>
                          )}
                          {clinic.description && (
                            <p className="text-sm text-muted-foreground mt-1">{clinic.description}</p>
                          )}
                          {clinic.latitude && clinic.longitude && (
                            <p className="text-xs text-muted-foreground">
                              📍 {clinic.latitude.toFixed(4)}, {clinic.longitude.toFixed(4)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Registered: {new Date(clinic.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {(clinic.status as string) === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={actionLoading === clinic.id}
                              onClick={() => updateStatus(clinic.id, 'approved')}
                            >
                              {actionLoading === clinic.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5"
                              disabled={actionLoading === clinic.id}
                              onClick={() => updateStatus(clinic.id, 'rejected')}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                        {(clinic.status as string) === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            disabled={actionLoading === clinic.id}
                            onClick={() => updateStatus(clinic.id, 'approved')}
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
