// @ts-nocheck
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Dermatology",
    "ENT",
    "Gastroenterology",
    "Gynecology",
    "Neurology",
    "Oncology",
    "Ophthalmology",
    "Orthopedics",
    "Pediatrics",
    "Psychiatry",
    "Pulmonology",
    "Urology",
    "Dentistry",
    "Emergency Medicine",
];

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { symptoms, departments } = await req.json();
        if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 3) {
            return new Response(JSON.stringify({ error: "Please describe your symptoms." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Gemini API key not configured." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const list: string[] = Array.isArray(departments) && departments.length
            ? Array.from(new Set([...departments, ...DEPARTMENTS]))
            : DEPARTMENTS;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text:
                                    `You are HealthQueue AI, an intelligent healthcare triage assistant integrated into a hospital appointment booking platform.

                                Your role is to help patients choose the most appropriate hospital department based on the symptoms they describe.

                                IMPORTANT RULES:

                                1. Never diagnose diseases or claim that the patient has a specific medical condition.

                                2. Never prescribe medicines, treatments, or dosages.

                                3. Recommend ONLY ONE department from the available department list.

                                4. Classify urgency into one of these values only:
                                - Low
                                - Medium
                                - High

                                5. If symptoms indicate a possible medical emergency (such as severe chest pain, difficulty breathing, stroke symptoms, severe bleeding, unconsciousness, seizures, or similar life-threatening situations), set:
                                Urgency = High
                                Recommendation = Visit the Emergency Department immediately or call emergency medical services.

                                6. Keep explanations short, simple, and easy for non-medical users.

                                7. Always encourage users to consult a qualified healthcare professional.

                                8. Do not mention probabilities or make definitive medical conclusions.

                                Return ONLY valid JSON using this format:

                                {
                                "department": "General Medicine",
                                "urgency": "Medium",
                                "explanation": "Your symptoms are commonly evaluated by a General Physician.",
                                "recommendation": "Book an appointment with a General Physician within the next 24 hours.",
                                "disclaimer": "This is not a medical diagnosis. Please consult a qualified healthcare professional for proper evaluation and treatment."
                                }

                                The available departments are:

                                General Medicine
                                Cardiology
                                Dermatology
                                ENT
                                Gastroenterology
                                Gynecology
                                Neurology
                                Oncology
                                Ophthalmology
                                Orthopedics
                                Pediatrics
                                Psychiatry
                                Pulmonology
                                Urology
                                Dentistry
                                Emergency Medicine

                                Always choose exactly one department from this list.

                                Do not return Markdown.

                                Do not return code blocks.

                                Return JSON only. Available departments: ` +
                                    list.join(", "),
                            },
                        ],
                    },
                    contents: [{ role: "user", parts: [{ text: `Symptoms: ${symptoms}` }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                department: { type: "STRING", enum: list },
                                urgency: { type: "STRING", enum: ["Low", "Medium", "High"] },
                                explanation: { type: "STRING" },
                                recommendation: { type: "STRING" },
                                disclaimer: { type: "STRING" },
                            },
                            required: ["department", "urgency", "explanation", "recommendation", "disclaimer"],
                        },
                    },
                }),
            },
        );

        if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Too many requests, please try again shortly." }), {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (!response.ok) {
            const text = await response.text();
            console.error("Gemini API error", response.status, text);
            return new Response(JSON.stringify({ error: "AI service error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return new Response(JSON.stringify({ error: "No recommendation returned" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(JSON.parse(text)), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("health-assistant error", e);
        return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
