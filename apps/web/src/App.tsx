import { useEffect, useRef, useState } from "react";
import type { Citation } from "@pg/shared";
import { streamChat } from "./api.ts";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  cache?: "semantic" | "response" | "miss";
}

const SUGGESTIONS = [
  "How do I get startup ideas?",
  "What makes a great founder?",
  "Why should I work on things that don't scale?",
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);

    const patchLast = (fn: (msg: Message) => Message) =>
      setMessages((m) => {
        const next = m.slice();
        const i = next.length - 1;
        if (i >= 0 && next[i]!.role === "assistant") next[i] = fn(next[i]!);
        return next;
      });

    try {
      for await (const ev of streamChat(q)) {
        if (ev.type === "token") {
          patchLast((msg) => ({ ...msg, content: msg.content + ev.value }));
        } else if (ev.type === "citations") {
          patchLast((msg) => ({ ...msg, citations: ev.citations }));
        } else if (ev.type === "cache") {
          patchLast((msg) => ({ ...msg, cache: ev.hit }));
        } else if (ev.type === "error") {
          patchLast((msg) => ({
            ...msg,
            content: `${msg.content}\n\n⚠️ ${ev.message}`,
          }));
        }
      }
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Could not reach the API";
      patchLast((msg) => ({
        ...msg,
        content: `${msg.content}\n\n⚠️ ${detail}`,
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Ask Paul Graham</h1>
        <p>Answers grounded in his essays, in his voice — with citations.</p>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.cache && m.cache !== "miss" && (
              <span className="badge">{m.cache} cache</span>
            )}
            <div className="content">{m.content || (busy ? "…" : "")}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="citations">
                {m.citations.map((c) => (
                  <a
                    key={c.chunkId}
                    href={c.link}
                    target="_blank"
                    rel="noreferrer"
                    title={`score ${c.score.toFixed(3)}`}
                  >
                    {c.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about startups, essays, programming…"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
