import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// Google 아이콘 SVG 컴포넌트
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Landing() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      {/* 헤더 */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Stock Signal AI</span>
          </div>
          <Button onClick={handleLogin} className="gap-2" id="header-login-btn">
            <GoogleIcon className="h-4 w-4" />
            Google로 로그인
          </Button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          AI 기반 주식 매매 신호
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          실시간 기술적 분석과 머신러닝을 통해 정확한 매매 신호를 제공합니다.
          초보자부터 전문가까지 모두 사용할 수 있습니다.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleLogin}
            size="lg"
            className="gap-3 text-lg h-12 px-8 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm"
            id="hero-google-login-btn"
          >
            <GoogleIcon className="h-5 w-5" />
            Google 계정으로 무료 시작
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-lg h-12 px-8"
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            기능 알아보기
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Google 계정만 있으면 바로 시작할 수 있습니다. 별도 회원가입 불필요.
        </p>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">주요 기능</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-bull/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-bull" />
                </div>
                <h3 className="font-semibold text-lg">실시간 신호</h3>
              </div>
              <p className="text-muted-foreground">
                RSI, MACD, 이동평균 등 기술적 지표를 분석하여 매매 신호를
                실시간으로 제공합니다.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">종목 스캐너</h3>
              </div>
              <p className="text-muted-foreground">
                미국·한국 주식을 실시간으로 스캔하여 매매 기회를 찾아냅니다.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg">포트폴리오 추적</h3>
              </div>
              <p className="text-muted-foreground">
                보유 종목을 추가하고 실시간으로 포트폴리오 성과를
                모니터링합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 신호 강도 설명 */}
      <section className="max-w-6xl mx-auto px-4 py-16 bg-card/50 rounded-lg border border-border/50 my-12">
        <h2 className="text-3xl font-bold mb-8 text-center">신호 강도 체계</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { grade: "강력매수", score: "60+", color: "text-bull" },
            { grade: "매수", score: "35+", color: "text-bull" },
            { grade: "관망", score: "-35~34", color: "text-muted-foreground" },
            { grade: "매도", score: "-60~-36", color: "text-bear" },
            { grade: "강력매도", score: "-60이하", color: "text-bear" },
          ].map(item => (
            <div key={item.grade} className="text-center">
              <div className={`text-2xl font-bold mb-2 ${item.color}`}>
                {item.grade}
              </div>
              <div className="text-sm text-muted-foreground">
                점수 {item.score}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 실시간 상승/하락 종목 미리보기 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">
          실시간 상승/하락 종목
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-bull/20 bg-bull/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-bull" />
                <h3 className="font-semibold">오늘의 상승 종목</h3>
              </div>
              <div className="space-y-2">
                {[
                  { ticker: "NVDA", name: "NVIDIA", change: "+3.01%" },
                  { ticker: "TSLA", name: "Tesla", change: "+3.07%" },
                  { ticker: "MSFT", name: "Microsoft", change: "+2.45%" },
                ].map(stock => (
                  <div
                    key={stock.ticker}
                    className="flex items-center justify-between p-2 rounded hover:bg-bull/10 transition-colors"
                  >
                    <div>
                      <div className="font-mono font-semibold">
                        {stock.ticker}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-bull font-semibold">
                      {stock.change}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-bear/20 bg-bear/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-bear" />
                <h3 className="font-semibold">오늘의 하락 종목</h3>
              </div>
              <div className="space-y-2">
                {[
                  { ticker: "IBM", name: "IBM", change: "-3.40%" },
                  { ticker: "INTC", name: "Intel", change: "-2.15%" },
                  { ticker: "BAC", name: "Bank of America", change: "-1.89%" },
                ].map(stock => (
                  <div
                    key={stock.ticker}
                    className="flex items-center justify-between p-2 rounded hover:bg-bear/10 transition-colors"
                  >
                    <div>
                      <div className="font-mono font-semibold">
                        {stock.ticker}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-bear font-semibold">
                      {stock.change}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 장점 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">
          왜 Stock Signal AI를 선택할까?
        </h2>
        <div className="space-y-4">
          {[
            "AI 기반의 정확한 기술적 분석",
            "실시간 시장 데이터 업데이트",
            "Google 계정으로 간편 로그인",
            "무료로 시작 가능",
            "24/7 시장 모니터링",
          ].map(benefit => (
            <div
              key={benefit}
              className="flex items-center gap-3 p-4 rounded-lg bg-card/50"
            >
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-lg">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">지금 바로 시작하세요</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Google 계정으로 로그인하면 AI 기반 주식 매매 신호를 바로 받아보실 수
          있습니다.
        </p>
        <Button
          onClick={handleLogin}
          size="lg"
          className="gap-3 text-lg h-12 px-10 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-md"
          id="cta-google-login-btn"
        >
          <GoogleIcon className="h-5 w-5" />
          Google로 무료 시작
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          Google 계정만 있으면 됩니다. 추가 가입 절차 없음.
        </p>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-border/50 py-8 text-center text-muted-foreground">
        <p>© 2026 Stock Signal AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
