import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, Hospital, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/platform-admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/platform-admin/clinics', label: 'Clinic Management', icon: Hospital },
];

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/platform-admin" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MedQueue Platform</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Button key={item.to} variant={location.pathname === item.to ? 'secondary' : 'ghost'} size="sm" className="gap-2" asChild>
                <Link to={item.to}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </nav>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
          {mobileOpen && (
          <nav className="md:hidden border-t p-2 space-y-1">
            {navItems.map(item => (
              <Button key={item.to} variant={location.pathname === item.to ? 'secondary' : 'ghost'} className="w-full justify-start gap-2" asChild>
                <Link to={item.to} onClick={() => setMobileOpen(false)}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
