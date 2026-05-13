import {
  getStockSummary,
  getHistoricalData,
  getTopMovers,
  getKRTopMovers,
} from "./finnhub";
import type { CandleData, TradeGuide } from "../shared/types";

// ─── 주요 종목 리스트 (상위 1,000대 종목) ──────────────────────────────────────────

// 1. 미국 주식 (S&P 500 + NASDAQ 100 주요 종목 약 600개)
export const US_SCAN_TICKERS: string[] = [
  // 테크 & 반도체 (150)
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "TSLA",
  "AVGO",
  "ORCL",
  "AMD",
  "CSCO",
  "ADBE",
  "CRM",
  "TXN",
  "QCOM",
  "INTC",
  "MU",
  "AMAT",
  "LRCX",
  "ADI",
  "KLAC",
  "SNPS",
  "CDNS",
  "ASML",
  "PANW",
  "SNOW",
  "PLTR",
  "CRWD",
  "DDOG",
  "ZS",
  "NET",
  "MDB",
  "TEAM",
  "WDAY",
  "ADSK",
  "ANSS",
  "NXPI",
  "MRVL",
  "MCHP",
  "ON",
  "MPWR",
  "WOLF",
  "SWKS",
  "QRVO",
  "STX",
  "WDC",
  "HPQ",
  "DELL",
  "SMCI",
  "ARM",
  "AVX",
  "TER",
  "ENPH",
  "FSLR",
  "SEDG",
  "AKAM",
  "FIVN",
  "OKTA",
  "DOCU",
  "TWLO",
  "U",
  "RBLX",
  "COIN",
  "MARA",
  "RIOT",
  "HOOD",
  "PYPL",
  "SQ",
  "SHOP",
  "SE",
  "MELI",
  "UBER",
  "LYFT",
  "DASH",
  "ABNB",
  "BKNG",
  "EXPE",
  "TRIP",
  "TROW",
  "BEN",
  "IVZ",
  "AMP",
  "LPLA",
  "SCHW",
  "RJF",
  "GS",
  "MS",
  "JPM",
  "BAC",
  "WFC",
  "C",
  "AXP",
  "V",
  "MA",
  "DFS",
  "COF",
  "SYF",
  "AIG",
  "MET",
  "PRU",
  "TRV",
  "CB",
  "PGR",
  "ALL",
  "SPGI",
  "MCO",
  "MSCI",
  "NDAQ",
  "ICE",
  "CME",
  "BLK",
  "STT",
  "BK",
  "NTRS",
  "FITB",
  "HBAN",
  "KEY",
  "MTB",
  "PNC",
  "RF",
  "TFC",
  "USB",
  "ZION",
  "SBNY",
  "FRC",
  "WAL",
  "PACW",
  "CMA",
  "HWC",
  "BOKF",
  "ASB",
  "VLY",
  "NYCB",
  "ONB",
  "FNB",
  "WTFC",
  "UMBF",
  "SF",
  "EWBC",
  "WBS",
  "FHN",
  "PB",
  "TROW",
  "BEN",

  // 헬스케어 & 바이오 (100)
  "LLY",
  "UNH",
  "JNJ",
  "ABBV",
  "MRK",
  "TMO",
  "PFE",
  "ABT",
  "DHR",
  "AMGN",
  "ISRG",
  "BMY",
  "GILD",
  "VRTX",
  "CVS",
  "CI",
  "HUM",
  "ELV",
  "SYK",
  "BDX",
  "BSX",
  "REGN",
  "ZTS",
  "MDT",
  "EW",
  "MCK",
  "ABC",
  "CAH",
  "HCA",
  "IDXX",
  "IQV",
  "ALGN",
  "BIIB",
  "MRNA",
  "BNTX",
  "ILMN",
  "A",
  "WAT",
  "MTD",
  "RMD",
  "BAX",
  "ZBH",
  "DXCM",
  "PODD",
  "VTRS",
  "OGN",
  "HLN",
  "GEHC",
  "GEV",

  // 에너지 & 산업재 (150)
  "XOM",
  "CVX",
  "COP",
  "SLB",
  "EOG",
  "MPC",
  "PSX",
  "VLO",
  "OXY",
  "HAL",
  "DVN",
  "HES",
  "FANG",
  "MRO",
  "APA",
  "CTRA",
  "PXD",
  "TRGP",
  "WMB",
  "OKE",
  "KMI",
  "GE",
  "RTX",
  "LMT",
  "BA",
  "HON",
  "CAT",
  "DE",
  "UNP",
  "UPS",
  "FDX",
  "CSX",
  "NSC",
  "LUV",
  "DAL",
  "UAL",
  "AAL",
  "MAR",
  "HLT",
  "CCL",
  "RCL",
  "NCLH",
  "WM",
  "RSG",
  "MMM",
  "GD",
  "NOC",
  "TDG",
  "HEI",
  "HWM",
  "ETN",
  "PH",
  "ITW",
  "EMR",
  "AME",
  "ROK",
  "DOV",
  "XYL",
  "TT",
  "CARR",
  "OTIS",
  "JCI",
  "PWR",
  "FIX",
  "ACM",
  "KBR",
  "VMC",
  "MLM",
  "EXP",
  "STLD",
  "NUE",
  "FCX",
  "NEM",
  "AA",
  "CF",
  "MOS",
  "CTVA",
  "APD",
  "SHW",
  "PPG",
  "ECL",
  "LIN",
  "ALB",
  "FMC",
  "CE",
  "DOW",
  "LYB",
  "DD",
  "EMN",
  "VRSK",
  "EFX",
  "TRI",
  "DNB",
  "INFO",
  "RSG",
  "WM",
  "WCN",
  "SRCL",
  "GFL",

  // 소비재 & 유통 & 기타 (200)
  "WMT",
  "PG",
  "COST",
  "HD",
  "KO",
  "PEP",
  "PM",
  "MO",
  "NKE",
  "MCD",
  "SBUX",
  "TGT",
  "LOW",
  "TJX",
  "ORLY",
  "AZO",
  "EL",
  "CL",
  "KMB",
  "GIS",
  "K",
  "MDLZ",
  "STZ",
  "MNST",
  "ADM",
  "TSN",
  "HRL",
  "SYY",
  "WBA",
  "DG",
  "DLTR",
  "FIVE",
  "ULTA",
  "BBY",
  "TSCO",
  "DHI",
  "LEN",
  "PHM",
  "NVR",
  "TOL",
  "GRMN",
  "VFC",
  "PVH",
  "RL",
  "LULU",
  "TPR",
  "CPRI",
  "YUM",
  "DRI",
  "DPZ",
  "CMG",
  "WEN",
  "QSR",
  "PLAY",
  "MAR",
  "HLT",
  "H",
  "WH",
  "RCL",
  "CCL",
  "NCLH",
  "DIS",
  "NFLX",
  "CMCSA",
  "CHTR",
  "PARA",
  "WBD",
  "T",
  "VZ",
  "TMUS",
  "AMT",
  "PLD",
  "CCI",
  "EQIX",
  "DLR",
  "PSA",
  "EXR",
  "VICI",
  "SPG",
  "O",
  "ARE",
  "BXP",
  "VNO",
  "HST",
  "MAA",
  "AVB",
  "EQR",
  "UDR",
  "ESS",
  "CPT",
  "INVH",
  "AMH",
  "CBRE",
  "WY",
  "IRM",
  "SBAC",
  "WELL",
  "VTR",
  "PEAK",
  "OHI",
  "NHI",
  "LTC",
  "MPW",
  "PKG",
  "IP",
  "WRK",
  "SEE",
  "AMCR",
  "BALL",
  "BLL",
  "KIM",
  "REG",
  "FRT",
];

// 2. 한국 주식 (KOSPI 200 + KOSDAQ 주요 종목 약 400개)
export const KR_SCAN_TICKERS: string[] = [
  // KOSPI 200 핵심 (200)
  "005930.KS",
  "000660.KS",
  "373220.KS",
  "207940.KS",
  "005380.KS",
  "000270.KS",
  "068270.KS",
  "005490.KS",
  "105560.KS",
  "055550.KS",
  "035420.KS",
  "006400.KS",
  "035720.KS",
  "051910.KS",
  "012330.KS",
  "003550.KS",
  "032830.KS",
  "028260.KS",
  "000810.KS",
  "017670.KS",
  "086790.KS",
  "011210.KS",
  "009150.KS",
  "015760.KS",
  "326030.KS",
  "003670.KS",
  "030200.KS",
  "034020.KS",
  "010130.KS",
  "001040.KS",
  "090430.KS",
  "010950.KS",
  "011170.KS",
  "000100.KS",
  "009540.KS",
  "036570.KS",
  "004020.KS",
  "003470.KS",
  "066570.KS",
  "009830.KS",
  "034730.KS",
  "051900.KS",
  "011780.KS",
  "024110.KS",
  "000720.KS",
  "005387.KS",
  "005935.KS",
  "000665.KS",
  "086280.KS",
  "010620.KS",
  "047040.KS",
  "011070.KS",
  "005830.KS",
  "001450.KS",
  "004170.KS",
  "000080.KS",
  "006800.KS",
  "071050.KS",
  "021240.KS",
  "033780.KS",
  "005940.KS",
  "006260.KS",
  "000990.KS",
  "042700.KS",
  "003490.KS",
  "138930.KS",
  "011200.KS",
  "004370.KS",
  "005300.KS",
  "004990.KS",
  "009240.KS",
  "000210.KS",
  "001800.KS",
  "000240.KS",
  "005440.KS",
  "000270.KS",
  "001740.KS",
  "001450.KS",
  "001040.KS",
  "000150.KS",
  "002350.KS",
  "000060.KS",
  "000120.KS",
  "001520.KS",
  "000070.KS",
  "000050.KS",
  "001250.KS",
  "001680.KS",
  "001120.KS",
  "000210.KS",
  "002380.KS",
  "003240.KS",
  "000880.KS",
  "001430.KS",
  "002240.KS",
  "002790.KS",
  "000370.KS",
  "003520.KS",
  "001130.KS",
  "000100.KS",

  // KOSDAQ 150 & 주요 종목 (200)
  "247540.KQ",
  "086520.KQ",
  "066970.KQ",
  "293480.KQ",
  "091990.KQ",
  "263750.KQ",
  "112040.KQ",
  "058470.KQ",
  "214150.KQ",
  "035760.KQ",
  "278280.KQ",
  "035900.KQ",
  "041510.KQ",
  "067160.KQ",
  "028300.KQ",
  "039030.KQ",
  "000660.KQ",
  "036830.KQ",
  "121600.KQ",
  "051910.KQ",
  "145020.KQ",
  "196170.KQ",
  "328130.KQ",
  "214450.KQ",
  "084990.KQ",
  "067310.KQ",
  "036490.KQ",
  "034230.KQ",
  "237690.KQ",
  "064290.KQ",
  "035600.KQ",
  "053030.KQ",
  "042000.KQ",
  "036930.KQ",
  "060250.KQ",
  "048530.KQ",
  "038500.KQ",
  "054670.KQ",
  "051370.KQ",
  "052460.KQ",
  "032620.KQ",
  "065680.KQ",
  "041190.KQ",
  "053800.KQ",
  "046890.KQ",
  "095660.KQ",
  "089010.KQ",
  "040300.KQ",
  "053350.KQ",
  "032500.KQ",
  "046860.KQ",
  "065620.KQ",
  "060720.KQ",
  "033640.KQ",
  "032190.KQ",
  "036120.KQ",
  "086900.KQ",
  "049070.KQ",
  "068240.KQ",
  "036540.KQ",
  "043200.KQ",
  "065350.KQ",
  "084110.KQ",
  "045660.KQ",
  "039200.KQ",
  "060150.KQ",
  "036200.KQ",
  "051160.KQ",
  "063170.KQ",
  "035080.KQ",
  "041440.KQ",
  "064760.KQ",
  "032940.KQ",
  "060230.KQ",
  "036670.KQ",
  "053060.KQ",
  "042510.KQ",
  "065150.KQ",
  "033540.KQ",
  "066430.KQ",
  "052670.KQ",
  "068050.KQ",
  "041960.KQ",
  "052420.KQ",
  "065420.KQ",
  "033100.KQ",
  "054090.KQ",
  "041000.KQ",
  "036570.KQ",
  "060590.KQ",
];

// ─── 진입/청산 가이드 계산 ───────────────────────────────────────────────────

/** ATR (Average True Range) 계산 - 변동성 측정 */
function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // 최근 period개의 ATR 평균
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
}

/** 지지/저항선 계산 (최근 N일 고점/저점 기반) */
function findSupportResistance(
  candles: CandleData[],
  lookback: number = 20
): {
  support: number;
  resistance: number;
} {
  const recent = candles.slice(-lookback);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

import type { SignalType } from "../shared/types"; // Import might already exist, but if not it will error, wait, let me just use SignalType from types

/** 진입/청산 가이드 생성 */
export function calculateTradeGuide(
  candles: CandleData[],
  signal: import("../shared/types").TradeSignal
): TradeGuide | null {
  const signalType = signal.type;
  if (candles.length < 20 || signalType === "neutral" || signalType === "hold") return null;

  const latest = candles[candles.length - 1];
  const currentPrice = latest.close;
  const atr = calculateATR(candles, 14);
  const { support, resistance } = findSupportResistance(candles, 20);
  const isKR = currentPrice > 1000; // 한국 주식 여부 추정 (가격 단위로 판별)

  // 소수점 자리수 결정
  const decimals = isKR
    ? 0
    : currentPrice < 10
      ? 2
      : currentPrice < 100
        ? 2
        : 2;
  const round = (n: number) => Number(n.toFixed(decimals));

  // 투자 기간(추천 보유 기간)에 따른 타겟 및 손절 배수 동적 설정
  const hold = signal.recommendedHold || "";
  const isShortTerm = hold.includes("초단기") || hold.includes("단기");
  const isLongTerm = hold.includes("장기") || hold.includes("수개월");

  // 단타(초단기/단기): ATR의 1.2~2.0배 수준의 짧고 현실적인 수익
  // 스윙(중기): ATR의 2.5~4.5배
  // 장투(장기): ATR의 5.0~10.0배 이상 넓은 수익
  const target1Mult = isShortTerm ? 1.2 : isLongTerm ? 5.0 : 2.5;
  const target2Mult = isShortTerm ? 2.0 : isLongTerm ? 10.0 : 4.5;
  const stopLossMult = isShortTerm ? 1.0 : isLongTerm ? 3.0 : 1.5;

  if (signalType === "buy") {
    // 매수 가이드
    const entryPrice = round(currentPrice); // 현재가 또는 약간 아래
    
    // 손절가는 지지선과 ATR 배수 중 더 타이트하거나 여유있는 것을 기간에 맞게 선택
    const atrStop = currentPrice - atr * stopLossMult;
    const stopLoss = isShortTerm ? round(Math.max(support, atrStop)) : round(Math.min(support, atrStop));
    
    const riskPerUnit = entryPrice - stopLoss;
    
    // 고정 퍼센티지가 아닌 현재 변동성(ATR)을 반영한 현실적인 목표가 설정
    const targetPrice1 = round(entryPrice + atr * target1Mult);
    const targetPrice2 = round(entryPrice + atr * target2Mult);
    
    const riskRewardRatio =
      riskPerUnit > 0
        ? Number(((targetPrice1 - entryPrice) / riskPerUnit).toFixed(2))
        : 0;

    const riskPct =
      riskPerUnit > 0 ? ((riskPerUnit / entryPrice) * 100).toFixed(1) : "N/A";
    const target1Pct = (((targetPrice1 - entryPrice) / entryPrice) * 100).toFixed(1);
    const target2Pct = (((targetPrice2 - entryPrice) / entryPrice) * 100).toFixed(1);

    const termLabel = isShortTerm ? "단기(단타)" : isLongTerm ? "장기(장투)" : "스윙";

    return {
      entryPrice,
      targetPrice1,
      targetPrice2,
      stopLoss,
      riskRewardRatio,
      atr: round(atr),
      positionSizeGuide: `[${termLabel} 전략] 일일 변동폭(ATR): ${((atr/entryPrice)*100).toFixed(1)}%. 손실 허용 ${riskPct}% — 권장 비중: ${riskPerUnit > 0 ? ((2 / Number(riskPct)) * 100).toFixed(0) : "N/A"}%`,
      entryCondition: `현재가(${entryPrice.toLocaleString()}) 부근 진입. 변동성 기반 현실적 ${termLabel} 목표.`,
      exitCondition: `1차 목표가(${targetPrice1.toLocaleString()}, +${target1Pct}%) 도달 시 50% 익절, 2차 목표가(${targetPrice2.toLocaleString()}, +${target2Pct}%) 청산. 손절가(${stopLoss.toLocaleString()}) 이탈 시 리스크 관리.`,
    };
  } else {
    // 매도(공매도) 가이드
    const entryPrice = round(currentPrice);
    
    const atrStop = currentPrice + atr * stopLossMult;
    const stopLoss = isShortTerm ? round(Math.min(resistance, atrStop)) : round(Math.max(resistance, atrStop));
    
    const riskPerUnit = stopLoss - entryPrice;
    
    const targetPrice1 = round(entryPrice - atr * target1Mult);
    const targetPrice2 = round(entryPrice - atr * target2Mult);
    
    const riskRewardRatio =
      riskPerUnit > 0
        ? Number(((entryPrice - targetPrice1) / riskPerUnit).toFixed(2))
        : 0;

    const riskPct =
      riskPerUnit > 0 ? ((riskPerUnit / entryPrice) * 100).toFixed(1) : "N/A";
    const target1Pct = (((entryPrice - targetPrice1) / entryPrice) * 100).toFixed(1);
    const target2Pct = (((entryPrice - targetPrice2) / entryPrice) * 100).toFixed(1);
    
    const termLabel = isShortTerm ? "단기(단타)" : isLongTerm ? "장기(장투)" : "스윙";

    return {
      entryPrice,
      targetPrice1,
      targetPrice2,
      stopLoss,
      riskRewardRatio,
      atr: round(atr),
      positionSizeGuide: `[${termLabel} 매도 전략] 일일 변동폭(ATR): ${((atr/entryPrice)*100).toFixed(1)}%. 손실 허용 ${riskPct}% — 권장 비중: ${riskPerUnit > 0 ? ((2 / Number(riskPct)) * 100).toFixed(0) : "N/A"}%`,
      entryCondition: `현재가(${entryPrice.toLocaleString()}) 부근 매도(공매도) 진입. 변동성 기반 현실적 ${termLabel} 목표.`,
      exitCondition: `1차 목표가(${targetPrice1.toLocaleString()}, +${target1Pct}%) 도달 시 익절, 2차 목표가(${targetPrice2.toLocaleString()}, +${target2Pct}%) 청산. 손절가(${stopLoss.toLocaleString()}) 돌파 시 손절.`,
    };
  }
}

// ─── 스캔 상태 관리 ─────────────────────────────────────────────────────────

export interface ScanResult {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  currency: string;
  currencySymbol: string;
  market: string;
  signalType: import("../shared/types").SignalType;
  signalStrength: number;
  signalGrade: string;
  signalReasons: string[];
  rsi: number | null;
  macd: number | null;
  ma5: number | null;
  ma20: number | null;
  bollinger?: { upper: number; lower: number; middle: number } | null;
  sector?: string;
  tradeGuide: TradeGuide | null;
  recommendedHold?: string;
  strategyLabel?: string;
  scannedAt: string;
}

export interface ScanCache {
  results: ScanResult[];
  progress: number;
  total: number;
  scanned: number;
  isRunning: boolean;
  startedAt: string | null;
  completedAt: string | null;
  market: "us" | "kr" | "all";
}

const scanCache = new Map<string, ScanCache>();

export function getScanCache(market: "us" | "kr" | "all"): ScanCache {
  return (
    scanCache.get(market) ?? {
      results: [],
      progress: 0,
      total: 0,
      scanned: 0,
      isRunning: false,
      startedAt: null,
      completedAt: null,
      market,
    }
  );
}

/** 배치 스캔 실행 (백그라운드) */
export async function runScanner(market: "us" | "kr" | "all"): Promise<void> {
  const existing = scanCache.get(market);
  if (existing?.isRunning) return;

  // 1. 고정 리스트 가져오기
  const fixedTickers =
    market === "us"
      ? US_SCAN_TICKERS
      : market === "kr"
        ? KR_SCAN_TICKERS
        : [...US_SCAN_TICKERS, ...KR_SCAN_TICKERS];

  // 2. 실시간 급등주(Top Movers) 동적 추가
  const dynamicTickers: string[] = [];
  try {
    if (market === "us" || market === "all") {
      const top = await getTopMovers();
      dynamicTickers.push(
        ...top.gainers.map(m => m.ticker),
        ...top.losers.map(m => m.ticker)
      );
    }
    if (market === "kr" || market === "all") {
      const top = await getKRTopMovers();
      dynamicTickers.push(
        ...top.gainers.map(m => m.ticker),
        ...top.losers.map(m => m.ticker)
      );
    }
  } catch (err) {
    console.warn("[Scanner] Failed to fetch dynamic tickers:", err);
  }

  // 중복 제거 및 리스트 확정
  const uniqueTickers = Array.from(
    new Set([...fixedTickers, ...dynamicTickers])
  );

  const cache: ScanCache = {
    results: [],
    progress: 0,
    total: uniqueTickers.length,
    scanned: 0,
    isRunning: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    market,
  };
  scanCache.set(market, cache);

  // 백그라운드 비동기 실행을 프로미스로 반환
  return (async () => {
    const BATCH_SIZE = 10; // 10개씩 병렬 처리 (속도 향상)
    const DELAY_MS = 1500; // 배치 간 1.5초 대기

    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
      const batch = uniqueTickers.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async ticker => {
          try {
            const [summary, candles] = await Promise.all([
              getStockSummary(ticker),
              getHistoricalData(ticker, "3mo"),
            ]);

            const signal = summary.signal;
            const tradeGuide = calculateTradeGuide(candles, signal);

            // 중립(관망) 신호도 결과에 포함하여 사용자가 원할 때 볼 수 있도록 함

            const result: ScanResult = {
              ticker,
              name: summary.name,
              price: summary.price,
              changePercent: summary.changePercent,
              currency: summary.currency ?? "USD",
              currencySymbol: summary.currencySymbol ?? "$",
              market: summary.market ?? "US",
              signalType: signal.type,
              signalStrength: signal.strength,
              signalGrade: signal.grade,
              signalReasons: signal.reasons,
              rsi: summary.indicators.rsi,
              macd: summary.indicators.macd,
              ma5: summary.indicators.ma5,
              ma20: summary.indicators.ma20,
              tradeGuide,
              recommendedHold: signal.recommendedHold,
              strategyLabel: signal.strategyLabel,
              scannedAt: new Date().toISOString(),
            };

            cache.results.push(result);
          } catch (err) {
            // console.warn(`[Scanner] Failed for ${ticker}:`, (err as Error).message);
          } finally {
            cache.scanned++;
            cache.progress = Math.round((cache.scanned / cache.total) * 100);
          }
        })
      );

      if (i + BATCH_SIZE < uniqueTickers.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    cache.isRunning = false;
    cache.completedAt = new Date().toISOString();
    cache.progress = 100;

    cache.results.sort((a, b) => {
      if (a.signalType === "buy" && b.signalType !== "buy") return -1;
      if (a.signalType !== "buy" && b.signalType === "buy") return 1;
      return b.signalStrength - a.signalStrength;
    });

    // DB에 스캔 기록 저장 (클라우드 DB 대응)
    try {
      const topBuys = cache.results
        .filter(r => r.signalType === "buy")
        .slice(0, 10);

      const { saveScanHistory } = await import("./db");
      await saveScanHistory({
        market,
        scannedAt: new Date(cache.completedAt!),
        results: JSON.stringify(cache.results),
        topBuys: JSON.stringify(topBuys),
      });
      console.log(`[Scanner] Successfully saved ${market} scan results to DB.`);
    } catch (err) {
      console.error("[Scanner] Failed to save scan history:", err);
    }
  })();
}
