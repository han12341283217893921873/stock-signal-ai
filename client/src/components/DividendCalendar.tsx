import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CircleDollarSign, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DividendCalendar() {
  const { data: dividends, isLoading } = trpc.portfolio.dividends.useQuery();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!dividends || dividends.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            배당금 캘린더
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CircleDollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">
            다가오는 배당 정보가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const upcoming = dividends
    .filter(d => new Date(d.exDate) >= new Date())
    .slice(0, 5);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          배당금 캘린더
          <Badge
            variant="outline"
            className="ml-auto text-[10px] bg-bull/10 text-bull border-bull/20"
          >
            Upcoming
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map((d: any, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-background flex flex-col items-center justify-center border border-border/50">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">
                  {new Date(d.exDate).toLocaleString("en-US", {
                    month: "short",
                  })}
                </span>
                <span className="text-sm font-black leading-none">
                  {new Date(d.exDate).getDate()}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold">{d.ticker}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {d.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-bold text-bull">
                +{d.totalDividend.toLocaleString()} {d.currency}
              </p>
              <div className="flex items-center gap-1 justify-end text-[9px] text-muted-foreground">
                <span>지급일:</span>
                <span className="font-mono">{d.payDate || "미정"}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="pt-2 text-center">
          <p className="text-[10px] text-muted-foreground italic">
            총 {dividends.length}개의 배당 이벤트가 감지되었습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
