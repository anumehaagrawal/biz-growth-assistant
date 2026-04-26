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

type VerifiedLocalEvent = {
  name: string;
  date: string;
  venue?: string;
  whyFit: string;
  sourceUrl: string;
  sourceLabel: string;
};

type OutreachStrategy = {
  title: string;
  category: "partnership" | "community" | "content" | "direct" | "referral" | "event";
  why: string;
  steps: string[];
  time_estimate: string;
};

type OutreachPlan = {
  intro: string;
  strategies: OutreachStrategy[];
};

const RAINIER_BEACH_EVENTS_URL = "https://rainierbeachcommunityclub.org/events/";
const DEFAULT_RAINIER_BEACH_VENUE = "Rainier Beach Community Club, 6038 S. Pilgrim St, Seattle, WA 98118";
const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "-")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&#8217;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function stripTags(html: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(html.replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, " "))
  );
}

function parseEventTimestamp(dateText: string, now = new Date()): number | null {
  const match = dateText
    .replace(/\*/g, " ")
    .match(/(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);

  if (!match) return null;

  const month = MONTH_INDEX[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = match[3] ? Number(match[3]) : now.getFullYear();
  const timestamp = new Date(year, month, day).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function isUpcomingEvent(dateText: string, now = new Date()): boolean {
  const timestamp = parseEventTimestamp(dateText, now);
  if (!timestamp) return false;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 24 * 60 * 60 * 1000;
  const end = start + 90 * 24 * 60 * 60 * 1000;
  return timestamp >= start && timestamp <= end;
}

function inferRainierBeachVenue(text: string, sourceUrl: string): string | undefined {
  if (/6038\s+S\.?\s+Pilgrim/i.test(text)) return DEFAULT_RAINIER_BEACH_VENUE;
  if (/clubhouse|pilgrim street/i.test(text) && sourceUrl.includes("rainierbeachcommunityclub.org")) {
    return DEFAULT_RAINIER_BEACH_VENUE;
  }
  return undefined;
}

function buildRainierBeachFitReason(name: string, summary: string): string {
  const text = `${name} ${summary}`.toLowerCase();
  if (/movie|talk|lecture|facial recognition|historic/i.test(text)) {
    return "This draws civically engaged neighbors and creates a strong opening for issue education, partner outreach, and volunteer signups.";
  }
  if (/sale|market|stroll|social|jazz|garden|ice cream/i.test(text)) {
    return "This is a neighborhood gathering where the organization can meet Rainier Valley residents face to face and invite them into its programs.";
  }
  return "This is a concrete local gathering the organization can use for in-person outreach, relationship-building, and community visibility.";
}

function parseRainierBeachCommunityClubEvents(html: string): VerifiedLocalEvent[] {
  const events: VerifiedLocalEvent[] = [];
  const matches = html.matchAll(/<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|<\/main>)/gi);

  for (const match of matches) {
    const sourceUrl = match[1]?.trim();
    const name = stripTags(match[2] ?? "");
    const block = match[3] ?? "";
    const date = stripTags(block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? "");

    if (!sourceUrl || !name || !date || !isUpcomingEvent(date)) continue;

    const paragraphs = Array.from(block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), (item) => stripTags(item[1] ?? "")).filter(Boolean);
    const listItems = Array.from(block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi), (item) => stripTags(item[1] ?? "")).filter(Boolean);
    const summary = normalizeWhitespace([...paragraphs, ...listItems].join(" "));
    const venue = inferRainierBeachVenue(summary, sourceUrl);

    events.push({
      name,
      date,
      venue,
      whyFit: buildRainierBeachFitReason(name, summary),
      sourceUrl,
      sourceLabel: "Rainier Beach Community Club",
    });
  }

  return events.sort((a, b) => (parseEventTimestamp(a.date) ?? 0) - (parseEventTimestamp(b.date) ?? 0));
}

async function fetchVerifiedLocalEvents(location: string): Promise<VerifiedLocalEvent[]> {
  const normalizedLocation = location.toLowerCase();

  if (!/(rainier valley|rainier beach|98118)/i.test(normalizedLocation)) {
    return [];
  }

  try {
    const res = await fetch(RAINIER_BEACH_EVENTS_URL);
    if (!res.ok) {
      console.warn(`[fetchVerifiedLocalEvents] Rainier Beach Community Club fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const events = parseRainierBeachCommunityClubEvents(html);
    console.log(`[fetchVerifiedLocalEvents] Parsed ${events.length} verified Rainier Beach events`);
    return events;
  } catch (error) {
    console.error("[fetchVerifiedLocalEvents] Failed to fetch local events:", error);
    return [];
  }
}

function formatVerifiedEvents(events: VerifiedLocalEvent[]): string {
  return events
    .map((event) => {
      const parts = [event.name, event.date, event.venue, event.whyFit, `Source: ${event.sourceUrl}`].filter(Boolean);
      return `- ${parts.join(" — ")}`;
    })
    .join("\n");
}

function countStrategiesUsingEvents(plan: OutreachPlan, eventNames: string[]): number {
  const loweredEventNames = eventNames.map((name) => name.toLowerCase());

  return plan.strategies.filter((strategy) => {
    const haystack = `${strategy.title} ${strategy.why} ${strategy.steps.join(" ")}`.toLowerCase();
    return loweredEventNames.some((eventName) => haystack.includes(eventName));
  }).length;
}

function forcePlanToUseVerifiedEvents(plan: OutreachPlan, events: VerifiedLocalEvent[]): OutreachPlan {
  const nextPlan: OutreachPlan = {
    ...plan,
    strategies: plan.strategies.map((strategy) => ({ ...strategy, steps: [...strategy.steps] })),
  };

  events.slice(0, 2).forEach((event, index) => {
    const strategy = nextPlan.strategies[index];
    if (!strategy) return;

    strategy.title = `Show up at ${event.name}`;
    strategy.category = "event";
    strategy.why = event.whyFit;
    strategy.steps = [
      `Attend or request a tabling/partner presence at ${event.name} (${event.date})${event.venue ? ` at ${event.venue}` : ""}.`,
      "Bring a concise flyer, volunteer sign-up sheet, and a clear invitation into this week's priority program or campaign.",
      `Use the event follow-up to email or text every contact you meet and reference ${event.name} directly so the outreach feels local and personal.`,
      `Coordinate around the verified source listing: ${event.sourceUrl}`,
    ];
    strategy.time_estimate = strategy.time_estimate || "1-2 hours";
  });

  return nextPlan;
}

async function revisePlanToUseEvents(
  plan: OutreachPlan,
  business: z.infer<typeof businessSchema>,
  audience: string,
  liveEventsText: string,
  eventNames: string[]
): Promise<OutreachPlan> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are revising a non-profit outreach plan. Keep the plan practical and specific, but make sure at least 2 of the 5 strategies explicitly reference real event names from the verified local events list. The event name must appear in the strategy title or steps. Do not invent event details beyond what is listed.`,
      },
      {
        role: "user",
        content: `Organization: ${business.name}\nCause area: ${business.industry}\nMission: ${business.description}\nAudience this week: ${audience}\n${business.location ? `Location: ${business.location}\n` : ""}\nVerified local events:\n${liveEventsText}\n\nEvent names that must appear in at least 2 strategies: ${eventNames.join(", ")}\n\nCurrent plan JSON:\n${JSON.stringify(plan, null, 2)}\n\nReturn a revised version of the plan with the same JSON schema and exactly 5 strategies.`,
      },
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
  if (!toolCall?.function?.arguments) {
    throw new Error("AI did not return a revised plan. Please try again.");
  }

  return JSON.parse(toolCall.function.arguments) as OutreachPlan;
}

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
      imageUrl: z.string().url().max(2000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { business, contentType, topic, platform, resources, imageUrl } = data;

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

    const imageInstruction = imageUrl
      ? "\n\nAn image is attached. Look carefully at it and ground the writing in what you can actually see — the people, setting, mood, and details. Weave it naturally into the story."
      : "";

    const userPrompt = `Write ${formatGuide}\n\nTopic / context: ${topic}${imageInstruction}\n\nReturn ONLY the finished content, no preamble, no "Here's your post" — just the content itself, ready to publish.`;

    const userContent: any = imageUrl
      ? [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ]
      : userPrompt;

    const result = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);

    const output = result.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) throw new Error("AI returned an empty response. Please try again.");
    return { output };
  });

// Calls Google Gemini API DIRECTLY (not via Lovable Gateway) so we can use
// the `googleSearch` grounding tool to find real, current local events.
async function searchLocalEvents(location: string, industry: string, mission: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[searchLocalEvents] GOOGLE_AI_API_KEY missing — skipping live event search");
    return "";
  }

  const prompt = `Search the web for community events, public meetings, festivals, markets, fairs, and gatherings happening in or near "${location}" in the next 7-14 days.

Focus on events relevant to a non-profit working on: ${industry}. Mission context: ${mission}.

Look for: neighborhood association meetings, farmers markets, school events, library programs, community center activities, faith community gatherings, parks & rec events, festivals, fairs, public hearings, mutual aid events, cultural celebrations.

For each event found, return on its own line:
- Event name
- Date / time (if known)
- Venue / address (if known)
- Why it might be a fit for this non-profit (1 short sentence)
- Source URL

If nothing concrete is found, return "NO_EVENTS_FOUND" and nothing else. Do NOT invent events.`;

  console.log(`[searchLocalEvents] Searching Gemini for events near "${location}"...`);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[searchLocalEvents] Gemini error ${res.status}:`, body.slice(0, 500));
      return "";
    }
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") ?? "";
    if (!text) {
      console.warn("[searchLocalEvents] Gemini returned no text. finishReason:", json.candidates?.[0]?.finishReason);
      return "";
    }
    if (text.includes("NO_EVENTS_FOUND")) {
      console.log("[searchLocalEvents] Gemini found no concrete events.");
      return "";
    }
    console.log(`[searchLocalEvents] ✓ Got ${text.length} chars of event data`);
    return text.trim();
  } catch (err) {
    console.error("[searchLocalEvents] fetch failed:", err);
    return "";
  }
}

export const generateOutreachPlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      business: businessSchema,
      resources: z.array(resourceSchema).max(20).optional(),
      audience_override: z.string().trim().max(500).optional().nullable(),
      events_to_promote: z.string().trim().max(2000).optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const { business, resources, audience_override, events_to_promote } = data;

    const audience = audience_override?.trim() || business.target_audience;
    const verifiedLocalEvents = business.location ? await fetchVerifiedLocalEvents(business.location) : [];
    const verifiedLocalEventsText = formatVerifiedEvents(verifiedLocalEvents);

    // Step 1: Use Gemini + googleSearch to find real local events happening now.
    const liveEvents = business.location
      ? await searchLocalEvents(business.location, business.industry, business.description)
      : "";
    const combinedLiveEvents = [verifiedLocalEventsText, liveEvents].filter(Boolean).join("\n");

    const systemPrompt = `You are a non-profit outreach and fundraising strategist. You design weekly outreach plans that are concrete, achievable for a busy small non-profit team (often volunteer-run), and tailored to the organization's specific mission, audience, and community.

LOCALITY-FIRST THINKING: When the organization has a location, think hard about the actual civic fabric of that place — the kinds of public schools, parks, community centers, libraries, recreation departments, faith communities, farmers' markets, neighborhood associations, small businesses, and local media (community papers, neighborhood Facebook groups, Nextdoor) that typically exist there. Recommend concrete outreach moves that tap into these venues' public calendars and bulletin boards: school PTA meetings, parks & rec event listings, library community boards, community center activity catalogs, church bulletins, farmers' market tabling, local cafes' flyer walls. Suggest realistic outlets by name when you can infer them from the location and reference materials; otherwise describe the venue type specifically (e.g. "the rec center on the south side" rather than just "a community center"). Never invent the names of specific schools, parks, or businesses you can't verify — describe the venue type instead.

EVENTS & PROGRAMS: When the user provides events or programs they want to publicize, every strategy should help drive awareness, sign-ups, or attendance for those specific events. When no events are provided, infer the org's regular programs from reference materials and build strategies around amplifying those.

LIVE LOCAL EVENTS: When a list of real upcoming community events is provided below (sourced from live web search and verified community calendars), at least 2 of your 5 strategies MUST reference specific events from that list by name — propose tabling, flyering, attending, partnering, or coordinating around them. The event name must appear explicitly in the strategy title or steps. Treat those events as verified facts; do NOT invent dates, venues, or details beyond what's listed.

Mix donor cultivation, volunteer recruitment, community partnerships, storytelling, advocacy, and grassroots tactics. No generic advice. When reference materials are provided, ground every strategy in real programs, partners, audiences, or wins from those materials — never invent statistics, quotes, or program names.${buildResourceSection(resources)}`;

    const userPrompt = `Create this week's outreach plan for:

Organization: ${business.name}
Cause area: ${business.industry}
Mission: ${business.description}
Who they want to reach this week: ${audience}${audience_override?.trim() ? " (user-customized for this plan)" : ""}
${business.location ? `Location / area served: ${business.location} — lean heavily into this locality. Recommend specific local venue types (schools, parks, libraries, community centers, faith groups, small businesses) where the org can post flyers, table at events, present, or partner.` : ""}
${business.goals ? `Mission goals this season: ${business.goals}` : ""}
${events_to_promote?.trim() ? `\nEVENTS / PROGRAMS TO PUBLICIZE THIS WEEK (build strategies around driving attendance & awareness for these):\n${events_to_promote.trim()}` : "\nNo specific events provided — infer the org's regular programs from the reference materials above and build strategies around amplifying those programs."}
${combinedLiveEvents ? `\n=== REAL UPCOMING LOCAL EVENTS (verified community calendars + live web search, fetched just now) ===\n${combinedLiveEvents}\n=== END LIVE EVENTS ===\n\nAt least 2 strategies MUST be built around specific events from the list above — name the event explicitly in the strategy title or steps.` : ""}

Generate 5 outreach strategies they can act on this week. At least 2 strategies must reference concrete local venue types in the org's locality (schools, parks & rec, libraries, community centers, faith communities, neighborhood groups, local media)${combinedLiveEvents ? ", and at least 2 must explicitly reference the real upcoming events listed above by name" : ""}. Mix tactics across donor outreach, volunteer recruitment, community partnerships, storytelling/content, events, advocacy, and supporter referrals. Each strategy must be specific to THIS organization — reference their cause, audience, mission goals, location, and the events/programs above.`;

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

    let plan = JSON.parse(toolCall.function.arguments) as OutreachPlan;

    if (verifiedLocalEvents.length >= 2) {
      const verifiedEventNames = verifiedLocalEvents.slice(0, 4).map((event) => event.name);
      const referencedEventCount = countStrategiesUsingEvents(plan, verifiedEventNames);

      if (referencedEventCount < 2) {
        console.warn(`[generateOutreachPlan] Only ${referencedEventCount} strategies referenced verified local events; revising plan.`);
        plan = await revisePlanToUseEvents(
          plan,
          business,
          audience,
          verifiedLocalEventsText,
          verifiedEventNames,
        );

        if (countStrategiesUsingEvents(plan, verifiedEventNames) < 2) {
          console.warn("[generateOutreachPlan] Revision still missed verified events; forcing fallback event strategies.");
          plan = forcePlanToUseVerifiedEvents(plan, verifiedLocalEvents);
        }
      }
    }

    return { plan };
  });

// ----- Post caption generation (multimodal for images) -----

export const generatePostCaption = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      business: businessSchema,
      mediaUrl: z.string().url().max(2000),
      mediaType: z.enum(["image", "video"]),
      brief: z.string().max(1000).optional().default(""),
      platform: z.enum(["instagram", "facebook", "linkedin"]).default("instagram"),
      resources: z.array(resourceSchema).max(20).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { business, mediaUrl, mediaType, brief, platform, resources } = data;

    const platformGuide: Record<string, string> = {
      instagram: "Instagram post: warm, vivid, scroll-stopping. 1-3 short paragraphs, line breaks for rhythm, end with a clear CTA, then 5-10 relevant hashtags on a new line.",
      facebook: "Facebook post: conversational, story-led, slightly longer. Plain text with a clear CTA. 1-3 light hashtags max.",
      linkedin: "LinkedIn post: professional and impact-focused. Lead with a strong hook, share the story/impact, end with a clear CTA. 3-5 relevant hashtags.",
    };

    const systemPrompt = `You are a social media writer for "${business.name}", a non-profit working in ${business.industry}.

Mission: ${business.description}
Audience: ${business.target_audience}
Brand voice: ${business.brand_voice}
${business.location ? `Location: ${business.location}` : ""}
${business.goals ? `Current goals: ${business.goals}` : ""}

Write captions that sound genuinely human and mission-driven. Center real people and impact. Match the brand voice precisely. Always include a clear, specific ask.${buildResourceSection(resources)}`;

    const userInstruction = mediaType === "image"
      ? `Look carefully at the attached image and write a ${platformGuide[platform]}\n\nUser brief / context: ${brief || "(none — base it entirely on what you see in the image and the organization's mission)"}\n\nGround the caption in what is visibly happening in the image. Return ONLY the finished caption, no preamble.`
      : `Write a ${platformGuide[platform]}\n\nThe post is a video. User brief / context: ${brief || "(no brief provided)"}\n\nReturn ONLY the finished caption, no preamble.`;

    // Build multimodal user message for images
    const userContent: any = mediaType === "image"
      ? [
          { type: "text", text: userInstruction },
          { type: "image_url", image_url: { url: mediaUrl } },
        ]
      : userInstruction;

    const result = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);

    const caption = result.choices?.[0]?.message?.content?.trim() ?? "";
    if (!caption) throw new Error("AI returned an empty caption. Please try again.");
    return { caption };
  });
