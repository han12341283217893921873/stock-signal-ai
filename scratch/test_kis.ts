import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testKis() {
  const KIS_BASE_URL = "https://openapi.koreainvestment.com:9443";
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  try {
    const tokenRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    });
    const token = tokenRes.data.access_token;
    console.log("Token received.");

    // Test KOSPI
    const res1 = await axios.get(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: "FHKST01010100",
        },
        params: { fid_cond_mrkt_div_code: "J", fid_input_iscd: "005930" },
      }
    );
    console.log("Samsung (005930) Price:", res1.data.output?.stck_prpr);

    // Test KOSDAQ
    const res2 = await axios.get(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: "FHKST01010100",
        },
        params: { fid_cond_mrkt_div_code: "J", fid_input_iscd: "086520" },
      }
    );
    console.log("Ecopro (086520) Price:", res2.data.output?.stck_prpr);
  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}
testKis();
