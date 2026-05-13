import {
  getStockSummary,
  getHistoricalData,
  getTopMovers,
  getKRTopMovers,
  isAnyMarketOpen,
} from "./finnhub.js";
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

// ─── 스윙 고/저점 탐색 ────────────────────────────────────────────────────────

/**
 * 피벗 저점(swing low) 탐색: 좌우 N개 봉보다 낮은 최근 저점들을 반환
 * 가장 최근의 유의미한 저점(진입 후보)과 그 아래의 더 강한 지지선을 각각 구한다.
 */
function findSwingLows(
  candles: CandleData[],
  lookback: number = 40,
  wingBars: number = 3
): { recent: number; major: number } {
  const slice = candles.slice(-lookback);
  const pivots: number[] = [];

  for (let i = wingBars; i < slice.length - wingBars; i++) {
    const mid = slice[i].low;
    const leftOk = slice.slice(i - wingBars, i).every(c => c.low >= mid);
    const rightOk = slice.slice(i + 1, i + wingBars + 1).every(c => c.low >= mid);
    if (leftOk && rightOk) pivots.push(mid);
  }

  if (pivots.length === 0) {
    const lows = slice.map(c => c.low);
    return { recent: Math.min(...lows), major: Math.min(...lows) };
  }

  // recent: 가장 마지막 피벗 저점 (진입 직전 저점)
  // major: 피벗들 중 하위 25% 수준 (강한 지지선)
  const sorted = [...pivots].sort((a, b) => a - b);
  return {
    recent: pivots[pivots.length - 1],
    major: sorted[Math.floor(sorted.length * 0.25)] ?? sorted[0],
  };
}

/**
 * 피벗 고점(swing high) 탐색: 최근 주요 저항선과 가장 강한 저항선을 반환
 */
function findSwingHighs(
  candles: CandleData[],
  lookback: number = 60,
  wingBars: number = 3
): { recent: number; major: number } {
  const slice = candles.slice(-lookback);
  const pivots: number[] = [];

  for (let i = wingBars; i < slice.length - wingBars; i++) {
    const mid = slice[i].high;
    const leftOk = slice.slice(i - wingBars, i).every(c => c.high <= mid);
    const rightOk = slice.slice(i + 1, i + wingBars + 1).every(c => c.high <= mid);
    if (leftOk && rightOk) pivots.push(mid);
  }

  if (pivots.length === 0) {
    const highs = slice.map(c => c.high);
    return { recent: Math.max(...highs), major: Math.max(...highs) };
  }

  const sorted = [...pivots].sort((a, b) => b - a);
  return {
    recent: pivots[pivots.length - 1],
    major: sorted[Math.floor(sorted.length * 0.25)] ?? sorted[0],
  };
}

/** 이동평균 계산 */
function calcMA(candles: CandleData[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1].close;
  const slice = candles.slice(-period);
  return slice.reduce((s, c) => s + c.close, 0) / period;
}

/**
 * 피보나치 되돌림 / 확장 레벨 계산
 * swingLow→swingHigh 기준으로 되돌림(진입 후보)과 확장(목표가) 레벨 반환
 */
function calcFibLevels(swingLow: number, swingHigh: number) {
  const range = swingHigh - swingLow;
  return {
    // 되돌림 — 매수 진입 후보
    fib236: swingHigh - range * 0.236,
    fib382: swingHigh - range * 0.382,
    fib500: swingHigh - range * 0.5,
    fib618: swingHigh - range * 0.618,  // 황금비 — 강한 지지
    // 확장 — 목표가 후보
    ext1272: swingHigh + range * 0.272, // 127.2% 확장
    ext1618: swingHigh + range * 0.618, // 161.8% 확장
  };
}

import type { SignalType } from "../shared/types";

/**
 * 스마트 진입가/목표가/손절가 계산
 *
 * 진입가: 현재가가 아닌 기술적으로 의미 있는 저점 부근 (MA20, 피보나치 61.8%, 스윙 저점 중 가장 현실적인 값)
 * 손절가: 진입 직전 스윙 저점 아래 ATR 0.3배 버퍼 (종목별 유동적)
 * 목표가: 피보나치 확장 또는 주요 스윙 고점 (저항선 기반)
 */
export function calculateTradeGuide(
  candles: CandleData[],
  signal: import("../shared/types").TradeSignal
): TradeGuide | null {
  const signalType = signal.type;
  if (candles.length < 20 || signalType === "neutral" || signalType === "hold") return null;

  const latest = candles[candles.length - 1];
  const currentPrice = latest.close;
  const atr = calculateATR(candles, 14);
  if (atr <= 0) return null;

  // 소수점 자리수 (한국 주식 0자리, 저가주 2자리)
  const isKR = latest.close > 1000 && !String(latest.close).includes(".");
  const decimals = isKR ? 0 : currentPrice < 10 ? 4 : 2;
  const round = (n: number) => Number(n.toFixed(decimals));

  const hold = signal.recommendedHold ?? "";
  const isShortTerm = hold.includes("초단기") || hold.includes("단기");
  const isLongTerm = hold.includes("장기") || hold.includes("수개월");

  const ma20 = calcMA(candles, 20);
  const ma50 = calcMA(candles, 50);
  const swingLows = findSwingLows(candles, isLongTerm ? 60 : 40);
  const swingHighs = findSwingHighs(candles, isLongTerm ? 80 : 60);
  const fib = calcFibLevels(swingLows.major, swingHighs.major);

  if (signalType === "buy") {
    // ── 진입가 결정 ──────────────────────────────────────────────────────────
    // 우선순위: 피보나치 61.8% ≈ 현재가 → MA20 → 최근 스윙 저점
    // 현재가가 이미 강한 지지선 부근이면 현재가, 과매수 상태면 되돌림 기다리는 가격 제시
    const candidates: { price: number; label: string }[] = [
      { price: fib.fib618, label: "피보나치 61.8% 되돌림" },
      { price: fib.fib500, label: "피보나치 50% 되돌림" },
      { price: fib.fib382, label: "피보나치 38.2% 되돌림" },
      { price: ma20, label: "MA20 지지선" },
      { price: ma50, label: "MA50 지지선" },
      { price: swingLows.recent, label: "최근 스윙 저점" },
    ];

    // 현재가보다 낮은 후보 중 가장 높은 것 = 가장 가까운 지지 진입 레벨
    // (현재가가 이미 지지선 위에 있을 때 다음 눌림목 진입을 안내)
    const belowCurrent = candidates
      .filter(c => c.price < currentPrice && c.price > currentPrice * 0.7)
      .sort((a, b) => b.price - a.price);

    // 현재가와 가장 가까운 지지선 (5% 이내면 현재가 진입 가능)
    const bestCandidate = belowCurrent[0];
    const gapToCurrent = bestCandidate
      ? (currentPrice - bestCandidate.price) / currentPrice
      : 0;

    // 현재가가 지지선과 5% 이내: 현재가 또는 지지선에서 진입
    // 5% 이상 떨어진 지지선: 눌림목 진입 가격 제시
    const entryPrice = round(
      gapToCurrent <= 0.05 || !bestCandidate
        ? currentPrice
        : bestCandidate.price
    );
    const entryLabel =
      gapToCurrent <= 0.05 || !bestCandidate
        ? "현재가 즉시 진입"
        : `눌림목 대기 (${bestCandidate.label})`;

    // ── 손절가 결정 ──────────────────────────────────────────────────────────
    // 진입 직전 스윙 저점 아래 ATR 버퍼 (단타는 0.3배, 스윙 0.5배, 장기 1.0배)
    const slBuffer = isShortTerm ? 0.3 : isLongTerm ? 1.0 : 0.5;
    const swingStopRaw = swingLows.recent - atr * slBuffer;
    // 최소 손절 거리: 진입가 대비 최소 1 ATR (너무 좁으면 시장 노이즈에 털림)
    const minStop = entryPrice - atr * (isShortTerm ? 1.0 : isLongTerm ? 2.5 : 1.5);
    const stopLoss = round(Math.min(swingStopRaw, minStop));

    const riskPerUnit = entryPrice - stopLoss;
    const riskPct = riskPerUnit > 0
      ? ((riskPerUnit / entryPrice) * 100).toFixed(1)
      : "N/A";

    // ── 목표가 결정 ──────────────────────────────────────────────────────────
    // 1차: 가장 가까운 스윙 고점(저항선) 또는 피보나치 127.2% 확장
    // 2차: 피보나치 161.8% 확장 또는 주요 스윙 고점
    const nearResistance = swingHighs.recent > currentPrice
      ? swingHighs.recent
      : fib.ext1272;
    const farResistance = Math.max(swingHighs.major, fib.ext1618);

    // 1차 목표: 저항선이 너무 가까우면(2% 이내) 피보나치 확장으로 교체
    const rawTarget1 = nearResistance > currentPrice * 1.02 ? nearResistance : fib.ext1272;
    const targetPrice1 = round(Math.max(rawTarget1, entryPrice + riskPerUnit * 1.5));
    const targetPrice2 = round(Math.max(farResistance, entryPrice + riskPerUnit * 3.0));

    const riskRewardRatio =
      riskPerUnit > 0
        ? Number(((targetPrice1 - entryPrice) / riskPerUnit).toFixed(2))
        : 0;

    const target1Pct = (((targetPrice1 - entryPrice) / entryPrice) * 100).toFixed(1);
    const target2Pct = (((targetPrice2 - entryPrice) / entryPrice) * 100).toFixed(1);
    const termLabel = isShortTerm ? "단기(단타)" : isLongTerm ? "장기(장투)" : "스윙";

    // 현재가가 진입가보다 높으면 눌림목 대기임을 명시
    const waitNote =
      entryPrice < currentPrice * 0.98
        ? ` (현재가 ${round(currentPrice).toLocaleString()} — 눌림목 대기 후 진입)`
        : "";

    return {
      entryPrice,
      targetPrice1,
      targetPrice2,
      stopLoss,
      riskRewardRatio,
      atr: round(atr),
      positionSizeGuide: `[${termLabel}] ATR: ${((atr / currentPrice) * 100).toFixed(1)}% | 리스크: ${riskPct}% | 권장 비중: ${riskPerUnit > 0 ? Math.min(((2 / Number(riskPct)) * 100), 30).toFixed(0) : "N/A"}% (계좌의 최대 30% 제한)`,
      entryCondition: `${entryLabel}${waitNote}. 손절가(${stopLoss.toLocaleString()}) 위에서만 진입 유효.`,
      exitCondition: `1차 목표(${targetPrice1.toLocaleString()}, +${target1Pct}%) 도달 시 절반 익절 → 2차 목표(${targetPrice2.toLocaleString()}, +${target2Pct}%) 전량 청산. 손절가 이탈 즉시 청산.`,
    };

  } else {
    // ── 매도(공매도) 가이드 ───────────────────────────────────────────────────
    const candidates: { price: number; label: string }[] = [
      { price: fib.fib236, label: "피보나치 23.6% 반등" },
      { price: fib.fib382, label: "피보나치 38.2% 반등" },
      { price: ma20, label: "MA20 저항선" },
      { price: swingHighs.recent, label: "최근 스윙 고점" },
    ];

    const aboveCurrent = candidates
      .filter(c => c.price > currentPrice && c.price < currentPrice * 1.3)
      .sort((a, b) => a.price - b.price);

    const bestCandidate = aboveCurrent[0];
    const gapToCurrent = bestCandidate
      ? (bestCandidate.price - currentPrice) / currentPrice
      : 0;

    const entryPrice = round(
      gapToCurrent <= 0.05 || !bestCandidate
        ? currentPrice
        : bestCandidate.price
    );
    const entryLabel =
      gapToCurrent <= 0.05 || !bestCandidate
        ? "현재가 즉시 매도"
        : `반등 저항 확인 후 매도 (${bestCandidate.label})`;

    const slBuffer = isShortTerm ? 0.3 : isLongTerm ? 1.0 : 0.5;
    const swingStop = swingHighs.recent + atr * slBuffer;
    const minStop = entryPrice + atr * (isShortTerm ? 1.0 : isLongTerm ? 2.5 : 1.5);
    const stopLoss = round(Math.max(swingStop, minStop));

    const riskPerUnit = stopLoss - entryPrice;
    const riskPct = riskPerUnit > 0
      ? ((riskPerUnit / entryPrice) * 100).toFixed(1)
      : "N/A";

    const nearSupport = swingLows.recent < currentPrice
      ? swingLows.recent
      : fib.fib618;
    const farSupport = Math.min(swingLows.major, fib.ext1618 < entryPrice ? fib.ext1618 : swingLows.major);

    const rawTarget1 = nearSupport < currentPrice * 0.98 ? nearSupport : fib.fib618;
    const targetPrice1 = round(Math.min(rawTarget1, entryPrice - riskPerUnit * 1.5));
    const targetPrice2 = round(Math.min(farSupport, entryPrice - riskPerUnit * 3.0));

    const riskRewardRatio =
      riskPerUnit > 0
        ? Number(((entryPrice - targetPrice1) / riskPerUnit).toFixed(2))
        : 0;

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
      positionSizeGuide: `[${termLabel} 매도] ATR: ${((atr / currentPrice) * 100).toFixed(1)}% | 리스크: ${riskPct}% | 권장 비중: ${riskPerUnit > 0 ? Math.min(((2 / Number(riskPct)) * 100), 30).toFixed(0) : "N/A"}%`,
      entryCondition: `${entryLabel}. 손절가(${stopLoss.toLocaleString()}) 아래에서만 매도 포지션 유효.`,
      exitCondition: `1차 목표(${targetPrice1.toLocaleString()}, -${target1Pct}%) 도달 시 절반 익절 → 2차 목표(${targetPrice2.toLocaleString()}, -${target2Pct}%) 전량 청산.`,
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
    const BATCH_SIZE = isAnyMarketOpen() ? 10 : 20; // 장외 시간엔 빠르게 처리
    const DELAY_MS = isAnyMarketOpen() ? 1200 : 600; // 장외엔 딜레이 절반

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
