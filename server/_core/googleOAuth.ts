/**
 * Google OAuth 2.0 라우트 핸들러
 *
 * 흐름:
 *   GET /api/auth/google         → Google 로그인 페이지로 리다이렉트
 *   GET /api/auth/google/callback → 코드 교환 → 사용자 저장 → 세션 쿠키 발급 → 홈 리다이렉트
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db.js";
import { ENV } from "./env.js";
import { sdk } from "./sdk.js";
import { getSessionCookieOptions } from "./cookies.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Google OAuth 설정 여부 확인
 */
export function isGoogleOAuthConfigured(): boolean {
  return (
    ENV.googleClientId.length > 0 &&
    ENV.googleClientId !== "your-google-client-id-here" &&
    ENV.googleClientSecret.length > 0 &&
    ENV.googleClientSecret !== "your-google-client-secret-here"
  );
}

export function registerGoogleOAuthRoutes(app: Express) {
  /**
   * 1단계: Google 로그인 시작
   * 브라우저를 Google 인증 페이지로 리다이렉트
   */
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!isGoogleOAuthConfigured()) {
      res.status(503).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:50px">
          <h2>⚠️ Google 로그인 미설정</h2>
          <p>.env.local 파일에 <code>GOOGLE_CLIENT_ID</code>와 <code>GOOGLE_CLIENT_SECRET</code>을 설정해주세요.</p>
          <p><a href="https://console.cloud.google.com">Google Cloud Console 바로가기</a></p>
          <p><a href="/">← 홈으로</a></p>
        </body></html>
      `);
      return;
    }

    const host = req.get("host")?.replace("127.0.0.1", "localhost");
    const redirectUri = `${req.protocol}://${host}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    console.log(`[Google OAuth] Redirect URI: ${redirectUri}`);
    res.redirect(302, `${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  /**
   * 2단계: Google 콜백 처리
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");

    if (error || !code) {
      console.warn("[Google OAuth] 로그인 취소 또는 오류:", error);
      res.redirect(302, "/?auth_error=cancelled");
      return;
    }

    try {
      const host = req.get("host")?.replace("127.0.0.1", "localhost");
      const redirectUri = `${req.protocol}://${host}/api/auth/google/callback`;

      // ── 토큰 교환 ──────────────────────────────────────────────────────────
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Token exchange failed: ${errText}`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        id_token?: string;
      };

      // ── 사용자 정보 조회 ──────────────────────────────────────────────────
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch Google user info");
      }

      const googleUser = (await userRes.json()) as {
        sub: string;
        email: string;
        name: string;
      };

      const openId = `google:${googleUser.sub}`;

      // ── DB에 사용자 저장/업데이트 ─────────────────────────────────────────
      await db.upsertUser({
        openId,
        name: googleUser.name || googleUser.email,
        email: googleUser.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // ── JWT 세션 쿠키 발급 ────────────────────────────────────────────────
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || googleUser.email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      // 배포 환경과 로컬 환경 모두에서 쿠키가 잘 유지되도록 설정
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
        sameSite: "lax",
        secure: req.protocol === "https",
      });

      console.log(`[Google OAuth] 로그인 성공: ${googleUser.email}`);
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] 콜백 처리 실패:", error);
      res.redirect(302, "/?auth_error=failed");
    }
  });
}
