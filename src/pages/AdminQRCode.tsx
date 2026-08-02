import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, QrCode, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRef } from 'react';

export default function AdminQRCode() {
  const { clinicId } = useAuth();
  const qrRef = useRef<HTMLDivElement>(null);

  const clinicUrl = `${window.location.origin}/clinic/${clinicId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clinicUrl);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = 'clinic-qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  if (!clinicId) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          No clinic found. Please complete registration first.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Code</h1>
          <p className="text-muted-foreground mt-1">
            Print or share this QR code so patients can scan and join your queue
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Clinic QR Code
            </CardTitle>
            <CardDescription>
              Patients scan this code to view your clinic and join the queue
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div
              ref={qrRef}
              className="rounded-2xl border-2 border-dashed border-primary/20 bg-white p-6"
            >
              <QRCodeSVG
                value={clinicUrl}
                size={240}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{clinicUrl}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Download PNG
                </Button>
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  Print QR Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <h3 className="font-semibold text-sm mb-2">How to use</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Print the QR code and display it at your reception desk</li>
              <li>• Patients scan the code with their phone camera</li>
              <li>• They'll be taken to your clinic page to join the queue</li>
              <li>• Share the link on social media or your website</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
