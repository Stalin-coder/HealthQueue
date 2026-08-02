// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Find all tokens where patient is within 2 positions of being called
    // and hasn't been notified yet
    const { data: allTokens } = await supabase
      .from("queue_tokens")
      .select("*, doctors(name)")
      .eq("queue_date", today)
      .in("status", ["waiting", "checked_in"])
      .order("token_number");

    if (!allTokens || allTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No waiting patients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get currently serving tokens per doctor
    const { data: servingTokens } = await supabase
      .from("queue_tokens")
      .select("doctor_id, token_number")
      .eq("queue_date", today)
      .in("status", ["serving", "in_consultation"]);

    const servingMap: Record<string, number> = {};
    (servingTokens || []).forEach((t: any) => {
      servingMap[t.doctor_id] = t.token_number;
    });

    // Group tokens by doctor
    const byDoctor: Record<string, any[]> = {};
    allTokens.forEach((t: any) => {
      if (!byDoctor[t.doctor_id]) byDoctor[t.doctor_id] = [];
      byDoctor[t.doctor_id].push(t);
    });

    const notifications: string[] = [];

    for (const [doctorId, tokens] of Object.entries(byDoctor)) {
      const sorted = tokens.sort((a: any, b: any) => a.token_number - b.token_number);
      // Patients within first 3 positions should be notified
      const nearTurn = sorted.slice(0, 3);
      for (const token of nearTurn) {
        notifications.push(
          `Token #${token.token_number} for Dr. ${token.doctors?.name} - patient near turn`
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${notifications.length} notifications`,
        notifications,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
