import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import protobuf from "protobufjs";
import { evaluatePriceAlerts } from "./alertEngine";
import { getKisKRQuote } from "./kis";
import { isKoreanTicker, isKRMarketOpen } from "./yahoo";

const protoStr = `
syntax = "proto3";
message PricingData {
    string id = 1;
    float price = 2;
    sint64 time = 3;
    string currency = 4;
    string exchange = 5;
    int32 quoteType = 6;
    int32 marketHours = 7;
    float changePercent = 8;
    sint64 dayVolume = 9;
    float dayHigh = 10;
    float dayLow = 11;
    float change = 12;
    string shortName = 13;
    sint64 expireDate = 14;
    float openPrice = 15;
    float previousClose = 16;
    float strikePrice = 17;
    string underlyingSymbol = 18;
    sint64 openInterest = 19;
    int32 optionsType = 20;
    sint64 miniOption = 21;
    sint64 lastSize = 22;
    float bid = 23;
    sint64 bidSize = 24;
    float ask = 25;
    sint64 askSize = 26;
    sint64 priceHint = 27;
    sint64 vol_24hr = 28;
    sint64 volAllCurrencies = 29;
    string fromcurrency = 30;
    string lastMarket = 31;
    double circulatingSupply = 32;
    double marketcap = 33;
}
`;

const root = protobuf.parse(protoStr).root;
const PricingData = root.lookupType("PricingData");

// connectToYahoo 함수를 setupWebSocketServer 밖에서 접근할 수 있도록 내보내기
let _connectToYahoo: (() => void) | null = null;
export function connectToYahoo() {
  if (_connectToYahoo) _connectToYahoo();
}

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  let yahooWs: WebSocket | null = null;

  // Ticker -> Set of Clients
  const tickerToClients = new Map<string, Set<WebSocket>>();
  // Client -> Set of Tickers (for cleanup)
  const clientSubscriptions = new Map<WebSocket, Set<string>>();

  wss.on("connection", ws => {
    console.log(`[WS] Client connected.`);

    ws.on("message", message => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "subscribe" && data.ticker) {
          const ticker = data.ticker.toUpperCase();
          handleSubscribe(ws, ticker);
        } else if (data.type === "unsubscribe" && data.ticker) {
          // 클라이언트 요청으로 특정 티커 구독 해지
          const ticker = data.ticker.toUpperCase();
          handleUnsubscribe(ws, ticker);
        }
      } catch (err) {
        // ignore
      }
    });

    ws.on("close", () => {
      handleDisconnect(ws);
      console.log(`[WS] Client disconnected.`);
    });
  });

  function handleSubscribe(ws: WebSocket, ticker: string) {
    // Add to ticker mapping
    if (!tickerToClients.has(ticker)) {
      tickerToClients.set(ticker, new Set());
    }
    tickerToClients.get(ticker)!.add(ws);

    // Add to client tracking
    if (!clientSubscriptions.has(ws)) {
      clientSubscriptions.set(ws, new Set());
    }
    clientSubscriptions.get(ws)!.add(ticker);

    // Subscribe on Yahoo if needed
    subscribeToYahoo(ticker);
  }

  function handleUnsubscribe(ws: WebSocket, ticker: string) {
    // 클라이언트의 구독 목록에서 티커 제거
    const clientTickers = clientSubscriptions.get(ws);
    if (clientTickers) {
      clientTickers.delete(ticker);
    }

    // 티커의 클라이언트 목록에서 해당 클라이언트 제거
    const clients = tickerToClients.get(ticker);
    if (clients) {
      clients.delete(ws);
      // 해당 티커에 대한 구독이 더 이상 없으면 Yahoo에서도 제거
      if (clients.size === 0) {
        tickerToClients.delete(ticker);
        console.log(
          `[WS] No more subscribers for ${ticker}. Removing from tracking.`
        );
        // Yahoo Finance WebSocket은 개별 unsubscribe를 지원하지 않으나
        // 추적 목록에서 제거하여 수신 데이터를 무시함
      }
    }
  }

  function handleDisconnect(ws: WebSocket) {
    const tickers = clientSubscriptions.get(ws);
    if (tickers) {
      Array.from(tickers).forEach(ticker => {
        const clients = tickerToClients.get(ticker);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            tickerToClients.delete(ticker);
          }
        }
      });
    }
    clientSubscriptions.delete(ws);
  }

  function _connect() {
    console.log("[WS] Connecting to Yahoo Finance WebSocket...");
    yahooWs = new WebSocket("wss://streamer.finance.yahoo.com");

    yahooWs.on("open", () => {
      console.log("[WS] Connected to Yahoo Finance WebSocket.");
      // 기존 구독 종목 재구독
      const allTickers = Array.from(tickerToClients.keys());
      if (allTickers.length > 0) {
        yahooWs?.send(JSON.stringify({ subscribe: allTickers }));
      }
    });

    yahooWs.on("message", data => {
      try {
        const buffer = Buffer.from(data.toString(), "base64");
        const message = PricingData.decode(buffer);
        const object = PricingData.toObject(message, {
          enums: String,
          longs: Number,
          defaults: true,
          objects: true,
        });

        if (object.id && object.price) {
          const ticker = object.id;
          const price = object.price;

          // 1. 실시간 알림 평가 (Alert Engine) - 실시간 데이터 스트림 기반
          evaluatePriceAlerts(ticker, price);

          // 2. 해당 종목을 구독 중인 클라이언트에게만 브로드캐스트
          const clients = tickerToClients.get(ticker);
          if (clients) {
            const msg = JSON.stringify({ type: "trade", ticker, price });
            Array.from(clients).forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
          }
        }
      } catch (err) {
        // ignore decoding errors
      }
    });

    yahooWs.on("close", () => {
      console.log("[WS] Yahoo Finance WebSocket closed. Reconnecting in 5s...");
      yahooWs = null;
      setTimeout(_connect, 5000);
    });

    yahooWs.on("error", err => {
      console.error("[WS] Yahoo Finance WebSocket error:", err);
    });
  }

  // 외부에서 호출 가능하도록 참조 저장
  _connectToYahoo = _connect;

  function subscribeToYahoo(ticker: string) {
    if (yahooWs && yahooWs.readyState === WebSocket.OPEN) {
      yahooWs.send(JSON.stringify({ subscribe: [ticker] }));
    }
  }

  // Yahoo Finance WebSocket 연결 시작
  _connect();

  // ─── KIS Real-time Polling for Korean Stocks ────────────────────────────────
  // Yahoo WebSocket은 한국 주식을 지원하지 않으므로, KIS API로 폴링하여 브로드캐스트
  setInterval(async () => {
    if (!isKRMarketOpen()) return;

    // 현재 구독 중인 한국 주식 티커들 추출
    const krTickers = Array.from(tickerToClients.keys()).filter(isKoreanTicker);
    if (krTickers.length === 0) return;

    for (const ticker of krTickers) {
      try {
        const quote = await getKisKRQuote(ticker);
        if (quote && quote.price) {
          const clients = tickerToClients.get(ticker);
          if (clients && clients.size > 0) {
            const msg = JSON.stringify({ 
              type: "trade", 
              ticker, 
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent
            });
            Array.from(clients).forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
            // 알림 엔진 평가도 실시간으로 수행
            evaluatePriceAlerts(ticker, quote.price);
          }
        }
        // KIS 초당 요청 제한(20건)을 고려하여 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`[WS] KIS Polling failed for ${ticker}:`, err);
      }
    }
  }, 5000); // 5초마다 한국 주식 시세 폴링
}
