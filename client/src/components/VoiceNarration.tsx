import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play, Pause, Square } from "lucide-react";

interface VoiceNarrationProps {
  text: string;
}

export default function VoiceNarration({ text }: VoiceNarrationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(
    null
  );

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handlePlay = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    // 마크다운 문법 제거
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\[.*?\]/g, "");
    const newUtterance = new SpeechSynthesisUtterance(cleanText);
    newUtterance.lang = "ko-KR";
    newUtterance.rate = 1.0;

    newUtterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
    setIsPlaying(true);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
      <span className="text-[10px] font-bold text-muted-foreground ml-1 uppercase tracking-tighter">
        AI 브리핑
      </span>
      <div className="flex items-center gap-1">
        {!isPlaying || isPaused ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary"
            onClick={handlePlay}
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-yellow-500"
            onClick={handlePause}
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive"
          onClick={handleStop}
          disabled={!isPlaying && !isPaused}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
