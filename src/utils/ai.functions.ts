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

async function callAI(
  messages: Array<{ role: string; content: string }>,
  opts: { tools?: unknown[]; tool_choice?: unknown } = {},
) {
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
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
    console.error("AI error:", res.status, text);
    throw new Error("AI request failed. Please try again.");
  }

  return res.json();
}

function hasAIKey() {
  return Boolean(process.env.LOVABLE_API_KEY);
}

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      business: businessSchema,
      contentType: z.enum(["social", "email", "blog"]),
      topic: z.string().min(1).max(1000),
      platform: z.string().max(50).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { business, contentType, topic, platform } = data;

    const formatGuide = {
      social: `a ${platform || "Instagram"} post for a non-profit (caption + 5-10 relevant hashtags). Make it human and emotionally resonant — the goal is to inspire action (donate, volunteer, share, advocate). ${platform === "linkedin" ? "Lean professional and impact-focused." : "Keep it warm, vivid, and scroll-stopping."}`,
      email:
        "a non-profit email — could be a donor appeal, volunteer call-out, supporter update, or newsletter. Include a compelling subject line, a heartfelt opening, the story or update (2-3 short paragraphs), and a clear, specific call-to-action (donate, sign up, share, RSVP).",
      blog: "a non-profit blog post or impact story with a catchy title, a human hook, 3-4 short sections with subheadings (story → impact → how readers can help), and a closing CTA. Aim for ~500-700 words. Use markdown.",
    }[contentType];

    const systemPrompt = `You are a marketing and storytelling writer for "${business.name}", a non-profit organization working in ${business.industry}.

About the organization & mission: ${business.description}
Who they're trying to reach (donors, volunteers, supporters, beneficiaries): ${business.target_audience}
Brand voice: ${business.brand_voice}
${business.location ? `Location / area served: ${business.location}` : ""}
${business.goals ? `Current mission goals: ${business.goals}` : ""}

Write content that sounds genuinely human and mission-driven — never generic AI-speak, never "salesy". Center real people and impact. Match the brand voice precisely. Always include a clear, specific ask (donate, volunteer, share, sign up, advocate) when appropriate.`;

    const userPrompt = `Write ${formatGuide}\n\nTopic / context: ${topic}\n\nReturn ONLY the finished content, no preamble, no "Here's your post" — just the content itself, ready to publish.`;

    const result = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const output = result.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) throw new Error("AI returned an empty response. Please try again.");
    return { output };
  });

const outreachActivitySchema = z.object({
  program: z.string().min(1).max(160),
  audience: z.string().min(1).max(160),
  schedule: z.string().min(1).max(200),
  callToAction: z.string().min(1).max(200),
  photoNote: z.string().max(500).optional(),
});

export type OutreachKit = {
  social_caption: string;
  flyer_copy: string;
  newsletter_blurb: string;
  parent_message: string;
  qr_card_text: string;
  short_description: string;
};

export const generateOutreachKit = createServerFn({ method: "POST" })
  .inputValidator(z.object({ business: businessSchema, activity: outreachActivitySchema }))
  .handler(async ({ data }) => {
    const { business, activity } = data;

    if (!hasAIKey()) {
      const nextStep = activity.callToAction || "Visit the Club this week";
      const audience = activity.audience.toLowerCase();
      const photoLine = activity.photoNote ? ` Photo idea: ${activity.photoNote}.` : "";
      const kit: OutreachKit = {
        social_caption: `${activity.program} is happening ${activity.schedule} at Rainier Valley Boys & Girls Club. If you have ${audience} who could use a safe, welcoming place after school, come see the space, meet the staff, and learn what a first visit can look like. ${nextStep}.`,
        flyer_copy: `${activity.program}\n\nFor ${activity.audience}\n${activity.schedule}\n\nRainier Valley Boys & Girls Club gives kids and teens a safe second home after school with caring staff, activities, homework support, and room to try something new.\n\n${nextStep}. Staff can answer questions and help with signup.`,
        newsletter_blurb: `Rainier Valley Boys & Girls Club is inviting ${activity.audience.toLowerCase()} to try ${activity.program} ${activity.schedule}. Families can stop by, meet staff, see what happens after school, and ask questions before deciding about membership. ${nextStep}.`,
        parent_message: `Hi, Rainier Valley Boys & Girls Club has ${activity.program} ${activity.schedule} for ${activity.audience.toLowerCase()}. Want to stop by, meet staff, and see if it is a good fit?`,
        qr_card_text:
          "Looking for a safe place after school? See what is happening this week at Rainier Valley Club. Scan to plan a visit or ask for signup help.",
        short_description: `${activity.program} gives ${activity.audience.toLowerCase()} a chance to try something engaging after school at Rainier Valley Boys & Girls Club.${photoLine}`,
      };
      return { kit };
    }

    const systemPrompt = `You write practical family outreach for Rainier Valley Boys & Girls Club staff.

Positioning: A safe second home after school, from elementary years through graduation.
Core goal: help local families picture their child at the Club and make the first step feel easy.
Primary CTA style: visit the Club this week before committing.
Secondary CTA style: get help signing up.

Organization context:
Name: ${business.name}
Location / area served: ${business.location || "Rainier Valley, Seattle"}
Mission/context: ${business.description}
Audience: ${business.target_audience}
Voice: clear, warm, local, and low-pressure.

Avoid donor appeals, fundraising language, and generic nonprofit marketing language. Write for parents, guardians, school staff, and trusted community partners.`;

    const userPrompt = `Create a ready-to-share outreach kit for this Club moment.

Program/activity: ${activity.program}
Who it is for: ${activity.audience}
When: ${activity.schedule}
What families should do next: ${activity.callToAction}
${activity.photoNote ? `Photo/context note: ${activity.photoNote}` : ""}

Requirements:
- Social caption: suitable for Instagram and Facebook, short and vivid.
- Flyer copy: headline, short body, and CTA.
- Newsletter blurb: for a school or community partner email.
- Parent message: SMS or WhatsApp length, friendly and direct.
- QR card text: for a small ambassador card, no pressure to enroll.
- Short description: one concise event/program description.
- Mention visit/signup help where useful.
- Return only the function call.`;

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
              name: "submit_outreach_kit",
              description: "Submit a structured outreach kit",
              parameters: {
                type: "object",
                properties: {
                  social_caption: { type: "string" },
                  flyer_copy: { type: "string" },
                  newsletter_blurb: { type: "string" },
                  parent_message: { type: "string" },
                  qr_card_text: { type: "string" },
                  short_description: { type: "string" },
                },
                required: [
                  "social_caption",
                  "flyer_copy",
                  "newsletter_blurb",
                  "parent_message",
                  "qr_card_text",
                  "short_description",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_outreach_kit" } },
      },
    );

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments)
      throw new Error("AI did not return an outreach kit. Please try again.");

    const kit = JSON.parse(toolCall.function.arguments) as OutreachKit;
    return { kit };
  });

export const generateOutreachPlan = createServerFn({ method: "POST" })
  .inputValidator(z.object({ business: businessSchema }))
  .handler(async ({ data }) => {
    const { business } = data;

    if (!hasAIKey()) {
      return {
        plan: {
          intro:
            "This week focuses on making the Club visible through trusted local channels and turning first visits into personal follow-up.",
          strategies: [
            {
              title: "Send this week's activity list to school offices",
              category: "partnership",
              why: "School staff are trusted messengers for families deciding where kids can go after school.",
              steps: [
                "Write a short blurb with three activities happening this week.",
                "Send it to nearby school office staff, counselors, and family liaisons.",
                "Ask them to share the local Club page with families who ask about after-school options.",
              ],
              time_estimate: "30 min",
            },
            {
              title: "Create QR cards for trusted community partners",
              category: "community",
              why: "A low-pressure QR card lets families explore the Club before starting enrollment.",
              steps: [
                "Print or share the QR card text from the outreach generator.",
                "Place cards with libraries, churches, food banks, coaches, and community center staff.",
                "Use the message: Looking for a safe place after school?",
              ],
              time_estimate: "45 min",
            },
            {
              title: "Post one real Club moment",
              category: "content",
              why: "Families need to picture what their child would actually do inside the Club.",
              steps: [
                "Pick one activity from this week such as cooking, basketball, robotics, or homework help.",
                "Use the outreach generator to create a caption and flyer copy.",
                "Point families to the local Club page and invite them to visit this week.",
              ],
              time_estimate: "20 min",
            },
            {
              title: "Follow up with first-time participants",
              category: "direct",
              why: "Kids who already showed up have crossed the hardest barrier.",
              steps: [
                "Add recent first-time participants to the follow-up tracker.",
                "Send the 48-hour message to invite them back this week.",
                "Mark status after each message so no family gets missed.",
              ],
              time_estimate: "30 min",
            },
            {
              title: "Invite current parents and teens to share the page",
              category: "referral",
              why: "Families are more likely to listen to people they already trust.",
              steps: [
                "Ask current parents and teen members to share the Club page with one family.",
                "Give them the QR card message so the ask feels simple.",
                "Track any visit requests that come from referrals.",
              ],
              time_estimate: "25 min",
            },
          ],
        },
      };
    }

    const systemPrompt = `You are an enrollment outreach strategist for a local Boys & Girls Club. You design weekly outreach plans that are concrete, achievable for busy Club staff, and focused on helping families discover the Club, picture their child there, visit before committing, and get signup help. Mix school partnerships, community ambassador QR cards, family-facing content, direct follow-up, low-pressure visit invitations, and trusted local channels. No donor appeals or fundraising tactics.`;

    const userPrompt = `Create this week's outreach plan for:

Organization: ${business.name}
Cause area: ${business.industry}
Mission: ${business.description}
Who they want to reach: ${business.target_audience}
${business.location ? `Location / area served: ${business.location}` : ""}
${business.goals ? `Mission goals this season: ${business.goals}` : ""}

Generate 5 outreach strategies they can act on this week. Mix tactics across school offices, teachers, coaches, community centers, churches, libraries, food banks, current parents, teen members, social posts, printed flyers, WhatsApp/SMS, QR cards, first visits, and follow-up after one-time participation. Each strategy must be specific to THIS Club and focused on visits, family confidence, and supported signup.`;

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
                  intro: {
                    type: "string",
                    description: "1-2 warm sentences introducing this week's focus",
                  },
                  strategies: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short action-oriented title" },
                        category: {
                          type: "string",
                          enum: [
                            "partnership",
                            "community",
                            "content",
                            "direct",
                            "referral",
                            "event",
                          ],
                        },
                        why: { type: "string", description: "1 sentence: why this works for them" },
                        steps: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 2,
                          maxItems: 4,
                          description: "Concrete steps to take",
                        },
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
      },
    );

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments)
      throw new Error("AI did not return a plan. Please try again.");

    const plan = JSON.parse(toolCall.function.arguments);
    return { plan };
  });
