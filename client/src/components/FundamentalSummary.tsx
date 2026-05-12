import { Card, CardContent } from "@/components/ui/card";
import { FundamentalMetrics } from "@shared/types";
import {
  Info,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  fundamentals?: FundamentalMetrics;
}

export default function FundamentalSummary({ fundamentals }: Props) {
  if (!fundamentals) return null;

  const getPERColor = (v?: number) => {
    if (!v) return "text-foreground";
    if (v < 15) return "text-emerald-400";
    if (v > 30) return "text-orange-400";
    return "text-foreground";
  };

  const getROEColor = (v?: number) => {
    if (!v) return "text-foreground";
    if (v > 15) return "text-emerald-400";
    if (v < 5) return "text-bear";
    return "text-foreground";
  };

  const metrics = [
    {
      label: "PER",
      value: fundamentals.peRatio?.toFixed(2) ?? "N/A",
      icon: <Activity className="h-3 w-3" />,
      desc: "주가수익비율",
      color: getPERColor(fundamentals.peRatio),
    },
    {
      label: "PBR",
      value: fundamentals.pbRatio?.toFixed(2) ?? "N/A",
      icon: <PieChart className="h-3 w-3" />,
      desc: "주가순자산비율",
      color:
        (fundamentals.pbRatio ?? 0) < 1
          ? "text-emerald-400"
          : "text-foreground",
    },
    {
      label: "ROE",
      value: fundamentals.roe ? `${fundamentals.roe.toFixed(2)}%` : "N/A",
      icon: <TrendingUp className="h-3 w-3" />,
      desc: "자기자본이익률",
      color: getROEColor(fundamentals.roe),
    },
    {
      label: "배당수익률",
      value: fundamentals.dividendYield
        ? `${fundamentals.dividendYield.toFixed(2)}%`
        : "N/A",
      icon: <DollarSign className="h-3 w-3" />,
      desc: "연간 배당률",
      color:
        (fundamentals.dividendYield ?? 0) > 3
          ? "text-emerald-400"
          : "text-foreground",
    },
  ];

  // 펀더멘털 점수 계산 (단순화, 성장주 고려)
  let score = 0;
  if ((fundamentals.peRatio ?? 100) < 30)
    score += 25; // 성장주 평균 감안 완화
  else if ((fundamentals.peRatio ?? 100) < 50) score += 15;

  if ((fundamentals.pbRatio ?? 100) < 3) score += 25;
  else if ((fundamentals.pbRatio ?? 100) < 8) score += 15;

  if ((fundamentals.roe ?? 0) > 10) score += 25;
  else if ((fundamentals.roe ?? 0) > 5) score += 15;

  if ((fundamentals.dividendYield ?? 0) > 1) score += 25;
  else if ((fundamentals.dividendYield ?? 0) > 0) score += 10;

  const getRating = (s: number) => {
    if (s >= 75)
      return {
        label: "매우 우량",
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      };
    if (s >= 50)
      return {
        label: "우량",
        color: "bg-green-500/20 text-green-400 border-green-500/30",
      };
    if (s >= 25)
      return {
        label: "보통",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      };
    return {
      label: "주의",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
  };

  const rating = getRating(score);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <Card
            key={i}
            className="glass-card border-white/5 hover:border-primary/20 transition-colors"
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-primary/70">{m.icon}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {m.label}
                </span>
              </div>
              <p className={`text-xl font-bold font-mono ${m.color}`}>
                {m.value}
              </p>
              <p className="text-[10px] text-muted-foreground/60">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 px-1">
        <Badge
          className={`text-[10px] py-0 px-2 h-5 flex items-center gap-1 ${rating.color}`}
        >
          <Star className="h-2.5 w-2.5 fill-current" />
          펀더멘털 {rating.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {score >= 75
            ? "재무 건전성이 매우 뛰어나며 저평가 매력이 있습니다."
            : score >= 50
              ? "전반적인 재무 상태가 양호합니다."
              : "일부 지표가 시장 평균 대비 다소 불리할 수 있습니다."}
        </span>
      </div>
    </div>
  );
}
