import type { CandleData } from "../shared/types";

// ─── Backtest Types ─────────────────────────────────────────────────────────

export interface BacktestStrategy {
  name: string;
  type: "rsi" | "macd" | "ma_cross" | "combined" | "bollinger";
  params: {
    bbPeriod?: number; // 볼린저 밴드 기간 (default 20)
    bbStdDev?: number; // 표준편차 배수 (default 2)
    rsiBuyThreshold?: number; // default 30
    rsiSellThreshold?: number; // default 70
    maFastPeriod?: number; // default 5
    maSlowPeriod?: number; // default 20
    initialCapital?: number; // default 10000
    positionSize?: number; // 0-100 percentage, default 100
  };
}

/** 가중치 기반 복합 스코어 계산 */
export function calcCompositeScore(result: BacktestResult): number {
  // 연환산 수익률 계산 (기간에 따라 보정)
  const tradingDays = result.equityCurve.length;
  const years = tradingDays / 252;
  const annualizedReturn =
    years > 0
      ? (Math.pow(1 + result.totalReturn / 100, 1 / years) - 1) * 100
      : result.totalReturn;
  // Score = (연환산수익률*0.4) + (승률*0.4) - (MDD*0.2)
  return (
    annualizedReturn * 0.4 + result.winRate * 0.4 - result.maxDrawdown * 0.2
  );
}

export interface BacktestTrade {
  type: "buy" | "sell";
  date: string;
  price: number;
  reason: string;
  shares: number;
  capital: number;
  portfolioValue: number;
}

export interface BacktestResult {
  ticker: string;
  strategyName: string;
  strategyType: string;
  period: string;
  trades: BacktestTrade[];
  // Performance metrics
  initialCapital: number;
  finalValue: number;
  totalReturn: number; // percentage
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number | null;
  // Equity curve for chart
  equityCurve: { date: string; value: number; drawdown: number }[];
  // Benchmark comparison
  buyAndHoldReturn: number; // percentage
}

// ─── Backtest Engine ────────────────────────────────────────────────────────

export function runBacktest(
  candles: CandleData[],
  strategy: BacktestStrategy,
  ticker: string,
  period: string
): BacktestResult {
  const params = strategy.params;
  const initialCapital = params.initialCapital ?? 10000;
  const positionPct = (params.positionSize ?? 100) / 100;

  let capital = initialCapital;
  let shares = 0;
  let position: "none" | "long" = "none";
  const trades: BacktestTrade[] = [];
  const equityCurve: { date: string; value: number; drawdown: number }[] = [];
  let peakValue = initialCapital;

  // Generate signals based on strategy type
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prev = candles[i - 1];
    const currentValue = capital + shares * candle.close;

    // Track equity curve
    peakValue = Math.max(peakValue, currentValue);
    const drawdown =
      peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;
    equityCurve.push({
      date: candle.date,
      value: Number(currentValue.toFixed(2)),
      drawdown: Number(drawdown.toFixed(2)),
    });

    let buySignal = false;
    let sellSignal = false;
    let reason = "";

    switch (strategy.type) {
      case "rsi":
        buySignal =
          candle.rsi != null && candle.rsi < (params.rsiBuyThreshold ?? 30);
        sellSignal =
          candle.rsi != null && candle.rsi > (params.rsiSellThreshold ?? 70);
        reason = buySignal
          ? `RSI ${candle.rsi?.toFixed(1)} < ${params.rsiBuyThreshold ?? 30} (과매도)`
          : `RSI ${candle.rsi?.toFixed(1)} > ${params.rsiSellThreshold ?? 70} (과매수)`;
        break;

      case "macd":
        if (
          candle.macd != null &&
          candle.macdSignal != null &&
          prev.macd != null &&
          prev.macdSignal != null
        ) {
          const prevDiff = prev.macd - prev.macdSignal;
          const currDiff = candle.macd - candle.macdSignal;
          buySignal = prevDiff <= 0 && currDiff > 0;
          sellSignal = prevDiff >= 0 && currDiff < 0;
          reason = buySignal ? "MACD 골든크로스" : "MACD 데드크로스";
        }
        break;

      case "ma_cross": {
        const fastKey = `ma${params.maFastPeriod ?? 5}` as keyof CandleData;
        const slowKey = `ma${params.maSlowPeriod ?? 20}` as keyof CandleData;
        const currFast = candle[fastKey] as number | null | undefined;
        const currSlow = candle[slowKey] as number | null | undefined;
        const prevFast = prev[fastKey] as number | null | undefined;
        const prevSlow = prev[slowKey] as number | null | undefined;

        if (
          currFast != null &&
          currSlow != null &&
          prevFast != null &&
          prevSlow != null
        ) {
          buySignal = prevFast <= prevSlow && currFast > currSlow;
          sellSignal = prevFast >= prevSlow && currFast < currSlow;
          reason = buySignal
            ? `MA${params.maFastPeriod ?? 5}이 MA${params.maSlowPeriod ?? 20}을 상향 돌파`
            : `MA${params.maFastPeriod ?? 5}이 MA${params.maSlowPeriod ?? 20}을 하향 돌파`;
        }
        break;
      }

      case "bollinger": {
        // Bollinger Band strategy: buy at lower band touch, sell at upper band touch
        const bbLower = candle.bbLower;
        const bbUpper = candle.bbUpper;
        if (bbLower != null && bbUpper != null) {
          buySignal = candle.close <= bbLower;
          sellSignal = candle.close >= bbUpper;
          reason = buySignal
            ? `주가(${candle.close})가 볼린저 하단선(${bbLower.toFixed(2)}) 접촉 - 반등 매수`
            : `주가(${candle.close})가 볼린저 상단선(${bbUpper.toFixed(2)}) 접촉 - 차익 매도`;
        }
        break;
      }

      case "combined": {
        // Combined: RSI + MACD + MA cross
        const rsiBuy =
          candle.rsi != null && candle.rsi < (params.rsiBuyThreshold ?? 35);
        const rsiSell =
          candle.rsi != null && candle.rsi > (params.rsiSellThreshold ?? 65);

        let macdBuy = false;
        let macdSell = false;
        if (
          candle.macd != null &&
          candle.macdSignal != null &&
          prev.macd != null &&
          prev.macdSignal != null
        ) {
          const prevDiff = prev.macd - prev.macdSignal;
          const currDiff = candle.macd - candle.macdSignal;
          macdBuy = prevDiff <= 0 && currDiff > 0;
          macdSell = prevDiff >= 0 && currDiff < 0;
        }

        const maBuy =
          candle.ma5 != null &&
          candle.ma20 != null &&
          candle.close > candle.ma5 &&
          candle.close > candle.ma20;
        const maSell =
          candle.ma5 != null &&
          candle.ma20 != null &&
          candle.close < candle.ma5 &&
          candle.close < candle.ma20;

        // Buy if at least 2 of 3 signals agree
        const buyCount = [rsiBuy, macdBuy, maBuy].filter(Boolean).length;
        const sellCount = [rsiSell, macdSell, maSell].filter(Boolean).length;

        buySignal = buyCount >= 2;
        sellSignal = sellCount >= 2;

        const reasons: string[] = [];
        if (buySignal) {
          if (rsiBuy) reasons.push(`RSI ${candle.rsi?.toFixed(1)} 과매도`);
          if (macdBuy) reasons.push("MACD 골든크로스");
          if (maBuy) reasons.push("MA 상승추세");
        } else if (sellSignal) {
          if (rsiSell) reasons.push(`RSI ${candle.rsi?.toFixed(1)} 과매수`);
          if (macdSell) reasons.push("MACD 데드크로스");
          if (maSell) reasons.push("MA 하락추세");
        }
        reason = reasons.join(" + ");
        break;
      }
    }

    // Execute trades
    if (buySignal && position === "none" && capital > 0) {
      const investAmount = capital * positionPct;
      const buyShares = Math.floor(investAmount / candle.close);
      if (buyShares > 0) {
        const cost = buyShares * candle.close;
        capital -= cost;
        shares += buyShares;
        position = "long";
        trades.push({
          type: "buy",
          date: candle.date,
          price: candle.close,
          reason,
          shares: buyShares,
          capital: Number(capital.toFixed(2)),
          portfolioValue: Number((capital + shares * candle.close).toFixed(2)),
        });
      }
    } else if (sellSignal && position === "long" && shares > 0) {
      const revenue = shares * candle.close;
      capital += revenue;
      const soldShares = shares;
      shares = 0;
      position = "none";
      trades.push({
        type: "sell",
        date: candle.date,
        price: candle.close,
        reason,
        shares: soldShares,
        capital: Number(capital.toFixed(2)),
        portfolioValue: Number(capital.toFixed(2)),
      });
    }
  }

  // Final portfolio value
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const finalValue = Number((capital + shares * lastPrice).toFixed(2));
  const totalReturn = Number(
    (((finalValue - initialCapital) / initialCapital) * 100).toFixed(2)
  );

  // Buy and hold comparison
  const firstPrice = candles.length > 0 ? candles[0].close : 0;
  const buyAndHoldReturn =
    firstPrice > 0
      ? Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2))
      : 0;

  // Win/loss calculation
  let winningTrades = 0;
  let losingTrades = 0;
  for (let i = 0; i < trades.length - 1; i += 2) {
    if (trades[i].type === "buy" && trades[i + 1]?.type === "sell") {
      if (trades[i + 1].price > trades[i].price) {
        winningTrades++;
      } else {
        losingTrades++;
      }
    }
  }
  const totalCompleteTrades = winningTrades + losingTrades;
  const winRate =
    totalCompleteTrades > 0
      ? Number(((winningTrades / totalCompleteTrades) * 100).toFixed(1))
      : 0;

  // Max drawdown
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    maxDrawdown = Math.max(maxDrawdown, point.drawdown);
  }

  // Simplified Sharpe ratio (annualized)
  let sharpeRatio: number | null = null;
  if (equityCurve.length > 1) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret =
        (equityCurve[i].value - equityCurve[i - 1].value) /
        equityCurve[i - 1].value;
      dailyReturns.push(ret);
    }
    const avgReturn =
      dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Number(((avgReturn / stdDev) * Math.sqrt(252)).toFixed(2));
    }
  }

  return {
    ticker,
    strategyName: strategy.name,
    strategyType: strategy.type,
    period,
    trades,
    initialCapital,
    finalValue,
    totalReturn,
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    sharpeRatio,
    equityCurve,
    buyAndHoldReturn,
  };
}

// ─── Grid Search Optimizer ──────────────────────────────────────────────────

export type OptimizeObjective = "totalReturn" | "winRate" | "sharpeRatio";

export interface OptimizeParams {
  strategyType: "rsi" | "macd" | "ma_cross" | "combined" | "bollinger" | "all";
  objective: OptimizeObjective;
  topN?: number; // 상위 N개 결과 반환 (default 5)
}

export interface OptimizeResult {
  rank: number;
  params: BacktestStrategy["params"];
  strategyType: string;
  strategyName: string;
  totalReturn: number;
  winRate: number;
  sharpeRatio: number | null;
  maxDrawdown: number;
  totalTrades: number;
  finalValue: number;
  compositeScore: number; // 가중치 기반 복합 스코어
  // 백테스트 전체 결과 (1위만 포함)
  fullResult?: BacktestResult;
}

export interface GridSearchResult {
  results: OptimizeResult[];
  totalCombinations: number;
  aiRecommended: OptimizeResult | null; // 가중치 스코어 최고 전략
}

/** 볼린저 밴드 전략 파라미터 그리드 */
function getBollingerGrid(): BacktestStrategy["params"][] {
  const grid: BacktestStrategy["params"][] = [];
  const periods = [15, 20, 25];
  const stdDevs = [1.5, 2, 2.5];
  for (const period of periods) {
    for (const std of stdDevs) {
      grid.push({ bbPeriod: period, bbStdDev: std });
    }
  }
  return grid;
}

/** RSI 전략 파라미터 그리드 */
function getRsiGrid(): BacktestStrategy["params"][] {
  const grid: BacktestStrategy["params"][] = [];
  const buyThresholds = [20, 25, 30, 35, 40];
  const sellThresholds = [60, 65, 70, 75, 80];
  for (const buy of buyThresholds) {
    for (const sell of sellThresholds) {
      if (sell > buy + 20) {
        // 최소 20 간격 보장
        grid.push({ rsiBuyThreshold: buy, rsiSellThreshold: sell });
      }
    }
  }
  return grid;
}

/** MA 크로스 전략 파라미터 그리드 */
function getMaCrossGrid(): BacktestStrategy["params"][] {
  const grid: BacktestStrategy["params"][] = [];
  const fastPeriods = [3, 5, 7, 10];
  const slowPeriods = [15, 20, 30, 60];
  for (const fast of fastPeriods) {
    for (const slow of slowPeriods) {
      if (slow > fast * 2) {
        // 슬로우는 패스트의 2배 이상
        grid.push({ maFastPeriod: fast, maSlowPeriod: slow });
      }
    }
  }
  return grid;
}

/** Combined 전략 파라미터 그리드 */
function getCombinedGrid(): BacktestStrategy["params"][] {
  const grid: BacktestStrategy["params"][] = [];
  const buyThresholds = [25, 30, 35, 40];
  const sellThresholds = [60, 65, 70];
  const fastPeriods = [5, 7, 10];
  const slowPeriods = [20, 30];
  for (const buy of buyThresholds) {
    for (const sell of sellThresholds) {
      for (const fast of fastPeriods) {
        for (const slow of slowPeriods) {
          if (sell > buy + 20 && slow > fast * 2) {
            grid.push({
              rsiBuyThreshold: buy,
              rsiSellThreshold: sell,
              maFastPeriod: fast,
              maSlowPeriod: slow,
            });
          }
        }
      }
    }
  }
  return grid;
}

/** 목표 지표 값 추출 */
function getObjectiveValue(
  result: BacktestResult,
  objective: OptimizeObjective
): number {
  switch (objective) {
    case "totalReturn":
      return result.totalReturn;
    case "winRate":
      return result.winRate;
    case "sharpeRatio":
      return result.sharpeRatio ?? -999;
  }
}

/**
 * 그리드 서치로 최적 파라미터 탐색
 * - 전략 타입에 따라 파라미터 조합을 자동 생성
 * - 각 조합으로 백테스트 실행 후 목표 지표 기준 정렬
 * - 상위 N개 결과 반환
 */
export function runGridSearch(
  candles: CandleData[],
  ticker: string,
  period: string,
  opts: OptimizeParams
): GridSearchResult {
  const { strategyType, objective, topN = 5 } = opts;

  // 파라미터 그리드 생성 (all이면 모든 전략 탐색)
  type StrategyEntry = {
    type: BacktestStrategy["type"];
    params: BacktestStrategy["params"];
  };
  let strategyEntries: StrategyEntry[];

  if (strategyType === "all") {
    strategyEntries = [
      ...getRsiGrid().map(p => ({ type: "rsi" as const, params: p })),
      ...getMaCrossGrid().map(p => ({ type: "ma_cross" as const, params: p })),
      ...getCombinedGrid().map(p => ({ type: "combined" as const, params: p })),
      ...getBollingerGrid().map(p => ({
        type: "bollinger" as const,
        params: p,
      })),
      [{ type: "macd" as const, params: {} }][0],
    ];
  } else {
    let paramGrid: BacktestStrategy["params"][];
    if (strategyType === "rsi") paramGrid = getRsiGrid();
    else if (strategyType === "ma_cross") paramGrid = getMaCrossGrid();
    else if (strategyType === "combined") paramGrid = getCombinedGrid();
    else if (strategyType === "bollinger") paramGrid = getBollingerGrid();
    else paramGrid = [{}]; // MACD
    strategyEntries = paramGrid.map(p => ({
      type: strategyType as BacktestStrategy["type"],
      params: p,
    }));
  }

  const totalCombinations = strategyEntries.length;
  const allResults: {
    type: BacktestStrategy["type"];
    params: BacktestStrategy["params"];
    result: BacktestResult;
  }[] = [];

  for (const entry of strategyEntries) {
    const strategy: BacktestStrategy = {
      name: `${entry.type.toUpperCase()} 최적화`,
      type: entry.type,
      params: { ...entry.params, initialCapital: 10000, positionSize: 100 },
    };
    try {
      const result = runBacktest(candles, strategy, ticker, period);
      if (result.totalTrades >= 2) {
        allResults.push({ type: entry.type, params: entry.params, result });
      }
    } catch {
      // 개별 조합 실패는 무시
    }
  }

  // 가중치 복합 스코어 계산
  const withScores = allResults.map(item => ({
    ...item,
    compositeScore: calcCompositeScore(item.result),
  }));

  // 목표 지표 기준 내림차순 정렬
  withScores.sort((a, b) => {
    const aVal = getObjectiveValue(a.result, objective);
    const bVal = getObjectiveValue(b.result, objective);
    return bVal - aVal;
  });

  // 가중치 스코어 기준으로 AI 추천 전략 선정
  const aiRecommendedRaw = [...withScores].sort(
    (a, b) => b.compositeScore - a.compositeScore
  )[0];

  // 상위 N개 추출
  const topResults = withScores.slice(0, topN);

  const optimizeResults: OptimizeResult[] = topResults.map((item, idx) => ({
    rank: idx + 1,
    params: item.params,
    strategyType: item.type,
    strategyName: formatStrategyName(item.type, item.params),
    totalReturn: item.result.totalReturn,
    winRate: item.result.winRate,
    sharpeRatio: item.result.sharpeRatio,
    maxDrawdown: item.result.maxDrawdown,
    totalTrades: item.result.totalTrades,
    finalValue: item.result.finalValue,
    compositeScore: item.compositeScore,
    fullResult: idx === 0 ? item.result : undefined,
  }));

  const aiRecommended: OptimizeResult | null = aiRecommendedRaw
    ? {
        rank: 0,
        params: aiRecommendedRaw.params,
        strategyType: aiRecommendedRaw.type,
        strategyName: formatStrategyName(
          aiRecommendedRaw.type,
          aiRecommendedRaw.params
        ),
        totalReturn: aiRecommendedRaw.result.totalReturn,
        winRate: aiRecommendedRaw.result.winRate,
        sharpeRatio: aiRecommendedRaw.result.sharpeRatio,
        maxDrawdown: aiRecommendedRaw.result.maxDrawdown,
        totalTrades: aiRecommendedRaw.result.totalTrades,
        finalValue: aiRecommendedRaw.result.finalValue,
        compositeScore: aiRecommendedRaw.compositeScore,
        fullResult: aiRecommendedRaw.result,
      }
    : null;

  return { results: optimizeResults, totalCombinations, aiRecommended };
}

/** 파라미터 조합을 읽기 쉬운 이름으로 변환 */
function formatStrategyName(
  type: string,
  params: BacktestStrategy["params"]
): string {
  switch (type) {
    case "rsi":
      return `RSI(매수<${params.rsiBuyThreshold ?? 30}, 매도>${params.rsiSellThreshold ?? 70})`;
    case "ma_cross":
      return `MA크로스(${params.maFastPeriod ?? 5}/${params.maSlowPeriod ?? 20})`;
    case "combined":
      return `복합(RSI ${params.rsiBuyThreshold ?? 35}/${params.rsiSellThreshold ?? 65}, MA ${params.maFastPeriod ?? 5}/${params.maSlowPeriod ?? 20})`;
    case "bollinger":
      return `볼린저(${params.bbPeriod ?? 20}일, ±${params.bbStdDev ?? 2}σ)`;
    default:
      return "MACD 크로스오버";
  }
}

// ─── Backtest Result Persistence & Python Integration ────────────────────────

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

/** 백테스트 결과 JSON 저장 경로 */
const BACKTEST_RESULT_DIR = path.resolve(
  process.cwd(),
  "server",
  "backtest_results"
);

/**
 * 백테스트 결과를 JSON 파일로 저장합니다.
 * Python signal_analysis.py 스크립트가 이 파일을 읽어 분석을 수행합니다.
 *
 * @param result - 저장할 백테스트 결과 객체
 * @returns 저장된 파일 경로
 */
export function saveBacktestResult(result: BacktestResult): string {
  // 디렉토리가 없으면 생성
  if (!fs.existsSync(BACKTEST_RESULT_DIR)) {
    fs.mkdirSync(BACKTEST_RESULT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backtest_${result.ticker}_${result.strategyType}_${timestamp}.json`;
  const filePath = path.join(BACKTEST_RESULT_DIR, filename);

  // 분석에 필요한 신호 성과 데이터 형식으로 변환
  const analysisData = result.trades.reduce<
    {
      entryDate: string;
      entryPrice: number;
      exitDate?: string;
      exitPrice?: number;
      signalStrength: number;
      returnPct: number;
    }[]
  >((acc, trade, idx) => {
    if (trade.type === "buy") {
      const nextSell = result.trades[idx + 1];
      if (nextSell?.type === "sell") {
        const returnPct = ((nextSell.price - trade.price) / trade.price) * 100;
        acc.push({
          entryDate: trade.date,
          entryPrice: trade.price,
          exitDate: nextSell.date,
          exitPrice: nextSell.price,
          signalStrength: Math.round(Math.abs(returnPct) * 5), // 임시 강도 추정
          returnPct: Number(returnPct.toFixed(2)),
        });
      }
    }
    return acc;
  }, []);

  const output = {
    ticker: result.ticker,
    strategyName: result.strategyName,
    strategyType: result.strategyType,
    period: result.period,
    summary: {
      totalReturn: result.totalReturn,
      winRate: result.winRate,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
      totalTrades: result.totalTrades,
    },
    trades: analysisData,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`[Backtest] 결과 저장: ${filePath}`);
  return filePath;
}

/**
 * Python signal_analysis.py 스크립트를 호출하여 신호 강도 분석을 수행합니다.
 * Node.js child_process 모듈을 사용하여 Python 스크립트를 실행하고 stdout을 수집합니다.
 *
 * @param jsonFilePath - 백테스트 결과 JSON 파일 경로 (saveBacktestResult 반환값)
 * @returns Python 스크립트의 분석 결과 텍스트
 */
export async function runSignalAnalysis(jsonFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(
      process.cwd(),
      "server",
      "signal_analysis.py"
    );

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`signal_analysis.py를 찾을 수 없습니다: ${scriptPath}`));
      return;
    }

    if (!fs.existsSync(jsonFilePath)) {
      reject(
        new Error(`백테스트 JSON 파일을 찾을 수 없습니다: ${jsonFilePath}`)
      );
      return;
    }

    const pythonExecutable =
      process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonExecutable, [scriptPath, jsonFilePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code !== 0) {
        console.error(
          `[SignalAnalysis] Python 스크립트 오류 (코드 ${code}):`,
          stderr
        );
        reject(
          new Error(`Python 스크립트 실행 실패 (종료 코드 ${code}): ${stderr}`)
        );
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err: Error) => {
      console.error("[SignalAnalysis] Python 프로세스 실행 오류:", err);
      reject(
        new Error(
          `Python 실행 오류: ${err.message}. Python이 설치되어 있는지 확인하세요.`
        )
      );
    });

    // 30초 타임아웃
    setTimeout(() => {
      proc.kill();
      reject(new Error("Python 스크립트 실행 시간 초과 (30초)"));
    }, 30000);
  });
}
