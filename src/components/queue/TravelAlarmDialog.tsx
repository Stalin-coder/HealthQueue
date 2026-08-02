import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlarmClock, Navigation } from 'lucide-react';

interface TravelAlarmDialogProps {
  open: boolean;
  reason: string | null;
  advice?: string | null;
  navigationUrl?: string;
  onDismiss: () => void;
}

export default function TravelAlarmDialog({ open, reason, advice, navigationUrl, onDismiss }: TravelAlarmDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-destructive/40">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 animate-pulse">
            <AlarmClock className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Time to leave for the clinic</AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <span className="block font-medium text-foreground">{reason}</span>
            {advice && <span className="block text-sm">{advice}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          {navigationUrl && (
            <Button className="gap-2" asChild>
              <a href={navigationUrl} target="_blank" rel="noopener noreferrer" onClick={onDismiss}>
                <Navigation className="h-4 w-4" /> Start Navigation
              </a>
            </Button>
          )}
          <AlertDialogAction onClick={onDismiss} className="bg-muted text-foreground hover:bg-muted/80">
            Dismiss alarm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
