"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import PdfUploader from "./components/PdfUploader";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

// Generate a unique thread ID for the conversation
function generateThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>("");
  const [showUploader, setShowUploader] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize threadId on mount (client-side only)
  useEffect(() => {
    setThreadId(generateThreadId());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start a new conversation with fresh memory
  const handleNewChat = () => {
    setMessages([]);
    setThreadId(generateThreadId());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage.content,
          threadId: threadId,
        }),
      });

      const data = await response.json();

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: data.response || data.error || "Something went wrong",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "Failed to connect to the agent. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>⚡</span>
              <h1>LangChain Agent</h1>
            </div>
            <div className={styles.headerButtons}>
              <a href="/research" className={styles.researchLink}>
                🔬 Research Agent
              </a>
              <button 
                onClick={() => setShowUploader(!showUploader)} 
                className={`${styles.uploaderToggle} ${showUploader ? styles.active : ""}`}
              >
                📚 Study Materials
              </button>
              {messages.length > 0 && (
                <button onClick={handleNewChat} className={styles.newChatButton}>
                  ✨ New Chat
                </button>
              )}
            </div>
          </div>
          <p className={styles.subtitle}>
            Weather • Math • Study Buddy (PDF-AI) • <a href="/research" className={styles.subtitleLink}>Research Agent</a> • <span className={styles.memoryBadge}>🧠 Memory</span>
          </p>
        </header>

        {showUploader && (
          <PdfUploader 
            onUploadComplete={() => setHasDocuments(true)} 
          />
        )}

        <div className={styles.chatContainer}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <h2>Start a conversation</h2>
                <p>The agent remembers your conversation! Try asking:</p>
                <div className={styles.suggestions}>
                  <button
                    onClick={() => setInput("Hi! My name is Alex")}
                    className={styles.suggestion}
                  >
                    👋 Introduce yourself
                  </button>
                  <button
                    onClick={() => setInput("What's the weather in Tokyo?")}
                    className={styles.suggestion}
                  >
                    🌤️ Weather in Tokyo
                  </button>
                  <button
                    onClick={() => setInput("Calculate 15 * 7 + 23")}
                    className={styles.suggestion}
                  >
                    🔢 Calculate 15 * 7 + 23
                  </button>
                  {hasDocuments ? (
                    <button
                      onClick={() => setInput("What are the main topics in my study materials?")}
                      className={styles.suggestion}
                    >
                      📚 Ask about your PDFs
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowUploader(true)}
                      className={styles.suggestion}
                    >
                      📄 Upload a PDF to study
                    </button>
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.role === "user" ? styles.userMessage : styles.agentMessage
                }`}
              >
                <div className={styles.messageAvatar}>
                  {message.role === "user" ? "👤" : "🤖"}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageRole}>
                      {message.role === "user" ? "You" : "Agent"}
                    </span>
                    <span className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className={styles.messageText}>{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.message} ${styles.agentMessage}`}>
                <div className={styles.messageAvatar}>🤖</div>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hasDocuments 
                ? "Ask about your study materials or anything else..." 
                : "Ask me anything... I'll remember our conversation!"
              }
              className={styles.input}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <span className={styles.loadingSpinner}></span>
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
