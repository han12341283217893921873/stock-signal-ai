import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function FearGreedGauge() {
  const { data: fgData, isLoading } = trpc.macro.fearGreed.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full glass-card" />;
  }

  if (!fgData) return null;

  const getStatusColor = (score: number) => {
    if (score <= 25) return "text-red-500";
    if (score <= 45) return "text-orange-400";
    if (score <= 55) return "text-yellow-400";
    if (score <= 75) return "text-green-400";
    return "text-emerald-500";
  };

  const getStatusBg = (score: number) => {
    if (score <= 25) return "bg-red-500";
    if (score <= 45) return "bg-orange-400";
    if (score <= 55) return "bg-yellow-400";
    if (score <= 75) return "bg-green-400";
    return "bg-emerald-500";
  };

  const rotation = (fgData.score / 100) * 180 - 90;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> 시장 공포와 탐욕 지수
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6 pb-6">
        <div className="relative w-48 h-24 overflow-hidden mb-4">
          {/* Gauge Background */}
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-muted/20" />
          {/* Gauge Colors */}
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent border-t-red-500/40 border-l-red-500/40 rotate-45" />
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent border-t-green-500/40 border-r-green-500/40 -rotate-45" />

          {/* Needle */}
          <div
            className="absolute bottom-0 left-1/2 w-1 h-20 bg-foreground origin-bottom transition-transform duration-1000 ease-out"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border-4 border-foreground" />
        </div>

        <div className="text-center">
          <p
            className={`text-2xl font-black uppercase tracking-tighter ${getStatusColor(fgData.score)}`}
          >
            {fgData.label}
          </p>
          <p className="text-3xl font-mono font-bold">{fgData.score}</p>
          <div className="flex justify-between w-full mt-4 text-[10px] text-muted-foreground font-mono">
            <span>공포 (0)</span>
            <span>중립 (50)</span>
            <span>탐욕 (100)</span>
          </div>
          <div className="w-full h-1 bg-muted/30 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${getStatusBg(fgData.score)}`}
              style={{ width: `${fgData.score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
