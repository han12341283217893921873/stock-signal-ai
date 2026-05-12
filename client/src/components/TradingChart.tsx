import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type ISeriesMarkersPluginApi,
} from "lightweight-charts";

export interface CandleInput {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  rsi?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHistogram?: number | null;
  bbUpper?: number | null;
  bbMiddle?: number | null;
  bbLower?: number | null;
}

interface TradingChartProps {
  data: CandleInput[];
  isKR?: boolean;
  showBB?: boolean;
  height?: number;
  realtimePrice?: number;
  markers?: Array<{
    time: Time;
    position: "aboveBar" | "belowBar" | "inBar";
    color: string;
    shape: "arrowUp" | "arrowDown" | "circle" | "square";
    text?: string;
  }>;
  priceLines?: Array<{
    price: number;
    color: string;
    label: string;
    style?: LineStyle;
  }>;
}

function toTime(dateStr: string): Time {
  return dateStr.slice(0, 10) as Time;
}

function todayAsTime(): Time {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` as Time;
}

const COLORS = {
  bg: "transparent",
  gridLine: "rgba(42, 46, 57, 0.3)",
  text: "rgba(156, 163, 175, 0.8)",
  border: "rgba(42, 46, 57, 0.5)",
  bullCandle: "#22c55e",
  bearCandle: "#ef4444",
  bullWick: "#22c55e",
  bearWick: "#ef4444",
  bullVolume: "rgba(34, 197, 94, 0.35)",
  bearVolume: "rgba(239, 68, 68, 0.35)",
  ma5: "#60a5fa",
  ma20: "#a78bfa",
  ma60: "#f97316",
  bbUpper: "#c084fc",
  bbMiddle: "rgba(192, 132, 252, 0.4)",
  bbLower: "#c084fc",
  rsiLine: "#c084fc",
  rsiOverbought: "rgba(239, 68, 68, 0.3)",
  rsiOversold: "rgba(34, 197, 94, 0.3)",
  macdLine: "#60a5fa",
  macdSignalLine: "#f97316",
  macdHistPos: "rgba(34, 197, 94, 0.5)",
  macdHistNeg: "rgba(239, 68, 68, 0.5)",
  crosshair: "rgba(156, 163, 175, 0.4)",
};

// ─── Chart refs (kept across renders to avoid recreating charts) ─────────────
interface ChartRefs {
  main: IChartApi | null;
  rsi: IChartApi | null;
  macd: IChartApi | null;
  candle: ISeriesApi<"Candlestick"> | null;
  volume: ISeriesApi<"Histogram"> | null;
  ma5: ISeriesApi<"Line"> | null;
  ma20: ISeriesApi<"Line"> | null;
  ma60: ISeriesApi<"Line"> | null;
  bbUpper: ISeriesApi<"Line"> | null;
  bbMiddle: ISeriesApi<"Line"> | null;
  bbLower: ISeriesApi<"Line"> | null;
  rsiLine: ISeriesApi<"Line"> | null;
  macdLine: ISeriesApi<"Line"> | null;
  macdSignal: ISeriesApi<"Line"> | null;
  macdHist: ISeriesApi<"Histogram"> | null;
  candleMarkers: ISeriesMarkersPluginApi<Time> | null;
}

export default function TradingChart({
  data,
  isKR = false,
  showBB = false,
  height = 500,
  realtimePrice,
  markers,
  priceLines,
}: TradingChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<ChartRefs>({
    main: null,
    rsi: null,
    macd: null,
    candle: null,
    volume: null,
    ma5: null,
    ma20: null,
    ma60: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    rsiLine: null,
    macdLine: null,
    macdSignal: null,
    macdHist: null,
    candleMarkers: null,
  });
  const initializedRef = useRef(false);

  const formatPrice = useCallback(
    (price: number) => {
      if (isKR) return Math.round(price).toLocaleString("ko-KR");
      return price.toFixed(2);
    },
    [isKR]
  );

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;
    const candles: CandlestickData[] = [];
    const volumes: HistogramData[] = [];
    const ma5D: LineData[] = [];
    const ma20D: LineData[] = [];
    const ma60D: LineData[] = [];
    const bbUpperD: LineData[] = [];
    const bbMiddleD: LineData[] = [];
    const bbLowerD: LineData[] = [];
    const rsiD: LineData[] = [];
    const macdLineD: LineData[] = [];
    const macdSignalD: LineData[] = [];
    const macdHistD: HistogramData[] = [];

    for (const d of data) {
      const time = toTime(d.date);
      const isUp = d.close >= d.open;
      candles.push({
        time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      });
      volumes.push({
        time,
        value: d.volume,
        color: isUp ? COLORS.bullVolume : COLORS.bearVolume,
      });
      if (d.ma5 != null) ma5D.push({ time, value: d.ma5 });
      if (d.ma20 != null) ma20D.push({ time, value: d.ma20 });
      if (d.ma60 != null) ma60D.push({ time, value: d.ma60 });
      if (d.bbUpper != null) bbUpperD.push({ time, value: d.bbUpper });
      if (d.bbMiddle != null) bbMiddleD.push({ time, value: d.bbMiddle });
      if (d.bbLower != null) bbLowerD.push({ time, value: d.bbLower });
      if (d.rsi != null) rsiD.push({ time, value: d.rsi });
      if (d.macd != null) macdLineD.push({ time, value: d.macd });
      if (d.macdSignal != null) macdSignalD.push({ time, value: d.macdSignal });
      if (d.macdHistogram != null) {
        macdHistD.push({
          time,
          value: d.macdHistogram,
          color: d.macdHistogram >= 0 ? COLORS.macdHistPos : COLORS.macdHistNeg,
        });
      }
    }

    // ─── 캔들 패턴 분석 (Feature 12) ───
    const patternMarkers: any[] = [];
    for (let i = 2; i < data.length; i++) {
      const curr = data[i];
      const prev = data[i - 1];
      const body = Math.abs(curr.close - curr.open);
      const wickHigh = curr.high - Math.max(curr.open, curr.close);
      const wickLow = Math.min(curr.open, curr.close) - curr.low;
      const range = curr.high - curr.low;

      // Hammer (망치형)
      if (wickLow > body * 2 && wickHigh < body * 0.5) {
        patternMarkers.push({
          time: toTime(curr.date),
          position: "belowBar",
          color: "#22c55e",
          shape: "arrowUp",
          text: "Hammer",
        });
      }
      // Shooting Star (유성형)
      else if (wickHigh > body * 2 && wickLow < body * 0.5) {
        patternMarkers.push({
          time: toTime(curr.date),
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          text: "Star",
        });
      }
      // Bullish Engulfing (상승 장악형)
      else if (
        prev.close < prev.open &&
        curr.close > curr.open &&
        curr.close > prev.open &&
        curr.open < prev.close
      ) {
        patternMarkers.push({
          time: toTime(curr.date),
          position: "belowBar",
          color: "#22c55e",
          shape: "square",
          text: "Engulf",
        });
      }
    }

    return {
      candles,
      volumes,
      ma5D,
      ma20D,
      ma60D,
      bbUpperD,
      bbMiddleD,
      bbLowerD,
      rsiD,
      macdLineD,
      macdSignalD,
      macdHistD,
      patternMarkers,
    };
  }, [data]);

  // ─── Initialize charts ONCE ────────────────────────────────────────────────
  useEffect(() => {
    if (!mainRef.current || !rsiRef.current || !macdRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const mainEl = mainRef.current;
    const mainH = Math.round(height * 0.6);
    const rsiH = Math.round(height * 0.18);
    const macdH = Math.round(height * 0.22);

    const baseOpts = (h: number, showTime = false) => ({
      width: mainEl.clientWidth,
      height: h,
      layout: {
        background: { type: ColorType.Solid as const, color: COLORS.bg },
        textColor: COLORS.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.gridLine },
        horzLines: { color: COLORS.gridLine },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: COLORS.crosshair,
          width: 1 as const,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: COLORS.crosshair,
          width: 1 as const,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: false,
        secondsVisible: false,
        visible: showTime,
      },
    });

    // Main chart
    const main = createChart(mainEl, {
      ...baseOpts(mainH, true),
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.05, bottom: 0.15 },
      },
      localization: { priceFormatter: formatPrice },
    });

    const candle = main.addSeries(CandlestickSeries, {
      upColor: COLORS.bullCandle,
      downColor: COLORS.bearCandle,
      borderUpColor: COLORS.bullCandle,
      borderDownColor: COLORS.bearCandle,
      wickUpColor: COLORS.bullWick,
      wickDownColor: COLORS.bearWick,
    });
    const candleMarkers = createSeriesMarkers(candle);

    const volume = main.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volume
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    const addLine = (
      chart: IChartApi,
      color: string,
      opts?: { lineStyle?: LineStyle; width?: number; lastVisible?: boolean }
    ) => {
      return chart.addSeries(LineSeries, {
        color,
        lineWidth: (opts?.width ?? 1) as any,
        lineStyle: opts?.lineStyle,
        priceLineVisible: false,
        lastValueVisible: opts?.lastVisible ?? false,
        crosshairMarkerVisible: opts?.lastVisible ?? false,
      });
    };

    const ma5S = addLine(main, COLORS.ma5);
    const ma20S = addLine(main, COLORS.ma20);
    const ma60S = addLine(main, COLORS.ma60);
    const bbUpperS = addLine(main, COLORS.bbUpper, {
      lineStyle: LineStyle.Dashed,
    });
    const bbMiddleS = addLine(main, COLORS.bbMiddle, {
      lineStyle: LineStyle.Dotted,
    });
    const bbLowerS = addLine(main, COLORS.bbLower, {
      lineStyle: LineStyle.Dashed,
    });

    // RSI chart
    const rsiChart = createChart(rsiRef.current!, {
      ...baseOpts(rsiH),
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    });
    const rsiLineS = rsiChart.addSeries(LineSeries, {
      color: COLORS.rsiLine,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });
    rsiLineS.createPriceLine({
      price: 70,
      color: COLORS.rsiOverbought,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
    rsiLineS.createPriceLine({
      price: 30,
      color: COLORS.rsiOversold,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });

    // MACD chart
    const macdChart = createChart(macdRef.current!, {
      ...baseOpts(macdH, true),
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });
    const macdHistS = macdChart.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const macdLineS = addLine(macdChart, COLORS.macdLine);
    const macdSignalS = addLine(macdChart, COLORS.macdSignalLine);

    // Store refs
    chartRefs.current = {
      main,
      rsi: rsiChart,
      macd: macdChart,
      candle,
      volume,
      ma5: ma5S,
      ma20: ma20S,
      ma60: ma60S,
      bbUpper: bbUpperS,
      bbMiddle: bbMiddleS,
      bbLower: bbLowerS,
      rsiLine: rsiLineS,
      macdLine: macdLineS,
      macdSignal: macdSignalS,
      macdHist: macdHistS,
      candleMarkers,
    };

    // Sync time scales
    const charts = [main, rsiChart, macdChart];
    let isSyncing = false;
    charts.forEach((source, i) => {
      source.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (isSyncing || !range) return;
        isSyncing = true;
        charts.forEach((target, j) => {
          if (i !== j)
            try {
              target.timeScale().setVisibleLogicalRange(range);
            } catch {
              /* ok */
            }
        });
        isSyncing = false;
      });
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = mainEl.clientWidth;
      charts.forEach(c => c.applyOptions({ width: w }));
    });
    ro.observe(mainEl);

    return () => {
      initializedRef.current = false;
      ro.disconnect();
      chartRefs.current = {
        main: null,
        rsi: null,
        macd: null,
        candle: null,
        volume: null,
        ma5: null,
        ma20: null,
        ma60: null,
        bbUpper: null,
        bbMiddle: null,
        bbLower: null,
        rsiLine: null,
        macdLine: null,
        macdSignal: null,
        macdHist: null,
        candleMarkers: null,
      };
      main.remove();
      rsiChart.remove();
      macdChart.remove();
    };
  }, [height, formatPrice]); // Only re-init if height/formatter changes

  // ─── Update chart DATA whenever processedData changes ──────────────────────
  useEffect(() => {
    const r = chartRefs.current;
    if (!processedData || !r.candle) return;

    r.candle.setData(processedData.candles);
    r.volume?.setData(processedData.volumes);
    r.ma5?.setData(processedData.ma5D);
    r.ma20?.setData(processedData.ma20D);
    r.ma60?.setData(processedData.ma60D);
    if (showBB) {
      r.bbUpper?.setData(processedData.bbUpperD);
      r.bbMiddle?.setData(processedData.bbMiddleD);
      r.bbLower?.setData(processedData.bbLowerD);
    }
    r.rsiLine?.setData(processedData.rsiD);
    r.macdHist?.setData(processedData.macdHistD);
    r.macdLine?.setData(processedData.macdLineD);
    r.macdSignal?.setData(processedData.macdSignalD);

    const combinedMarkers = [
      ...(markers || []),
      ...(processedData.patternMarkers || []),
    ];
    if (combinedMarkers.length > 0 && r.candleMarkers) {
      r.candleMarkers.setMarkers(combinedMarkers as any);
    } else if (r.candleMarkers) {
      r.candleMarkers.setMarkers([]);
    }

    // Price lines (목표가 / 손절가)
    if (r.candle) {
      const existingLines = (r.candle as any).__priceLines as
        | ReturnType<typeof r.candle.createPriceLine>[]
        | undefined;
      existingLines?.forEach(l => {
        try {
          r.candle!.removePriceLine(l);
        } catch {}
      });
      const newLines = (priceLines ?? []).map(pl =>
        r.candle!.createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: 1,
          lineStyle: pl.style ?? LineStyle.Dashed,
          axisLabelVisible: true,
          title: pl.label,
        })
      );
      (r.candle as any).__priceLines = newLines;
    }

    // Fit content only on first data load
    r.main?.timeScale().fitContent();
    r.rsi?.timeScale().fitContent();
    r.macd?.timeScale().fitContent();
  }, [processedData, showBB, markers, priceLines]);

  // ─── Real-time candle tick update ──────────────────────────────────────────
  useEffect(() => {
    const r = chartRefs.current;
    if (
      !realtimePrice ||
      !r.candle ||
      !processedData ||
      processedData.candles.length === 0
    )
      return;

    const lastCandle = processedData.candles[processedData.candles.length - 1];
    const todayTime = todayAsTime();

    if (lastCandle.time === todayTime) {
      // Update today's candle
      r.candle.update({
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, realtimePrice),
        low: Math.min(lastCandle.low, realtimePrice),
        close: realtimePrice,
      });
      // Update volume bar color
      if (r.volume) {
        const lastVol = processedData.volumes[processedData.volumes.length - 1];
        r.volume.update({
          time: lastCandle.time,
          value: lastVol.value,
          color:
            realtimePrice >= lastCandle.open
              ? COLORS.bullVolume
              : COLORS.bearVolume,
        });
      }
    } else {
      // No candle for today yet — synthesize one
      r.candle.update({
        time: todayTime,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, realtimePrice),
        low: Math.min(lastCandle.close, realtimePrice),
        close: realtimePrice,
      });
    }
  }, [realtimePrice, processedData]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        차트 데이터를 불러올 수 없습니다
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-1 left-2 z-10 flex items-center gap-3 text-[10px] pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-muted-foreground">실시간</span>
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-0.5 inline-block"
            style={{ background: COLORS.ma5 }}
          />{" "}
          MA5
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-0.5 inline-block"
            style={{ background: COLORS.ma20 }}
          />{" "}
          MA20
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-0.5 inline-block"
            style={{ background: COLORS.ma60 }}
          />{" "}
          MA60
        </span>
        {showBB && (
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: COLORS.bbUpper }}
            />{" "}
            BB
          </span>
        )}
      </div>
      <div ref={mainRef} />
      <div className="relative mt-0.5">
        <div className="absolute top-1 left-2 z-10 text-[10px] text-muted-foreground pointer-events-none">
          RSI (14)
        </div>
        <div ref={rsiRef} />
      </div>
      <div className="relative mt-0.5">
        <div className="absolute top-1 left-2 z-10 text-[10px] text-muted-foreground pointer-events-none">
          MACD
        </div>
        <div ref={macdRef} />
      </div>
    </div>
  );
}
