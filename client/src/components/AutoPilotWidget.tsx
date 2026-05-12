import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bot, Sparkles, AlertCircle, Zap, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AutoPilotWidget() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.portfolio.autoPilotStatus.useQuery();
  const toggleMutation = trpc.portfolio.toggleAutoPilot.useMutation({
    onSuccess: (data) => {
      utils.portfolio.autoPilotStatus.setData(undefined, { enabled: data.enabled });
      toast.success(data.enabled ? "AI 오토파일럿이 활성화되었습니다. 강력 신호 감지 시 자동 매매를 수행합니다." : "AI 오토파일럿이 비활성화되었습니다.");
    },
    onError: () => {
      toast.error("오토파일럿 설정 변경 중 오류가 발생했습니다.");
    }
  });

  const isEnabled = status?.enabled ?? false;

  return (
    <Card className={`glass-card premium-border overflow-hidden transition-all duration-500 ${isEnabled ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-primary/5 border-primary/20'}`}>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
            <Bot className={`h-6 w-6 ${isEnabled ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className={`h-3 w-3 ${isEnabled ? 'text-emerald-400' : 'text-primary'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isEnabled ? 'text-emerald-400' : 'text-primary'}`}>
                AI Auto-Pilot Mode
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">AI 자율 주행 매매 시스템 (Buy & Sell)</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              AI가 강력 매수 신호를 포착하면 자동 매수하며, <span className="text-emerald-500 font-bold">손절(-5%) / 익절(+15%)</span> 또는 매도 신호 감지 시 자동으로 매도하여 자산을 보호합니다.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Switch 
            checked={isEnabled} 
            onCheckedChange={(val) => toggleMutation.mutate({ enabled: val })}
            disabled={toggleMutation.isPending}
            className="data-[state=checked]:bg-emerald-500"
          />
          <span className={`text-[10px] font-bold ${isEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {isEnabled ? "활성화됨" : "비활성화"}
          </span>
        </div>
      </CardContent>
      
      {isEnabled && (
        <div className="px-5 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center gap-2">
          <ShieldAlert className="h-3 w-3 text-emerald-400 shrink-0" />
          <p className="text-[10px] text-emerald-400/80 font-medium">실제 주문이 아닌 가상 포트폴리오의 매매를 자동화합니다.</p>
        </div>
      )}
    </Card>
  );
}
