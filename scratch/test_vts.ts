import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testVts() {
  const VTS_BASE_URL = "https://openapivts.koreainvestment.com:29443";
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  console.log("Testing KIS VTS (Virtual Trading) Connection...");

  try {
    const tokenRes = await axios.post(`${VTS_BASE_URL}/oauth2/tokenP`, {
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    });
    const token = tokenRes.data.access_token;
    console.log("VTS Token received.");

    const res = await axios.get(
      `${VTS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
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
    console.log("Samsung (005930) VTS Price:", res.data.output?.stck_prpr);
    console.log("Success with VTS!");
  } catch (error: any) {
    console.error("VTS Failed:", error.response?.data || error.message);
  }
}
testVts();
