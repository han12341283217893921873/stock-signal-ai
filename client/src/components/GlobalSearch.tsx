import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, BarChart2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [, setLocation] = useLocation();

  const { data: searchResults, isLoading } = trpc.stock.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1 }
  );

  const utils = trpc.useUtils();
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
      toast.success("관심 종목에 추가되었습니다");
      onOpenChange(false);
      setQuery("");
    },
  });

  // reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="종목명 또는 티커 검색 (예: AAPL, 삼성전자)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 검색 중...
            </div>
          ) : query.length > 0 ? (
            "검색 결과가 없습니다."
          ) : (
            "종목을 검색해보세요."
          )}
        </CommandEmpty>
        {query.length === 0 && (
          <CommandGroup heading="빠른 메뉴 이동">
            <CommandItem
              onSelect={() => {
                setLocation("/");
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <BarChart2 className="mr-2 h-4 w-4" /> 대시보드 홈
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setLocation("/portfolio");
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" /> 내 포트폴리오
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setLocation("/scanner");
                onOpenChange(false);
              }}
              className="cursor-pointer"
            >
              <Loader2 className="mr-2 h-4 w-4" /> 종목 스캐너
            </CommandItem>
          </CommandGroup>
        )}
        {searchResults && searchResults.length > 0 && (
          <CommandGroup heading="종목 검색 결과">
            {searchResults.map((result: any) => (
              <CommandItem
                key={result.ticker}
                value={`${result.ticker} ${result.name}`}
                onSelect={() => {
                  setLocation(`/stock/${result.ticker}`);
                  onOpenChange(false);
                }}
                className="flex items-center justify-between py-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-base">
                      {result.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.exchange && (
                    <Badge
                      variant="outline"
                      className="text-[10px] hidden sm:flex border-border/50 bg-background/50"
                    >
                      {result.exchange}
                    </Badge>
                  )}
                  <button
                    className="p-1.5 rounded-full hover:bg-primary hover:text-primary-foreground bg-primary/10 text-primary transition-all z-10 opacity-0 group-hover:opacity-100"
                    onClick={e => {
                      e.stopPropagation();
                      addMutation.mutate({
                        ticker: result.ticker,
                        name: result.name,
                      });
                    }}
                    title="대시보드에 즉시 추가"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
