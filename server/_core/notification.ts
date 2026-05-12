import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * 확장된 알림 옵션: 사용자별 채널(이메일, 웹훅, 텔레그램) 지원
 */
export type NotificationOptions = {
  /** 사용자 이메일 주소 (설정 시 이메일 발송) */
  email?: string | null;
  /** 사용자 웹훅 URL (설정 시 POST 요청 발송) */
  webhook?: string | null;
  /** 텔레그램 Chat ID (설정 시 텔레그램 메시지 발송) */
  telegramChatId?: string | null;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * 이메일 알림 발송 (nodemailer + Gmail SMTP)
 * 환경변수: SMTP_USER (Gmail 계정), SMTP_PASS (앱 비밀번호)
 */
async function sendEmailNotification(
  email: string,
  title: string,
  content: string
): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn(
      "[Notification] SMTP_USER 또는 SMTP_PASS 환경변수가 설정되지 않아 이메일 발송을 건너뜁니다."
    );
    return;
  }

  try {
    // nodemailer 동적 임포트 (선택적 의존성)
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.warn(
        "[Notification] nodemailer 패키지를 찾을 수 없습니다. npm install nodemailer를 실행하세요."
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Stock Signal AI" <${smtpUser}>`,
      to: email,
      subject: title,
      text: content,
      html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
    });

    console.log(`[Notification] 이메일 발송 완료: ${email}`);
  } catch (err) {
    console.warn("[Notification] 이메일 발송 실패:", err);
  }
}

/**
 * 웹훅 알림 발송 (HTTP POST)
 */
async function sendWebhookNotification(
  webhookUrl: string,
  title: string,
  content: string
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn(
        `[Notification] 웹훅 발송 실패: ${response.status} ${response.statusText}`
      );
    } else {
      console.log(`[Notification] 웹훅 발송 완료: ${webhookUrl}`);
    }
  } catch (err) {
    console.warn("[Notification] 웹훅 발송 중 오류:", err);
  }
} /**
 * 텔레그램 메시지 발송
 * 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (글로벌 기본값)
 */
export async function sendTelegramNotification(
  chatId: string,
  title: string,
  content: string
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn(
      "[Notification] TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않아 텔레그램 발송을 건너뜁니다."
    );
    return;
  }

  const text = `*${title}*\n\n${content}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[Notification] 텔레그램 발송 실패: ${res.status} — ${detail}`
      );
    } else {
      console.log(`[Notification] 텔레그램 발송 완료 → chat_id: ${chatId}`);
    }
  } catch (err) {
    console.warn("[Notification] 텔레그램 발송 중 오류:", err);
  }
}

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * 추가로 options에 email/webhook이 제공되면 해당 채널로도 발송합니다.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 */
export async function notifyOwner(
  payload: NotificationPayload,
  options?: NotificationOptions
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // 사용자 이메일 채널 발송 (병렬 실행, 실패해도 계속 진행)
  const sideEffects: Promise<void>[] = [];

  if (options?.email) {
    sideEffects.push(sendEmailNotification(options.email, title, content));
  }

  if (options?.webhook) {
    sideEffects.push(sendWebhookNotification(options.webhook, title, content));
  }

  // 텔레그램: 사용자 지정 chat_id 또는 환경변수 기본값 사용
  const telegramChatId =
    options?.telegramChatId || process.env.TELEGRAM_CHAT_ID;
  if (telegramChatId) {
    sideEffects.push(sendTelegramNotification(telegramChatId, title, content));
  }

  // 사이드 이펙트는 백그라운드로 처리 (메인 흐름 방해 안 함)
  if (sideEffects.length > 0) {
    Promise.allSettled(sideEffects).catch(() => {});
  }

  if (!ENV.forgeApiUrl) {
    // forge API URL이 없어도 이메일/웹훅은 발송될 수 있음
    return sideEffects.length > 0;
  }

  if (!ENV.forgeApiKey) {
    return sideEffects.length > 0;
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
