import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Heart, Search, Ticket, Bell, Clock, CheckCircle, Shield,
  Hospital, Users, Star, ArrowRight, Smartphone, CalendarCheck,
  BarChart3, Zap, Lock, Activity, ChevronRight, MapPin,
  Twitter, Facebook, Linkedin, Instagram, Mail, Phone
} from 'lucide-react';

const steps = [
  { icon: Search, title: 'Find a Clinic', desc: 'Search nearby clinics and doctors by name, specialization, or location.' },
  { icon: Ticket, title: 'Join the Queue', desc: 'Book your slot and receive a queue token instantly.' },
  { icon: Bell, title: 'Arrive at the Right Time', desc: 'Get notifications when your turn is near. No more sitting in crowded waiting rooms.' },
];

const patientBenefits = [
  { icon: Clock, text: 'Avoid long waiting times' },
  { icon: Activity, text: 'Track queue position live' },
  { icon: Bell, text: 'Receive turn notifications' },
  { icon: CalendarCheck, text: 'Book appointments easily' },
];

const clinicBenefits = [
  { icon: Smartphone, text: 'Manage patient queues digitally' },
  { icon: Users, text: 'Reduce overcrowding in waiting areas' },
  { icon: Star, text: 'Improve patient experience' },
  { icon: BarChart3, text: 'Track appointments easily' },
];

const features = [
  { icon: Activity, title: 'Real-Time Queue Tracking', desc: 'Patients see live queue updates with their position and estimated wait time.' },
  { icon: Zap, title: 'Smart Notifications', desc: 'Get alerts when your turn approaches so you arrive at the perfect time.' },
  { icon: CalendarCheck, title: 'Simple Appointment Booking', desc: 'Book doctor visits in seconds with our streamlined booking system.' },
  { icon: BarChart3, title: 'Clinic Dashboard', desc: 'Reception can manage queues, call patients, and track daily flow easily.' },
];

const trustItems = [
  { icon: Lock, title: 'Secure Patient Data', desc: 'End-to-end encryption protects all patient information and medical records.' },
  { icon: Shield, title: 'Reliable Queue Management', desc: 'Built for high-traffic clinics with 99.9% uptime and real-time sync.' },
  { icon: Hospital, title: 'Designed for Healthcare', desc: 'Purpose-built for hospitals, clinics, and multi-doctor practices.' },
];

const testimonials = [
  { quote: 'This system reduced our clinic waiting time by over 60%. Our patients are happier and our staff is less stressed.', author: 'Dr. Priya Sharma', role: 'Apollo Care Clinic, Chennai' },
  { quote: 'Patients love knowing exactly when to arrive. We saw a dramatic drop in no-shows and walk-outs.', author: 'Dr. Rajesh Gupta', role: 'City Health Clinic, Bengaluru' },
  { quote: 'The real-time queue tracking is a game-changer. Our waiting room is no longer overcrowded.', author: 'Dr. Anita Desai', role: 'Green Valley Hospital, Pune' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </div>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MedQueue</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Log In</Link></Button>
            <Button size="sm" asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <Zap className="h-3 w-3" /> Real-Time Queue Management
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Skip the Waiting Room.{' '}
                <span className="text-primary">Join the Digital Queue.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Book doctor appointments, track your queue position in real time, and arrive only when it's your turn.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/signup">
                    <Search className="h-4 w-4" /> Find a Clinic
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/signup">
                    <Ticket className="h-4 w-4" /> Join Queue
                  </Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-accent" /> Free for patients</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-accent" /> No app download</span>
              </div>
            </div>
            {/* Hero illustration */}
            <div className="relative hidden md:block">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-3xl" />
              <div className="relative bg-card border rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Patient Queue View</p>
                    <p className="text-xs text-muted-foreground">Live • Updated just now</p>
                  </div>
                  <Badge className="ml-auto bg-accent text-accent-foreground text-xs">Live</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">18</p>
                    <p className="text-xs text-muted-foreground">Current Token</p>
                  </div>
                  <div className="bg-accent/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-accent">24</p>
                    <p className="text-xs text-muted-foreground">Your Token</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">~25m</p>
                    <p className="text-xs text-muted-foreground">Est. Wait</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[19, 20, 21, 22, 23, 24].map(n => (
                    <div key={n} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${n === 24 ? 'bg-primary/10 border border-primary/20 font-semibold' : 'bg-muted/50'}`}>
                      <span>Token #{n}</span>
                      <Badge variant={n === 24 ? 'default' : 'secondary'} className="text-xs">
                        {n === 24 ? 'You' : 'Waiting'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Three Simple Steps</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Get started in minutes. No app download required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <Card className="text-center p-6 h-full hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 space-y-4">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
                {i < 2 && <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/40 z-10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Patient Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5"><Users className="h-3 w-3" /> For Patients</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Your Time Matters</h2>
            <p className="text-muted-foreground">No more sitting in crowded waiting rooms for hours. Know exactly when to arrive.</p>
            <div className="space-y-4">
              {patientBenefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{b.text}</span>
                </div>
              ))}
            </div>
            <Button className="gap-2 mt-2" asChild>
              <Link to="/signup">
                <CalendarCheck className="h-4 w-4" /> Book Appointment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 border">
            <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Upcoming Appointment</p>
              <div className="border-l-4 border-primary pl-4">
                <p className="font-semibold">Dr. Priya Sharma</p>
                <p className="text-sm text-muted-foreground">General Medicine • City Health Clinic</p>
                <p className="text-sm text-muted-foreground">Today, 10:30 AM</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Badge className="bg-accent text-accent-foreground">Token #24</Badge>
                <span className="text-sm text-muted-foreground">5 patients ahead • ~25 min wait</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinic Benefits */}
      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gradient-to-br from-accent/5 to-primary/5 rounded-2xl p-8 border">
              <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><Hospital className="h-4 w-4 text-primary" /> Clinic Dashboard</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-xl font-bold text-primary">42</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <div className="bg-accent/5 rounded-lg p-3">
                    <p className="text-xl font-bold text-accent">18</p>
                    <p className="text-xs text-muted-foreground">Serving</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xl font-bold">8</p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                  </div>
                </div>
                <Button className="w-full gap-2" size="sm"><ArrowRight className="h-4 w-4" /> Call Next Patient</Button>
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <Badge variant="outline" className="gap-1.5"><Hospital className="h-3 w-3" /> For Clinics</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Streamline Your Practice</h2>
              <p className="text-muted-foreground">Digitize your queue, reduce chaos, and give patients a better experience.</p>
              <div className="space-y-4">
                {clinicBenefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <b.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="font-medium">{b.text}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="gap-2 mt-2" asChild>
                <Link to="/register-clinic">
                  <Hospital className="h-4 w-4" /> Register Your Clinic <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Queue Preview */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 gap-1.5"><Activity className="h-3 w-3" /> Live Demo</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">See the Queue in Action</h2>
          <p className="text-muted-foreground mt-2">Here's what the real-time queue experience looks like.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Clinic View */}
          <Card className="overflow-hidden">
            <div className="bg-primary px-5 py-3">
              <p className="text-primary-foreground font-semibold text-sm flex items-center gap-2"><Hospital className="h-4 w-4" /> Clinic View</p>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-2xl font-bold text-primary">18</p>
                  <p className="text-xs text-muted-foreground">Current Token</p>
                </div>
                <div className="bg-accent/5 rounded-lg p-3">
                  <p className="text-2xl font-bold text-accent">19</p>
                  <p className="text-xs text-muted-foreground">Next Token</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { n: 18, status: 'Serving', color: 'bg-accent/10 text-accent border-accent/20' },
                  { n: 19, status: 'Waiting', color: 'bg-muted/50' },
                  { n: 20, status: 'Waiting', color: 'bg-muted/50' },
                  { n: 21, status: 'Waiting', color: 'bg-muted/50' },
                ].map(t => (
                  <div key={t.n} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${t.color}`}>
                    <span className="font-medium">Token #{t.n}</span>
                    <Badge variant={t.status === 'Serving' ? 'default' : 'secondary'} className="text-xs">{t.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Patient View */}
          <Card className="overflow-hidden">
            <div className="bg-accent px-5 py-3">
              <p className="text-accent-foreground font-semibold text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Patient View</p>
            </div>
            <CardContent className="p-5 space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Your Token Number</p>
                <p className="text-5xl font-bold text-primary">24</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">5</p>
                  <p className="text-xs text-muted-foreground">Patients Ahead</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">~25 min</p>
                  <p className="text-xs text-muted-foreground">Est. Wait Time</p>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
                <Bell className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-sm font-medium">We'll notify you when your turn is near</p>
                <p className="text-xs text-muted-foreground">You can leave the waiting room safely</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Platform Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Everything You Need</h2>
            <p className="text-muted-foreground mt-2">A complete queue and appointment management solution.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="p-6 hover:shadow-md transition-shadow h-full">
                <CardContent className="p-0 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 gap-1.5"><Shield className="h-3 w-3" /> Trust & Security</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">Built for Healthcare</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {trustItems.map((t, i) => (
            <div key={i} className="text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <t.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-semibold text-lg">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 gap-1.5"><Star className="h-3 w-3" /> Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Loved by Clinics & Patients</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-6">
                <CardContent className="p-0 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-primary text-primary" />)}
                  </div>
                  <p className="text-sm italic text-muted-foreground">"{t.quote}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center relative space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Stop Waiting. Start Booking.</h2>
          <p className="text-lg text-muted-foreground">Join thousands of patients and clinics already using MedQueue for smarter healthcare.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <Link to="/signup"><Search className="h-4 w-4" /> Find Clinics</Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/signup"><Hospital className="h-4 w-4" /> Register Clinic</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Heart className="h-4 w-4" />
                </div>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MedQueue</span>
              </Link>
              <p className="text-sm text-muted-foreground">Digital queue management for modern healthcare.</p>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">Company</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">Connect</p>
              <div className="flex gap-3">
                <a href="#" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors"><Twitter className="h-4 w-4 text-muted-foreground" /></a>
                <a href="#" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors"><Facebook className="h-4 w-4 text-muted-foreground" /></a>
                <a href="#" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors"><Linkedin className="h-4 w-4 text-muted-foreground" /></a>
                <a href="#" className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors"><Instagram className="h-4 w-4 text-muted-foreground" /></a>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> hello@medqueue.in</p>
                <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> +91 800-MED-QUEUE</p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} MedQueue. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
