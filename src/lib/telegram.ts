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

const HELP_TEXT = `<b>Comandi disponibili</b>

/list — lista progetti con id e status

/update [id] status [valore]
/update [id] revenue [valore]
/update [id] mrr [valore] (legacy — il MRR è calcolato da revenue e launch_date)
/update [id] goal [valore]
/update [id] prevmrr [valore]
/update [id] launch [YYYY-MM-DD]
/update [id] idea [YYYY-MM-DD]
/update [id] buildstart [YYYY-MM-DD]
/update [id] users [valore]
/update [id] milestone [testo]
/update [id] notes [testo]
/update [id] private true|false
/update [id] company true|false
/update [id] url [site|repo|substack] [url]

/edit [id] — modifica privato e aziendale (wizard)

/delete [id] — elimina progetto (richiede /confirm)
/confirm [id] — conferma eliminazione

/timeline [id] add [type] [YYYY-MM-DD] [titolo]
/timeline [id] list

/roadmap [id] add [priority] [titolo]
/roadmap [id] done [item_id]
/roadmap [id] wip [item_id]
/roadmap [id] list

/add — aggiungi nuovo progetto (wizard)
/cancel — annulla wizard in corso
/help — questo messaggio`;

async function handleList(chatId: number): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, is_company")
    .order("order_index", { ascending: true });

  if (error) throw error;

  if (!data?.length) {
    await sendTelegramMessage(chatId, "Nessun progetto trovato.");
    return;
  }

  const lines = data.map(
    (p: { id: string; name: string; status: string; is_company: boolean }) =>
      `<b>${p.name}</b>\n<code>${p.id.slice(0, 8)}</code> — ${p.status}${p.is_company ? " · aziendale" : ""}`
  );

  const inline_keyboard = data.map(
    (p: { id: string; name: string; is_company: boolean }) => [
      {
        text: `Aziendale: ${p.is_company ? "✅" : "❌"}`,
        callback_data: `toggle_company:${p.id.slice(0, 8)}`,
      },
    ]
  );

  await sendTelegramMessage(
    chatId,
    lines.join("\n\n"),
    { inline_keyboard }
  );
}

async function handleUpdate(chatId: number, args: string[]): Promise<void> {
  if (args.length < 2) {
    await sendTelegramMessage(
      chatId,
      "Uso: /update [id] [campo] [valore]\nEsempio: /update abc123 status live"
    );
    return;
  }

  const [idPrefix, field, ...rest] = args;
  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  const supabase = createServiceClient();
  let update: Record<string, unknown> = {};
  let confirmMsg = "";

  switch (field) {
    case "status": {
      const value = rest[0] as ProjectStatus;
      if (!value || !PROJECT_STATUSES.includes(value)) {
        await sendTelegramMessage(
          chatId,
          `Status non valido. Valori: ${PROJECT_STATUSES.join(", ")}`
        );
        return;
      }
      update = { status: value };
      confirmMsg = `Status di <b>${project.name}</b> → <b>${value}</b>`;
      break;
    }
    case "revenue": {
      const value = parseMrr(rest[0] ?? "");
      if (value === null) {
        await sendTelegramMessage(
          chatId,
          "Revenue non valido. Usa un numero ≥ 0 con punto decimale (es. 49.00)."
        );
        return;
      }
      update = { total_revenue: value };
      confirmMsg = `Revenue totale di <b>${project.name}</b> → €${formatMrr(value)}`;
      break;
    }
    case "mrr": {
      const value = parseMrr(rest[0] ?? "");
      if (value === null) {
        await sendTelegramMessage(
          chatId,
          "MRR non valido. Usa un numero ≥ 0 con punto decimale (es. 4.90)."
        );
        return;
      }
      update = { mrr: value };
      confirmMsg = `MRR di <b>${project.name}</b> → €${formatMrr(value)} (nota: il MRR in dashboard è calcolato da revenue e launch_date)`;
      break;
    }
    case "goal": {
      const value = parseMrr(rest[0] ?? "");
      if (value === null) {
        await sendTelegramMessage(
          chatId,
          "Obiettivo MRR non valido. Usa un numero ≥ 0 con punto decimale (es. 500)."
        );
        return;
      }
      update = { mrr_goal: value };
      confirmMsg = `Obiettivo MRR di <b>${project.name}</b> → €${formatMrr(value)}`;
      break;
    }
    case "prevmrr": {
      const value = parseMrr(rest[0] ?? "");
      if (value === null) {
        await sendTelegramMessage(
          chatId,
          "MRR precedente non valido. Usa un numero ≥ 0 con punto decimale (es. 4.90)."
        );
        return;
      }
      update = { mrr_prev: value };
      confirmMsg = `MRR mese scorso di <b>${project.name}</b> → €${formatMrr(value)}`;
      break;
    }
    case "launch": {
      const value = parseLaunchDate(rest[0] ?? "");
      if (!value) {
        await sendTelegramMessage(
          chatId,
          "Data non valida. Usa il formato YYYY-MM-DD (es. 2024-09-01)."
        );
        return;
      }
      update = { launch_date: value };
      confirmMsg = `Launch date di <b>${project.name}</b> → ${value}`;
      break;
    }
    case "idea": {
      const value = parseLaunchDate(rest[0] ?? "");
      if (!value) {
        await sendTelegramMessage(
          chatId,
          "Data non valida. Usa il formato YYYY-MM-DD (es. 2024-01-15)."
        );
        return;
      }
      update = { idea_date: value };
      confirmMsg = `Idea date di <b>${project.name}</b> → ${value}`;
      break;
    }
    case "buildstart": {
      const value = parseLaunchDate(rest[0] ?? "");
      if (!value) {
        await sendTelegramMessage(
          chatId,
          "Data non valida. Usa il formato YYYY-MM-DD (es. 2024-03-01)."
        );
        return;
      }
      update = { build_start_date: value };
      confirmMsg = `Inizio build di <b>${project.name}</b> → ${value}`;
      break;
    }
    case "users": {
      const value = parseInt(rest[0], 10);
      if (isNaN(value) || value < 0) {
        await sendTelegramMessage(
          chatId,
          "Utenti deve essere un numero intero ≥ 0."
        );
        return;
      }
      update = { users_count: value };
      confirmMsg = `Utenti di <b>${project.name}</b> → ${value}`;
      break;
    }
    case "milestone": {
      const value = rest.join(" ").trim();
      if (!value) {
        await sendTelegramMessage(chatId, "Specifica il testo della milestone.");
        return;
      }
      update = { next_milestone: value };
      confirmMsg = `Milestone di <b>${project.name}</b> aggiornata.`;
      break;
    }
    case "notes": {
      const value = rest.join(" ").trim();
      update = { private_notes: value || null };
      confirmMsg = `Note private di <b>${project.name}</b> aggiornate.`;
      break;
    }
    case "private": {
      const value = rest[0]?.toLowerCase();
      if (value !== "true" && value !== "false") {
        await sendTelegramMessage(
          chatId,
          "Uso: /update [id] private true|false"
        );
        return;
      }
      update = { is_private: value === "true" };
      confirmMsg = `Visibilità di <b>${project.name}</b> → ${value === "true" ? "privato" : "pubblico"}`;
      break;
    }
    case "company": {
      const value = rest[0]?.toLowerCase();
      if (value !== "true" && value !== "false") {
        await sendTelegramMessage(
          chatId,
          "Uso: /update [id] company true|false"
        );
        return;
      }
      update = { is_company: value === "true" };
      confirmMsg = `Flag aziendale di <b>${project.name}</b> → ${value === "true" ? "sì" : "no"}`;
      break;
    }
    case "url": {
      const urlField = rest[0];
      const url = rest.slice(1).join(" ").trim();
      const fieldMap: Record<string, string> = {
        site: "url_site",
        repo: "url_repo",
        substack: "url_substack",
      };
      const dbField = fieldMap[urlField];
      if (!dbField) {
        await sendTelegramMessage(
          chatId,
          "Campo URL non valido. Usa: site, repo o substack."
        );
        return;
      }
      update = { [dbField]: url || null };
      confirmMsg = `URL ${urlField} di <b>${project.name}</b> aggiornato.`;
      break;
    }
    default:
      await sendTelegramMessage(
        chatId,
        "Campo non riconosciuto. Usa: status, revenue, mrr, goal, prevmrr, launch, idea, buildstart, users, milestone, notes, private, company, url."
      );
      return;
  }

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", project.id);

  if (error) throw error;
  await sendTelegramMessage(chatId, `✓ ${confirmMsg}`);
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

async function handleTimeline(chatId: number, args: string[]): Promise<void> {
  if (args.length < 2) {
    await sendTelegramMessage(
      chatId,
      "Uso: /timeline [id] add [type] [YYYY-MM-DD] [titolo]\nOppure: /timeline [id] list"
    );
    return;
  }

  const [idPrefix, action, ...rest] = args;
  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  const supabase = createServiceClient();

  if (action === "list") {
    const { data, error } = await supabase
      .from("project_timeline")
      .select("id, event_date, title, type")
      .eq("project_id", project.id)
      .order("event_date", { ascending: false });

    if (error) throw error;

    if (!data?.length) {
      await sendTelegramMessage(
        chatId,
        `Nessun evento per <b>${project.name}</b>.`
      );
      return;
    }

    const lines = data.map(
      (event: { id: string; event_date: string; title: string; type: string }) =>
        `<code>${event.id.slice(0, 8)}</code> ${event.event_date} [${event.type}] ${event.title}`
    );

    await sendTelegramMessage(
      chatId,
      `<b>Timeline — ${project.name}</b>\n\n${lines.join("\n")}`
    );
    return;
  }

  if (action === "add") {
    const [type, dateStr, ...titleParts] = rest;

    if (!type || !dateStr || titleParts.length === 0) {
      await sendTelegramMessage(
        chatId,
        `Uso: /timeline [id] add [type] [YYYY-MM-DD] [titolo]\nTipi: ${TIMELINE_EVENT_TYPES.join(", ")}`
      );
      return;
    }

    if (!TIMELINE_EVENT_TYPES.includes(type as TimelineEventType)) {
      await sendTelegramMessage(
        chatId,
        `Tipo non valido. Valori: ${TIMELINE_EVENT_TYPES.join(", ")}`
      );
      return;
    }

    const eventDate = parseLaunchDate(dateStr);
    if (!eventDate) {
      await sendTelegramMessage(
        chatId,
        "Data non valida. Usa il formato YYYY-MM-DD."
      );
      return;
    }

    const title = titleParts.join(" ").trim();
    const { data: created, error } = await supabase
      .from("project_timeline")
      .insert({
        project_id: project.id,
        type,
        event_date: eventDate,
        title,
      })
      .select("id, title")
      .single();

    if (error) throw error;

    await sendTelegramMessage(
      chatId,
      `✓ Evento aggiunto a <b>${project.name}</b>\n<code>${created.id.slice(0, 8)}</code> — ${created.title}`
    );
    return;
  }

  await sendTelegramMessage(chatId, "Azione non riconosciuta. Usa: add, list.");
}

async function handleRoadmap(chatId: number, args: string[]): Promise<void> {
  if (args.length < 2) {
    await sendTelegramMessage(
      chatId,
      "Uso: /roadmap [id] add|done|wip|list ..."
    );
    return;
  }

  const [idPrefix, action, ...rest] = args;
  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  const roadmap = getProjectRoadmap(project);

  if (action === "list") {
    if (roadmap.length === 0) {
      await sendTelegramMessage(
        chatId,
        `Roadmap vuota per <b>${project.name}</b>.`
      );
      return;
    }

    const lines = roadmap.map(
      (item) =>
        `<code>${item.id.slice(0, 8)}</code> [${item.status}] ${item.priority} — ${item.title}`
    );

    await sendTelegramMessage(
      chatId,
      `<b>Roadmap — ${project.name}</b>\n\n${lines.join("\n")}`
    );
    return;
  }

  if (action === "add") {
    const [priority, ...titleParts] = rest;

    if (!priority || titleParts.length === 0) {
      await sendTelegramMessage(
        chatId,
        `Uso: /roadmap [id] add [priority] [titolo]\nPriorità: ${ROADMAP_ITEM_PRIORITIES.join(", ")}`
      );
      return;
    }

    if (!ROADMAP_ITEM_PRIORITIES.includes(priority as RoadmapItemPriority)) {
      await sendTelegramMessage(
        chatId,
        `Priorità non valida. Valori: ${ROADMAP_ITEM_PRIORITIES.join(", ")}`
      );
      return;
    }

    const title = titleParts.join(" ").trim();
    const newItem: RoadmapItem = {
      id: crypto.randomUUID(),
      title,
      status: "todo",
      priority: priority as RoadmapItemPriority,
    };

    await saveProjectRoadmap(project.id, [...roadmap, newItem]);
    await sendTelegramMessage(
      chatId,
      `✓ Item roadmap aggiunto a <b>${project.name}</b>\n<code>${newItem.id.slice(0, 8)}</code> — ${newItem.title}`
    );
    return;
  }

  if (action === "done" || action === "wip") {
    const itemPrefix = rest[0];
    if (!itemPrefix) {
      await sendTelegramMessage(
        chatId,
        `Uso: /roadmap [id] ${action} [item_id_parziale]`
      );
      return;
    }

    let item: RoadmapItem | null;
    try {
      item = findRoadmapItemByPrefix(roadmap, itemPrefix);
    } catch (err) {
      await sendTelegramMessage(
        chatId,
        err instanceof Error ? err.message : "ID roadmap ambiguo."
      );
      return;
    }

    if (!item) {
      await sendTelegramMessage(
        chatId,
        `Item roadmap non trovato per id "${itemPrefix}".`
      );
      return;
    }

    const newStatus: RoadmapItemStatus =
      action === "done" ? "done" : "in_progress";

    const updated = roadmap.map((entry) =>
      entry.id === item!.id ? { ...entry, status: newStatus } : entry
    );

    await saveProjectRoadmap(project.id, updated);
    await sendTelegramMessage(
      chatId,
      `✓ <b>${item.title}</b> → ${newStatus}`
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    "Azione non riconosciuta. Usa: add, done, wip, list."
  );
}

async function handleDelete(chatId: number, args: string[]): Promise<void> {
  const [idPrefix] = args;

  if (!idPrefix) {
    await sendTelegramMessage(chatId, "Uso: /delete [id]");
    return;
  }

  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  await sendTelegramMessage(
    chatId,
    `Sei sicuro di eliminare <b>${project.name}</b>?\nRispondi <code>/confirm ${project.id.slice(0, 8)}</code>`
  );
}

async function handleConfirm(chatId: number, args: string[]): Promise<void> {
  const [idPrefix] = args;

  if (!idPrefix) {
    await sendTelegramMessage(chatId, "Uso: /confirm [id]");
    return;
  }

  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").delete().eq("id", project.id);

  if (error) throw error;

  await sendTelegramMessage(
    chatId,
    `✓ Progetto <b>${project.name}</b> eliminato.`
  );
}

async function handleAddStart(chatId: number): Promise<void> {
  await setSession(chatId, "name", {});
  await sendTelegramMessage(
    chatId,
    "Nuovo progetto — invia il <b>nome</b>:\n(/cancel per annullare)"
  );
}

async function handleEditStart(chatId: number, args: string[]): Promise<void> {
  const [idPrefix] = args;

  if (!idPrefix) {
    await sendTelegramMessage(chatId, "Uso: /edit [id]");
    return;
  }

  const project = await findProjectByIdPrefix(idPrefix);

  if (!project) {
    await sendTelegramMessage(chatId, `Progetto non trovato per id "${idPrefix}".`);
    return;
  }

  await setSession(chatId, "edit_private", {
    project_id: project.id,
    is_private: project.is_private,
    is_company: project.is_company,
  });

  await sendTelegramMessage(
    chatId,
    `Modifica <b>${project.name}</b>\n\nQuesto progetto è privato? (sì/no)\n(/cancel per annullare)`,
    {
      inline_keyboard: [
        [
          {
            text: `Aziendale: ${project.is_company ? "✅" : "❌"}`,
            callback_data: `toggle_company:${project.id.slice(0, 8)}`,
          },
        ],
      ],
    }
  );
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

  const session = await getSession(chatId);
  if (
    session &&
    session.data.project_id === project.id &&
    (session.step === "edit_private" || session.step === "edit_company")
  ) {
    await setSession(chatId, session.step, {
      ...session.data,
      is_company: newValue,
    });
  }

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

async function handleWizardInput(
  chatId: number,
  text: string,
  session: TelegramSession
): Promise<void> {
  const data = { ...session.data };

  switch (session.step) {
    case "name": {
      if (!text.trim()) {
        await sendTelegramMessage(chatId, "Il nome non può essere vuoto.");
        return;
      }
      data.name = text.trim();
      await setSession(chatId, "tagline", data);
      await sendTelegramMessage(
        chatId,
        "Invia la <b>tagline</b> (max 80 caratteri):"
      );
      break;
    }
    case "tagline": {
      const tagline = text.trim();
      if (!tagline) {
        await sendTelegramMessage(chatId, "La tagline non può essere vuota.");
        return;
      }
      if (tagline.length > 80) {
        await sendTelegramMessage(
          chatId,
          `Tagline troppo lunga (${tagline.length}/80). Accorciala.`
        );
        return;
      }
      data.tagline = tagline;
      await setSession(chatId, "status", data);
      await sendTelegramMessage(
        chatId,
        `Invia lo <b>status</b>:\n${PROJECT_STATUSES.join(" | ")}`
      );
      break;
    }
    case "status": {
      const status = text.trim().toLowerCase() as ProjectStatus;
      if (!PROJECT_STATUSES.includes(status)) {
        await sendTelegramMessage(
          chatId,
          `Status non valido. Valori: ${PROJECT_STATUSES.join(", ")}`
        );
        return;
      }
      data.status = status;
      await setSession(chatId, "url_site", data);
      await sendTelegramMessage(
        chatId,
        "Invia l'URL del sito (o <b>-</b> per saltare):"
      );
      break;
    }
    case "url_site": {
      const url = text.trim();
      const urlSite = url === "-" ? null : url;

      const supabase = createServiceClient();

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
          name: data.name,
          tagline: data.tagline,
          status: data.status,
          url_site: urlSite,
          order_index: orderIndex,
        })
        .select("id, name")
        .single();

      if (error) throw error;

      await clearSession(chatId);
      await sendTelegramMessage(
        chatId,
        `✓ Progetto <b>${created.name}</b> creato.\n<code>${created.id.slice(0, 8)}</code>`
      );
      break;
    }
    case "edit_private": {
      const isPrivate = parseYesNo(text);
      if (isPrivate === null) {
        await sendTelegramMessage(chatId, "Risposta non valida. Usa sì o no.");
        return;
      }
      data.is_private = isPrivate;
      await setSession(chatId, "edit_company", data);
      await sendTelegramMessage(
        chatId,
        "Questo progetto è aziendale? (sì/no)"
      );
      break;
    }
    case "edit_company": {
      const isCompany = parseYesNo(text);
      if (isCompany === null) {
        await sendTelegramMessage(chatId, "Risposta non valida. Usa sì o no.");
        return;
      }

      if (!data.project_id) {
        await clearSession(chatId);
        await sendTelegramMessage(chatId, "Sessione non valida. Riprova con /edit.");
        return;
      }

      const supabase = createServiceClient();
      const { data: updated, error } = await supabase
        .from("projects")
        .update({
          is_private: data.is_private,
          is_company: isCompany,
        })
        .eq("id", data.project_id)
        .select("name, is_private, is_company")
        .single();

      if (error) throw error;

      await clearSession(chatId);
      await sendTelegramMessage(
        chatId,
        `✓ <b>${updated.name}</b> aggiornato.\nPrivato: ${updated.is_private ? "sì" : "no"}\nAziendale: ${updated.is_company ? "sì" : "no"}`
      );
      break;
    }
    default:
      await clearSession(chatId);
      await sendTelegramMessage(chatId, "Sessione non valida. Riprova con /add.");
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
  const session = await getSession(chatId);

  if (session && !trimmed.startsWith("/")) {
    await handleWizardInput(chatId, trimmed, session);
    return;
  }

  if (session && trimmed.startsWith("/") && trimmed !== "/cancel") {
    await sendTelegramMessage(
      chatId,
      "Wizard in corso. Completa i passaggi o invia /cancel."
    );
    return;
  }

  const [command, ...args] = trimmed.split(/\s+/);
  const cmd = command.toLowerCase().split("@")[0];

  switch (cmd) {
    case "/start":
    case "/help":
      await sendTelegramMessage(chatId, HELP_TEXT);
      break;
    case "/list":
      await handleList(chatId);
      break;
    case "/update":
      await handleUpdate(chatId, args);
      break;
    case "/timeline":
      await handleTimeline(chatId, args);
      break;
    case "/roadmap":
      await handleRoadmap(chatId, args);
      break;
    case "/add":
      await handleAddStart(chatId);
      break;
    case "/edit":
      await handleEditStart(chatId, args);
      break;
    case "/delete":
      await handleDelete(chatId, args);
      break;
    case "/confirm":
      await handleConfirm(chatId, args);
      break;
    case "/cancel":
      if (session) {
        await clearSession(chatId);
        await sendTelegramMessage(chatId, "Wizard annullato.");
      } else {
        await sendTelegramMessage(chatId, "Nessun wizard in corso.");
      }
      break;
    default:
      if (trimmed.startsWith("/")) {
        await sendTelegramMessage(
          chatId,
          "Comando non riconosciuto. Invia /help per la lista."
        );
      }
  }
}
