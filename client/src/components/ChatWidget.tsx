import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HistoryMessage {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

interface DisplayMessage {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
}

function buildDisplay(history: HistoryMessage[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const h of history) {
    out.push({ role: "user", text: h.message });
    out.push({ role: "assistant", text: h.response });
  }
  return out;
}

const LIMIT = 4;
const WINDOW_MS = 5 * 60 * 1000;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);
  const [usedInWindow, setUsedInWindow] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, refetch } = useQuery<{ messages: HistoryMessage[]; usedInWindow: number; limit: number }>({
    queryKey: ["/api/chat/history"],
    enabled: open,
    staleTime: 0,
  });

  // Sync window count and cooldown from history
  useEffect(() => {
    if (!data) return;
    setUsedInWindow(data.usedInWindow);

    // Check if oldest in-window message will expire soon enough to still be in cooldown
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const inWindow = data.messages.filter(m => new Date(m.created_at) >= windowStart);
    if (inWindow.length >= LIMIT) {
      const oldestAt = new Date(inWindow[0].created_at).getTime();
      const availableAt = new Date(oldestAt + WINDOW_MS);
      if (availableAt > new Date()) {
        setCooldownUntil(availableAt);
      } else {
        setCooldownUntil(null);
      }
    } else {
      setCooldownUntil(null);
    }
  }, [data]);

  const historyMessages = buildDisplay(data?.messages ?? []);
  const allMessages = [...historyMessages, ...optimisticMessages];

  // Recalculate cooldown label every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const isCoolingDown = cooldownUntil ? cooldownUntil > new Date() : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      // Attach http status onto the json so onError can read it reliably
      return { ...json, httpStatus: res.status, ok: res.ok } as any;
    },
    onMutate: (message) => {
      setOptimisticMessages([{ role: "user", text: message }]);
    },
    onSuccess: (data: any) => {
      if (!data.ok) {
        // Handle error responses (429, 503, 500, etc.) inside onSuccess
        if (data.httpStatus === 429) {
          const minutes = data.retryAfterMinutes ?? 15;
          setCooldownUntil(new Date(Date.now() + minutes * 60 * 1000));
          setUsedInWindow(LIMIT);
          setOptimisticMessages([]);
        } else {
          const errorText = data.message || "Something went wrong. Please try again.";
          setOptimisticMessages((prev) => [...prev, { role: "assistant", text: errorText, error: true }]);
        }
        return;
      }
      setOptimisticMessages([]);
      refetch();
    },
    onError: () => {
      setOptimisticMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Couldn't reach the server. Please try again.", error: true },
      ]);
    },
  });

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending || isCoolingDown) return;
    setInput("");
    sendMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isLoading = sendMutation.isPending;
  const canSend = input.trim().length > 0 && !isLoading && !isCoolingDown;

  const cooldownLabel = cooldownUntil && isCoolingDown
    ? `You've reached your limit. New questions available ${formatDistanceToNow(cooldownUntil, { addSuffix: true })}.`
    : null;

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[340px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <div>
                <p className="text-sm font-semibold leading-tight">ReviewOptic Assistant</p>
                <p className="text-[11px] opacity-80">Ask me anything.</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {allMessages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center text-center pt-6 pb-2 text-muted-foreground">
                <MessageCircle className="w-9 h-9 mb-3 opacity-20" />
                <p className="text-[13px] font-medium mb-1">How can I help?</p>
                <p className="text-[11px] opacity-70 mb-4">Ask me anything.</p>
                <div className="flex flex-col gap-2 w-full text-left">
                  {[
                    "How do I get more Google reviews?",
                    "What's the best time to ask for a review?",
                    "How should I respond to a negative review?",
                    "Can you write me a review request message?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-left text-[12px] px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allMessages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : msg.error
                      ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-tl-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Cooldown banner */}
          {isCoolingDown && cooldownLabel && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-snug">{cooldownLabel}</p>
            </div>
          )}

          {/* Input + counter */}
          <div className="border-t border-border px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCoolingDown ? "Cooldown active…" : "Ask a question…"}
              disabled={isCoolingDown || isLoading}
              className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-40"
            />
            <Button
              size="icon"
              className="h-7 w-7 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!canSend}
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 px-4 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        style={{ height: "52px" }}
        aria-label="Open chat"
      >
        {open ? <X className="w-5 h-5" /> : (
          <>
            <MessageCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-[13px] font-medium">Need help?</span>
          </>
        )}
      </button>
    </>
  );
}
