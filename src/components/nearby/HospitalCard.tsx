import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Star, Clock, Users, Stethoscope } from 'lucide-react';


interface HospitalCardProps {
  clinic: any;
  formatDist: (km: number) => string;
  onNavigate?: (clinic: any) => void;
}

export default function HospitalCard({ clinic, formatDist, onNavigate }: HospitalCardProps) {
  return (
    <Card className="hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden group">
      <CardContent className="p-0">
        <div className="flex">
          {/* Distance Sidebar */}
          <div className="flex flex-col items-center justify-center px-3 py-4 bg-muted/40 border-r min-w-[72px]">
            {clinic.distance !== null ? (
              <>
                <Navigation className="h-4 w-4 text-primary mb-1" />
                <span className="text-sm font-bold text-primary leading-tight">{formatDist(clinic.distance)}</span>
                <span className="text-[10px] text-muted-foreground">away</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground text-center">No GPS</span>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {clinic.name}
                  </h3>
                  {clinic.rating && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-green-100 dark:bg-green-950/30 px-1.5 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400 shrink-0">
                      <Star className="h-3 w-3 fill-current" />
                      {Number(clinic.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {clinic.address}{clinic.city && ` · ${clinic.city}`}
                </p>
              </div>
            </div>

            {/* Wait Time + Stats */}
            {clinic.estimatedWaitMin !== null && (
              <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 mt-2 text-xs font-semibold ${
                clinic.estimatedWaitMin === 0
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                  : clinic.estimatedWaitMin <= 15
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
              }`}>
                <Clock className="h-3.5 w-3.5" />
                {clinic.estimatedWaitMin === 0 ? 'No wait' : `~${clinic.estimatedWaitMin} min wait`}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Stethoscope className="h-3 w-3" />
                {clinic.activeDoctors.length} doctor{clinic.activeDoctors.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3 text-blue-500" />
                {clinic.queueInfo.waiting} in queue
              </span>
            </div>

            {/* Specialties + CTA */}
            <div className="flex items-center justify-between mt-2.5 gap-2">
              <div className="flex flex-wrap gap-1 min-w-0">
                {Array.from(new Set(clinic.activeDoctors.map((d: any) => d.specialization)))
                  .slice(0, 3)
                  .map((spec: any) => (
                    <Badge key={spec} variant="outline" className="text-[10px] py-0 h-5">{spec}</Badge>
                  ))}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {clinic.latitude && clinic.longitude && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={e => {
                      e.stopPropagation();
                      onNavigate?.(clinic);
                    }}
                  >
                    <Navigation className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs px-3 shrink-0" asChild>
                  <Link to={`/clinic/${clinic.id}`} onClick={e => e.stopPropagation()}>
                    Join Queue
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
