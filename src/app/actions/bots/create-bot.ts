// src/app/actions/bots/create-bot.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { logUserActivity } from "@/app/actions/activity/log-user-activity";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  ensureQuotaAllows,
  getTeamPlanDetails,
  incrementOpenAiApiCallCount,
  isTeamEvaluationExpired,
} from "@/lib/teams/usage";
import { importFromUrl } from "@/app/actions/documents/import-from-url";
import { checkDocumentContent } from "@/lib/middleware/moderation";
import { ingestDocument } from "@/lib/documents/ingest-document";

type BotStatus = "active" | "draft" | "archived";

interface CreateBotInput {
  description: string;
  tone?: string;
  website?: string;
  useRootBacklink?: boolean;
  supportEmail?: string;
  supportUrl?: string;
  supportPhone?: string;
}

interface GeneratedBotPlan {
  name?: string;
  slug?: string;
  description?: string;
  systemPrompt?: string;
  defaultResponse?: string;
  cannedResponses?: Record<string, string>;
  backLinkText?: string;
}

type CannedResponseKey =
  | "greeting"
  | "capabilities"
  | "identity"
  | "about"
  | "contact"
  | "offTopic"
  | "humanRequest"
  | "humanTakeoverOn"
  | "humanTakeoverOff";

interface CannedResponseTemplate {
  key: CannedResponseKey;
  pattern: string;
  patternType?: "regex" | "keyword" | "exact";
  priority: number;
  action?: "human_request" | "human_takeover_on" | "human_takeover_off";
  actionConfig?: Record<string, unknown>;
  defaultResponse: (context: {
    name: string;
    summary: string;
    tone: string;
    supportEmail?: string;
    supportUrl?: string;
    supportPhone?: string;
  }) => string;
}

const CANNED_RESPONSE_TEMPLATES: CannedResponseTemplate[] = [
  {
    key: "greeting",
    pattern: "^(hi|hello|hey)[!. ]*$",
    patternType: "regex",
    priority: 100,
    defaultResponse: ({ name, summary, tone }) =>
      `Hi there! I'm ${name}, here to help. Ask me anything about ${summary}. I'll keep responses ${tone}.`,
  },
  {
    key: "capabilities",
    pattern: "^(what (can|do) you do|how does this work|help)(\\b|[?.! ]*$)",
    patternType: "regex",
    priority: 90,
    defaultResponse: ({ summary, tone }) =>
      `I can answer questions, summarize information, and guide you through topics related to ${summary}. Let me know what you're trying to do and I'll keep things ${tone}.`,
  },
  {
    key: "identity",
    pattern: "^(who are you|are you (a )?bot|are you human|what are you)(\\b|[?.! ]*$)",
    patternType: "regex",
    priority: 80,
    defaultResponse: ({ name, summary }) =>
      `I'm ${name}, an AI assistant trained on details about ${summary}. I'm here to keep answers fast and useful.`,
  },
  {
    key: "about",
    pattern: "^(what is this|about (this|the )?(site|company)?)(\\b|[?.! ]*$)",
    patternType: "regex",
    priority: 70,
    defaultResponse: ({ summary }) =>
      `I'm here to answer questions about ${summary}. Ask about products, services, or anything else you see on the site.`,
  },
  {
    key: "contact",
    pattern: "^(contact|support|customer service)(\\b|[?.! ]*$)|\\b(email|phone|call|reach you)\\b",
    patternType: "regex",
    priority: 60,
    defaultResponse: ({ supportEmail, supportUrl, supportPhone }) => {
      const contactMethods: string[] = [];
      if (supportEmail) contactMethods.push(`email us at ${supportEmail}`);
      if (supportPhone) contactMethods.push(`call us at ${supportPhone}`);
      if (supportUrl)
        contactMethods.push(`visit our contact page at ${supportUrl}`);

      if (contactMethods.length > 0) {
        const methodsText =
          contactMethods.length === 1
            ? contactMethods[0]
            : contactMethods.length === 2
            ? `${contactMethods[0]} or ${contactMethods[1]}`
            : `${contactMethods.slice(0, -1).join(", ")}, or ${
                contactMethods[contactMethods.length - 1]
              }`;
        return `For support, you can ${methodsText}. What kind of help do you need?`;
      }
      return "I can share the best way to get in touch based on the site details. What kind of help do you need?";
    },
  },
  {
    key: "offTopic",
    pattern: "^(tell me a joke|joke|weather|random|funny)(\\b|[?.! ]*$)",
    patternType: "regex",
    priority: 50,
    defaultResponse: ({ summary }) =>
      `I'm focused on helping with questions about ${summary}. Ask me something specific and I'll do my best to help.`,
  },
  {
    key: "humanRequest",
    pattern: "human|talk to (a )?human|human agent|customer service rep|customer service representative|speak to (a )?human",
    patternType: "keyword",
    priority: 110,
    action: "human_request",
    defaultResponse: () =>
      "Do you want to talk to a customer service representative? If so, please type human. If you want to talk to me again, simply type bot.",
  },
  {
    key: "humanTakeoverOn",
    pattern: "human",
    patternType: "exact",
    priority: 120,
    action: "human_takeover_on",
    actionConfig: { takeover_hours: 15 },
    defaultResponse: () =>
      "Thanks. A human will take it from here. If you want me back, just type bot.",
  },
  {
    key: "humanTakeoverOff",
    pattern: "bot",
    patternType: "exact",
    priority: 119,
    action: "human_takeover_off",
    defaultResponse: () => "I'm back. How can I help?",
  },
];

const MAX_DESCRIPTION_WORDS = 400;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function summarizeForContext(text: string, maxLength = 220) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned || "this bot";
  const truncated = cleaned.slice(0, maxLength);
  return `${truncated.slice(0, truncated.lastIndexOf(" ")).trim()}...`;
}

function buildFallbackPlan(input: CreateBotInput): Required<GeneratedBotPlan> {
  const cleanedDescription = input.description.trim();
  const defaultTone = input.tone?.trim() || "friendly and concise";
  const nameSeed =
    cleanedDescription.split(/\s+/).slice(0, 4).join(" ") || "New Bot";

  const name = `${nameSeed} Assistant`.trim();
  const slug = slugify(name) || `assistant-${Date.now()}`;
  const summary = summarizeForContext(cleanedDescription, 180);

  // Build support contact info for system prompt
  const supportInfo: string[] = [];
  if (input.supportEmail) supportInfo.push(`Email: ${input.supportEmail}`);
  if (input.supportPhone) supportInfo.push(`Phone: ${input.supportPhone}`);
  if (input.supportUrl) supportInfo.push(`Contact page: ${input.supportUrl}`);

  const supportSection =
    supportInfo.length > 0
      ? ` For support inquiries, direct users to: ${supportInfo.join(", ")}.`
      : "";

  const basePrompt = `You are ${name}, an AI guide. Keep answers ${defaultTone}, use the provided documents or site context when available, avoid making up facts, and ask clarifying questions if the user request is vague.${supportSection}`;

  return {
    name,
    slug,
    description: summary,
    systemPrompt: basePrompt,
    defaultResponse: "",
    cannedResponses: {},
    backLinkText: input.website ? "Back to site" : "",
  };
}

function getRootDomain(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

function buildFallbackDefaultResponse(
  summary: string,
  backlink?: string | null
) {
  const linkPart = backlink
    ? ` You can also explore the resources at ${backlink}.`
    : "";
  return `I'm currently unable to respond to this type of question, but I still want to help. Ask a specific, relevant question about ${summary} and I'll pick it up as soon as I'm back.${linkPart}`.trim();
}

async function generateBotPlan(
  input: CreateBotInput,
  websiteContext?: { url?: string; title?: string; contentPreview?: string }
): Promise<GeneratedBotPlan | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const tone = input.tone?.trim() || "friendly and concise";
  const brief = input.description.trim();
  const contentPreview =
    websiteContext?.contentPreview?.slice(0, 2600) ??
    websiteContext?.contentPreview;

  // Build support contact info for prompt
  const supportInfo: Record<string, string> = {};
  if (input.supportEmail) supportInfo.email = input.supportEmail;
  if (input.supportPhone) supportInfo.phone = input.supportPhone;
  if (input.supportUrl) supportInfo.contactPage = input.supportUrl;

  const messages = [
    {
      role: "system",
      content:
        "You design chatbots. Given a short brief, return a compact JSON object with the fields: name, slug, description, systemPrompt, defaultResponse, cannedResponses (object with keys greeting, capabilities, identity, about, contact, offTopic), and backLinkText. Slug must be lowercase kebab-case. Keep description to two sentences. System prompt should instruct the bot to stay on topic, use provided sources, and keep the requested tone. If support contact information is provided, include it in the system prompt and contact canned response.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          brief,
          tone,
          website: websiteContext?.url ?? null,
          websiteTitle: websiteContext?.title ?? null,
          websiteContentPreview: contentPreview ?? null,
          supportContact:
            Object.keys(supportInfo).length > 0 ? supportInfo : null,
        },
        null,
        2
      ),
    },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 600,
        messages,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("Bot plan generation failed", message);
      return null;
    }

    const completion = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as GeneratedBotPlan;
    return parsed;
  } catch (error) {
    console.error("Failed to generate bot plan", error);
    return null;
  }
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string
) {
  const cleanedBase = slugify(base) || "assistant";
  let slug = cleanedBase;
  let suffix = 1;

  while (true) {
    const { data } = await supabase
      .from("bot_bots")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${cleanedBase}-${++suffix}`;
  }

  return slug;
}

function buildCannedResponses(
  botId: string,
  teamId: string,
  plan: GeneratedBotPlan,
  fallbackContext: {
    name: string;
    summary: string;
    tone: string;
    supportEmail?: string;
    supportUrl?: string;
    supportPhone?: string;
  }
) {
  return CANNED_RESPONSE_TEMPLATES.map((template) => ({
    bot_id: botId,
    team_id: teamId,
    pattern: template.pattern,
    pattern_type: template.patternType ?? "keyword",
    response:
      plan.cannedResponses?.[template.key] ||
      template.defaultResponse(fallbackContext),
    action: template.action ?? null,
    action_config: template.actionConfig ?? null,
    case_sensitive: false,
    fuzzy_threshold: 0,
    priority: template.priority,
    // Enable all by default except off-topic
    enabled: template.key !== "offTopic",
  }));
}

export async function createBot(input: CreateBotInput) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const cleanDescription = input.description.trim();
  if (!cleanDescription) {
    return { success: false, error: "Please provide a short description." };
  }

  const wordCount = cleanDescription.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_DESCRIPTION_WORDS) {
    return {
      success: false,
      error: `Keep the description under ${MAX_DESCRIPTION_WORDS} words.`,
    };
  }

  // Get user's team_id (required for RLS)
  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error:
        "No team found. Please contact support or wait for team creation to complete.",
    };
  }

  const planDetails = await getTeamPlanDetails(teamId);
  const plan = planDetails.plan;

  if (isTeamEvaluationExpired(planDetails)) {
    return {
      success: false,
      error: "Evaluation period ended. Upgrade to create additional bots.",
    };
  }

  // Enforce bot count limits by plan
  const planBotLimits: Record<string, number | null> = {
    free: 1,
    pro: 3,
    team: 10,
    enterprise: null,
    admin: null,
  };
  const limit = planBotLimits[plan] ?? null;
  if (limit !== null) {
    const { count: botCount } = await supabase
      .from("bot_bots")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    if ((botCount ?? 0) >= limit) {
      return {
        success: false,
        error:
          limit === 1
            ? "The Evaluation plan includes 1 chatbot. Upgrade to create more."
            : `This plan supports up to ${limit} chatbots. Contact support to increase your limit.`,
      };
    }
  }

  // Try to pull website content for better grounding (best effort)
  const providedWebsite = input.website?.trim();
  let importedWebsite:
    | { url?: string; title?: string; contentPreview?: string }
    | undefined;
  if (providedWebsite) {
    const result = await importFromUrl(providedWebsite);
    if (result.success && result.content) {
      importedWebsite = {
        url: providedWebsite,
        title: result.title,
        contentPreview: result.content,
      };
    }
  }

  const fallbackPlan = buildFallbackPlan(input);
  const generatedPlan =
    (await generateBotPlan(input, importedWebsite)) ?? fallbackPlan;

  if (generatedPlan !== fallbackPlan) {
    // Track AI usage for quota awareness
    await incrementOpenAiApiCallCount(teamId, plan).catch((error) => {
      console.error("Failed to record OpenAI usage", error);
    });
  }

  const name = generatedPlan.name?.trim() || fallbackPlan.name;
  const slugBase = generatedPlan.slug?.trim() || name;
  const slug = await ensureUniqueSlug(supabase, slugBase);
  const description =
    generatedPlan.description?.trim() || fallbackPlan.description;
  const systemPrompt =
    generatedPlan.systemPrompt?.trim() || fallbackPlan.systemPrompt;
  const backlinkUrlCandidate = input.useRootBacklink
    ? getRootDomain(providedWebsite) || importedWebsite?.url
    : importedWebsite?.url ?? providedWebsite ?? null;
  const defaultResponse = buildFallbackDefaultResponse(
    summarizeForContext(description, 140),
    backlinkUrlCandidate
  );
  const backLinkUrl = backlinkUrlCandidate ?? null;
  const backLinkText =
    generatedPlan.backLinkText?.trim() ||
    fallbackPlan.backLinkText ||
    (backLinkUrl ? "Back to site" : null);

  const { data: existing } = await supabase
    .from("bot_bots")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Slug already exists. Please try again." };
  }

  const status: BotStatus = "active";

  const { data: created, error } = await supabase
    .from("bot_bots")
    .insert({
      name,
      description,
      slug,
      system_prompt: systemPrompt,
      default_response: defaultResponse,
      is_public: true,
      status,
      // Color customization defaults
      primary_color: null,
      secondary_color: null,
      color_background: null,
      color_container_background: null,
      color_text: null,
      color_border: null,
      color_message_user: null,
      color_message_assistant: null,
      // Navigation
      back_link_url: backLinkUrl,
      back_link_text: backLinkText,
      // Formatting
      rich_responses_enabled: false,
      user_id: user.id,
      team_id: teamId, // Required for RLS
    })
    .select("id, slug")
    .single();

  if (error || !created) {
    return { success: false, error: error?.message || "Failed to create bot" };
  }

  const cannedResponses = buildCannedResponses(
    created.id,
    teamId,
    generatedPlan,
    {
      name,
      summary: summarizeForContext(description, 140),
      tone: input.tone?.trim() || "friendly and concise",
      supportEmail: input.supportEmail,
      supportUrl: input.supportUrl,
      supportPhone: input.supportPhone,
    }
  );

  const { error: cannedError } = await supabase
    .from("bot_canned_responses")
    .insert(cannedResponses);

  if (cannedError) {
    // Best-effort cleanup so bots aren't created without defaults
    await supabase.from("bot_bots").delete().eq("id", created.id);
    return {
      success: false,
      error:
        "Bot creation failed while adding tailored responses. Please try again.",
    };
  }

  // Best-effort: create a document from the provided website for immediate grounding
  if (importedWebsite?.contentPreview) {
    try {
      await ensureQuotaAllows(teamId, plan, "documents", 1);
      const isFlagged = await checkDocumentContent(
        importedWebsite.contentPreview,
        {
          userId: user.id,
          teamId,
          botId: created.id,
          ipAddress: undefined,
          userAgent: undefined,
        }
      );

      const { data: document, error: docError } = await supabase
        .from("bot_documents")
        .insert({
          title: importedWebsite.title || "Website Import",
          content: importedWebsite.contentPreview,
          tags: ["website"],
          is_global: false,
          canonical_url: importedWebsite.url || null,
          user_id: user.id,
          team_id: teamId,
          is_flagged: isFlagged,
        })
        .select("id")
        .single();

      if (!docError && document) {
        await supabase
          .from("bot_document_links")
          .insert([{ document_id: document.id, bot_id: created.id }]);

        await ingestDocument({
          supabase,
          documentId: document.id,
          teamId,
          content: importedWebsite.contentPreview,
          plan,
        });
      }
    } catch (docError) {
      console.error("Failed to create website document for bot", docError);
    }
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: created?.id ?? null,
    metadata: {
      name,
      slug: created.slug,
      visibility: "public",
      status,
    },
  });

  await logUserActivity({
    userId: user.id,
    type: "bot_created",
    message: `Created bot ${name}`,
    metadata: { bot_id: created?.id ?? null, bot_slug: slug },
  });

  // Check if this is the user's first bot and send setup guide email
  const { count: botCount } = await supabase
    .from("bot_bots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (botCount === 1 && user.email) {
    // Get user profile for name
    const { data: profile } = await supabase
      .from("bot_user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Send setup guide email (don't await to avoid blocking)
    import("@/lib/email/send-setup-guide-email")
      .then(({ sendSetupGuideEmail }) =>
        sendSetupGuideEmail({
          email: user.email!,
          userName: profile?.full_name || undefined,
          botName: name,
        })
      )
      .catch((error) => {
        console.error("Failed to send setup guide email:", error);
        // Don't fail bot creation if email fails
      });
  }

  return { success: true, slug: created.slug, botId: created.id };
}
