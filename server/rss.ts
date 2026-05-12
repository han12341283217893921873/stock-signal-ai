import Parser from "rss-parser";

const parser = new Parser();

export interface RSSNewsItem {
  title: string;
  link: string;
  pubDate?: string;
  source: string;
}

/**
 * 특정 종목에 대한 뉴스를 Google News RSS를 통해 가져옵니다. (비용 제로)
 */
export async function getRSSNews(ticker: string): Promise<RSSNewsItem[]> {
  try {
    const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
    // 한국 주식인 경우 한글 뉴스를 우선적으로 검색하도록 쿼리 조정
    const query = isKR ? encodeURIComponent(`${ticker} 주식`) : ticker;
    const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 10).map(item => ({
      title: item.title || "제목 없음",
      link: item.link || "",
      pubDate: item.pubDate,
      source: "Google News RSS",
    }));
  } catch (error) {
    console.error(`[RSS] Failed to fetch news for ${ticker}:`, error);
    return [];
  }
}

/**
 * 일반 경제 뉴스를 가져옵니다.
 */
export async function getMarketNewsRSS(): Promise<RSSNewsItem[]> {
  try {
    const url =
      "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko";
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 15).map(item => ({
      title: item.title || "제목 없음",
      link: item.link || "",
      pubDate: item.pubDate,
      source: "Google News Market",
    }));
  } catch (error) {
    console.error("[RSS] Failed to fetch market news:", error);
    return [];
  }
}
