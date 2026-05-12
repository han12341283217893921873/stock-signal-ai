import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

import { useState, useEffect } from "react";

export default function EconomicCalendar() {
  const { data: events, isLoading } = trpc.macro.calendar.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  const [nextEvent, setNextEvent] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!events) return;
    const now = new Date();
    const future = events.find(e => new Date(e.time) > now);
    setNextEvent(future);
  }, [events]);

  useEffect(() => {
    if (!nextEvent) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextEvent.time).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("발표 중...");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${d > 0 ? d + "일 " : ""}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" /> 경제 지표 일정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) return null;

  return (
    <Card className="glass-card h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          경제 지표 일정
          {nextEvent && (
            <Badge
              variant="secondary"
              className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/20"
            >
              {nextEvent.event.slice(0, 10)}... {timeLeft}
            </Badge>
          )}
          <Badge variant="outline" className="ml-auto text-[10px]">
            Next 2 Weeks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
          {events.map((event, idx) => (
            <div
              key={idx}
              className="px-4 py-3 flex items-center justify-between border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(event.time).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 border-none ${
                      event.impact === "high"
                        ? "bg-red-500/10 text-red-400"
                        : event.impact === "medium"
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {event.impact.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs font-medium truncate pr-2">
                  {event.event}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex flex-col items-end gap-1">
                  {event.actual !== null ? (
                    <span className="text-xs font-bold font-mono text-primary">
                      {event.actual} {event.unit}
                    </span>
                  ) : (
                    <span className="text-xs font-bold font-mono text-muted-foreground">
                      {event.estimate ?? "-"} {event.unit}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    이전: {event.prev ?? "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
