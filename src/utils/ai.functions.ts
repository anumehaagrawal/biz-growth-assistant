import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const businessSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  target_audience: z.string().min(1).max(1000),
  brand_voice: z.string().min(1).max(100),
  goals: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
});

const resourceSchema = z.object({
  name: z.string().min(1).max(300),
  text: z.string().min(1).max(40_000),
});

const TOTAL_RESOURCE_BUDGET = 60_000;

function buildResourceSection(resources: Array<{ name: string; text: string }> | undefined): string {
  if (!resources || resources.length === 0) return "";
  // Fair-share budget per resource
  const perItem = Math.floor(TOTAL_RESOURCE_BUDGET / resources.length);
  const blocks = resources.map((r) => {
    const snippet = r.text.length > perItem ? r.text.slice(0, perItem) + "\n[...truncated]" : r.text;
    return `--- RESOURCE: ${r.name} ---\n${snippet}`;
  });
  return `\n\nREFERENCE MATERIALS from the organization (use the facts, language, programs, and tone from these — never invent statistics, quotes, or program names; if something isn't in the materials and you're unsure, keep it general rather than fabricate):\n\n${blocks.join("\n\n")}`;
}

async function callAI(messages: Array<{ role: string; content: string }>, opts: { tools?: any[]; tool_choice?: any } = {}) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      ...opts,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
    console.error("AI error:", res.status, text);
    throw new Error("AI request failed. Please try again.");
  }

  return res.json();
}

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      business: businessSchema,
      contentType: z.enum(["social", "email", "blog"]),
      topic: z.string().min(1).max(1000),
      platform: z.string().max(50).optional(),
      resources: z.array(resourceSchema).max(20).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { business, contentType, topic, platform, resources } = data;

    const formatGuide = {
      social: `a ${platform || "Instagram"} post for a non-profit (caption + 5-10 relevant hashtags). Make it human and emotionally resonant — the goal is to inspire action (donate, volunteer, share, advocate). ${platform === "linkedin" ? "Lean professional and impact-focused." : "Keep it warm, vivid, and scroll-stopping."}`,
      email: "a non-profit email — could be a donor appeal, volunteer call-out, supporter update, or newsletter. Include a compelling subject line, a heartfelt opening, the story or update (2-3 short paragraphs), and a clear, specific call-to-action (donate, sign up, share, RSVP).",
      blog: "a non-profit blog post or impact story with a catchy title, a human hook, 3-4 short sections with subheadings (story → impact → how readers can help), and a closing CTA. Aim for ~500-700 words. Use markdown.",
    }[contentType];

    const systemPrompt = `You are a marketing and storytelling writer for "${business.name}", a non-profit organization working in ${business.industry}.

About the organization & mission: ${business.description}
Who they're trying to reach (donors, volunteers, supporters, beneficiaries): ${business.target_audience}
Brand voice: ${business.brand_voice}
${business.location ? `Location / area served: ${business.location}` : ""}
${business.website ? `Website: ${business.website}` : ""}
${business.goals ? `Current mission goals: ${business.goals}` : ""}

Write content that sounds genuinely human and mission-driven — never generic AI-speak, never "salesy". Center real people and impact. Match the brand voice precisely. Always include a clear, specific ask (donate, volunteer, share, sign up, advocate) when appropriate.${buildResourceSection(resources)}`;

    const userPrompt = `Write ${formatGuide}\n\nTopic / context: ${topic}\n\nReturn ONLY the finished content, no preamble, no "Here's your post" — just the content itself, ready to publish.`;

    const result = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const output = result.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) throw new Error("AI returned an empty response. Please try again.");
    return { output };
  });

export const generateOutreachPlan = createServerFn({ method: "POST" })
  .inputValidator(z.object({ business: businessSchema }))
  .handler(async ({ data }) => {
    const { business } = data;

    const systemPrompt = `You are a non-profit outreach and fundraising strategist. You design weekly outreach plans that are concrete, achievable for a busy small non-profit team (often volunteer-run), and tailored to the organization's specific mission, audience, and community. Mix donor cultivation, volunteer recruitment, community partnerships, storytelling, advocacy, and grassroots tactics. No generic advice.`;

    const userPrompt = `Create this week's outreach plan for:

Organization: ${business.name}
Cause area: ${business.industry}
Mission: ${business.description}
Who they want to reach: ${business.target_audience}
${business.location ? `Location / area served: ${business.location}` : ""}
${business.goals ? `Mission goals this season: ${business.goals}` : ""}

Generate 5 outreach strategies they can act on this week. Mix tactics across donor outreach, volunteer recruitment, community partnerships (local businesses, faith groups, schools), storytelling/content, events, advocacy, and supporter referrals. Each strategy must be specific to THIS organization — reference their cause, audience, mission goals, or location.`;

    const result = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "submit_outreach_plan",
              description: "Submit a weekly outreach plan with 5 strategies",
              parameters: {
                type: "object",
                properties: {
                  intro: { type: "string", description: "1-2 warm sentences introducing this week's focus" },
                  strategies: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short action-oriented title" },
                        category: { type: "string", enum: ["partnership", "community", "content", "direct", "referral", "event"] },
                        why: { type: "string", description: "1 sentence: why this works for them" },
                        steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Concrete steps to take" },
                        time_estimate: { type: "string", description: "e.g. '30 min', '1 hour'" },
                      },
                      required: ["title", "category", "why", "steps", "time_estimate"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["intro", "strategies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_outreach_plan" } },
      }
    );

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return a plan. Please try again.");

    const plan = JSON.parse(toolCall.function.arguments);
    return { plan };
  });
