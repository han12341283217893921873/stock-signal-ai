import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Search,
  FileText,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface AIDeepDiveProps {
  ticker: string;
}

export default function AIDeepDive({ ticker }: AIDeepDiveProps) {
  const [showModal, setShowModal] = useState(false);
  const deepDiveMutation = trpc.ai.deepDive.useMutation();

  const handleStart = async () => {
    setShowModal(true);
    try {
      await deepDiveMutation.mutateAsync({ ticker });
    } catch (err) {
      console.error("[AI Deep-Dive] Failed:", err);
      toast.error("심층 리서치 중 오류가 발생했습니다.");
    }
  };

  const isAnalyzing = deepDiveMutation.isPending;
  const report = deepDiveMutation.data?.report;

  return (
    <>
      <Button
        onClick={handleStart}
        variant="secondary"
        className="gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
      >
        <Search className="h-4 w-4" />
        AI 심층 리서치 (Deep-Dive)
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col glass-card border-indigo-500/30 shadow-2xl shadow-indigo-500/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-indigo-500/5 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    {ticker} 자율 심층 리서치 보고서
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI 애널리스트가 공시, 뉴스, 재무 데이터를 종합 분석
                    중입니다.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full border-t-2 border-indigo-500 animate-spin" />
                    <Sparkles className="h-8 w-8 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <p className="font-bold text-xl text-indigo-400">
                      심층 데이터를 수집하고 있습니다...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      최근 공시 자료와 30일치 뉴스 헤드라인을 분석하여 통찰력을
                      도출하고 있습니다. 잠시만 기다려주세요 (약 15-30초 소요)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-0" />
                    <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                    <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              ) : report ? (
                <div className="prose prose-invert prose-indigo max-w-none prose-sm sm:prose-base leading-relaxed">
                  <ReactMarkdown>{report}</ReactMarkdown>

                  <div className="mt-12 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex gap-4 items-start">
                    <AlertTriangle className="h-6 w-6 text-indigo-400 shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-indigo-400 text-sm">
                        전문가 의견 참고 주의
                      </p>
                      <p className="text-[12px] text-muted-foreground leading-snug">
                        이 보고서는 AI가 인터넷 상의 공개 데이터(뉴욕 증시 공시,
                        뉴스 등)를 바탕으로 생성한 자율 리서치 결과입니다. 수치
                        오류가 포함될 수 있으므로 최종 투자 결정 전 반드시 원본
                        데이터를 확인하시기 바랍니다.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-between items-center px-8">
              <span className="text-[10px] text-muted-foreground font-mono">
                POWERED BY GEMINI 1.5 PRO / CLAUDE 3.5
              </span>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="rounded-full px-6"
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
