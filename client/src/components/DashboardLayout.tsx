import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Bell,
  History,
  TrendingUp,
  BarChart3,
  Zap,
  Globe2,
  Wallet,
  BellRing,
  BrainCircuit,
  PiggyBank,
  LineChart,
  Lightbulb,
  Calendar,
  Search,
  Sun,
  Moon,
  Cloud,
  CloudRain,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { TopMoversWidget } from "./TopMoversWidget";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

const menuGroups = [
  {
    label: "핵심",
    items: [
      { icon: LayoutDashboard, label: "대시보드", path: "/" },
      { icon: Zap, label: "종목 스캐너", path: "/scanner" },
      { icon: Lightbulb, label: "가치-심리 괴리", path: "/divergence-strategy" },
      { icon: History, label: "신호 히스토리", path: "/signals" },
    ],
  },
  {
    label: "포트폴리오",
    items: [{ icon: Wallet, label: "포트폴리오", path: "/portfolio" }],
  },
  {
    label: "AI 분석",
    items: [
      { icon: BrainCircuit, label: "AI 분석 허브", path: "/ai-hub" },
      { icon: Calendar, label: "실적 캘린더", path: "/earnings-calendar" },
      { icon: BarChart3, label: "섹터 히트맵", path: "/sector-heatmap" },
    ],
  },
  {
    label: "설정",
    items: [{ icon: BellRing, label: "알림 조건", path: "/alerts" }],
  },
];

// 플랫 배열 (경로 매칭용)
const menuItems = menuGroups.flatMap(g => g.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(open => !open);
      }
    };

    const handleOpenSearch = () => setSearchOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-search", handleOpenSearch);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-search", handleOpenSearch);
    };
  }, []);

  // Unread signal count (only for authenticated users)
  const { data: unreadCount } = trpc.signals.unreadCount.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 60000,
  });

  // Macro data - 장중 30초, 장외 5분 폴링
  const { data: macroData } = trpc.macro.indices.useQuery(undefined, {
    refetchInterval: 30 * 1000,
    staleTime: 25 * 1000,
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border/50 sidebar-glow"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border/40">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent/70 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0 shadow-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold tracking-tight text-sm gradient-text truncate block">
                      Stock Signal
                    </span>
                    <span className="text-[10px] text-muted-foreground block -mt-0.5 tracking-widest uppercase truncate">
                      AI Platform
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            {!isCollapsed && (
              <MarketWeatherBadge />
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Search Input Trigger */}
            <div
              className={`px-3 py-3 transition-all border-b border-sidebar-border/30 ${isCollapsed ? "hidden" : "block"}`}
            >
              <Button
                variant="outline"
                className="w-full justify-start text-sm text-muted-foreground bg-sidebar-accent/30 border-sidebar-border/50 hover:bg-sidebar-accent/60 hover:text-foreground relative shadow-none"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs">종목 검색...</span>
                <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[9px] font-medium opacity-80 sm:flex">
                  <span className="text-[10px]">⌘</span>K
                </kbd>
              </Button>
            </div>

            {/* 실시간 상승/하락 주식 순위 */}
            <TopMoversWidget
              isCollapsed={isCollapsed}
              onNavigate={ticker => setLocation(`/stock/${ticker}`)}
            />

            {/* 거시경제 미니 위젯 */}
            {!isCollapsed && macroData && macroData.length > 0 && (
              <div className="mx-3 mb-2 p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/30">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Globe2 className="h-3 w-3 text-primary/70 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-semibold truncate">
                    매크로 지수
                  </span>
                </div>
                <div className="space-y-1.5">
                  {macroData.map(item => (
                    <div
                      key={item.ticker}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[11px] text-muted-foreground/80 truncate flex-1">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-foreground/80">
                          {item.ticker === "KRW=X"
                            ? item.price.toFixed(1)
                            : item.ticker === "^TNX"
                              ? item.price.toFixed(2) + "%"
                              : item.price.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            item.changePercent >= 0 ? "text-bull" : "text-bear"
                          }`}
                        >
                          {item.changePercent >= 0 ? "+" : ""}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1 py-2">
              {menuGroups.map(group => (
                <SidebarGroup key={group.label} className="px-2 py-0">
                  <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1 px-2 font-bold truncate">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarMenu className="gap-0.5">
                    {group.items.map(item => {
                      const isActive = location === item.path;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className={`h-9 transition-all text-sm font-normal rounded-lg ${
                              isActive
                                ? "bg-primary/12 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                            }`}
                          >
                            <item.icon
                              className={`h-4 w-4 shrink-0 transition-colors ${
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            />
                            <span className="flex items-center justify-between w-full">
                              <span>{item.label}</span>
                              {item.path === "/signals" &&
                                unreadCount != null &&
                                unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 min-w-4 px-1 text-[10px] font-bold shrink-0"
                                  >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                  </Badge>
                                )}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              ))}
            </div>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-2">
            {/* 테마 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center"
              title={
                theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
              {!isCollapsed && (
                <span>{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/80 px-3 backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold text-sm tracking-tight">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MarketWeatherBadge() {
  const { data: weather } = trpc.advanced.weather.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000
  });

  if (!weather) return null;

  return (
    <div className={`ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-tighter ${
      weather.status === 'storm' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
      weather.status === 'cloudy' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    }`}>
      {weather.status === 'storm' ? <CloudRain className="w-3 h-3" /> : 
       weather.status === 'cloudy' ? <Cloud className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
      <span className="hidden xl:inline">{weather.status}</span>
    </div>
  );
}
