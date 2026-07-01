import { createServiceClient } from "@/lib/supabase";
import {
  PROJECT_STATUSES,
  ROADMAP_ITEM_PRIORITIES,
  TIMELINE_EVENT_TYPES,
  parseRoadmap,
  type Project,
  type ProjectStatus,
  type RoadmapItem,
  type RoadmapItemPriority,
  type RoadmapItemStatus,
  type TimelineEventType,
} from "@/types/project";

const TELEGRAM_API = "https://api.telegram.org";

type WizardData = {
  name?: string;
  tagline?: string;
  status?: ProjectStatus;
  project_id?: string;
  is_private?: boolean;
  is_company?: boolean;
};

type TelegramSession = {
  chat_id: number;
  step: string;
  data: WizardData;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `Sei l'assistente personale di Marco, solopreneur italiano che gestisce più side project.
Hai accesso al suo dashboard progetti tramite tool e puoi leggere e aggiornare dati in tempo reale.

I tuoi compiti:
- Rispondere a domande libere sui progetti ("come va OpFanta?", "qual è il MRR totale?")
- Aggiornare campi quando Marco te lo chiede ("setta il revenue di OpFanta a 49 euro")
- Salvare idee veloci quando Marco ti lancia uno spunto
- Aggiungere eventi timeline o roadmap item
- Creare o eliminare progetti

Regole:
- Rispondi SEMPRE in italiano
- Sii conciso e diretto, sei su Telegram (no markdown eccessivo, no asterischi)
- Se Marco dice "idea: [testo]" o "spunto: [testo]" o "ho visto su Instagram che...", usa save_idea
- Per eliminare un progetto, chiedi SEMPRE conferma prima di chiamare delete_project
- Se non capisci a quale progetto si riferisce, chiedi con una domanda corta
- Date in formato italiano (es. "1 luglio 2026") convertile in YYYY-MM-DD prima di passarle ai tool
- Se Marco chiede "cosa puoi fare?" descrivi le capacità in linguaggio naturale, non lista comandi
`;

const TOOLS = [
  {
    name: "list_projects",
    description:
      "Restituisce tutti i progetti con id, nome, status, MRR, utenti",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_project",
    description: "Dettaglio completo di un singolo progetto",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: {
          type: "string",
          description: "Prime 4-8 lettere dell'id UUID",
        },
      },
      required: ["id_prefix"],
    },
  },
  {
    name: "update_project",
    description:
      "Aggiorna un campo di un progetto. field può essere: status, revenue, mrr, mrr_goal, mrr_prev, launch_date, idea_date, build_start_date, users_count, next_milestone, private_notes, is_private, is_company, url_site, url_repo, url_substack",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
        field: { type: "string" },
        value: {
          type: "string",
          description: "Il valore come stringa — sarà parsato internamente",
        },
      },
      required: ["id_prefix", "field", "value"],
    },
  },
  {
    name: "create_project",
    description: "Crea un nuovo progetto",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string", description: "Max 80 caratteri" },
        status: {
          type: "string",
          description: "idea | building | beta | live | paused | dead",
        },
        url_site: { type: "string", description: "Opzionale" },
      },
      required: ["name", "tagline", "status"],
    },
  },
  {
    name: "delete_project",
    description:
      "Elimina un progetto. Usare SOLO dopo conferma esplicita dell'utente.",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
      },
      required: ["id_prefix"],
    },
  },
  {
    name: "save_idea",
    description: "Salva un'idea o spunto veloce nella tabella ideas",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string", description: "Testo o dettaglio dell'idea" },
        source: {
          type: "string",
          description: "Opzionale: instagram, x, manuale, etc.",
        },
        project_id_prefix: {
          type: "string",
          description: "Opzionale: collega a un progetto esistente",
        },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "list_ideas",
    description: "Legge le idee salvate",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Opzionale: bozza | sviluppata | scartata. Se omesso mostra tutte.",
        },
      },
    },
  },
  {
    name: "add_timeline_event",
    description: "Aggiunge un evento alla timeline di un progetto",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
        type: {
          type: "string",
          description: "Uno dei tipi validi (es. launch, milestone, update)",
        },
        date: { type: "string", description: "YYYY-MM-DD" },
        title: { type: "string" },
      },
      required: ["id_prefix", "type", "date", "title"],
    },
  },
  {
    name: "list_timeline",
    description: "Lista eventi timeline di un progetto",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
      },
      required: ["id_prefix"],
    },
  },
  {
    name: "add_roadmap_item",
    description: "Aggiunge un item alla roadmap di un progetto",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
        priority: { type: "string", description: "high | medium | low" },
        title: { type: "string" },
      },
      required: ["id_prefix", "priority", "title"],
    },
  },
  {
    name: "update_roadmap_item",
    description: "Cambia lo status di un item roadmap",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string", description: "ID del progetto" },
        item_id_prefix: {
          type: "string",
          description: "ID parziale dell'item roadmap",
        },
        status: { type: "string", description: "todo | in_progress | done" },
      },
      required: ["id_prefix", "item_id_prefix", "status"],
    },
  },
  {
    name: "list_roadmap",
    description: "Lista roadmap di un progetto",
    input_schema: {
      type: "object",
      properties: {
        id_prefix: { type: "string" },
      },
      required: ["id_prefix"],
    },
  },
];

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: { text: string; callback_data: string }[][] }
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    console.error("Telegram sendMessage failed:", responseBody);
  }
}

async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  const res = await fetch(
    `${TELEGRAM_API}/bot${token}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    }
  );

  if (!res.ok) {
    const responseBody = await res.text();
    console.error("Telegram answerCallbackQuery failed:", responseBody);
  }
}

function isAllowedUser(userId: number): boolean {
  const allowed = process.env.ALLOWED_TELEGRAM_USER_ID;
  if (!allowed) return false;
  return String(userId) === allowed;
}

/** Parse MRR from bot input — accepts decimals with dot (e.g. "4.90"). */
function parseMrr(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) return null;

  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100) / 100;
}

function formatMrr(value: number): string {
  return value.toFixed(2);
}

function parseLaunchDate(raw: string): string | null {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return value;
}

function parseYesNo(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (["sì", "si", "s", "yes", "y", "true", "1"].includes(value)) return true;
  if (["no", "n", "false", "0"].includes(value)) return false;
  return null;
}

async function findProjectByIdPrefix(prefix: string): Promise<Project | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const matches = (data as Project[]).filter((p) =>
    p.id.toLowerCase().startsWith(prefix.toLowerCase())
  );

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `ID ambiguo "${prefix}" — corrisponde a ${matches.length} progetti. Usa più caratteri.`
    );
  }

  return matches[0];
}

async function getSession(chatId: number): Promise<TelegramSession | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("telegram_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return data as TelegramSession | null;
}

async function setSession(
  chatId: number,
  step: string,
  data: WizardData
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("telegram_sessions").upsert({
    chat_id: chatId,
    step,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function clearSession(chatId: number): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("telegram_sessions").delete().eq("chat_id", chatId);
}

async function getConversationHistory(
  chatId: number
): Promise<ConversationMessage[]> {
  const session = await getSession(chatId);
  if (!session || session.step !== "conversation") return [];
  return (
    (session.data as unknown as { messages: ConversationMessage[] }).messages ??
    []
  );
}

async function saveConversationHistory(
  chatId: number,
  messages: ConversationMessage[]
): Promise<void> {
  const trimmed = messages.slice(-20);
  await setSession(chatId, "conversation", {
    messages: trimmed,
  } as unknown as WizardData);
}

function getProjectRoadmap(project: Project): RoadmapItem[] {
  return parseRoadmap((project as unknown as Record<string, unknown>).roadmap);
}

function findRoadmapItemByPrefix(
  items: RoadmapItem[],
  prefix: string
): RoadmapItem | null {
  const matches = items.filter((item) =>
    item.id.toLowerCase().startsWith(prefix.toLowerCase())
  );

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `ID roadmap ambiguo "${prefix}" — corrisponde a ${matches.length} item. Usa più caratteri.`
    );
  }

  return matches[0];
}

async function saveProjectRoadmap(
  projectId: string,
  roadmap: RoadmapItem[]
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("projects")
    .update({ roadmap })
    .eq("id", projectId);

  if (error) throw error;
}

function normalizeProjectStatus(raw: string): ProjectStatus | null {
  const value = raw.trim().toLowerCase();
  if (value === "dead") return "archived";
  if (PROJECT_STATUSES.includes(value as ProjectStatus)) {
    return value as ProjectStatus;
  }
  return null;
}

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  _chatId: number
): Promise<unknown> {
  const supabase = createServiceClient();

  switch (toolName) {
    case "list_projects": {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, total_revenue, mrr, users_count")
        .order("order_index", { ascending: true });

      if (error) throw error;

      return (data ?? []).map(
        (p: {
          id: string;
          name: string;
          status: string;
          total_revenue: number;
          mrr: number;
          users_count: number;
        }) => ({
          id: p.id.slice(0, 8),
          name: p.name,
          status: p.status,
          total_revenue: p.total_revenue,
          mrr: p.mrr,
          users_count: p.users_count,
        })
      );
    }

    case "get_project": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }
      return project;
    }

    case "update_project": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const field = String(toolInput.field ?? "").toLowerCase();
      const value = String(toolInput.value ?? "");

      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      const fieldAliases: Record<string, string> = {
        revenue: "total_revenue",
        goal: "mrr_goal",
        prevmrr: "mrr_prev",
        launch: "launch_date",
        idea: "idea_date",
        buildstart: "build_start_date",
        users: "users_count",
        milestone: "next_milestone",
        notes: "private_notes",
        private: "is_private",
        company: "is_company",
      };

      const dbField = fieldAliases[field] ?? field;
      let update: Record<string, unknown> = {};

      switch (dbField) {
        case "status": {
          const status = normalizeProjectStatus(value);
          if (!status) {
            throw new Error(
              `Status non valido. Valori: ${PROJECT_STATUSES.join(", ")}`
            );
          }
          update = { status };
          break;
        }
        case "total_revenue":
        case "mrr":
        case "mrr_goal":
        case "mrr_prev": {
          const parsed = parseMrr(value);
          if (parsed === null) {
            throw new Error(
              "Valore numerico non valido. Usa un numero ≥ 0 con punto decimale (es. 49.00)."
            );
          }
          update = { [dbField]: parsed };
          break;
        }
        case "launch_date":
        case "idea_date":
        case "build_start_date": {
          const parsed = parseLaunchDate(value);
          if (!parsed) {
            throw new Error(
              "Data non valida. Usa il formato YYYY-MM-DD (es. 2024-09-01)."
            );
          }
          update = { [dbField]: parsed };
          break;
        }
        case "users_count": {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed) || parsed < 0) {
            throw new Error("Utenti deve essere un numero intero ≥ 0.");
          }
          update = { users_count: parsed };
          break;
        }
        case "next_milestone": {
          const text = value.trim();
          if (!text) throw new Error("Specifica il testo della milestone.");
          update = { next_milestone: text };
          break;
        }
        case "private_notes": {
          update = { private_notes: value.trim() || null };
          break;
        }
        case "is_private":
        case "is_company": {
          const parsed = parseYesNo(value);
          if (parsed === null) {
            throw new Error('Valore booleano non valido. Usa "true" o "false".');
          }
          update = { [dbField]: parsed };
          break;
        }
        case "url_site":
        case "url_repo":
        case "url_substack": {
          update = { [dbField]: value.trim() || null };
          break;
        }
        default:
          throw new Error(
            "Campo non riconosciuto. Usa: status, revenue, mrr, mrr_goal, mrr_prev, launch_date, idea_date, build_start_date, users_count, next_milestone, private_notes, is_private, is_company, url_site, url_repo, url_substack."
          );
      }

      const { data: updated, error } = await supabase
        .from("projects")
        .update(update)
        .eq("id", project.id)
        .select("id, name")
        .single();

      if (error) throw error;

      return {
        success: true,
        project: updated.name,
        id: updated.id.slice(0, 8),
        field: dbField,
        update,
      };
    }

    case "create_project": {
      const name = String(toolInput.name ?? "").trim();
      const tagline = String(toolInput.tagline ?? "").trim();
      const status = normalizeProjectStatus(String(toolInput.status ?? ""));
      const urlSiteRaw = toolInput.url_site
        ? String(toolInput.url_site).trim()
        : "";

      if (!name) throw new Error("Il nome non può essere vuoto.");
      if (!tagline) throw new Error("La tagline non può essere vuota.");
      if (tagline.length > 80) {
        throw new Error(
          `Tagline troppo lunga (${tagline.length}/80). Accorciala.`
        );
      }
      if (!status) {
        throw new Error(
          `Status non valido. Valori: ${PROJECT_STATUSES.join(", ")}`
        );
      }

      const { data: maxOrder } = await supabase
        .from("projects")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      const orderIndex = (maxOrder?.order_index ?? 0) + 1;

      const { data: created, error } = await supabase
        .from("projects")
        .insert({
          name,
          tagline,
          status,
          url_site: urlSiteRaw || null,
          order_index: orderIndex,
        })
        .select("id, name, status")
        .single();

      if (error) throw error;

      return {
        id: created.id.slice(0, 8),
        name: created.name,
        status: created.status,
      };
    }

    case "delete_project": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      return { deleted: true, name: project.name, id: project.id.slice(0, 8) };
    }

    case "save_idea": {
      const title = String(toolInput.title ?? "").trim();
      const body = String(toolInput.body ?? "").trim();
      const source = toolInput.source
        ? String(toolInput.source).trim()
        : null;

      if (!title) throw new Error("Il titolo non può essere vuoto.");
      if (!body) throw new Error("Il corpo dell'idea non può essere vuoto.");

      let projectId: string | null = null;
      if (toolInput.project_id_prefix) {
        const project = await findProjectByIdPrefix(
          String(toolInput.project_id_prefix)
        );
        if (!project) {
          throw new Error(
            `Progetto non trovato per id "${toolInput.project_id_prefix}".`
          );
        }
        projectId = project.id;
      }

      const { data: created, error } = await supabase
        .from("ideas")
        .insert({
          title,
          body,
          source,
          project_id: projectId,
        })
        .select("id, title, created_at")
        .single();

      if (error) throw error;

      return created;
    }

    case "list_ideas": {
      let query = supabase
        .from("ideas")
        .select("id, title, body, source, status, project_id, created_at")
        .order("created_at", { ascending: false });

      if (toolInput.status) {
        query = query.eq("status", String(toolInput.status));
      }

      const { data, error } = await query;
      if (error) throw error;

      return data ?? [];
    }

    case "add_timeline_event": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const type = String(toolInput.type ?? "");
      const date = String(toolInput.date ?? "");
      const title = String(toolInput.title ?? "").trim();

      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      if (!TIMELINE_EVENT_TYPES.includes(type as TimelineEventType)) {
        throw new Error(
          `Tipo non valido. Valori: ${TIMELINE_EVENT_TYPES.join(", ")}`
        );
      }

      const eventDate = parseLaunchDate(date);
      if (!eventDate) {
        throw new Error("Data non valida. Usa il formato YYYY-MM-DD.");
      }

      if (!title) throw new Error("Il titolo dell'evento non può essere vuoto.");

      const { data: created, error } = await supabase
        .from("project_timeline")
        .insert({
          project_id: project.id,
          type,
          event_date: eventDate,
          title,
        })
        .select("id, title, type, event_date")
        .single();

      if (error) throw error;

      return {
        ...created,
        id: created.id.slice(0, 8),
        project: project.name,
      };
    }

    case "list_timeline": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      const { data, error } = await supabase
        .from("project_timeline")
        .select("id, event_date, title, type")
        .eq("project_id", project.id)
        .order("event_date", { ascending: false });

      if (error) throw error;

      return {
        project: project.name,
        events: (data ?? []).map(
          (event: {
            id: string;
            event_date: string;
            title: string;
            type: string;
          }) => ({
            id: event.id.slice(0, 8),
            event_date: event.event_date,
            title: event.title,
            type: event.type,
          })
        ),
      };
    }

    case "add_roadmap_item": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const priority = String(toolInput.priority ?? "");
      const title = String(toolInput.title ?? "").trim();

      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      if (!ROADMAP_ITEM_PRIORITIES.includes(priority as RoadmapItemPriority)) {
        throw new Error(
          `Priorità non valida. Valori: ${ROADMAP_ITEM_PRIORITIES.join(", ")}`
        );
      }

      if (!title) throw new Error("Il titolo non può essere vuoto.");

      const roadmap = getProjectRoadmap(project);
      const newItem: RoadmapItem = {
        id: crypto.randomUUID(),
        title,
        status: "todo",
        priority: priority as RoadmapItemPriority,
      };

      await saveProjectRoadmap(project.id, [...roadmap, newItem]);

      return {
        project: project.name,
        item: {
          id: newItem.id.slice(0, 8),
          title: newItem.title,
          priority: newItem.priority,
          status: newItem.status,
        },
      };
    }

    case "update_roadmap_item": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const itemIdPrefix = String(toolInput.item_id_prefix ?? "");
      const status = String(toolInput.status ?? "") as RoadmapItemStatus;

      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      if (!["todo", "in_progress", "done"].includes(status)) {
        throw new Error("Status non valido. Valori: todo, in_progress, done.");
      }

      const roadmap = getProjectRoadmap(project);
      const item = findRoadmapItemByPrefix(roadmap, itemIdPrefix);
      if (!item) {
        throw new Error(`Item roadmap non trovato per id "${itemIdPrefix}".`);
      }

      const updated = roadmap.map((entry) =>
        entry.id === item.id ? { ...entry, status } : entry
      );

      await saveProjectRoadmap(project.id, updated);

      return {
        project: project.name,
        item: { id: item.id.slice(0, 8), title: item.title, status },
      };
    }

    case "list_roadmap": {
      const idPrefix = String(toolInput.id_prefix ?? "");
      const project = await findProjectByIdPrefix(idPrefix);
      if (!project) {
        throw new Error(`Progetto non trovato per id "${idPrefix}".`);
      }

      const roadmap = getProjectRoadmap(project);

      return {
        project: project.name,
        items: roadmap.map((item) => ({
          id: item.id.slice(0, 8),
          title: item.title,
          status: item.status,
          priority: item.priority,
        })),
      };
    }

    default:
      throw new Error(`Tool sconosciuto: ${toolName}`);
  }
}

async function runClaudeWithTools(
  chatId: number,
  userMessage: string
): Promise<string> {
  const history = await getConversationHistory(chatId);

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let currentMessages = [...messages];

  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS as Parameters<typeof client.messages.create>[0]["tools"],
      messages: currentMessages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText =
        textBlock?.type === "text" ? textBlock.text : "Fatto.";

      const updatedHistory: ConversationMessage[] = [
        ...history,
        { role: "user", content: userMessage },
        { role: "assistant", content: finalText },
      ];
      await saveConversationHistory(chatId, updatedHistory);

      return finalText;
    }

    if (response.stop_reason === "tool_use") {
      currentMessages.push({
        role: "assistant",
        content: response.content as never,
      });

      const toolResults = await Promise.all(
        response.content
          .filter((b) => b.type === "tool_use")
          .map(async (block) => {
            if (block.type !== "tool_use") return null;
            try {
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                chatId
              );
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: JSON.stringify(result),
              };
            } catch (err) {
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: `Errore: ${err instanceof Error ? err.message : "errore sconosciuto"}`,
                is_error: true,
              };
            }
          })
      );

      currentMessages.push({
        role: "user",
        content: toolResults.filter(Boolean) as never,
      });

      continue;
    }

    break;
  }

  return "Non ho capito. Puoi ripetere?";
}

async function handleToggleCompany(
  chatId: number,
  idPrefix: string
): Promise<string> {
  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    throw new Error(`Progetto non trovato per id "${idPrefix}".`);
  }

  const newValue = !project.is_company;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("projects")
    .update({ is_company: newValue })
    .eq("id", project.id);

  if (error) throw error;

  return `<b>${project.name}</b> — Aziendale: ${newValue ? "sì ✅" : "no ❌"}`;
}

export async function handleTelegramCallback(
  userId: number,
  chatId: number,
  callbackQueryId: string,
  data: string
): Promise<void> {
  if (!isAllowedUser(userId)) {
    await answerCallbackQuery(callbackQueryId, "Non autorizzato.");
    return;
  }

  try {
    if (data.startsWith("toggle_company:")) {
      const idPrefix = data.slice("toggle_company:".length);
      const confirmMsg = await handleToggleCompany(chatId, idPrefix);
      await answerCallbackQuery(
        callbackQueryId,
        confirmMsg.replace(/<[^>]+>/g, "")
      );
      await sendTelegramMessage(chatId, `✓ ${confirmMsg}`);
      return;
    }

    await answerCallbackQuery(callbackQueryId, "Azione non riconosciuta.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'aggiornamento.";
    await answerCallbackQuery(callbackQueryId, message);
    await sendTelegramMessage(chatId, message);
  }
}

export async function handleTelegramUpdate(
  userId: number,
  chatId: number,
  text: string
): Promise<void> {
  if (!isAllowedUser(userId)) {
    await sendTelegramMessage(chatId, "Non autorizzato.");
    return;
  }

  const trimmed = text.trim();
  if (
    trimmed.toLowerCase() === "reset" ||
    trimmed.toLowerCase() === "/reset"
  ) {
    await clearSession(chatId);
    await sendTelegramMessage(chatId, "Conversazione resettata.");
    return;
  }

  try {
    const response = await runClaudeWithTools(chatId, text);
    await sendTelegramMessage(chatId, response);
  } catch (error) {
    console.error("Claude bot error:", error);
    await sendTelegramMessage(
      chatId,
      "Errore interno. Riprova tra qualche secondo."
    );
  }
}
