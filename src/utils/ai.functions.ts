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
});

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
    })
  )
  .handler(async ({ data }) => {
    const { business, contentType, topic, platform } = data;

    const formatGuide = {
      social: `a ${platform || "Instagram"} post (caption + 5-10 relevant hashtags). Keep it scroll-stopping, ${platform === "linkedin" ? "professional yet warm" : "punchy and authentic"}.`,
      email: "a marketing email with a compelling subject line, warm greeting, body (2-3 short paragraphs), and a clear call-to-action.",
      blog: "a blog post with a catchy title, intro hook, 3-4 short sections with subheadings, and a closing CTA. Aim for ~500-700 words. Use markdown.",
    }[contentType];

    const systemPrompt = `You are a marketing writer for "${business.name}", a ${business.industry} business.

About the business: ${business.description}
Target audience: ${business.target_audience}
Brand voice: ${business.brand_voice}
${business.location ? `Location: ${business.location}` : ""}
${business.goals ? `Goals: ${business.goals}` : ""}

Write content that sounds genuinely human, never generic AI-speak. Match the brand voice precisely.`;

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

    const systemPrompt = `You are a small-business outreach strategist. You design weekly outreach plans that are concrete, achievable for a busy small-business owner, and tailored to their specific situation. No generic advice.`;

    const userPrompt = `Create this week's outreach plan for:

Business: ${business.name} (${business.industry})
About: ${business.description}
Audience: ${business.target_audience}
${business.location ? `Location: ${business.location}` : ""}
${business.goals ? `Goals: ${business.goals}` : ""}

Generate 5 outreach strategies they can act on this week. Mix tactics: partnerships, community, content, direct outreach, events, referrals, etc. Each strategy must be specific to THIS business — reference their industry, audience, or location.`;

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
