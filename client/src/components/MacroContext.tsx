import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MacroContextProps {
  ticker: string;
  tickerChange: number;
}

export default function MacroContext({
  ticker,
  tickerChange,
}: MacroContextProps) {
  const { data: context, isLoading } = trpc.macro.marketContext.useQuery();

  if (isLoading || !context) return null;

  const isVixHigh = context.vix > 20;
  const isMarketDown = context.sp500Change < 0;

  // 상황 분석 로직
  let analysis = "";
  let type: "neutral" | "warning" | "positive" = "neutral";

  if (tickerChange < 0 && isMarketDown) {
    analysis =
      "지수 하락에 따른 동반 하락세입니다. 개별 악재보다는 시장 심리 영향이 큽니다.";
    type = "neutral";
  } else if (tickerChange < 0 && !isMarketDown) {
    analysis =
      "시장 지수는 보합/상승 중이나 본 종목은 하락 중입니다. 개별 이슈를 확인하세요.";
    type = "warning";
  } else if (tickerChange > 0 && isMarketDown) {
    analysis =
      "시장이 하락함에도 불구하고 본 종목은 강세를 보이고 있습니다. 상대적 강도가 높습니다.";
    type = "positive";
  } else {
    analysis = "현재 시장 흐름과 유사하게 움직이고 있습니다.";
  }

  return (
    <Card
      className={`glass-card border-l-4 ${
        type === "warning"
          ? "border-l-bear"
          : type === "positive"
            ? "border-l-bull"
            : "border-l-primary"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
              type === "warning"
                ? "bg-bear/10 text-bear"
                : type === "positive"
                  ? "bg-bull/10 text-bull"
                  : "bg-primary/10 text-primary"
            }`}
          >
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-1">
              시장 환경 분석
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] max-w-[200px]">
                    S&P 500, VIX 지수 및 공포/탐욕 지수를 종합하여 현재 종목의
                    움직임이 매크로 환경에 의한 것인지 분석합니다.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {analysis}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-background/50 py-0 px-1.5 h-5 flex items-center gap-1"
              >
                S&P 500{" "}
                {context.sp500Change > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 text-bull" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 text-bear" />
                )}
                <span
                  className={
                    context.sp500Change >= 0 ? "text-bull" : "text-bear"
                  }
                >
                  {context.sp500Change > 0 ? "+" : ""}
                  {context.sp500Change.toFixed(2)}%
                </span>
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono bg-background/50 py-0 px-1.5 h-5 flex items-center gap-1 ${isVixHigh ? "border-bear/50 text-bear" : ""}`}
              >
                VIX {context.vix.toFixed(1)} {isVixHigh ? " ⚠️ 고변동성" : ""}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-background/50 py-0 px-1.5 h-5 flex items-center gap-1"
              >
                {context.fearGreed.label} ({context.fearGreed.score})
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
