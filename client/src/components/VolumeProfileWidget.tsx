import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Zap } from "lucide-react";

interface VolumeProfileWidgetProps {
  data: any[];
  isKR?: boolean;
}

export default function VolumeProfileWidget({
  data,
  isKR,
}: VolumeProfileWidgetProps) {
  const profile = useMemo(() => {
    if (!data || data.length === 0) return [];

    const prices = data.map(d => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const bins = 10;
    const binSize = range / bins;

    const volumeBins = new Array(bins).fill(0);
    data.forEach(d => {
      const binIdx = Math.min(Math.floor((d.close - min) / binSize), bins - 1);
      volumeBins[binIdx] += d.volume;
    });

    const maxVol = Math.max(...volumeBins);

    return volumeBins
      .map((vol, i) => ({
        priceRange: `${(min + i * binSize).toLocaleString()} ~ ${(min + (i + 1) * binSize).toLocaleString()}`,
        percentage: (vol / maxVol) * 100,
        isPOC: vol === maxVol, // Point of Control
      }))
      .reverse();
  }, [data]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          매물대 분석 (Volume Profile)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {profile.map((p, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[9px] text-muted-foreground px-1">
              <span>{p.priceRange}</span>
              {p.isPOC && (
                <span className="text-bull font-bold flex items-center gap-1">
                  <Zap className="h-2 w-2" /> 매물 집중
                </span>
              )}
            </div>
            <div className="h-3 w-full bg-muted/30 rounded-sm overflow-hidden border border-border/30 relative">
              <div
                className={`h-full transition-all duration-1000 ${p.isPOC ? "bg-bull/40" : "bg-primary/20"}`}
                style={{ width: `${p.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
