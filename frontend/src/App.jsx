
import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Plus,
  Sparkles,
  User,
  Zap,
  Database,
  ShieldCheck,
  Menu
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function newSessionId() {
  return "s-" + crypto.randomUUID();
}

export default function App() {
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);

  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend unavailable");
        }
        return response.json();
      })
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function startNewChat() {
    setSessionId(newSessionId());
    setMessages([]);
    setInput("");
    setError("");
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const text = input.trim();

    if (!text || busy) return;

    setInput("");
    setError("");

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text }
    ]);

    setBusy(true);

    try {
      const payload = {
        session_id: sessionId,
        message: text
      };

      if (systemPrompt.trim()) {
        payload.system_prompt = systemPrompt.trim();
      }

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Something went wrong. Please try again."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply,
          metadata: data.metadata
        }
      ]);
    } catch (err) {
      const errorMessage =
        err.message || "Unable to connect to the server.";

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          role: "error",
          content: errorMessage
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">

      {/* Sidebar */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={19} />
          </div>
          <span>
            lyftr<span className="brand-ai">.ai</span>
          </span>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <Plus size={17} />
          New chat
        </button>

        <div className="side-label">WORKSPACE</div>

        <div className="side-item active">
          <Bot size={17} />
          AI Assistant
        </div>

        <div className="side-label system-label">
          SYSTEM STATUS
        </div>

        <div className="status-card">

          <div className="status-line">
            <span
              className={`status-dot ${
                health?.status === "ok" ? "online" : ""
              }`}
            ></span>

            <span>
              {health?.status === "ok"
                ? "Backend online"
                : "Backend unavailable"}
            </span>
          </div>

          <div className="status-detail">
            <Database size={13} />
            SQLite storage
          </div>

          <div className="status-detail">
            <ShieldCheck size={13} />
            {health?.keys_configured ?? 0} API keys configured
          </div>

          <div className="status-detail">
            <Zap size={13} />
            Cache {health?.cache_enabled ? "enabled" : "unknown"}
          </div>

        </div>

        <div className="sidebar-bottom">
          Built for resilient AI conversations
        </div>

      </aside>

      {/* Main application */}

      <main className="main">

        {/* Header */}

        <header className="topbar">

          <div className="top-title">

            <span className="mobile-brand">
              <Menu size={18} />
            </span>

            <span>AI Assistant</span>

            <span className="model-pill">
              Gemini · LiteLLM
            </span>

          </div>

          <button
            className="prompt-button"
            onClick={() => setShowPrompt((value) => !value)}
          >
            System prompt
          </button>

        </header>

        {/* System prompt panel */}

        {showPrompt && (
          <div className="prompt-panel">

            <label htmlFor="system-prompt-input">
              Custom instructions
            </label>

            <textarea
              id="system-prompt-input"
              data-testid="system-prompt-input"
              value={systemPrompt}
              onChange={(event) =>
                setSystemPrompt(event.target.value)
              }
              placeholder="Example: Explain concepts in simple language..."
            />

          </div>
        )}

        {/* Chat area */}

        <section className="chat-area">

          {messages.length === 0 ? (

            <div className="welcome">

              <div className="welcome-icon">
                <Sparkles size={25} />
              </div>

              <div className="eyebrow">
                YOUR AI WORKSPACE
              </div>

              <h1>
                What can I help you
                <br />
                <span>think through today?</span>
              </h1>

              <p>
                Ask a question, explore an idea, or work through a problem.
                <br />
                Your conversation stays remembered in this session.
              </p>

              <div className="suggestions">

                {[
                  "Explain how API key failover works",
                  "What is response caching?",
                  "Help me understand FastAPI"
                ].map((item) => (

                  <button
                    key={item}
                    onClick={() => setInput(item)}
                  >
                    {item}
                    <span>↗</span>
                  </button>

                ))}

              </div>

            </div>

          ) : (

            <div className="messages">

              {/* Conversation messages */}

              {messages.map((message, index) => (

                <div
                  className={`message-row ${message.role}`}
                  key={index}
                >

                  <div className={`avatar ${message.role}`}>
                    {message.role === "user" ? (
                      <User size={16} />
                    ) : (
                      <Bot size={17} />
                    )}
                  </div>

                  <div
                    className="message-body"
                    data-testid={
                      message.role === "assistant"
                        ? "assistant-message"
                        : undefined
                    }
                  >

                    <div className="message-author">
                      {message.role === "user"
                        ? "You"
                        : message.role === "error"
                        ? "Notice"
                        : "Lyftr AI"}
                    </div>

                    <div className="message-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* Response metadata */}

                    {message.role === "assistant" &&
                      message.metadata && (

                        <div className="metadata">

                          <span
                            className={`source ${
                              message.metadata.resolution_source ===
                              "LLM_CACHE"
                                ? "cached"
                                : ""
                            }`}
                            data-testid="meta-source"
                          >
                            {message.metadata.resolution_source}
                          </span>

                          <span data-testid="meta-model">
                            {message.metadata.model}
                          </span>

                          <span data-testid="meta-latency">
                            {message.metadata.latency_ms} ms
                          </span>

                          <span>
                            In{" "}
                            <b data-testid="meta-input-tokens">
                              {message.metadata.input_tokens}
                            </b>
                          </span>

                          <span>
                            Out{" "}
                            <b data-testid="meta-output-tokens">
                              {message.metadata.output_tokens}
                            </b>
                          </span>

                        </div>

                      )}

                  </div>

                </div>

              ))}

              {/* Typing indicator */}

              {busy && (

                <div className="message-row assistant">

                  <div className="avatar assistant">
                    <Bot size={17} />
                  </div>

                  <div className="message-body">

                    <div className="message-author">
                      Lyftr AI
                    </div>

                    <div className="typing">
                      <i></i>
                      <i></i>
                      <i></i>
                    </div>

                  </div>

                </div>

              )}

              <div ref={bottomRef} />

            </div>

          )}

        </section>

        {/* Message composer */}

        <div className="composer-wrap">

          {error && (
            <div className="error-note">
              {error}
            </div>
          )}

          <form
            className="composer"
            onSubmit={sendMessage}
          >

            <textarea
              data-testid="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
              placeholder="Message Lyftr AI..."
              rows="1"
            />

            <button
              type="submit"
              data-testid="send-button"
              disabled={!input.trim() || busy}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>

          </form>

          <div className="composer-foot">

            <span>
              <ShieldCheck size={12} />
              Responses may be AI-generated
            </span>

            <span>
              Enter to send · Shift + Enter for new line
            </span>

          </div>

        </div>

      </main>

    </div>
  );
}
