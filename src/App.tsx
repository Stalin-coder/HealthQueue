import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Index from "./pages/Index";
import ClinicDetail from "./pages/ClinicDetail";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import MyQueue from "./pages/MyQueue";
import VisitHistory from "./pages/VisitHistory";
import NearbyHospitals from "./pages/NearbyHospitals";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDoctors from "./pages/AdminDoctors";
import AdminSchedules from "./pages/AdminSchedules";
import AdminQueue from "./pages/AdminQueue";
import AdminAppointments from "./pages/AdminAppointments";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminClinicApprovals from "./pages/AdminClinicApprovals";
import PlatformAdminDashboard from "./pages/PlatformAdminDashboard";
import PlatformAdminClinics from "./pages/PlatformAdminClinics";
import LiveQueueDisplay from "./pages/LiveQueueDisplay";
import DoctorView from "./pages/DoctorView";
import ClinicRegistration from "./pages/ClinicRegistration";
import AdminPatients from "./pages/AdminPatients";
import AdminQRCode from "./pages/AdminQRCode";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole, allowedRoles }: { children: React.ReactNode; requiredRole?: string; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  
  if (user) {
    if (role === 'platform_admin') return <Navigate to="/platform-admin" replace />;
    if (role === 'clinic_admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/clinic/:id" element={<ProtectedRoute><ClinicDetail /></ProtectedRoute>} />
      <Route path="/book/:doctorId" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
      <Route path="/my-appointments" element={<ProtectedRoute><MyAppointments /></ProtectedRoute>} />
      <Route path="/my-queue" element={<ProtectedRoute><MyQueue /></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute><NearbyHospitals /></ProtectedRoute>} />
      <Route path="/visit-history" element={<ProtectedRoute><VisitHistory /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="clinic_admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/doctors" element={<ProtectedRoute requiredRole="clinic_admin"><AdminDoctors /></ProtectedRoute>} />
      <Route path="/admin/schedules" element={<ProtectedRoute requiredRole="clinic_admin"><AdminSchedules /></ProtectedRoute>} />
      <Route path="/admin/queue" element={<ProtectedRoute requiredRole="clinic_admin"><AdminQueue /></ProtectedRoute>} />
      <Route path="/admin/appointments" element={<ProtectedRoute requiredRole="clinic_admin"><AdminAppointments /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="clinic_admin"><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/doctor-view" element={<ProtectedRoute requiredRole="clinic_admin"><DoctorView /></ProtectedRoute>} />
      <Route path="/admin/clinic-approvals" element={<ProtectedRoute requiredRole="platform_admin"><AdminClinicApprovals /></ProtectedRoute>} />
      <Route path="/admin/patients" element={<ProtectedRoute requiredRole="clinic_admin"><AdminPatients /></ProtectedRoute>} />
      <Route path="/admin/qr-code" element={<ProtectedRoute requiredRole="clinic_admin"><AdminQRCode /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requiredRole="clinic_admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/platform-admin" element={<ProtectedRoute requiredRole="platform_admin"><PlatformAdminDashboard /></ProtectedRoute>} />
      <Route path="/platform-admin/clinics" element={<ProtectedRoute requiredRole="platform_admin"><PlatformAdminClinics /></ProtectedRoute>} />
      <Route path="/register-clinic" element={<ProtectedRoute><ClinicRegistration /></ProtectedRoute>} />
      <Route path="/queue-display" element={<LiveQueueDisplay />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
