import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Bell,
  BellOff,
  BellRing,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

const CONDITION_LABELS: Record<
  string,
  { label: string; unit: string; hint: string }
> = {
  rsi_below: {
    label: "RSI 이하",
    unit: "",
    hint: "RSI가 설정값 이하일 때 알림 (예: 30 → 과매도 구간)",
  },
  rsi_above: {
    label: "RSI 이상",
    unit: "",
    hint: "RSI가 설정값 이상일 때 알림 (예: 70 → 과매수 구간)",
  },
  signal_strength_above: {
    label: "신호 강도 이상",
    unit: "",
    hint: "AI 신호 강도가 설정값 이상일 때 알림 (0-100)",
  },
  price_above: {
    label: "가격 이상",
    unit: "$",
    hint: "현재가가 설정값 이상일 때 알림",
  },
  price_below: {
    label: "가격 이하",
    unit: "$",
    hint: "현재가가 설정값 이하일 때 알림",
  },
  complex: {
    label: "복합 조건 (다중 지표)",
    unit: "",
    hint: "여러 지표(RSI, MACD, 가격 등)를 모두 만족할 때 알림",
  },
};

interface AddForm {
  ticker: string;
  name: string;
  conditionType: string;
  threshold: string;
  rules: { type: string; operator: string; value: string }[];
}

const defaultForm: AddForm = {
  ticker: "",
  name: "",
  conditionType: "rsi_below",
  threshold: "",
  rules: [],
};

export default function Alerts() {
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddForm>(defaultForm);
  const [tgChatId, setTgChatId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const utils = trpc.useUtils();
  const { data: conditions = [], isLoading } = trpc.alerts.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: history = [] } = trpc.alerts.history.useQuery(undefined, {
    enabled: !!user,
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  const setNotifMutation = trpc.alerts.setNotificationSettings.useMutation({
    onSuccess: () => toast.success("알림 채널 설정이 저장되었습니다."),
    onError: e => toast.error(e.message),
  });

  const addMutation = trpc.alerts.add.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      setAddOpen(false);
      setForm(defaultForm);
      toast.success("알림 조건이 추가되었습니다.");
    },
    onError: e => toast.error(e.message),
  });

  const toggleMutation = trpc.alerts.toggle.useMutation({
    onSuccess: () => utils.alerts.list.invalidate(),
    onError: e => toast.error(e.message),
  });

  const removeMutation = trpc.alerts.remove.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("알림 조건이 삭제되었습니다.");
    },
    onError: e => toast.error(e.message),
  });

  const evaluateMutation = trpc.alerts.evaluate.useMutation({
    onSuccess: data => {
      if (data.triggered.length > 0) {
        toast.success(
          `${data.triggered.length}개 조건이 충족되어 알림을 발송했습니다.`
        );
      } else {
        toast("현재 충족된 알림 조건이 없습니다.");
      }
    },
    onError: e => toast.error(e.message),
  });

  const handleAdd = () => {
    let conditionJson: string | undefined;
    let finalThreshold = form.threshold;

    if (!form.ticker || !form.conditionType) {
      toast.error("티커와 조건 유형은 필수입니다.");
      return;
    }

    if (form.conditionType === "complex") {
      if (form.rules.length === 0) {
        toast.error("복합 조건은 최소 1개 이상의 규칙이 필요합니다.");
        return;
      }
      if (form.rules.some(r => !r.value)) {
        toast.error("모든 규칙의 임계값을 입력해주세요.");
        return;
      }
      conditionJson = JSON.stringify(
        form.rules.map(r => ({ ...r, value: Number(r.value) }))
      );
      finalThreshold = "0"; // complex에서는 사용 안함
    } else {
      if (!form.threshold) {
        toast.error("임계값은 필수입니다.");
        return;
      }
    }

    addMutation.mutate({
      ticker: form.ticker,
      name: form.name || undefined,
      conditionType: form.conditionType as any,
      threshold: Number(finalThreshold),
      conditionJson,
    });
  };

  const activeCount = conditions.filter(c => c.isActive === 1).length;

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Bell className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            알림 조건을 설정하려면 로그인이 필요합니다.
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            로그인
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">알림 조건</h1>
            <p className="text-sm text-muted-foreground mt-1">
              조건 충족 시 자동으로 알림을 발송합니다.
              {activeCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  {activeCount}개 활성
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  조건 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>알림 조건 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>티커 *</Label>
                      <Input
                        placeholder="AAPL"
                        value={form.ticker}
                        onChange={e =>
                          setForm({
                            ...form,
                            ticker: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>알림 이름</Label>
                      <Input
                        placeholder="과매도 알림"
                        value={form.name}
                        onChange={e =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>조건 유형 *</Label>
                    <Select
                      value={form.conditionType}
                      onValueChange={v =>
                        setForm({ ...form, conditionType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONDITION_LABELS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.conditionType && (
                      <p className="text-xs text-muted-foreground">
                        {CONDITION_LABELS[form.conditionType]?.hint}
                      </p>
                    )}
                  </div>
                  {form.conditionType === "complex" ? (
                    <div className="space-y-3 pt-2">
                      <Label>복합 조건 규칙 (AND)</Label>
                      {form.rules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Select
                            value={rule.type}
                            onValueChange={v => {
                              const newRules = [...form.rules];
                              newRules[idx].type = v;
                              setForm({ ...form, rules: newRules });
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rsi">RSI</SelectItem>
                              <SelectItem value="macd">MACD</SelectItem>
                              <SelectItem value="price">가격</SelectItem>
                              <SelectItem value="signal">신호강도</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={rule.operator}
                            onValueChange={v => {
                              const newRules = [...form.rules];
                              newRules[idx].operator = v;
                              setForm({ ...form, rules: newRules });
                            }}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=">">이상</SelectItem>
                              <SelectItem value="<">이하</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="값"
                            value={rule.value}
                            onChange={e => {
                              const newRules = [...form.rules];
                              newRules[idx].value = e.target.value;
                              setForm({ ...form, rules: newRules });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newRules = [...form.rules];
                              newRules.splice(idx, 1);
                              setForm({ ...form, rules: newRules });
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm({
                            ...form,
                            rules: [
                              ...form.rules,
                              { type: "rsi", operator: "<", value: "" },
                            ],
                          })
                        }
                        className="w-full gap-2"
                      >
                        <Plus className="w-3 h-3" /> 규칙 추가
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>임계값 *</Label>
                      <Input
                        type="number"
                        placeholder={
                          form.conditionType.startsWith("rsi")
                            ? "30"
                            : form.conditionType === "signal_strength_above"
                              ? "70"
                              : "150"
                        }
                        value={form.threshold}
                        onChange={e =>
                          setForm({ ...form, threshold: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleAdd}
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? "추가 중..." : "추가"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 조건 목록 */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : conditions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <BellOff className="w-12 h-12 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium text-muted-foreground">
                  설정된 알림 조건이 없습니다
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  RSI 과매도, 가격 돌파 등 원하는 조건을 설정하면 자동으로
                  알림을 받을 수 있습니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />첫 알림 조건 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conditions.map(cond => {
              const meta = CONDITION_LABELS[cond.conditionType];
              const isActive = cond.isActive === 1;
              return (
                <Card
                  key={cond.id}
                  className={`transition-opacity ${isActive ? "" : "opacity-60"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {isActive ? (
                            <BellRing className="w-4 h-4" />
                          ) : (
                            <BellOff className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{cond.ticker}</span>
                            {cond.name && (
                              <span className="text-sm text-muted-foreground">
                                {cond.name}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {meta?.label}
                            </Badge>
                          </div>
                          {cond.conditionType === "complex" ? (
                            <div className="text-sm text-muted-foreground mt-0.5">
                              복합 규칙:{" "}
                              {cond.conditionJson
                                ? JSON.parse(cond.conditionJson).length + "개"
                                : "0개"}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground mt-0.5">
                              임계값:{" "}
                              <span className="font-medium text-foreground">
                                {meta?.unit}
                                {Number(cond.threshold).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {cond.lastTriggeredAt && (
                            <div className="text-xs text-muted-foreground/70 mt-0.5">
                              마지막 발동:{" "}
                              {new Date(cond.lastTriggeredAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {isActive ? "활성" : "비활성"}
                          </span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={v =>
                              toggleMutation.mutate({
                                id: cond.id,
                                isActive: v,
                              })
                            }
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={!isActive || evaluateMutation.isPending}
                          onClick={() =>
                            evaluateMutation.mutate({ ticker: cond.ticker })
                          }
                        >
                          <Activity className="w-3 h-3" />
                          평가
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeMutation.mutate({ id: cond.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 알림 히스토리 */}
        {history.length > 0 && (
          <Card>
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setHistoryOpen(v => !v)}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  알림 히스토리
                  <Badge variant="outline" className="text-[10px]">
                    {history.length}건
                  </Badge>
                </span>
                {historyOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            {historyOpen && (
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {history.map(h => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-lg bg-muted/30 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {h.ticker}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {h.message ?? h.conditionType}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(h.triggeredAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* 텔레그램 & 웹훅 알림 채널 설정 */}
        <Card className="border-primary/20 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              알림 채널 설정 (텔레그램 / 웹훅)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">💬 텔레그램 Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 123456789"
                  value={tgChatId}
                  onChange={e => setTgChatId(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    if (!tgChatId.trim()) {
                      toast.error("Chat ID를 입력하세요.");
                      return;
                    }
                    toast.info(
                      `Chat ID: ${tgChatId} — .env.local에 TELEGRAM_CHAT_ID=${tgChatId} 추가 후 서버 재시작`,
                      { duration: 10000 }
                    );
                  }}
                >
                  안내
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                텔레그램 @BotFather에서 봇 생성 후 Chat ID 확인. 서버
                .env.local에 TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 추가 필요.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">🌐 웹훅 URL (Slack/Discord)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://hooks.slack.com/..."
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  disabled={setNotifMutation.isPending}
                  onClick={() =>
                    setNotifMutation.mutate({
                      notifyWebhook: webhookUrl || null,
                      notifyEmail: null,
                    })
                  }
                >
                  저장
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 사용 안내 */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Bell className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">
                  알림 조건 사용 방법
                </p>
                <p>
                  알림 조건은 <strong>2분 간격</strong>으로 자동 평가됩니다.
                  조건 충족 시 시스템 알림이 전송됩니다.
                </p>
                <p>
                  또는 각 조건의 <strong>평가</strong> 버튼을 눌러 즉시 확인할
                  수 있습니다.
                </p>
                <p className="text-xs">
                  * 동일 조건은 10분 내 중복 발송되지 않습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
