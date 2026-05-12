import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testKis71050() {
  const KIS_VTS_URL = "https://openapivts.koreainvestment.com:29443";
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  try {
    const tokenRes = await axios.post(`${KIS_VTS_URL}/oauth2/tokenP`, {
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    });
    const token = tokenRes.data.access_token;

    // 한국금융지주 (071050)
    const res = await axios.get(
      `${KIS_VTS_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: "FHKST01010100",
        },
        params: { fid_cond_mrkt_div_code: "J", fid_input_iscd: "071050" },
      }
    );
    console.log(
      "한국금융지주 (071050) KIS VTS Price:",
      res.data.output?.stck_prpr
    );
  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
  }
}
testKis71050();
