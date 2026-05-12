import { ENV } from "./env";

export async function sendTelegramMessage(message: string) {
  if (!ENV.telegramBotToken || !ENV.telegramChatId) {
    console.warn(
      "[Telegram] Token or Chat ID not configured. Skipping message."
    );
    return;
  }

  const url = `https://api.telegram.org/bot${ENV.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ENV.telegramChatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Telegram] Failed to send message:", err);
    }
  } catch (err) {
    console.error("[Telegram] Error:", err);
  }
}
