import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  TrendingUp,
  Wallet,
  LayoutDashboard,
  Settings,
  Brain,
  Bell,
  Moon,
  Sun,
  Calculator,
} from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (to: string) => {
    setLocation(to);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-all"
      >
        <Search className="h-3 w-3" />
        <span>빠른 검색...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 ml-2">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="종목 티커 또는 명령어를 입력하세요..." />
        <CommandList>
          <CommandEmpty>결과를 찾을 수 없습니다.</CommandEmpty>

          <CommandGroup heading="메뉴 이동">
            <CommandItem onSelect={() => navigate("/")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>대시보드</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/portfolio")}>
              <Wallet className="mr-2 h-4 w-4" />
              <span>내 포트폴리오</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/scanner")}>
              <Search className="mr-2 h-4 w-4" />
              <span>스톡 스캐너</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="인기 종목 바로가기">
            <CommandItem onSelect={() => navigate("/stock/TSLA")}>
              <TrendingUp className="mr-2 h-4 w-4 text-bull" />
              <span>Tesla (TSLA)</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/stock/NVDA")}>
              <TrendingUp className="mr-2 h-4 w-4 text-bull" />
              <span>NVIDIA (NVDA)</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/stock/AAPL")}>
              <TrendingUp className="mr-2 h-4 w-4 text-bull" />
              <span>Apple (AAPL)</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="고급 도구">
            <CommandItem onSelect={() => navigate("/portfolio")}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>양도세 계산기</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>설정</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
