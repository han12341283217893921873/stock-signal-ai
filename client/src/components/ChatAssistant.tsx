import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "stock-ai-chat-history";
const MAX_STORED = 50;
const DEFAULT_MSG = {
  role: "assistant" as const,
  content:
    "안녕하세요! 포트폴리오 분석이나 시장 상황에 대해 궁금한 점이 있으신가요?",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Message[];
    } catch {}
    return [DEFAULT_MSG];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // 메시지 변경 시 localStorage에 저장 (최대 50개)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED))
      );
    } catch {}
  }, [messages]);

  const handleClear = () => {
    const initial = [DEFAULT_MSG];
    setMessages(initial);
    localStorage.removeItem(STORAGE_KEY);
  };

  const chatMutation = trpc.chat.ask.useMutation({
    onSuccess: data => {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.",
        },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    chatMutation.mutate({
      message: userMessage,
      history: messages
        .slice(1)
        .map(m => ({ role: m.role, content: m.content })),
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl hover:scale-110 transition-transform bg-primary"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-80 sm:w-96 h-[500px] shadow-2xl flex flex-col glass-card border-primary/20 animate-in slide-in-from-bottom-5 duration-300">
          <CardHeader className="p-4 bg-primary/10 border-b border-primary/10 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> AI 투자 비서
              <Badge
                variant="outline"
                className="text-[10px] py-0 border-primary/30 text-primary"
              >
                Beta
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                title="대화 초기화"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-muted" : "bg-primary/20"}`}
                      >
                        {m.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted/50 border border-border/50 rounded-tl-none"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[85%]">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="p-3 rounded-2xl rounded-tl-none bg-muted/50 border border-border/50 text-xs">
                        분석 중입니다...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t border-border/50">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="질문을 입력하세요..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                className="h-9 text-xs focus-visible:ring-primary/30"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
