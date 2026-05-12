import axios from "axios";
import { ENV } from "./_core/env";
import type { CandleData } from "../shared/types";

const KIS_REAL_URL = "https://openapi.koreainvestment.com:9443";
const KIS_VTS_URL = "https://openapivts.koreainvestment.com:29443";

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let tokenRequestPromise: Promise<string | null> | null = null;

/** KIS가 모의투자(VTS) 모드인지 판단 (키가 PS로 시작하면 모의투자) */
function isVtsMode(): boolean {
  return (process.env.KIS_APP_KEY || "").startsWith("PS");
}

function getBaseUrl(): string {
  return isVtsMode() ? KIS_VTS_URL : KIS_REAL_URL;
}

/** KIS Access Token 발급/갱신 (동시 요청 방지 적용) */
export async function getKisAccessToken(): Promise<string | null> {
  // 1. 이미 캐시된 토큰이 있으면 즉시 반환
  if (accessToken && Date.now() < tokenExpiresAt - 3600 * 1000) {
    return accessToken;
  }

  // 2. 이미 토큰 요청 중이면 진행 중인 Promise 반환
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  // 3. 토큰 요청 시작
  tokenRequestPromise = (async () => {
    const appKey = process.env.KIS_APP_KEY;
    const appSecret = process.env.KIS_APP_SECRET;

    if (!appKey || !appSecret) {
      return null;
    }

    try {
      const url = `${getBaseUrl()}/oauth2/tokenP`;
      console.log(`[KIS] Requesting token from: ${url}`);
      const response = await axios.post(url, {
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret,
      });

      if (response.data.access_token) {
        accessToken = response.data.access_token;
        // expires_in은 초 단위임 (보통 86400 = 24시간)
        const expiresIn = response.data.expires_in || 86400;
        tokenExpiresAt = Date.now() + expiresIn * 1000;
        console.log(
          `[KIS] ✅ Access Token Issued. Expires at: ${new Date(tokenExpiresAt).toLocaleString()}`
        );
        return accessToken;
      } else {
        console.error(
          "[KIS] ❌ Token response missing access_token:",
          response.data
        );
      }
    } catch (error: any) {
      console.error("[KIS] ❌ Token Request Failed:");
      if (error.response) {
        console.error(`  - Status: ${error.response.status}`);
        console.error(`  - Error Code: ${error.response.data?.error_code}`);
        console.error(
          `  - Message: ${error.response.data?.error_description || JSON.stringify(error.response.data)}`
        );
      } else {
        console.error(`  - Message: ${error.message}`);
      }
    } finally {
      tokenRequestPromise = null;
    }
    return null;
  })();

  return tokenRequestPromise;
}

/** 한국 주식 실시간 시세 조회 */
export async function getKisKRQuote(ticker: string) {
  const token = await getKisAccessToken();
  if (!token) return null;

  // 종목 코드만 추출 (예: 005930.KS -> 005930)
  const code = ticker.split(".")[0];

  try {
    const response = await axios.get(
      `${getBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
          appkey: process.env.KIS_APP_KEY,
          appsecret: process.env.KIS_APP_SECRET,
          tr_id: "FHKST01010100", // 주식현재가 시세
        },
        params: {
          fid_cond_mrkt_div_code: "J", // 주식
          fid_input_iscd: code,
        },
      }
    );

    const data = response.data.output;
    if (data) {
      return {
        symbol: ticker,
        price: parseFloat(data.stck_prpr),
        change: parseFloat(data.prdy_vrss),
        changePercent: parseFloat(data.prdy_ctrt),
        high: parseFloat(data.stck_hgpr),
        low: parseFloat(data.stck_lwpr),
        open: parseFloat(data.stck_oprc),
        volume: parseFloat(data.acml_vol),
      };
    } else {
      console.warn(
        `[KIS] ⚠️ No output data in quote response for ${ticker}:`,
        response.data.msg1 || "Unknown error"
      );
    }
  } catch (error: any) {
    console.error(
      `[KIS] ❌ Quote fetch failed for ${ticker}:`,
      error.response?.data?.msg1 || error.message
    );
  }
  return null;
}

/** 한국 주식 일봉 차트 데이터 조회 */
export async function getKisKRCandles(
  ticker: string,
  period: string = "6mo"
): Promise<CandleData[] | null> {
  const token = await getKisAccessToken();
  if (!token) return null;

  const code = ticker.split(".")[0];
  const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // 시작일 계산
  const startDateObj = new Date();
  if (period === "1y") startDateObj.setFullYear(startDateObj.getFullYear() - 1);
  else if (period === "1mo") startDateObj.setMonth(startDateObj.getMonth() - 1);
  else startDateObj.setMonth(startDateObj.getMonth() - 6);
  const startDate = startDateObj.toISOString().slice(0, 10).replace(/-/g, "");

  try {
    const response = await axios.get(
      `${getBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
      {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
          appkey: process.env.KIS_APP_KEY,
          appsecret: process.env.KIS_APP_SECRET,
          tr_id: "FHKST03010100", // 주식 일/주/월별 차트 조회
        },
        params: {
          fid_cond_mrkt_div_code: "J",
          fid_input_iscd: code,
          fid_input_date_1: startDate,
          fid_input_date_2: endDate,
          fid_period_div_code: "D", // 일봉
          fid_org_adj_prc: "0", // 수정주가 미적용(0) 또는 적용(1) - 보통 0 사용
        },
      }
    );

    const list = response.data.output2;
    if (list && Array.isArray(list)) {
      return list
        .map((item: any) => ({
          date: `${item.stck_bsop_date.slice(0, 4)}-${item.stck_bsop_date.slice(4, 6)}-${item.stck_bsop_date.slice(6, 8)}`,
          open: parseFloat(item.stck_oprc),
          high: parseFloat(item.stck_hgpr),
          low: parseFloat(item.stck_lwpr),
          close: parseFloat(item.stck_clpr),
          volume: parseFloat(item.acml_vol),
        }))
        .reverse(); // 과거 -> 현재 순으로 정렬
    }
  } catch (error) {
    console.warn(
      `[KIS] Candles fetch failed for ${ticker}:`,
      (error as any).message
    );
  }
  return null;
}
