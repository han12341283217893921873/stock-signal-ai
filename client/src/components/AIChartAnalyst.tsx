import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, BrainCircuit, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import html2canvas from "html2canvas";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface AIChartAnalystProps {
  ticker: string;
  chartContainerId: string;
}

export default function AIChartAnalyst({
  ticker,
  chartContainerId,
}: AIChartAnalystProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const analyzeMutation = trpc.ai.analyzeChart.useMutation();

  const handleAnalyze = async () => {
    const element = document.getElementById(chartContainerId);
    if (!element) {
      toast.error("차트 영역을 찾을 수 없습니다.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setShowModal(true);

      // 캡처 시 스타일 조정 (배경색 등)
      const canvas = await html2canvas(element, {
        backgroundColor: "#020617",
        scale: 2, // 고해상도
        logging: false,
        useCORS: true,
      });

      const base64Image = canvas.toDataURL("image/png");

      const result = await analyzeMutation.mutateAsync({
        ticker,
        image: base64Image,
        context: "이 차트는 현재 사용자의 상세 페이지에서 캡처되었습니다.",
      });

      setAnalysis(result.analysis);
    } catch (err) {
      console.error("[AI Chart Analyst] Failed:", err);
      toast.error("AI 시각 분석 중 오류가 발생했습니다.");
      setShowModal(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        variant="outline"
        className="gap-2 border-primary/40 hover:bg-primary/10"
      >
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4 text-primary" />
        )}
        AI 시각 분석 (Vision)
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col glass-card border-primary/30 shadow-2xl shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                AI 차트 시각 분석 리포트
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <Eye className="h-6 w-6 text-primary absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">
                      이미지를 분석 중입니다...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gemini Vision 엔진이 차트 패턴을 해독하고 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysis || ""}</ReactMarkdown>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-border/50 bg-muted/20 text-right">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowModal(false)}
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
