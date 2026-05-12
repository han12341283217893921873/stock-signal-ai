import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptText, HelpCircle, Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TaxEstimator() {
  const { data: taxInfo, isLoading } = trpc.portfolio.taxEstimator.useQuery();

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!taxInfo) return null;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2 bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          예상 양도소득세
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[10px]">
                해외주식은 연간 합산 수익 250만원(USD 환산), 국내주식은 5000만원
                공제 후 22%의 세율이 적용됩니다. (주민세 포함)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Tabs defaultValue="usd" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="usd">해외 주식 (USD)</TabsTrigger>
            <TabsTrigger value="krw">국내 주식 (KRW)</TabsTrigger>
          </TabsList>

          <TabsContent value="usd" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                  총 실현 가능 수익
                </p>
                <p className="text-lg font-black font-mono leading-none">
                  ${" "}
                  {taxInfo.totalGainsUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold text-bull">
                  기본 공제액
                </p>
                <p className="text-lg font-black font-mono leading-none text-bull">
                  -${" "}
                  {(taxInfo.deductionUSD / 1300).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" /> 과세 대상 금액
                </span>
                <span className="text-sm font-bold font-mono">
                  ${" "}
                  {taxInfo.taxableAmountUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-primary/10 pt-2">
                <span className="text-xs font-bold text-foreground">
                  최종 예상 세금 (22%)
                </span>
                <span className="text-sm font-black font-mono text-bear">
                  ${" "}
                  {taxInfo.estimatedTaxUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="krw" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                  총 실현 가능 수익
                </p>
                <p className="text-lg font-black font-mono leading-none">
                  ₩ {taxInfo.totalGainsKRW.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold text-bull">
                  기본 공제액
                </p>
                <p className="text-lg font-black font-mono leading-none text-bull">
                  -₩ {taxInfo.deductionKRW.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calculator className="h-3 w-3" /> 과세 대상 금액
                </span>
                <span className="text-sm font-bold font-mono">
                  ₩ {taxInfo.taxableAmountKRW.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-primary/10 pt-2">
                <span className="text-xs font-bold text-foreground">
                  최종 예상 세금 (22%)
                </span>
                <span className="text-sm font-black font-mono text-bear">
                  ₩ {taxInfo.estimatedTaxKRW.toLocaleString()}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-[10px] text-muted-foreground italic text-center">
          * 실시간 환율 기반 계산. 실제 증권사 정산 금액과 차이가 있을 수
          있습니다.
        </p>
      </CardContent>
    </Card>
  );
}
