import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import type { ChatMessage } from "../api/chat";
import { Logo } from "./Logo";

interface ChatWidgetBaseProps {
  token: string | null;
  greeting: string;
  placeholder: string;
  sendMessage: (token: string, messages: ChatMessage[], onChunk: (chunk: string) => void) => Promise<void>;
}

export function ChatWidgetBase({ token, greeting, placeholder, sendMessage }: ChatWidgetBaseProps) {
  const greetingMessage: ChatMessage = { role: "assistant", content: greeting };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  function handleReset() {
    setMessages([greetingMessage]);
    setError(null);
    setInput("");
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    if (!token) {
      setError("Please sign in to chat with us.");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);
    setError(null);

    let started = false;
    try {
      await sendMessage(token, nextMessages, (chunk) => {
        started = true;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk };
          return updated;
        });
      });
      if (!started) {
        setMessages((prev) => prev.slice(0, -1));
        setError("The chat assistant returned an empty response.");
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : "Failed to reach the chat assistant");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <div className="chat-widget-header-brand">
              <Logo size="sm" />
              <span>Assistant</span>
            </div>
            <div className="chat-widget-header-actions">
              <button
                type="button"
                className="icon-button"
                onClick={handleReset}
                disabled={sending}
                title="Start a new chat"
              >
                <RotateCcw size={15} />
              </button>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="chat-widget-messages" ref={listRef}>
            {messages.map((m, i) => {
              const isPending = sending && i === messages.length - 1 && m.role === "assistant" && !m.content;
              return (
                <div
                  key={i}
                  className={`chat-bubble chat-bubble-${m.role}${isPending ? " chat-bubble-typing" : ""}`}
                >
                  {isPending ? "Typing..." : m.content}
                </div>
              );
            })}
            {error && <div className="chat-bubble chat-bubble-error">{error}</div>}
          </div>

          <form className="chat-widget-form" onSubmit={handleSend}>
            <input
              type="text"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="icon-button" disabled={sending || !input.trim()} title="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-widget-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Chat with support"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
