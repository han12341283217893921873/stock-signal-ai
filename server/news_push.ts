import { sendTelegramMessage } from "./_core/telegram";
import { getPortfolioPositions, getWatchlist } from "./db";
import { getCompanyNews } from "./finnhub";

/** 뉴스 푸시 엔진 (Feature 38) */
export async function startNewsPushEngine() {
  console.log("🚀 News Push Engine Started...");

  // 5분마다 뉴스 체크
  setInterval(
    async () => {
      try {
        // 모든 사용자의 워치리스트/포트폴리오 종목 수집
        // (단순화를 위해 여기서는 모든 유니크 티커 대상)
        // 실제 운영 시에는 사용자별 설정에 따라 처리

        const tickers = ["AAPL", "TSLA", "NVDA", "005930.KS"]; // 예시 (실제로는 DB에서 추출)

        for (const ticker of tickers) {
          const news = await getCompanyNews(ticker, 1); // 최근 1일
          if (news.length > 0) {
            const latest = news[0];

            // 이미 보낸 뉴스인지 체크하는 로직 필요 (여기선 생략)

            const msg = `🔔 *[실시간 뉴스]* ${ticker}\n\n${latest.title}\n\n[기사 보기](${latest.link})`;
            await sendTelegramMessage(msg);
          }
        }
      } catch (err) {
        console.error("[NewsPush] Error:", err);
      }
    },
    5 * 60 * 1000
  );
}
