import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Stethoscope, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface TriageAssistantProps {
  onSelectSpecialty?: (specialty: string) => void;
}

interface TriageResult {
  department: string;
  urgency: 'Low' | 'Medium' | 'High';
  explanation: string;
}

export default function TriageAssistant({ onSelectSpecialty }: TriageAssistantProps) {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const handleCheck = async () => {
    if (!symptoms.trim() || symptoms.trim().length < 3) {
      toast({ title: 'Invalid input', description: 'Please describe your symptoms in detail.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt to call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('health-assistant', {
        body: { symptoms },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as TriageResult);
    } catch (e: any) {
      console.error('Error invoking health-assistant:', e);
      
      // 2. Local Fallback simulation in case of connection/API issues
      // This is a helpful safeguard to allow testing in local previews
      toast({
        title: 'Running Local Simulator',
        description: 'Using offline mock analysis since the Edge Function is not deployed.',
      });
      
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Simple keyword matching for mock triage
      const lower = symptoms.toLowerCase();
      let department = 'General Medicine';
      let urgency: 'Low' | 'Medium' | 'High' = 'Low';
      let explanation = 'Your symptoms seem routine. A general practitioner can evaluate and refer you if necessary.';

      if (lower.includes('chest') || lower.includes('heart') || lower.includes('palpitations') || lower.includes('breathing')) {
        department = 'Cardiology';
        urgency = 'High';
        explanation = 'Chest pain and breathing difficulty can indicate a heart emergency. Please seek immediate emergency medical care.';
      } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('acne') || lower.includes('itch')) {
        department = 'Dermatology';
        urgency = 'Low';
        explanation = 'Skin conditions are usually non-emergency. A dermatologist can inspect the rash or lesions for targeted treatment.';
      } else if (lower.includes('child') || lower.includes('baby') || lower.includes('pediatric')) {
        department = 'Pediatrics';
        urgency = 'Medium';
        explanation = 'For child-related issues, consulting a pediatrician is recommended to check growth, vaccinations, or acute illnesses.';
      } else if (lower.includes('ear') || lower.includes('nose') || lower.includes('throat') || lower.includes('cough')) {
        department = 'ENT';
        urgency = 'Low';
        explanation = 'Issues related to ears, sinus, or persistent cough are best handled by an Ear, Nose, and Throat (ENT) specialist.';
      } else if (lower.includes('bone') || lower.includes('joint') || lower.includes('fracture') || (lower.includes('pain') && (lower.includes('knee') || lower.includes('back')))) {
        department = 'Orthopedics';
        urgency = 'Medium';
        explanation = 'Musculoskeletal pain, joint stiffness, or suspected fractures should be evaluated by an orthopedic specialist.';
      } else if (lower.includes('stomach') || lower.includes('belly') || lower.includes('vomit') || lower.includes('diarrhea')) {
        department = 'Gastroenterology';
        urgency = 'Medium';
        explanation = 'Digestive track symptoms, persistent stomach ache, or nausea are best diagnosed by a gastroenterologist.';
      } else if (lower.includes('headache') || lower.includes('dizzy') || lower.includes('seizure') || lower.includes('numbness')) {
        department = 'Neurology';
        urgency = 'Medium';
        explanation = 'Neurological symptoms like severe headaches or tingling sensations should be checked by a neurologist.';
      }

      setResult({ department, urgency, explanation });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setSymptoms('');
  };

  const getUrgencyBadge = (urgency: 'Low' | 'Medium' | 'High') => {
    switch (urgency) {
      case 'High':
        return <Badge variant="destructive" className="animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> High Urgency</Badge>;
      case 'Medium':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Medium Urgency</Badge>;
      default:
        return <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">Low Urgency</Badge>;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
          <Sparkles className="h-4 w-4 fill-primary animate-pulse" />
          AI Triage Assistant
        </CardTitle>
        <CardDescription>
          Describe your symptoms to find the right department and urgency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Describe how you feel (e.g., 'I have a mild rash on my forearm and slight itching for two days...')"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="resize-none h-20 text-sm focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={500}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCheck}
                disabled={loading || !symptoms.trim()}
                size="sm"
                className="gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Check Symptoms
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-4 relative space-y-3 shadow-sm animate-in fade-in zoom-in duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 absolute right-2 top-2 rounded-full text-muted-foreground hover:text-foreground"
              onClick={clearResult}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Result:</span>
              {getUrgencyBadge(result.urgency)}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Recommended Specialty</p>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground">{result.department}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg leading-relaxed border border-muted/20">
              {result.explanation}
            </div>

            {onSelectSpecialty && (
              <Button
                onClick={() => onSelectSpecialty(result.department)}
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-200"
              >
                Filter clinics for {result.department}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
