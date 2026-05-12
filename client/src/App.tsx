import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import RootPage from "./pages/RootPage";
import Landing from "./pages/Landing";
import DashboardHome from "./pages/DashboardHome";
import StockDetail from "./pages/StockDetail";
import SignalHistory from "./pages/SignalHistory";
import Scanner from "@/pages/Scanner";
import Portfolio from "@/pages/Portfolio";
import Alerts from "@/pages/Alerts";
import AIHub from "@/pages/AIHub";
import EarningsCalendar from "@/pages/EarningsCalendar";
import SectorHeatmapPage from "@/pages/SectorHeatmapPage";
import DivergenceStrategy from "@/pages/DivergenceStrategy";


import { useAuth } from "./_core/hooks/useAuth";
import { Skeleton } from "./components/ui/skeleton";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootPage} />
      <Route path="/landing" component={Landing} />

      {/* Protected Routes */}
      <Route path="/stock/:ticker">
        {params => <ProtectedRoute component={StockDetail} params={params} />}
      </Route>
      <Route path="/signals">
        {() => <ProtectedRoute component={SignalHistory} />}
      </Route>
      <Route path="/scanner">
        {() => <ProtectedRoute component={Scanner} />}
      </Route>
      <Route path="/portfolio">
        {() => <ProtectedRoute component={Portfolio} />}
      </Route>
      <Route path="/alerts">
        {() => <ProtectedRoute component={Alerts} />}
      </Route>
      <Route path="/ai-hub">{() => <ProtectedRoute component={AIHub} />}</Route>
      <Route path="/earnings-calendar">
        {() => <ProtectedRoute component={EarningsCalendar} />}
      </Route>
      <Route path="/sector-heatmap">
        {() => <ProtectedRoute component={SectorHeatmapPage} />}
      </Route>
      <Route path="/divergence-strategy">
        {() => <ProtectedRoute component={DivergenceStrategy} />}
      </Route>


      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
