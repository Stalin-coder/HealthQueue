import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, RefreshCw, Send, Bot, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface TravelCoachContext {
  doctorName?: string;
  clinicName?: string;
  tokenNumber?: number;
  patientsAhead?: number;
  waitMinutes?: number;
  distanceKm?: number | null;
  travelMinutes?: number | null;
  arrived?: boolean;
  status?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TravelCoachProps {
  context: TravelCoachContext;
  onAdvice?: (advice: string) => void;
}

export default function TravelCoach({ context, onAdvice }: TravelCoachProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const contextRef = useRef(context);
  contextRef.current = context;
  const onAdviceRef = useRef(onAdvice);
  onAdviceRef.current = onAdvice;

  const ask = useCallback(async (history?: ChatMessage[]) => {
    const { data, error } = await supabase.functions.invoke('travel-coach', {
      body: { context: contextRef.current, messages: history ?? [] },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return (data?.reply as string) || '';
  }, []);

  const refreshAdvice = useCallback(async () => {
    setLoading(true);
    try {
      const reply = await ask();
      setAdvice(reply);
      onAdviceRef.current?.(reply);
    } catch (e: any) {
      toast({ title: 'AI coach unavailable', description: e.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [ask]);

  // Initial advice once travel data is known
  const hasTravel = context.travelMinutes != null;
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current || !hasTravel) return;
    fetchedRef.current = true;
    void refreshAdvice();
  }, [hasTravel, refreshAdvice]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setChatLoading(true);
    try {
      const reply = await ask(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast({ title: 'AI coach unavailable', description: e.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">AI Travel Coach</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshAdvice} disabled={loading} className="h-7 gap-1 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </Button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {loading && !advice
            ? 'Analysing your distance and queue position…'
            : advice || 'Enable location to get a personalised leave-time recommendation.'}
        </p>

        {messages.length > 0 && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <Bot className="h-3.5 w-3.5 mt-1 shrink-0 text-primary" />}
                <span className={`rounded-lg px-2.5 py-1.5 leading-relaxed ${m.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-muted'}`}>
                  {m.content}
                </span>
                {m.role === 'user' && <User className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2 text-xs text-muted-foreground items-center">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendMessage(); } }}
            placeholder="Ask: when should I leave?"
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={sendMessage} disabled={chatLoading || !input.trim()} className="h-9 px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
