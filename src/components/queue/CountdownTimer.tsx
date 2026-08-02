import { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  totalSeconds: number;
  isServing: boolean;
}

export default function CountdownTimer({ totalSeconds, isServing }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isServing || remaining <= 0) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isServing, remaining > 0]);

  if (isServing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-3xl font-bold text-green-600 animate-pulse">Your Turn!</div>
        <p className="text-xs text-muted-foreground">Please proceed to the doctor</p>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const urgencyColor =
    remaining <= 300 ? 'text-red-600' :
    remaining <= 900 ? 'text-orange-500' :
    'text-primary';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Timer className={`h-5 w-5 ${urgencyColor}`} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Wait</span>
      </div>
      <div className={`text-4xl font-mono font-bold tabular-nums ${urgencyColor}`}>
        {pad(mins)}:{pad(secs)}
      </div>
      {remaining <= 300 && remaining > 0 && (
        <p className="text-xs text-red-500 font-medium animate-pulse">Almost your turn!</p>
      )}
    </div>
  );
}
