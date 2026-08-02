const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TravelContext {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { context, messages = [] } = (await req.json()) as {
      context: TravelContext;
      messages?: { role: "user" | "assistant"; content: string }[];
    };

    const c = context || {};
    const buffer =
      c.waitMinutes != null && c.travelMinutes != null ? c.waitMinutes - c.travelMinutes : null;

    const systemPrompt = `You are MedQueue's travel coach for a clinic queue app. You help a patient decide exactly when to leave home so they arrive just before their turn.

Live data:
- Doctor: ${c.doctorName ?? "unknown"} at ${c.clinicName ?? "clinic"}
- Patient token: #${c.tokenNumber ?? "?"} (status: ${c.status ?? "waiting"})
- Patients ahead: ${c.patientsAhead ?? "?"}
- Estimated queue wait: ${c.waitMinutes ?? "?"} minutes
- Distance to clinic: ${c.distanceKm != null ? c.distanceKm.toFixed(2) + " km" : "unknown"}
- Estimated travel time: ${c.travelMinutes != null ? c.travelMinutes + " min" : "unknown"}
- Spare buffer (wait - travel): ${buffer != null ? buffer + " min" : "unknown"}
- Already near clinic: ${c.arrived ? "yes" : "no"}

Rules:
- Be concise, warm and concrete. Max 3 short sentences unless asked for detail.
- Always give an actionable time: "leave now", "leave in ~X min", or "you can relax for ~X min".
- Advise a small safety margin (about 5 minutes) for parking and check-in.
- If distance or travel time is unknown, say location is needed to be precise.
- Never give medical advice; stick to travel and queue timing.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages.length
          ? messages
          : [{ role: "user", content: "Given my current queue and travel data, when should I leave?" }]),
      ],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const errText = await res.text();
      console.error("AI gateway error", res.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply: string = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("travel-coach error", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
