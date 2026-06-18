import { handleTelegramCallback, handleTelegramUpdate } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
};

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
};

function getEnvConfig():
  | { ok: true; botToken: string; allowedUserId: string }
  | { ok: false; error: string } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const allowedUserId = process.env.ALLOWED_TELEGRAM_USER_ID;

  if (!botToken) {
    return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };
  }
  if (!allowedUserId) {
    return { ok: false, error: "Missing ALLOWED_TELEGRAM_USER_ID" };
  }

  return { ok: true, botToken, allowedUserId };
}

function extractMessage(update: TelegramUpdate): TelegramMessage | null {
  const message = update.message ?? update.edited_message;
  if (!message?.text || !message.from) return null;
  return message;
}

export async function POST(request: NextRequest) {
  const env = getEnvConfig();
  if (!env.ok) {
    console.error("Telegram webhook misconfigured:", env.error);
    return NextResponse.json({ error: env.error }, { status: 500 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = extractMessage(update);
  if (!message) {
    if (update.callback_query?.data && update.callback_query.from) {
      const userId = update.callback_query.from.id;
      const chatId = update.callback_query.message?.chat.id;

      if (!chatId) {
        return NextResponse.json({ ok: true });
      }

      if (String(userId) !== env.allowedUserId) {
        console.warn(`Telegram webhook: unauthorized callback user ${userId}`);
        return NextResponse.json({ ok: true });
      }

      try {
        await handleTelegramCallback(
          userId,
          chatId,
          update.callback_query.id,
          update.callback_query.data
        );
      } catch (error) {
        console.error("Telegram callback handler error:", error);
      }
    }

    return NextResponse.json({ ok: true });
  }

  const userId = message.from!.id;
  const chatId = message.chat.id;
  const text = message.text!;

  if (String(userId) !== env.allowedUserId) {
    console.warn(`Telegram webhook: unauthorized user ${userId}`);
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(userId, chatId, text);
  } catch (error) {
    console.error("Telegram webhook handler error:", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const env = getEnvConfig();

  return NextResponse.json({
    status: env.ok ? "ok" : "misconfigured",
    endpoint: "/api/telegram",
    method: "POST",
    botTokenConfigured: env.ok,
    allowedUserIdConfigured: Boolean(process.env.ALLOWED_TELEGRAM_USER_ID),
    ...(env.ok ? {} : { error: env.error }),
  });
}
