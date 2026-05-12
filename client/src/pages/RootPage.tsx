import { useAuth } from "@/_core/hooks/useAuth";
import DashboardHome from "./DashboardHome";
import Landing from "./Landing";
import { Skeleton } from "@/components/ui/skeleton";

export default function RootPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우 랜딩 페이지 표시
  if (!user) {
    return <Landing />;
  }

  return <DashboardHome />;
}
