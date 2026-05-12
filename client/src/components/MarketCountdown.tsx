import { useState, useEffect } from "react";
import { Clock, Globe2 } from "lucide-react";

interface MarketInfo {
  name: string;
  flag: string;
  isOpen: boolean;
  status: string;
  countdownLabel: string;
  countdownSecs: number;
  openHour: number;
  openMin: number;
  closeHour: number;
  closeMin: number;
  tzOffset: number; // UTC+N hours
}

function getMarketInfo(now: Date): { kr: MarketInfo; us: MarketInfo } {
  // Korea KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const kstDay = kst.getUTCDay(); // 0=Sun
  const kstH = kst.getUTCHours();
  const kstM = kst.getUTCMinutes();
  const kstTotalMin = kstH * 60 + kstM;
  const krOpen = 9 * 60; // 09:00
  const krClose = 15 * 60 + 30; // 15:30

  const krIsWeekday = kstDay >= 1 && kstDay <= 5;
  const krIsOpen =
    krIsWeekday && kstTotalMin >= krOpen && kstTotalMin < krClose;

  let krCountdownSecs = 0;
  let krCountdownLabel = "";
  if (krIsOpen) {
    krCountdownLabel = "장 마감까지";
    const closeMs = (krClose - kstTotalMin) * 60 - kst.getUTCSeconds();
    krCountdownSecs = closeMs;
  } else {
    // next open
    let daysUntilNext = 0;
    if (!krIsWeekday || kstTotalMin >= krClose) {
      // find next weekday
      daysUntilNext = kstDay === 5 ? 3 : kstDay === 6 ? 2 : 1;
      if (kstDay >= 1 && kstDay <= 5 && kstTotalMin >= krClose)
        daysUntilNext = kstDay === 5 ? 3 : 1;
    }
    krCountdownLabel =
      daysUntilNext > 0
        ? `${daysUntilNext > 1 ? daysUntilNext + "일 후 " : ""}장 시작까지`
        : "장 시작까지";
    const secsSinceKSTmidnight = kstH * 3600 + kstM * 60 + kst.getUTCSeconds();
    const secsUntilOpen =
      daysUntilNext * 86400 + krOpen * 60 - secsSinceKSTmidnight;
    krCountdownSecs = secsUntilOpen > 0 ? secsUntilOpen : 0;
  }

  // US EST = UTC-5 / EDT = UTC-4 (assume EDT Mar-Nov)
  const month = now.getUTCMonth(); // 0-indexed
  const isDST = month >= 2 && month <= 10; // rough DST approximation
  const estOffset = isDST ? -4 : -5;
  const est = new Date(now.getTime() + estOffset * 3600_000);
  const estDay = est.getUTCDay();
  const estH = est.getUTCHours();
  const estM = est.getUTCMinutes();
  const estTotalMin = estH * 60 + estM;
  const usOpen = 9 * 60 + 30; // 09:30 ET
  const usClose = 16 * 60; // 16:00 ET

  const usIsWeekday = estDay >= 1 && estDay <= 5;
  const usIsOpen =
    usIsWeekday && estTotalMin >= usOpen && estTotalMin < usClose;

  let usCountdownSecs = 0;
  let usCountdownLabel = "";
  if (usIsOpen) {
    usCountdownLabel = "장 마감까지";
    usCountdownSecs = (usClose - estTotalMin) * 60 - est.getUTCSeconds();
  } else {
    let daysUntilNext = 0;
    if (!usIsWeekday || estTotalMin >= usClose) {
      daysUntilNext = estDay === 5 ? 3 : estDay === 6 ? 2 : 1;
      if (usIsWeekday && estTotalMin >= usClose)
        daysUntilNext = estDay === 5 ? 3 : 1;
    }
    usCountdownLabel =
      daysUntilNext > 0
        ? `${daysUntilNext > 1 ? daysUntilNext + "일 후 " : ""}장 시작까지`
        : "장 시작까지";
    const secsUntilOpen =
      daysUntilNext * 86400 +
      usOpen * 60 -
      (estH * 3600 + estM * 60 + est.getUTCSeconds());
    usCountdownSecs = secsUntilOpen > 0 ? secsUntilOpen : 0;
  }

  return {
    kr: {
      name: "한국 주식시장",
      flag: "🇰🇷",
      isOpen: krIsOpen,
      status: krIsOpen ? "거래중" : "휴장",
      countdownLabel: krCountdownLabel,
      countdownSecs: krCountdownSecs,
      openHour: 9,
      openMin: 0,
      closeHour: 15,
      closeMin: 30,
      tzOffset: 9,
    },
    us: {
      name: "미국 주식시장",
      flag: "🇺🇸",
      isOpen: usIsOpen,
      status: usIsOpen ? "거래중" : "휴장",
      countdownLabel: usCountdownLabel,
      countdownSecs: usCountdownSecs,
      openHour: 22,
      openMin: 30,
      closeHour: 5,
      closeMin: 0,
      tzOffset: 9, // displayed in KST
    },
  };
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return "00:00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}시간 ${String(m).padStart(2, "0")}분`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MarketCountdown() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { kr, us } = getMarketInfo(now);

  return (
    <div className="grid grid-cols-2 gap-3">
      {[kr, us].map(market => (
        <div key={market.name} className="stat-card relative overflow-hidden">
          {/* 거래중 글로우 효과 */}
          {market.isOpen && (
            <div className="absolute inset-0 bg-bull/5 rounded-[var(--radius)] pointer-events-none" />
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{market.flag}</span>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                  {market.flag === "🇰🇷" ? "KOSPI / KOSDAQ" : "NYSE / NASDAQ"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                market.isOpen
                  ? "bg-bull/12 text-bull border-bull/25"
                  : "bg-muted/60 text-muted-foreground border-border/40"
              }`}
            >
              {market.isOpen && <span className="live-dot w-1.5 h-1.5" />}
              {market.status}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                {market.countdownLabel}
              </p>
              <p
                className={`text-2xl font-black font-mono tracking-tight ${
                  market.isOpen ? "text-bull" : "text-foreground"
                }`}
              >
                {formatCountdown(market.countdownSecs)}
              </p>
            </div>
            <Clock
              className={`w-8 h-8 ${market.isOpen ? "text-bull/30" : "text-muted-foreground/20"}`}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground">
              {market.flag === "🇰🇷"
                ? "운영: 09:00 – 15:30 KST (월~금)"
                : "운영: 22:30 – 06:00 KST (월~금)"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
