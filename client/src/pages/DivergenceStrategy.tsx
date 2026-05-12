import DashboardLayout from "@/components/DashboardLayout";
import ValueSentimentDivergence from "@/components/ValueSentimentDivergence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ShieldCheck, Target, Lightbulb } from "lucide-react";

export default function DivergenceStrategy() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* 헤더 섹션 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-black tracking-tighter text-sm uppercase">
              <Zap className="w-4 h-4 fill-primary" />
              Core Engine
            </div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              가치-심리 괴리 전략
              <span className="text-muted-foreground/30 text-2xl font-normal hidden sm:inline">Value Divergence</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              기업의 펀더멘털은 우량하지만(AI 고득점), 시장의 일시적인 오해나 공포로 인해 가격이 과하게 저평가된 
              종목을 발굴합니다. "가치는 높고 가격은 싼" 최적의 역발상 진입 시점을 포착하세요.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Card className="bg-primary/5 border-primary/20 shadow-none px-4 py-2 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">신뢰도</p>
                <p className="text-sm font-black mt-1">High Accuracy</p>
              </div>
            </Card>
          </div>
        </div>

        {/* 전략 설명 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              icon: Target, 
              title: "60% 펀더멘털", 
              desc: "AI 분석 엔진을 통한 기업 본연의 가치 및 성장성 평가" 
            },
            { 
              icon: Zap, 
              title: "40% 기술적 바닥", 
              desc: "볼린저 밴드 하단 이격도 및 RSI 과매도 지표 활용" 
            },
            { 
              icon: Lightbulb, 
              title: "상대적 랭킹", 
              desc: "전체 시장에서 괴리율이 가장 큰 Top 5 종목 우선 순위" 
            }
          ].map((feature, idx) => (
            <Card key={idx} className="bg-card/50 border-border/50 shadow-none">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">{feature.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 메인 리스트 컴포넌트 */}
        <ValueSentimentDivergence />

        {/* 안내 문구 */}
        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-base">투자 유의사항</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              이 전략은 역발상(Contrarian) 투자 방식을 기반으로 합니다. 주가가 저평가 구간에 진입하더라도 
              추가적인 하락이 발생할 수 있으므로, 반드시 분할 매수로 접근하시고 개별 종목의 최신 공시나 
              뉴스(AI 분석 허브 참조)를 교차 검증하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
