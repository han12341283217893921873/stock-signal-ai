import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, Check, Loader2, Plus } from "lucide-react";

interface AddToPortfolioButtonProps {
  ticker: string;
  name?: string;
  currentPrice?: number;
  currency?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  signalScore?: number;
}

export default function AddToPortfolioButton({
  ticker,
  name,
  currentPrice,
  currency = "USD",
  size = "sm",
  variant = "outline",
  className = "",
  signalScore,
}: AddToPortfolioButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [avgPrice, setAvgPrice] = useState(
    currentPrice ? String(currentPrice) : ""
  );
  const utils = trpc.useUtils();

  // 이미 포트폴리오에 있는지 확인
  const { data: portfolioData } = trpc.portfolio.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const positions = portfolioData?.positions ?? [];
  const alreadyInPortfolio = positions.some(
    p => p.ticker.toUpperCase() === ticker.toUpperCase()
  );

  const buyMutation = trpc.portfolio.buy.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate();
      setOpen(false);
      setQuantity("1");
      toast.success(`${ticker} 매수가 완료되었습니다.`);
    },
    onError: e => toast.error(e.message),
  });

  if (!user) return null;

  const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  const currSymbol = isKR || currency === "KRW" ? "₩" : "$";

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentPrice) setAvgPrice(String(currentPrice));
    setOpen(true);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const qty = parseFloat(quantity);
    const price = parseFloat(avgPrice);
    if (!qty || qty <= 0) return toast.error("수량을 입력해주세요.");
    if (!price || price <= 0) return toast.error("매수가를 입력해주세요.");
    buyMutation.mutate({
      ticker: ticker.toUpperCase(),
      name,
      quantity: qty,
      price: price,
      signalScore,
    });
  };

  return (
    <>
      <Button
        size={size}
        variant={alreadyInPortfolio ? "ghost" : variant}
        className={`gap-1.5 ${alreadyInPortfolio ? "text-green-500 hover:text-green-500" : ""} ${className}`}
        onClick={
          alreadyInPortfolio
            ? e => {
                e.stopPropagation();
                e.preventDefault();
              }
            : handleOpen
        }
        title={
          alreadyInPortfolio ? "포트폴리오에 보유 중" : "포트폴리오에 추가"
        }
      >
        {alreadyInPortfolio ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Briefcase className="h-3.5 w-3.5" />
        )}
        {size !== "icon" && (
          <span className="text-xs">
            {alreadyInPortfolio ? "보유 중" : "포트폴리오"}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              모의투자 주식 매수
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-mono font-bold">{ticker}</p>
                {name && (
                  <p className="text-xs text-muted-foreground">{name}</p>
                )}
              </div>
              {currentPrice && (
                <p className="font-mono font-semibold text-sm">
                  {currSymbol}
                  {isKR || currency === "KRW"
                    ? currentPrice.toLocaleString("ko-KR")
                    : currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </p>
              )}
            </div>
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">보유 예수금</span>
                <span className="font-bold text-primary">
                  {portfolioData?.cashBalance?.toLocaleString() ?? "0"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">매수 수량</Label>
                <Input
                  type="number"
                  min="0.0001"
                  step="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="1"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">매수가 ({currSymbol})</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={avgPrice}
                  onChange={e => setAvgPrice(e.target.value)}
                  placeholder={currentPrice ? String(currentPrice) : "0"}
                />
              </div>
            </div>
            {currentPrice && avgPrice && parseFloat(avgPrice) > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  총 매수 예상 금액:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {currSymbol}
                    {(
                      parseFloat(quantity || "0") * parseFloat(avgPrice)
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: isKR ? 0 : 2,
                    })}
                  </span>
                </p>
                {isKR && (
                  <p className="text-[10px] text-muted-foreground opacity-70">
                    (달러 환산: 약 $
                    {(
                      (parseFloat(quantity || "0") * parseFloat(avgPrice)) /
                      1380
                    ).toFixed(2)}{" "}
                    USD)
                  </p>
                )}
              </div>
            )}
            <Button
              className="w-full bg-bull hover:bg-bull/90"
              onClick={handleAdd}
              disabled={buyMutation.isPending}
            >
              {buyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              매수 주문 실행
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
