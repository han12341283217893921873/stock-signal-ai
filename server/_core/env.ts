import { z } from "zod";

// ─── 환경 변수 스키마 정의 (Zod 유효성 검사) ─────────────────────────────────

/**
 * 필수 환경 변수 스키마
 * 애플리케이션 시작 시 누락된 필수 환경변수가 있으면 명확한 오류 메시지와 함께 프로세스를 종료합니다.
 */
const envSchema = z.object({
  // 데이터베이스 (필수)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // JWT / 쿠키 시크릿 (필수)
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  // OAuth (필수 - 개발 환경에서는 형식 검사 완화)
  OAUTH_SERVER_URL: z.string().min(1, "OAUTH_SERVER_URL is required"),

  // App ID (필수)
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),

  // 소유자 OpenID (선택 - 없으면 admin 자동 부여 비활성화)
  OWNER_OPEN_ID: z.string().optional(),

  // Finnhub API (선택 - 없으면 Yahoo Finance 전용)
  FINNHUB_API_KEY: z.string().optional(),

  // Forge API (선택 - 없으면 푸시 알림 비활성화)
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),

  // OpenAI (선택 - 없으면 AI 기능 비활성화)
  OPENAI_API_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  // Google OAuth 2.0 (선택 - 없으면 Google 로그인 비활성화)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Telegram (선택)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // 한국투자증권 (KIS) API (선택)
  KIS_APP_KEY: z.string().optional(),
  KIS_APP_SECRET: z.string().optional(),
  KIS_CANO: z.string().optional(),
  KIS_ACNT_PRDT_CD: z.string().optional(),

  // SMTP 이메일 (선택 - 없으면 이메일 알림 비활성화)
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Node 환경
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * 환경 변수 유효성 검사 실행
 * 누락된 필수 환경변수가 있으면 명확한 오류 메시지를 출력하고 프로세스를 종료합니다.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((e: any) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    console.error(`\n[ENV] ❌ 필수 환경 변수가 누락되었습니다:\n${errors}\n`);
    console.error(
      "[ENV] .env.local 파일을 확인하고 누락된 환경 변수를 설정하세요."
    );
    process.exit(1);
  }

  return result.data;
}

// 환경 변수 유효성 검사 (모듈 로드 시 1회 실행)
const validatedEnv = validateEnv();

// ─── ENV 객체 ────────────────────────────────────────────────────────────────

export const ENV = {
  get appId() {
    return validatedEnv.VITE_APP_ID ?? "";
  },
  get cookieSecret() {
    return validatedEnv.JWT_SECRET ?? "";
  },
  get databaseUrl() {
    return validatedEnv.DATABASE_URL ?? "";
  },
  get databaseAuthToken() {
    return validatedEnv.DATABASE_AUTH_TOKEN ?? "";
  },
  get oAuthServerUrl() {
    return validatedEnv.OAUTH_SERVER_URL ?? "";
  },
  get ownerOpenId() {
    return validatedEnv.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return validatedEnv.NODE_ENV === "production";
  },
  get finnhubApiKey() {
    return validatedEnv.FINNHUB_API_KEY ?? "";
  },
  get forgeApiUrl() {
    return validatedEnv.BUILT_IN_FORGE_API_URL ?? "";
  },
  get forgeApiKey() {
    return validatedEnv.BUILT_IN_FORGE_API_KEY ?? "";
  },
  get openAiApiUrl() {
    return validatedEnv.OPENAI_API_URL ?? "";
  },
  get openAiApiKey() {
    return validatedEnv.OPENAI_API_KEY ?? "";
  },
  get openAiModel() {
    return validatedEnv.OPENAI_MODEL ?? "";
  },
  get googleClientId() {
    return validatedEnv.GOOGLE_CLIENT_ID ?? "";
  },
  get googleClientSecret() {
    return validatedEnv.GOOGLE_CLIENT_SECRET ?? "";
  },
  get telegramBotToken() {
    return validatedEnv.TELEGRAM_BOT_TOKEN ?? "";
  },
  get telegramChatId() {
    return validatedEnv.TELEGRAM_CHAT_ID ?? "";
  },
  get kisAppKey() {
    return validatedEnv.KIS_APP_KEY ?? "";
  },
  get kisAppSecret() {
    return validatedEnv.KIS_APP_SECRET ?? "";
  },
  get kisCano() {
    return validatedEnv.KIS_CANO ?? "";
  },
  get kisAcntPrdtCd() {
    return validatedEnv.KIS_ACNT_PRDT_CD ?? "01";
  },
};
