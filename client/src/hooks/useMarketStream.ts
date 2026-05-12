import { useState, useEffect, useRef, useCallback } from "react";

interface PriceUpdate {
  price: number;
  direction: "up" | "down" | "same";
}

export function useMarketStream(
  tickers: string[]
): Record<string, PriceUpdate> {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const prevPricesRef = useRef<Record<string, number>>({});
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0); // 지수 백오프용 재시도 카운터
  const tickersKey = tickers.join(",");
  const tickersRef = useRef<string[]>(tickers);

  // tickers 최신값 항상 유지
  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickersKey]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected to market stream");
      // 연결 성공 시 재시도 카운터 초기화
      retryCountRef.current = 0;
      // 현재 구독 중인 모든 티커 재구독
      tickersRef.current.forEach(ticker => {
        ws.send(JSON.stringify({ type: "subscribe", ticker }));
      });
    };

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "trade" && data.ticker && data.price) {
          const prevPrice = prevPricesRef.current[data.ticker];
          const direction: "up" | "down" | "same" =
            prevPrice === undefined
              ? "same"
              : data.price > prevPrice
                ? "up"
                : data.price < prevPrice
                  ? "down"
                  : "same";

          prevPricesRef.current[data.ticker] = data.price;

          setPrices(prev => ({
            ...prev,
            [data.ticker]: { price: data.price, direction },
          }));
        }
      } catch {
        // parse error
      }
    };

    ws.onclose = () => {
      // 지수 백오프 전략: 최소 3초, 최대 30초 간격으로 재연결
      const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;
      console.log(
        `[WS] Disconnected. Reconnecting in ${delay / 1000}s... (attempt ${retryCountRef.current})`
      );
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [tickersKey]);

  const lastTickersRef = useRef<string>("");

  useEffect(() => {
    if (tickers.length === 0) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    if (
      tickersKey === lastTickersRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    lastTickersRef.current = tickersKey;
    connect();

    return () => {
      // Don't close immediately on every re-render unless tickers actually changed
    };
  }, [tickersKey, connect]);

  // Handle cleanup on unmount only
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        console.log("[WS] Closing on unmount");
        // 언마운트 시 구독 중인 모든 티커에 unsubscribe 메시지 전송
        if (wsRef.current.readyState === WebSocket.OPEN) {
          tickersRef.current.forEach(ticker => {
            wsRef.current!.send(
              JSON.stringify({ type: "unsubscribe", ticker })
            );
          });
        }
        wsRef.current.close();
      }
    };
  }, []);

  // When tickers change, subscribe new ones and unsubscribe removed ones
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      tickers.forEach(ticker => {
        wsRef.current!.send(JSON.stringify({ type: "subscribe", ticker }));
      });
    }
  }, [tickersKey]);

  return prices;
}
