import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, TrendingUp, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CorrelationWidgetProps {
  ticker: string;
}

export default function CorrelationWidget({ ticker }: CorrelationWidgetProps) {
  const { data: nasdaqCorr, isLoading: nasdaqLoading } =
    trpc.stock.correlation.useQuery({ ticker, benchmark: "^IXIC" });
  const { data: kospiCorr, isLoading: kospiLoading } =
    trpc.stock.correlation.useQuery({ ticker, benchmark: "^KS11" });

  if (nasdaqLoading || kospiLoading)
    return <Skeleton className="h-40 w-full rounded-xl" />;

  const getCorrelationLabel = (corr: number) => {
    if (corr > 0.8)
      return { text: "강한 정관계", color: "text-bull", icon: Link2 };
    if (corr > 0.4)
      return { text: "약한 정관계", color: "text-bull/70", icon: Link2 };
    if (corr < -0.4)
      return { text: "약한 역관계", color: "text-bear/70", icon: Unlink };
    if (corr < -0.8)
      return { text: "강한 역관계", color: "text-bear", icon: Unlink };
    return {
      text: "낮은 상관성",
      color: "text-muted-foreground",
      icon: HelpCircle,
    };
  };

  const CorrItem = ({ label, data }: any) => {
    if (!data) return null;
    const info = getCorrelationLabel(data.correlation);
    const Icon = info.icon;

    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-background/50">
            <Icon className={`h-4 w-4 ${info.color}`} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              {label}
            </p>
            <p className={`text-xs font-bold ${info.color}`}>{info.text}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold">
            {data.correlation.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[9px] text-muted-foreground">Beta:</span>
            <span className="text-[10px] font-mono font-bold text-primary">
              {data.beta}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          시장 상관관계 분석 (30D)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[10px]">
                1.0에 가까울수록 지수와 똑같이 움직이고, -1.0에 가까울수록
                반대로 움직입니다. Beta는 지수 대비 변동성을 의미합니다.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <CorrItem label="나스닥 (Nasdaq)" data={nasdaqCorr} />
        <CorrItem label="코스피 (KOSPI)" data={kospiCorr} />
      </CardContent>
    </Card>
  );
}
