import { createServiceClient } from "@/lib/supabase";
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from "@/types/project";

const TELEGRAM_API = "https://api.telegram.org";

type WizardData = {
  name?: string;
  tagline?: string;
  status?: ProjectStatus;
};

type TelegramSession = {
  chat_id: number;
  step: string;
  data: WizardData;
};

export async function sendTelegramMessage(
  chatId: number,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Telegram sendMessage failed:", body);
  }
}

function isAllowedUser(userId: number): boolean {
  const allowed = process.env.ALLOWED_TELEGRAM_USER_ID;
  if (!allowed) return false;
  return String(userId) === allowed;
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
/update [id] mrr [valore]
/update [id] users [valore]
/update [id] milestone [testo]
/update [id] notes [testo]
/update [id] url [site|repo|substack] [url]

/add — aggiungi nuovo progetto (wizard)
/cancel — annulla wizard in corso
/help — questo messaggio`;

async function handleList(chatId: number): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status")
    .order("order_index", { ascending: true });

  if (error) throw error;

  if (!data?.length) {
    await sendTelegramMessage(chatId, "Nessun progetto trovato.");
    return;
  }

  const lines = data.map(
    (p: { id: string; name: string; status: string }) =>
      `<b>${p.name}</b>\n<code>${p.id.slice(0, 8)}</code> — ${p.status}`
  );

  await sendTelegramMessage(chatId, lines.join("\n\n"));
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
    case "mrr": {
      const value = parseInt(rest[0], 10);
      if (isNaN(value) || value < 0) {
        await sendTelegramMessage(chatId, "MRR deve essere un numero intero ≥ 0.");
        return;
      }
      update = { mrr: value };
      confirmMsg = `MRR di <b>${project.name}</b> → €${value}`;
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
        "Campo non riconosciuto. Usa: status, mrr, users, milestone, notes, url."
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

async function handleAddStart(chatId: number): Promise<void> {
  await setSession(chatId, "name", {});
  await sendTelegramMessage(
    chatId,
    "Nuovo progetto — invia il <b>nome</b>:\n(/cancel per annullare)"
  );
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
    case "/add":
      await handleAddStart(chatId);
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
