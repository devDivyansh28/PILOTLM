"use client";

import React from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CitationChip } from "./CitationChip";
import { SourceViewerModal } from "@/components/viewers/SourceViewerModal";

interface Citation {
  sourceId: string;
  type: string;
  location: Record<string, unknown>;
  text: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  notebookId: string;
  chatId?: string;
  onChatChange?: (chatId: string) => void;
}

export function ChatInterface({ notebookId, chatId: externalChatId, onChatChange }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [selectedCitation, setSelectedCitation] = React.useState<Citation | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Load messages when chatId changes
  React.useEffect(() => {
    if (!externalChatId) return;
    let mounted = true;
    const raf = requestAnimationFrame(() => {
      if (mounted) setLoading(true);
    });
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/chats/${externalChatId}/messages`);
        if (res.ok && mounted) {
          const data = await res.json();
          setMessages(data.map((m: { id: string; role: string; content: string; createdAt: string; citations?: { sourceId: string; type: string; location: Record<string, unknown> }[] }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
            citations: m.citations?.map((c) => ({ sourceId: c.sourceId, type: c.type, location: c.location, text: "" })),
          })));
        }
      } catch {
        // ignore
      } finally {
        if (mounted) {
          cancelAnimationFrame(raf);
          setLoading(false);
        }
      }
    };
    fetchMessages();
    return () => { mounted = false; cancelAnimationFrame(raf); };
  }, [externalChatId, notebookId]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    const streamingId = crypto.randomUUID();
    const streamingMessage: Message = {
      id: streamingId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, streamingMessage]);
    const currentInput = input;
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, query: currentInput, chatId: externalChatId }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let citations: Citation[] = [];
      let newChatId = externalChatId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "token") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                )
              );
            } else if (data.type === "done") {
              citations = data.citations || [];
              newChatId = data.chatId;
            } else if (data.type === "error") {
              console.error("Chat stream error:", data.message);
            }
          } catch {
            // ignore parse errors for partial lines
          }
        }
      }

      // Finalize the streaming message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingId
            ? { ...msg, isStreaming: false, citations }
            : msg
        )
      );

      if (!externalChatId && newChatId) {
        onChatChange?.(newChatId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingId
            ? { ...msg, content: msg.content || "Failed to get response", isStreaming: false }
            : msg
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Ask questions about your sources</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-3" style={{ flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`inline-block max-w-[85%] px-4 py-2 rounded-2xl ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"}`}>
                  <p className="whitespace-pre-wrap">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-1 h-4 bg-current animate-pulse ml-0.5" />}
                  </p>
                </div>
                    {msg.citations && msg.citations.length > 0 && !msg.isStreaming && (
                  <div className="flex flex-wrap gap-1 mt-1.5" style={{ direction: msg.role === "user" ? "rtl" : "ltr" }}>
                    {msg.citations.map((citation, index) => (
                      <CitationChip key={`${citation.sourceId}-${index}`} citation={citation} index={index} onClick={() => setSelectedCitation(citation)} />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1" style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 resize-none"
            disabled={streaming}
          />
          <Button onClick={handleSend} disabled={!input.trim() || streaming} size="icon">
            {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {selectedCitation && (
        <SourceViewerModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
}